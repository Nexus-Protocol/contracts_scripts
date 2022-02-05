import {BlockTxBroadcastResult, Coin, getContractEvents, LCDClient, LocalTerra, Wallet} from '@terra-money/terra.js';
import {full_init as full_basset_vault_init} from "../../basset_vault/definition";
import {anchor_init} from "../deploy_anchor/definition";
import {create_contract, execute_contract, sleep} from "../../utils";
import {LOCALTERRA_DEFAULT_VALIDATOR_ADDR} from "../deploy_anchor/config";
import {
    AddressesHolderConfig,
    BalanceResponse,
    BorrowerInfoResponse,
    CollateralsResponse,
    TokenInfoResponse,
} from "./config"
import {isTxSuccess} from "../../transaction";
import * as assert from "assert";
import { stringify } from 'querystring';

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

export async function normal_case(lcd_client: LCDClient, sender: Wallet, addresses_holder_addr: string) {

    const addresses = await get_addresses(lcd_client, addresses_holder_addr);

    const anchor_market_addr = addresses.anchor_market_addr;
    const bluna_token_addr = addresses.bluna_token_addr;
    const bluna_hub_addr = addresses.bluna_hub_addr;
    const oracle_addr = addresses.anchor_oracle_addr;
    const overseer_addr = addresses.anchor_overseer_addr;
    const basset_vault_for_bluna_addr = addresses.basset_vault_for_bluna_addr;
    const nluna_token_addr = addresses.nluna_token_addr;

    const luna_to_bond = 10000000;

    await feed_price(lcd_client, sender, oracle_addr, bluna_token_addr, 1);

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
                console.log(`basset_vault_for_bluna test: "normal_case_1" passed(rebalance_not_needed)!`);
                return;
            }
        }
    }

    let actual_farmer_nluna_balance = await get_token_balance(lcd_client, sender.key.accAddress, nluna_token_addr);

    assert(expected_farmer_nluna_balance_after_deposit == actual_farmer_nluna_balance);

    const expected_collateral_amount = total_bluna_amount;
    const actual_collateral_amount = await get_collateral_amount(lcd_client, overseer_addr, basset_vault_for_bluna_addr);
    assert(expected_collateral_amount == actual_collateral_amount);

    const expected_loan = Math.round(total_bluna_amount * 0.6 * 0.8);
    const actual_borrower_info: BorrowerInfoResponse = await lcd_client.wasm.contractQuery(anchor_market_addr, {
        borrower_info: {
            borrower: basset_vault_for_bluna_addr
        }
    });
    const actual_loan = +actual_borrower_info.loan_amount;
    const comparison = Math.abs(actual_loan - expected_loan);
    assert(comparison < 10); // inaccuracy is 0,01 %
    console.log(`basset_vault_for_bluna test: "normal_case_1" passed(rebalanced)!`);
}

export async function borrow_more_on_bluna_price_increasing(lcd_client: LCDClient, sender: Wallet, addresses_holder_addr: string) {
    const addresses = await get_addresses(lcd_client, addresses_holder_addr);

    const anchor_market_addr = addresses.anchor_market_addr;
    const bluna_token_addr = addresses.bluna_token_addr;
    const bluna_hub_addr = addresses.bluna_hub_addr;
    const oracle_addr = addresses.anchor_oracle_addr;
    const overseer_addr = addresses.anchor_overseer_addr;
    const basset_vault_for_bluna_addr = addresses.basset_vault_for_bluna_addr;

    const luna_to_bond = 100000000;
    let basset_price = 1;

    await feed_price(lcd_client, sender, oracle_addr, bluna_token_addr, basset_price);

    await bond_luna(lcd_client, sender, bluna_hub_addr, luna_to_bond);
    const bluna_to_deposit = await get_token_balance(lcd_client, sender.key.accAddress, bluna_token_addr); //deposit all bluna in contract
    let dep = await deposit_bluna(lcd_client, sender, bluna_token_addr, basset_vault_for_bluna_addr, bluna_to_deposit);
    console.log("DEP", dep);
    let collateral = await get_collateral_amount(lcd_client, overseer_addr, basset_vault_for_bluna_addr);
    console.log("BLUNATODEPOSIT", bluna_to_deposit, "COLLATERAL", collateral);
    //loan = locked_basset * basset_price * basset_max_ltv(0,6) * borrow_ltv_aim(0,8)
    let expected_loan = Math.round(collateral * basset_price * 0.6 * 0.8);
    let actual_borrower_info: BorrowerInfoResponse = await lcd_client.wasm.contractQuery(anchor_market_addr, {
        borrower_info: {
            borrower: basset_vault_for_bluna_addr
        }
    });
    let actual_loan = +actual_borrower_info.loan_amount;

    console.log(actual_loan, expected_loan);
    let comparison = Math.abs(actual_loan - expected_loan);
    assert(comparison < 100); // inaccuracy is 0,01 %

    basset_price = basset_price * 2;
    await feed_price(lcd_client, sender, oracle_addr, bluna_token_addr, basset_price);

    await rebalance(lcd_client, sender, basset_vault_for_bluna_addr);

    collateral = await get_collateral_amount(lcd_client, overseer_addr, basset_vault_for_bluna_addr);
    expected_loan = Math.round(collateral * basset_price * 0.6 * 0.8);
    actual_borrower_info = await lcd_client.wasm.contractQuery(anchor_market_addr, {
        borrower_info: {
            borrower: basset_vault_for_bluna_addr
        }
    });
    actual_loan = +actual_borrower_info.loan_amount;
    comparison = Math.abs(actual_loan - expected_loan);
    assert(comparison < 100); // inaccuracy is 0,01 %
    console.log(`basset_vault_for_bluna test: "increase_bluna_price" passed!`);
}

export async function repay_on_bluna_price_decreasing(lcd_client: LCDClient, sender: Wallet, addresses_holder_addr: string) {
    const addresses = await get_addresses(lcd_client, addresses_holder_addr);

    const anchor_market_addr = addresses.anchor_market_addr;
    const bluna_token_addr = addresses.bluna_token_addr;
    const bluna_hub_addr = addresses.bluna_hub_addr;
    const oracle_addr = addresses.anchor_oracle_addr;
    const overseer_addr = addresses.anchor_overseer_addr;
    const basset_vault_for_bluna_addr = addresses.basset_vault_for_bluna_addr;

    const luna_to_bond = 100000000;
    let basset_price = 1;

    await feed_price(lcd_client, sender, oracle_addr, bluna_token_addr, basset_price);

    await bond_luna(lcd_client, sender, bluna_hub_addr, luna_to_bond);
    const bluna_to_deposit = await get_token_balance(lcd_client, sender.key.accAddress, bluna_token_addr); //deposit all bluna in contract
    await deposit_bluna(lcd_client, sender, bluna_token_addr, basset_vault_for_bluna_addr, bluna_to_deposit);
    let collateral = await get_collateral_amount(lcd_client, overseer_addr, basset_vault_for_bluna_addr);

    //loan = locked_basset * basset_price * basset_max_ltv(0,6) * borrow_ltv_aim(0,8)
    let expected_loan = Math.round(collateral * basset_price * 0.6 * 0.8);
    let actual_borrower_info: BorrowerInfoResponse = await lcd_client.wasm.contractQuery(anchor_market_addr, {
        borrower_info: {
            borrower: basset_vault_for_bluna_addr
        }
    });
    let actual_loan = +actual_borrower_info.loan_amount;

    let comparison = Math.abs(actual_loan - expected_loan);
    assert(comparison < 100); // inaccuracy is 0,01 %

    basset_price = basset_price / 2;
    await feed_price(lcd_client, sender, oracle_addr, bluna_token_addr, basset_price);

    await rebalance(lcd_client, sender, basset_vault_for_bluna_addr);

    collateral = await get_collateral_amount(lcd_client, overseer_addr, basset_vault_for_bluna_addr);
    expected_loan = Math.round(collateral * basset_price * 0.6 * 0.8);
    actual_borrower_info = await lcd_client.wasm.contractQuery(anchor_market_addr, {
        borrower_info: {
            borrower: basset_vault_for_bluna_addr
        }
    });
    actual_loan = +actual_borrower_info.loan_amount;
    comparison = Math.abs(actual_loan - expected_loan);
    assert(comparison < 100); // precision is 0,01 %
    console.log(`basset_vault_for_bluna test: "decrease_bluna_price" passed!`);
}

export async function expired_basset_price_rebalance(lcd_client: LCDClient, sender: Wallet, addresses_holder_addr: string) {
    const addresses = await get_addresses(lcd_client, addresses_holder_addr);

    const anchor_market_addr = addresses.anchor_market_addr;
    const bluna_token_addr = addresses.bluna_token_addr;
    const bluna_hub_addr = addresses.bluna_hub_addr;
    const oracle_addr = addresses.anchor_oracle_addr;
    const overseer_addr = addresses.anchor_overseer_addr;
    const basset_vault_for_bluna_addr = addresses.basset_vault_for_bluna_addr;

    const luna_to_bond = 100000000;
    let basset_price = 1;

    await feed_price(lcd_client, sender, oracle_addr, bluna_token_addr, basset_price);

    await bond_luna(lcd_client, sender, bluna_hub_addr, luna_to_bond);
    const bluna_to_deposit = await get_token_balance(lcd_client, sender.key.accAddress, bluna_token_addr); //deposit all bluna in contract
    await deposit_bluna(lcd_client, sender, bluna_token_addr, basset_vault_for_bluna_addr, bluna_to_deposit);
    let collateral = await get_collateral_amount(lcd_client, overseer_addr, basset_vault_for_bluna_addr);

    //loan = locked_basset * basset_price * basset_max_ltv(0,6) * borrow_ltv_aim(0,8)
    let expected_loan = Math.round(collateral * basset_price * 0.6 * 0.8);
    let actual_borrower_info: BorrowerInfoResponse = await lcd_client.wasm.contractQuery(anchor_market_addr, {
        borrower_info: {
            borrower: basset_vault_for_bluna_addr
        }
    });
    let actual_loan = +actual_borrower_info.loan_amount;
    let comparison = Math.abs(actual_loan - expected_loan);
    assert(comparison < 100); // inaccuracy is 0,01 %

    await sleep(26000);

    await rebalance(lcd_client, sender, basset_vault_for_bluna_addr);

    collateral = await get_collateral_amount(lcd_client, overseer_addr, basset_vault_for_bluna_addr);
    expected_loan = Math.round(collateral * basset_price * 0.6 * 0.4);
    actual_borrower_info = await lcd_client.wasm.contractQuery(anchor_market_addr, {
        borrower_info: {
            borrower: basset_vault_for_bluna_addr
        }
    });
    actual_loan = +actual_borrower_info.loan_amount;
    comparison = Math.abs(actual_loan - expected_loan);
    assert(comparison < 200); // inaccuracy is 0,02 % (the more sub messages the more inaccurate tax calculations in the third-party protocols the less precision )
    console.log(`basset_vault_for_bluna test: "expired_bluna_price" passed!`);
}

async function query_anchor_borrow_net_apr(lcd_client: LCDClient, addresses: AddressesHolderConfig): Promise<number> {
    const market_state = await lcd_client.wasm.contractQuery(addresses.anchor_market_addr, {
        state: {},
    }) as {
        total_liabilities: string,
        total_reserves: string,
        anc_emission_rate: string,
    };

    const coins = await lcd_client.bank.balance(addresses.anchor_market_addr);

    let borrow_rate = await lcd_client.wasm.contractQuery(addresses.anchor_interest_model_addr, {
        borrow_rate: {
            market_balance: coins.get('uusd')?.amount,
            total_liabilities: market_state.total_liabilities,
            total_reserves: market_state.total_reserves,
        },
    }) as {
        rate: string,
    };

    let anc_price = await query_anchor_price(lcd_client, addresses);

    let distribution_apr = Number(market_state.anc_emission_rate) * anc_price * 4656810 / Number(market_state.total_liabilities);

    let interest_apr = Number(borrow_rate.rate) * 4656810;

    let net_apr = distribution_apr - interest_apr;

    return net_apr;
}

async function query_anchor_earn_apr(lcd_client: LCDClient, addresses: AddressesHolderConfig): Promise<number> {
    let epoch_state = await lcd_client.wasm.contractQuery(addresses.anchor_overseer_addr, {
        epoch_state: {},
    }) as {
        deposit_rate: number,
    }; 

    return epoch_state.deposit_rate * 4656810;
}

async function query_anchor_price(lcd_client: LCDClient, addresses: AddressesHolderConfig): Promise<number> {
    const simulation = await lcd_client.wasm.contractQuery(addresses.anc_stable_swap_addr, {
        simulation: {
            offer_asset: {
                info: {
                    token: {
                        contract_addr: addresses.anchor_token_addr,
                    }
                },
                amount: "1000000"
            }
        }
    }) as {
        return_amount: string,
    };
    return Number(simulation.return_amount) / 1_000_000
}

async function setup_anchor(lcd_client: LCDClient, addresses: AddressesHolderConfig) {
    const localterra = new LocalTerra();
    const other_wallet = localterra.wallets.test2;

    const bluna_token_addr = addresses.bluna_token_addr;

    const bluna_to_deposit = "150000000000000";
    
    await bond_luna(lcd_client, other_wallet, addresses.bluna_hub_addr, bluna_to_deposit);

    await get_token_balance(lcd_client, other_wallet.key.accAddress, bluna_token_addr);

    const send_bluna_msg = {
        deposit_collateral: {}
    };

    await execute_contract(lcd_client, other_wallet, bluna_token_addr, {
        send: {
            contract: addresses.anchor_custody_bluna_addr,
            amount: bluna_to_deposit,
            msg: Buffer.from(JSON.stringify(send_bluna_msg)).toString('base64'),
        }
    });

    await execute_contract(lcd_client, other_wallet, addresses.anchor_overseer_addr, {
        lock_collateral: {
            collaterals: [[bluna_token_addr, String(bluna_to_deposit)]]
        }
    });

    await lcd_client.wasm.contractQuery(addresses.anchor_custody_bluna_addr, {
        borrower: {
            address: other_wallet.key.accAddress,
        }
    });

    const ust_to_borrow = "90000000000000";

    await execute_contract(lcd_client, other_wallet, addresses.anchor_market_addr, {
        borrow_stable: {
            borrow_amount: ust_to_borrow,
        }
    });

    const stables_to_deposit = "45000000000000";

    await execute_contract(lcd_client, other_wallet, addresses.anchor_market_addr, {
        deposit_stable: { }
    }, [new Coin("uusd", stables_to_deposit)]);
}

async function provide_liquidity_to_anc_stable_swap(lcd_client: LCDClient, sender: Wallet, addresses: AddressesHolderConfig) {
    let anc_amount = "100000000";
    let stable_amount = "300000000";
    
    await execute_contract(lcd_client, sender, addresses.anchor_token_addr, {
        mint: {
            recipient: sender.key.accAddress,
            amount: anc_amount,
        }
    });

    await execute_contract(lcd_client, sender, addresses.anchor_token_addr, {
        increase_allowance: {
            spender: addresses.anc_stable_swap_addr,
            amount: anc_amount,
        }
    });

    await execute_contract(lcd_client, sender, addresses.anc_stable_swap_addr, {
        provide_liquidity: {
            assets: [
                {
                    info: {
                        token: {
                            contract_addr: addresses.anchor_token_addr,
                        }
                    },
                    amount: anc_amount
                },
                {
                    info: {
                        native_token: {
                            denom: "uusd"
                        }
                    },
                    amount: stable_amount
                }
            ]
        }
    }, [new Coin("uusd", stable_amount)]);
}

async function query_basset_vault_strategy_addr(lcd_client: LCDClient, basset_vault_addr: string): Promise<string> {
    const config = await lcd_client.wasm.contractQuery(basset_vault_addr, {
        config: {},
    }) as {
        basset_vault_strategy_contract_addr: string,
    }; 
    return config.basset_vault_strategy_contract_addr;
}

export async function withdraw_all_on_negative_profit(lcd_client: LCDClient, _sender: Wallet, addresses_holder_addr: string) {
    const addresses = await get_addresses(lcd_client, addresses_holder_addr);

    const anchor_market_addr = addresses.anchor_market_addr;
    const bluna_token_addr = addresses.bluna_token_addr;
    const bluna_hub_addr = addresses.bluna_hub_addr;

    const borrow_apr = await query_anchor_borrow_net_apr(lcd_client, addresses);
    const earn_apr = await query_anchor_earn_apr(lcd_client, addresses);
    const anchor_apr = borrow_apr + earn_apr;
    assert(anchor_apr > 0);

    const basset_vault_strategy_addr = await query_basset_vault_strategy_addr(lcd_client, addresses.basset_vault_for_bluna_addr);

    const borrow_action = await lcd_client.wasm.contractQuery(basset_vault_strategy_addr, {
        borrower_action: {
            basset_in_contract_address: "10000000000",
            borrowed_amount: "0",
            locked_basset_amount: "0",
        },
    });

    console.log(borrow_action);
}

export async function anchor_apr_calculation(lcd_client: LCDClient, _sender: Wallet, addresses_holder_addr: string) {
    const addresses = await get_addresses(lcd_client, addresses_holder_addr);

    const basset_vault_strategy_addr = await query_basset_vault_strategy_addr(lcd_client, addresses.basset_vault_for_bluna_addr);
    
    const anchor_apr = await lcd_client.wasm.contractQuery(basset_vault_strategy_addr, {
        anchor_apr: {},
    }) as {
        anchor_earn_apr: number,
        anchor_borrow_distribution_apr: number,
        anchor_borrow_interest_apr: number,
    };

    const borrow_apr = await query_anchor_borrow_net_apr(lcd_client, addresses);

    let queried_borrow_apr = anchor_apr.anchor_borrow_distribution_apr - anchor_apr.anchor_borrow_interest_apr;
    const borrow_apr_diff = Math.abs(borrow_apr - queried_borrow_apr);
    assert(borrow_apr_diff < 0.0001); // inaccuracy is less than 0,01 %

    const earn_apr = await query_anchor_earn_apr(lcd_client, addresses);

    const earn_apr_diff = Math.abs(earn_apr - anchor_apr.anchor_earn_apr);
    assert(earn_apr_diff < 0.0001); // inaccuracy is less than 0,01 %

    console.log(`Apr calculation test passed:\n\tEarn apr. Expected: ${earn_apr}, calculated: ${anchor_apr.anchor_earn_apr}\n\tBorrow apr. Expected: ${borrow_apr}, calculated: ${queried_borrow_apr}`);
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

    //deposit some UST to be able to borrow it
    await deposit_stable(lcd_client, sender, anchor_market_info.contract_addr, "100000000000000");

    const addresses_holder_config = AddressesHolderConfig(anchor_market_info, basset_vault_info_for_bluna, basset_vault_info_for_beth);
    const addresses_holder_addr = await create_contract(lcd_client, sender, "addrs_holder", addresses_holder_wasm, addresses_holder_config);
    
    await provide_liquidity_to_anc_stable_swap(lcd_client, sender, addresses_holder_config);

    await setup_anchor(lcd_client, addresses_holder_config);

    // await execute_contract(lcd_client, sender, addresses_holder_config.anchor_overseer_addr, {
    //     execute_epoch_operations: {}
    // });

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

async function bond_luna(lcd_client: LCDClient, sender: Wallet, bluna_hub_addr: string, amount: number | string) {
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

async function deposit_stable(lcd_client: LCDClient, sender: Wallet, anchor_market_contract: string, amount: any) {
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

async function get_nluna_supply(lcd_client: LCDClient, nluna_token_addr: string) {
    const nluna_token_info: TokenInfoResponse = await lcd_client.wasm.contractQuery(nluna_token_addr,
        {
            token_info: {}
        });
    return +nluna_token_info.total_supply;
}