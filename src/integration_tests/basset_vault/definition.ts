import {BlockTxBroadcastResult, Coin, getContractEvents, isTxError, LCDClient, Wallet} from '@terra-money/terra.js';
import {full_init as full_basset_vault_init} from "../../basset_vault/definition";
import {anchor_init} from "../deploy_anchor/definition";
import {create_contract, execute_contract, sleep} from "../../utils";
import {LOCALTERRA_DEFAULT_VALIDATOR_ADDR} from "../deploy_anchor/config";
import {
    AddressesHolderConfig,
    AnchorEpochStateResponse,
    AnchorStateResponse,
    BalanceResponse,
    BorrowerInfoResponse,
    CollateralsResponse,
    TokenInfoResponse,
} from "./config"
import {isTxSuccess} from "../../transaction";
import * as assert from "assert";
import Decimal from 'decimal.js';

// ===================================================
const addresses_holder_wasm = "wasm_artifacts/utils/addr_holder.wasm";

// ===================================================

export async function borrow_zero_amount_issue(lcd_client: LCDClient, sender: Wallet, addresses_holder_addr: string) {

    const addresses = await get_addresses(lcd_client, addresses_holder_addr);

    const bluna_token_addr = addresses.bluna_token_addr;
    const bluna_hub_addr = addresses.bluna_hub_addr;
    const oracle_addr = addresses.anchor_oracle_addr;
    const basset_vault_for_bluna_addr = addresses.basset_vault_for_bluna_addr;
    //==========================================

    const luna_to_bond = 10;
    await feed_price(lcd_client, sender, oracle_addr, bluna_token_addr, 1);

    await bond_luna(lcd_client, sender, bluna_hub_addr, luna_to_bond);
    const bluna_to_deposit = await get_token_balance(lcd_client, sender.key.accAddress, bluna_token_addr); //deposit all bluna in contract
    await deposit_bluna(lcd_client, sender, bluna_token_addr, basset_vault_for_bluna_addr, bluna_to_deposit);

    const expected_query_rebalance = {
        Nothing: {}
    };
    const actual_rebalance_query = await lcd_client.wasm.contractQuery(basset_vault_for_bluna_addr, {
        rebalance: {}
    });

    assert(JSON.stringify(expected_query_rebalance) == JSON.stringify(actual_rebalance_query));
}

export async function simple_deposit(lcd_client: LCDClient, sender: Wallet, addresses_holder_addr: string) {

    const addresses = await get_addresses(lcd_client, addresses_holder_addr);

    const anchor_market_addr = addresses.anchor_market_addr;
    const bluna_token_addr = addresses.bluna_token_addr;
    const bluna_hub_addr = addresses.bluna_hub_addr;
    const oracle_addr = addresses.anchor_oracle_addr;
    const overseer_addr = addresses.anchor_overseer_addr;
    const basset_vault_for_bluna_addr = addresses.basset_vault_for_bluna_addr;
    const nluna_token_addr = addresses.nluna_token_addr;

    //deposit some UST directly to anchor marker in order to vault could borrow it
    const initial_ust_for_anchor = 100_000_000;
    await deposit_stable(lcd_client, sender, anchor_market_addr, initial_ust_for_anchor);
    const luna_to_bond = 10_000_000;
    const bluna_price = 1;

    await feed_price(lcd_client, sender, oracle_addr, bluna_token_addr, bluna_price);

    await bond_luna(lcd_client, sender, bluna_hub_addr, luna_to_bond);

    const bluna_to_deposit = await get_token_balance(lcd_client, sender.key.accAddress, bluna_token_addr); //deposit all bluna in contract
    const collateral = await get_collateral_amount(lcd_client, overseer_addr, basset_vault_for_bluna_addr);
    const total_bluna_amount = collateral + bluna_to_deposit;

    const farmer_nluna_balance_before_deposit = await get_token_balance(lcd_client, sender.key.accAddress, nluna_token_addr);

    const nluna_supply = await get_nluna_supply(lcd_client, nluna_token_addr);

    let additional_nluna_amount;
    let is_first_depositor = bluna_to_deposit == total_bluna_amount; // or collateral == zero

    if (is_first_depositor) {
        additional_nluna_amount = bluna_to_deposit;
    } else {
        additional_nluna_amount = (nluna_supply * bluna_to_deposit) / (total_bluna_amount - bluna_to_deposit);
    }

    let expected_farmer_nluna_balance_after_deposit = farmer_nluna_balance_before_deposit + additional_nluna_amount;
    const deposit_result = await deposit_bluna(lcd_client, sender, bluna_token_addr, basset_vault_for_bluna_addr, bluna_to_deposit);
    if (deposit_result == undefined) {
        throw new Error(
            `Deposit basset failed`
        );
    } else {
        let contract_events = getContractEvents(deposit_result);

        for (let contract_event of contract_events) {
            let action = contract_event["action"];
            if (action !== undefined && action == "rebalance_not_needed") {
                console.log(`basset_vault_for_bluna test: "simple_deposit" passed(rebalance_not_needed)!`);
                return;
            }
        }
    }

    let actual_farmer_nluna_balance = await get_token_balance(lcd_client, sender.key.accAddress, nluna_token_addr);

    assert(expected_farmer_nluna_balance_after_deposit == actual_farmer_nluna_balance);

    const expected_collateral_amount = total_bluna_amount;
    const actual_collateral_amount = await get_collateral_amount(lcd_client, overseer_addr, basset_vault_for_bluna_addr);
    assert(expected_collateral_amount == actual_collateral_amount);

    //locked_basset * basset_price * basset_max_ltv(0,6) * borrow_ltv_aim(0,8)
    let user_liability = Math.round(total_bluna_amount * bluna_price * 0.6 * 0.8);
    await assert_loan(lcd_client, anchor_market_addr, basset_vault_for_bluna_addr, user_liability);

    console.log(`basset_vault_for_bluna test: "simple_deposit" passed(rebalanced)!`);
}

export async function borrow_more_on_bluna_price_increasing(lcd_client: LCDClient, sender: Wallet, addresses_holder_addr: string) {
    const addresses = await get_addresses(lcd_client, addresses_holder_addr);

    const anchor_market_addr = addresses.anchor_market_addr;
    const bluna_token_addr = addresses.bluna_token_addr;
    const bluna_hub_addr = addresses.bluna_hub_addr;
    const oracle_addr = addresses.anchor_oracle_addr;
    const overseer_addr = addresses.anchor_overseer_addr;
    const basset_vault_for_bluna_addr = addresses.basset_vault_for_bluna_addr;

    //deposit some UST directly to anchor marker in order to vault could borrow it
    const initial_ust_for_anchor = 100_000_000;
    await deposit_stable(lcd_client, sender, anchor_market_addr, initial_ust_for_anchor);

    const luna_to_bond = 100_000_000;
    let bluna_price = 1;

    await feed_price(lcd_client, sender, oracle_addr, bluna_token_addr, bluna_price);

    await bond_luna(lcd_client, sender, bluna_hub_addr, luna_to_bond);
    const bluna_to_deposit = await get_token_balance(lcd_client, sender.key.accAddress, bluna_token_addr); //deposit all bluna in contract
    await deposit_bluna(lcd_client, sender, bluna_token_addr, basset_vault_for_bluna_addr, bluna_to_deposit);
    let collateral = await get_collateral_amount(lcd_client, overseer_addr, basset_vault_for_bluna_addr);

    //locked_basset * bluna_price * basset_max_ltv(0,6) * borrow_ltv_aim(0,8)
    let user_liability = Math.round(collateral * bluna_price * 0.6 * 0.8);
    await assert_loan(lcd_client, anchor_market_addr, basset_vault_for_bluna_addr, user_liability);

    bluna_price = bluna_price * 2;
    await feed_price(lcd_client, sender, oracle_addr, bluna_token_addr, bluna_price);

    await rebalance(lcd_client, sender, basset_vault_for_bluna_addr);

    collateral = await get_collateral_amount(lcd_client, overseer_addr, basset_vault_for_bluna_addr);

    user_liability = Math.round(collateral * bluna_price * 0.6 * 0.8);
    await assert_loan(lcd_client, anchor_market_addr, basset_vault_for_bluna_addr, user_liability);

    console.log(`basset_vault_for_bluna test: "borrow_more_on_bluna_price_increasing" passed!`);
}

export async function repay_on_bluna_price_decreasing(lcd_client: LCDClient, sender: Wallet, addresses_holder_addr: string) {
    const addresses = await get_addresses(lcd_client, addresses_holder_addr);

    const anchor_market_addr = addresses.anchor_market_addr;
    const bluna_token_addr = addresses.bluna_token_addr;
    const bluna_hub_addr = addresses.bluna_hub_addr;
    const oracle_addr = addresses.anchor_oracle_addr;
    const overseer_addr = addresses.anchor_overseer_addr;
    const basset_vault_for_bluna_addr = addresses.basset_vault_for_bluna_addr;

    //deposit some UST directly to anchor marker in order to vault could borrow it
    const initial_ust_for_anchor = 100_000_000;
    await deposit_stable(lcd_client, sender, anchor_market_addr, initial_ust_for_anchor);

    const luna_to_bond = 100_000_000;
    let bluna_price = 1;

    await feed_price(lcd_client, sender, oracle_addr, bluna_token_addr, bluna_price);

    await bond_luna(lcd_client, sender, bluna_hub_addr, luna_to_bond);
    const bluna_to_deposit = await get_token_balance(lcd_client, sender.key.accAddress, bluna_token_addr); //deposit all bluna in contract
    await deposit_bluna(lcd_client, sender, bluna_token_addr, basset_vault_for_bluna_addr, bluna_to_deposit);
    let collateral = await get_collateral_amount(lcd_client, overseer_addr, basset_vault_for_bluna_addr);

    //locked_basset * basset_price * basset_max_ltv(0,6) * borrow_ltv_aim(0,8)
    let user_liability = Math.round(collateral * bluna_price * 0.6 * 0.8);
    await assert_loan(lcd_client, anchor_market_addr, basset_vault_for_bluna_addr, user_liability);

    bluna_price = bluna_price / 2;
    await feed_price(lcd_client, sender, oracle_addr, bluna_token_addr, bluna_price);

    await rebalance(lcd_client, sender, basset_vault_for_bluna_addr);

    collateral = await get_collateral_amount(lcd_client, overseer_addr, basset_vault_for_bluna_addr);

    user_liability = Math.round(collateral * bluna_price * 0.6 * 0.8);
    await assert_loan(lcd_client, anchor_market_addr, basset_vault_for_bluna_addr, user_liability);

    console.log(`basset_vault_for_bluna test: "repay_on_bluna_price_decreasing" passed!`);
}

export async function recursive_repay_ok(lcd_client: LCDClient, sender: Wallet, addresses_holder_addr: string) {
    const addresses = await get_addresses(lcd_client, addresses_holder_addr);

    const anchor_market_addr = addresses.anchor_market_addr;
    const aust_token_addr = addresses.aterra_token_addr;
    const bluna_token_addr = addresses.bluna_token_addr;
    const bluna_hub_addr = addresses.bluna_hub_addr;
    const oracle_addr = addresses.anchor_oracle_addr;
    const overseer_addr = addresses.anchor_overseer_addr;
    const basset_vault_for_bluna_addr = addresses.basset_vault_for_bluna_addr;
    const nluna_token_addr = addresses.nluna_token_addr;

    //deposit some UST directly to anchor_marker in order to basset_vault could borrow it
    const initial_ust_for_anchor = 100_000_000;
    await deposit_stable(lcd_client, sender, anchor_market_addr, initial_ust_for_anchor);

    const luna_to_bond = 100_000_000;
    let basset_price = 1;

    await feed_price(lcd_client, sender, oracle_addr, bluna_token_addr, basset_price);

    await bond_luna(lcd_client, sender, bluna_hub_addr, luna_to_bond);
    const bluna_to_deposit = await get_token_balance(lcd_client, sender.key.accAddress, bluna_token_addr);
    await deposit_bluna(lcd_client, sender, bluna_token_addr, basset_vault_for_bluna_addr, bluna_to_deposit);

    // redeem rest of directly deposited UST from anchor market
    let anchor_ust_balance = await query_stable_balance(lcd_client, anchor_market_addr);
    const aust_exchange_rate = await get_aust_exchange_rate(lcd_client, anchor_market_addr);
    const anchor_initial_funds = 1_000_000;
    const aust_to_burn = Math.round((anchor_ust_balance - anchor_initial_funds) / aust_exchange_rate);
    await redeem_stable(lcd_client, sender, aust_token_addr, anchor_market_addr, aust_to_burn);
    anchor_ust_balance = await query_stable_balance(lcd_client, anchor_market_addr);
    //check whether there is no UST in anchor_market
    assert_numbers_with_inaccuracy(anchor_initial_funds, anchor_ust_balance, 10);

    let actual_borrower_info: BorrowerInfoResponse = await lcd_client.wasm.contractQuery(anchor_market_addr, {
        borrower_info: {
            borrower: basset_vault_for_bluna_addr
        }
    });
    const loan_before_withdraw = +actual_borrower_info.loan_amount;

    const buffer_before_withdraw = await query_stable_balance(lcd_client, basset_vault_for_bluna_addr);

    const collateral_before_withdraw = await get_collateral_amount(lcd_client, overseer_addr, basset_vault_for_bluna_addr);

    const farmer_nluna_balance_before_withdraw = await get_token_balance(lcd_client, sender.key.accAddress, nluna_token_addr);

    // According to basset_vault_config it's impossible to withdraw more bAsset than 18% of nAsset total supply.
    // There is only one farmer in our test => farmer nAsset balance is equal to total nAsset supply.
    // That's why only 15% of deposited bluna to withdraw.
    const part_to_withdraw = 0.15;
    const withdraw_result = await withdraw_bluna(lcd_client, sender, nluna_token_addr, basset_vault_for_bluna_addr, bluna_to_deposit * part_to_withdraw);
    if (withdraw_result === undefined) {
        throw new Error(
            `Withdraw basset failed`
        );
    } else {
        const actual_repay_cycles_amount = await calculate_repay_cycles_amount(withdraw_result);
        const expected_repay_cycles_amount = Math.ceil((loan_before_withdraw * part_to_withdraw) / buffer_before_withdraw);
        assert(actual_repay_cycles_amount == expected_repay_cycles_amount);
    }

    actual_borrower_info = await lcd_client.wasm.contractQuery(anchor_market_addr, {
        borrower_info: {
            borrower: basset_vault_for_bluna_addr
        }
    });
    const actual_loan_after_withdraw = +actual_borrower_info.loan_amount;
    const expected_loan_after_withdraw = Math.floor(loan_before_withdraw * (1 - part_to_withdraw));
    //See comment for assert_loan fn
    assert_numbers_with_inaccuracy(expected_loan_after_withdraw, actual_loan_after_withdraw, 10);

    const actual_buffer_after_withdraw = await query_stable_balance(lcd_client, basset_vault_for_bluna_addr);
    const expected_buffer_after_withdraw = Math.floor(buffer_before_withdraw * (1 - part_to_withdraw));
    assert(actual_buffer_after_withdraw == expected_buffer_after_withdraw);

    const actual_collateral_after_withdraw = await get_collateral_amount(lcd_client, overseer_addr, basset_vault_for_bluna_addr);
    const expected_collateral_after_withdraw = Math.floor(collateral_before_withdraw * (1 - part_to_withdraw));
    assert_numbers_with_inaccuracy(expected_collateral_after_withdraw, actual_collateral_after_withdraw, 10);

    const actual_farmer_nluna_balance_after_withdraw = await get_token_balance(lcd_client, sender.key.accAddress, nluna_token_addr);
    const expected_farmer_nluna_balance_after_withdraw = Math.floor(farmer_nluna_balance_before_withdraw * (1 - part_to_withdraw));
    assert(actual_farmer_nluna_balance_after_withdraw == expected_farmer_nluna_balance_after_withdraw);

    console.log(`basset_vault_for_bluna test: "recursive_repay_ok" passed!`);
}

//THIS TEST FAILS (bug fix needed)
// According to basset_vault_config it's impossible to withdraw more bAsset than 18% of nAsset total supply.
// if nasset to burn > 18% of nasset total supply and current ltv is low than max ltv(anchor market property), there is no tx fail and unexpected repay amount appears!
// Repay iterations amount assert shows that its equal to max iterations amount.
// Next 3 assets show that loan is not repayed as expected but basset withdrawn and nasset burned
export async function recursive_repay_fail(lcd_client: LCDClient, sender: Wallet, addresses_holder_addr: string) {
    const addresses = await get_addresses(lcd_client, addresses_holder_addr);

    const anchor_market_addr = addresses.anchor_market_addr;
    const aust_token_addr = addresses.aterra_token_addr;
    const bluna_token_addr = addresses.bluna_token_addr;
    const bluna_hub_addr = addresses.bluna_hub_addr;
    const oracle_addr = addresses.anchor_oracle_addr;
    const overseer_addr = addresses.anchor_overseer_addr;
    const basset_vault_for_bluna_addr = addresses.basset_vault_for_bluna_addr;
    const nluna_token_addr = addresses.nluna_token_addr;

    //deposit some UST directly to anchor_marker in order to basset_vault could borrow it
    const initial_ust_for_anchor = 100_000_000;
    await deposit_stable(lcd_client, sender, anchor_market_addr, initial_ust_for_anchor);

    const luna_to_bond = 100_000_000;
    let basset_price = 1;

    await feed_price(lcd_client, sender, oracle_addr, bluna_token_addr, basset_price);

    await bond_luna(lcd_client, sender, bluna_hub_addr, luna_to_bond);
    const bluna_to_deposit = await get_token_balance(lcd_client, sender.key.accAddress, bluna_token_addr);
    await deposit_bluna(lcd_client, sender, bluna_token_addr, basset_vault_for_bluna_addr, bluna_to_deposit);

    // redeem rest of directly deposited UST from anchor market
    let anchor_ust_balance = await query_stable_balance(lcd_client, anchor_market_addr);
    const aust_exchange_rate = await get_aust_exchange_rate(lcd_client, anchor_market_addr);
    const anchor_initial_funds = 1_000_000;
    const aust_to_burn = Math.round((anchor_ust_balance - anchor_initial_funds) / aust_exchange_rate);
    await redeem_stable(lcd_client, sender, aust_token_addr, anchor_market_addr, aust_to_burn);
    anchor_ust_balance = await query_stable_balance(lcd_client, anchor_market_addr);
    //check whether there is no UST in anchor_market
    assert_numbers_with_inaccuracy(anchor_initial_funds, anchor_ust_balance, 10);

    let actual_borrower_info: BorrowerInfoResponse = await lcd_client.wasm.contractQuery(anchor_market_addr, {
        borrower_info: {
            borrower: basset_vault_for_bluna_addr
        }
    });
    const loan_before_withdraw = +actual_borrower_info.loan_amount;

    const collateral_before_withdraw = await get_collateral_amount(lcd_client, overseer_addr, basset_vault_for_bluna_addr);

    const farmer_nluna_balance_before_withdraw = await get_token_balance(lcd_client, sender.key.accAddress, nluna_token_addr);

    const part_to_withdraw = 0.30;
    const withdraw_result = await withdraw_bluna(lcd_client, sender, nluna_token_addr, basset_vault_for_bluna_addr, bluna_to_deposit * part_to_withdraw);
    if (withdraw_result === undefined) {
        throw new Error(
            `Withdraw basset failed`
        );
    } else {
        const actual_repay_cycles_amount = await calculate_repay_cycles_amount(withdraw_result);
        assert(actual_repay_cycles_amount == 9);
    }

    actual_borrower_info = await lcd_client.wasm.contractQuery(anchor_market_addr, {
        borrower_info: {
            borrower: basset_vault_for_bluna_addr
        }
    });
    const actual_loan_after_withdraw = +actual_borrower_info.loan_amount;
    const expected_loan_after_withdraw = loan_before_withdraw * (1 - part_to_withdraw);
    assert_numbers_with_inaccuracy(expected_loan_after_withdraw, actual_loan_after_withdraw, 10);

    const actual_collateral_after_withdraw = await get_collateral_amount(lcd_client, overseer_addr, basset_vault_for_bluna_addr);
    const expected_collateral_after_withdraw = collateral_before_withdraw * (1 - part_to_withdraw);
    assert_numbers_with_inaccuracy(expected_collateral_after_withdraw, actual_collateral_after_withdraw, 10);

    const actual_farmer_nluna_balance_after_withdraw = await get_token_balance(lcd_client, sender.key.accAddress, nluna_token_addr);
    const expected_farmer_nluna_balance_after_withdraw = farmer_nluna_balance_before_withdraw * (1 - part_to_withdraw);
    assert_numbers_with_inaccuracy(expected_farmer_nluna_balance_after_withdraw, actual_farmer_nluna_balance_after_withdraw, 10);

    console.log(`basset_vault_for_bluna test: "recursive_repay_fail"`);
}

export async function expired_basset_price_rebalance(lcd_client: LCDClient, sender: Wallet, addresses_holder_addr: string) {
    const addresses = await get_addresses(lcd_client, addresses_holder_addr);

    const anchor_market_addr = addresses.anchor_market_addr;
    const bluna_token_addr = addresses.bluna_token_addr;
    const bluna_hub_addr = addresses.bluna_hub_addr;
    const oracle_addr = addresses.anchor_oracle_addr;
    const overseer_addr = addresses.anchor_overseer_addr;
    const basset_vault_for_bluna_addr = addresses.basset_vault_for_bluna_addr;

    //deposit some UST directly to anchor marker in order to vault could borrow it
    const initial_ust_for_anchor = 100_000_000;
    await deposit_stable(lcd_client, sender, anchor_market_addr, initial_ust_for_anchor);

    const luna_to_bond = 100_000_000;
    let bluna_price = 1;

    await feed_price(lcd_client, sender, oracle_addr, bluna_token_addr, bluna_price);

    await bond_luna(lcd_client, sender, bluna_hub_addr, luna_to_bond);
    const bluna_to_deposit = await get_token_balance(lcd_client, sender.key.accAddress, bluna_token_addr); //deposit all bluna in contract
    await deposit_bluna(lcd_client, sender, bluna_token_addr, basset_vault_for_bluna_addr, bluna_to_deposit);
    let collateral = await get_collateral_amount(lcd_client, overseer_addr, basset_vault_for_bluna_addr);

    //locked_basset * basset_price * basset_max_ltv(0,6) * borrow_ltv_aim(0,8)
    let user_liability = Math.round(collateral * bluna_price * 0.6 * 0.8);
    await assert_loan(lcd_client, anchor_market_addr, basset_vault_for_bluna_addr, user_liability);

    await sleep(26000);

    await rebalance(lcd_client, sender, basset_vault_for_bluna_addr);

    //locked_basset * basset_price * basset_max_ltv(0,6) * borrow_ltv_aim(0,4)
    //borrow_ltv_aim drops on 50% in emergency mode
    user_liability = Math.round(collateral * bluna_price * 0.6 * 0.4);
    await assert_loan(lcd_client, anchor_market_addr, basset_vault_for_bluna_addr, user_liability);

    console.log(`basset_vault_for_bluna test: "expired_bluna_price" passed!`);
}

export async function anchor_nexus_full_init(
    lcd_client: LCDClient,
    sender: Wallet,
    psi_token_initial_owner: string,
    bluna_init_price: number,
    beth_init_price: number
) {
    const anchor_market_info = await anchor_init(lcd_client, sender);
    let [basset_vault_info_for_bluna, basset_vault_info_for_beth] = await full_basset_vault_init(lcd_client, sender, psi_token_initial_owner, anchor_market_info);

    const oracle_addr = anchor_market_info.oracle_addr;
    const bluna_token_addr = anchor_market_info.bluna_token_addr;
    const beth_token_addr = anchor_market_info.beth_token_addr;

    await register_basset_price_feeder(lcd_client, sender, oracle_addr, bluna_token_addr);
    await register_basset_price_feeder(lcd_client, sender, oracle_addr, beth_token_addr);

    await feed_price(lcd_client, sender, oracle_addr, bluna_token_addr, bluna_init_price);
    await feed_price(lcd_client, sender, oracle_addr, beth_token_addr, beth_init_price);

    const addresses_holder_config = AddressesHolderConfig(anchor_market_info, basset_vault_info_for_bluna, basset_vault_info_for_beth);
    const addresses_holder_addr = await create_contract(lcd_client, sender, "addrs_holder", addresses_holder_wasm, addresses_holder_config);

    return addresses_holder_addr;
}

async function register_basset_price_feeder(lcd_client: LCDClient, sender: Wallet, oracle_addr: string, basset_token_addr: string) {
    await execute_contract(lcd_client, sender, oracle_addr, {
        register_feeder: {
            asset: basset_token_addr,
            feeder: sender.key.accAddress
        }
    });
}

export async function get_addresses(
    lcd_client: LCDClient,
    addrs_holder_addr: string
) {
    const result: AddressesHolderConfig = await lcd_client.wasm.contractQuery(addrs_holder_addr, {
        get_addresses: {}
    });
    return result;
}

async function feed_price(lcd_client: LCDClient, sender: Wallet, oracle_addr: string, basset_token_addr: string, new_basset_price: number) {
    const result = await execute_contract(lcd_client, sender, oracle_addr, {
        feed_price: {
            prices: [
                [basset_token_addr, new_basset_price.toString()],
            ]
        }
    });
    return result;
}

async function bond_luna(lcd_client: LCDClient, sender: Wallet, bluna_hub_addr: string, amount: number) {
    const bond_result = await execute_contract(lcd_client, sender, bluna_hub_addr,
        {
            bond: {
                validator: LOCALTERRA_DEFAULT_VALIDATOR_ADDR,
            }
        },
        [new Coin("uluna", amount.toString())]
    );

    return bond_result;
}

async function deposit_bluna(lcd_client: LCDClient, sender: Wallet, bluna_token_addr: string, recipient_addr: string, amount: number) {
    const deposit_msg = {deposit: {}};

    const send_result = await execute_contract(lcd_client, sender, bluna_token_addr, {
        send: {
            contract: recipient_addr,
            amount: amount.toString(),
            msg: Buffer.from(JSON.stringify(deposit_msg)).toString('base64'),
        }
    });

    return send_result;
}

async function withdraw_bluna(lcd_client: LCDClient, sender: Wallet, nluna_token_addr: string, basset_vault_for_bluna_addr: string, amount: number) {
    const withdraw_msg = {withdraw: {}};

    const withdraw_result = await execute_contract(lcd_client, sender, nluna_token_addr, {
        send: {
            contract: basset_vault_for_bluna_addr,
            amount: amount.toString(),
            msg: Buffer.from(JSON.stringify(withdraw_msg)).toString('base64'),
        }
    });

    return withdraw_result;
}

async function rebalance(lcd_client: LCDClient, sender: Wallet, basset_vault_addr: string): Promise<BlockTxBroadcastResult> {
    const rebalance_msg = {
        anyone: {
            anyone_msg: {
                rebalance: {}
            }
        }
    };

    while (true) {
        let result = await execute_contract(lcd_client, sender, basset_vault_addr, rebalance_msg);
        if (result !== undefined && isTxSuccess(result)) {
            return result;
        } else {
            await sleep(1000);
        }
    }
}

async function deposit_stable(lcd_client: LCDClient, sender: Wallet, anchor_market_contract: string, amount: number) {
    await sleep(500);

    const deposit_result = await execute_contract(
        lcd_client,
        sender,
        anchor_market_contract,
        {
            deposit_stable: {}
        },
        [new Coin("uusd", amount)]);
    return deposit_result;
}

async function redeem_stable(lcd_client: LCDClient, sender: Wallet, aust_token_addr: string, anchor_market_contract: string, aust_amount: number) {
    await sleep(500);

    const redeem_msg = {redeem_stable: {}};

    const redeem_result = await execute_contract(lcd_client, sender, aust_token_addr, {
        send: {
            contract: anchor_market_contract,
            amount: aust_amount.toString(),
            msg: Buffer.from(JSON.stringify(redeem_msg)).toString('base64'),
        }
    });

    return redeem_result;
}

async function get_collateral_amount(lcd_client: LCDClient, overseer_addr: string, basset_vault_for_bluna_addr: string) {
    const collaterals_response: CollateralsResponse = await lcd_client.wasm.contractQuery(overseer_addr, {
        collaterals: {
            borrower: basset_vault_for_bluna_addr
        }
    });
    if (collaterals_response.collaterals[0] == undefined) {
        return 0;
    }
    return +collaterals_response.collaterals[0][1];
}

async function get_token_balance(lcd_client: LCDClient, token_holder_addr: string, token_addr: string) {
    const result: BalanceResponse = await lcd_client.wasm.contractQuery(token_addr, {
        balance: {
            address: token_holder_addr
        }
    });
    return +result.balance;
}

async function assert_loan(lcd_client: LCDClient, anchor_market_addr: string, borrower_addr: string, liability: number) {
    const anchor_market_state: AnchorStateResponse = await lcd_client.wasm.contractQuery(anchor_market_addr, {
        state: {}
    });

    const borrower_info: BorrowerInfoResponse = await lcd_client.wasm.contractQuery(anchor_market_addr, {
        borrower_info: {
            borrower: borrower_addr
        }
    });
    const actual_loan = +borrower_info.loan_amount;
    const global_interest_index = new Decimal(anchor_market_state.global_interest_index);
    const interest_index = new Decimal(borrower_info.interest_index);
    const inner_liability = new Decimal(liability);
    const expected_loan = inner_liability.mul(global_interest_index).div(interest_index).round().toNumber();
    //There is a bug in anchor market contracts (reported): the absence of explicit Uint256 to Decimal256 cast derives to inaccuracy
    //This inaccuracy depends on localterra config as well: in case all timeouts equals to 200ms and longer inaccuracy low than 10,
    // but the shorter timeouts the more blocks between requests the bigger inaccuracy.
    assert_numbers_with_inaccuracy(expected_loan, actual_loan, 10);
}

async function get_nluna_supply(lcd_client: LCDClient, nluna_token_addr: string) {
    const nluna_token_info: TokenInfoResponse = await lcd_client.wasm.contractQuery(nluna_token_addr,
        {
            token_info: {}
        });
    return +nluna_token_info.total_supply;
}

async function query_stable_balance(lcd_client: LCDClient, contract_addr: string) {
    const response = await lcd_client.bank.balance(contract_addr);
    const result = response.get("uusd")?.amount;
    if (result == undefined) {
        assert(false);
    } else {
        return result.toNumber();
    }
}

async function get_aust_exchange_rate(lcd_client: LCDClient, anchor_market_addr: string) {
    const response: AnchorEpochStateResponse = await lcd_client.wasm.contractQuery(anchor_market_addr,
        {
            epoch_state: {}
        }
    );
    return +response.exchange_rate;
}

async function calculate_repay_cycles_amount(result: BlockTxBroadcastResult) {
    if (isTxError(result)) {
        throw new Error(
            `${result.code} - ${result.raw_log}`
        );
    }

    let contract_events = getContractEvents(result);

    let repay_cycles_amount = 0;

    for (let contract_event of contract_events) {
        let action_1 = contract_event["action_1"];
        if (action_1 == "repay_loan") {
            repay_cycles_amount += 1;
        }
    }
    return repay_cycles_amount;
}

function assert_numbers_with_inaccuracy(expected: number, actual: number, inaccuracy: number) {
    let diff = Math.abs(expected - actual);
    assert(diff <= inaccuracy);
}