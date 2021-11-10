import {BlockTxBroadcastResult, Coin, LCDClient, Wallet} from '@terra-money/terra.js';
import {full_init as full_basset_vault_init} from "../../basset_vault/definition";
import {anchor_init} from "../deploy_anchor/definition";
import {execute_contract, sleep} from "../../utils";
import {LOCALTERRA_DEFAULT_VALIDATOR_ADDR} from "../deploy_anchor/config"
import {isTxSuccess} from "../../transaction";

//STEPS
// 1. Deploy anchor_market_contracts
// 2. Deploy basset_vault_init

export async function init(lcd_client: LCDClient, sender: Wallet, psi_token_initial_owner: string) {

    const anchor_market_info = await anchor_init(lcd_client, sender);
    let [basset_vault_info_for_bluna, basset_vault_info_for_beth] = await full_basset_vault_init(lcd_client, sender, psi_token_initial_owner, anchor_market_info);

    const oracle_addr = anchor_market_info.oracle_addr;
    const bluna_hub_addr = anchor_market_info.basset_hub_addr;
    const bluna_token_addr = anchor_market_info.bluna_token_addr;
    const beth_token_addr = anchor_market_info.beth_token_addr;

    await register_basset_price_feeder(lcd_client, sender, oracle_addr, bluna_token_addr);
    await register_basset_price_feeder(lcd_client, sender, oracle_addr, beth_token_addr);

    await feed_price(lcd_client, sender, oracle_addr, bluna_token_addr, 1.0);
    await feed_price(lcd_client, sender, oracle_addr, beth_token_addr, 10.0);

    await bond_and_send_luna(lcd_client, sender, bluna_token_addr, bluna_hub_addr, basset_vault_info_for_bluna.addr, 100);
    console.log(`============check===========`);
    let borrower_response = await lcd_client.wasm.contractQuery(anchor_market_info.contract_addr, {
        borrower_info: {
            borrower: basset_vault_info_for_bluna.addr,
        }
    });
    console.log(`borrower_response - ${JSON.stringify(borrower_response)}`);

    let nluna_vault_balance = await lcd_client.wasm.contractQuery(basset_vault_info_for_bluna.nasset_token_addr, {
        balance: {
            address: sender.key.accAddress,
        }
    });
    console.log(`nluna_vault_balance - ${JSON.stringify(nluna_vault_balance)}`);
}

async function register_basset_price_feeder(lcd_client: LCDClient, sender: Wallet, oracle_addr: string, basset_token_addr: string) {
    await execute_contract(lcd_client, sender, oracle_addr, {
        register_feeder: {
            asset: basset_token_addr,
            feeder: sender.key.accAddress
        }
    });
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

async function bond_and_send_luna(lcd_client: LCDClient, sender: Wallet, bluna_token_addr: string, bluna_hub_addr: string, recipient_addr: string, amount: number) {
    await execute_contract(lcd_client, sender, bluna_hub_addr,
        {
            bond: {
                validator: LOCALTERRA_DEFAULT_VALIDATOR_ADDR,
            }
        },
        [new Coin("uluna", amount.toString())]
    );

    const deposit_msg = {deposit: {}};

    const result = await execute_contract(lcd_client, sender, bluna_token_addr, {
        send: {
            contract: recipient_addr,
            amount: amount.toString(),
            msg: Buffer.from(JSON.stringify(deposit_msg)).toString('base64'),
        }
    });

    return result;
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

async function honest_work(lcd_client: LCDClient, sender: Wallet, basset_vault_addr: string): Promise<BlockTxBroadcastResult> {
    const honest_work_msg = {
        anyone: {
            anyone_msg: {
                honest_work: {}
            }
        }
    };

    while (true) {
        let result = await execute_contract(lcd_client, sender, basset_vault_addr, honest_work_msg);
        if (result !== undefined && isTxSuccess(result)) {
            return result;
        } else {
            await sleep(1000);
        }
    }
}
