import { LCDClient, Wallet } from "@terra-money/terra.js";
import { Cw20CodeId, TokenConfig } from '../../config';
import { create_contract, instantiate_contract } from '../../utils';
import { AddressesHolderConfig } from "../nex_prism/config";
import { PrismMarketInfo } from "./config";

// ===================================================
const addresses_holder_wasm = "wasm_artifacts/utils/addr_holder.wasm";
const artifacts_path = "wasm_artifacts";
const path_to_anchor_mm_artifacts = `${artifacts_path}/anchor/mm`;
const prism_market_wasm = `${path_to_anchor_mm_artifacts}/moneymarket_market.wasm`;

// ===================================================


export async function init_token(lcd_client: LCDClient, sender: Wallet, code_id: number, init_msg: TokenConfig): Promise<string> {
	let contract_addr = await instantiate_contract(lcd_client, sender, sender.key.accAddress, code_id, init_msg);
	return contract_addr;
}

export async function prism_init(lcd_client: LCDClient, sender: Wallet) {
	const result = await prism_init_verbose(
		lcd_client,
		sender
	);
	return result;
}

async function prism_init_verbose(
    lcd_client: LCDClient,
	sender: Wallet,
): Promise<PrismMarketInfo> {
    let cw20_code_id = await Cw20CodeId(lcd_client, sender);
    console.log(`=======================`);

    // source: https://finder.terra.money/mainnet/address/terra1dh9478k2qvqhqeajhn75a2a7dsnf74y5ukregw
    let prism_token_config = {
		name: "Prism governance token",
		symbol: "PRISM",
		decimals: 6,
		initial_balances: [],
		mint: {
			minter: sender.key.accAddress,
		},
	};

	let prism_token_addr = await init_token(lcd_client, sender, cw20_code_id, prism_token_config);
	console.log(`anchor_token instantiated\n\taddress: ${prism_token_addr}`);
	console.log(`=======================`);

    return PrismMarketInfo(
        prism_token_addr
    )
}

export async function prism_nexprism_full_init(
    lcd_client: LCDClient,
    sender: Wallet,
) {
    const prism_market_info = await prism_init(lcd_client, sender);
    // TODO:
    // let [basset_vault_info_for_bluna, basset_vault_info_for_beth] = await full_basset_vault_init(lcd_client, sender, psi_token_initial_owner, anchor_market_info);

    // const oracle_addr = anchor_market_info.oracle_addr;
    // const bluna_token_addr = anchor_market_info.bluna_token_addr;
    // const beth_token_addr = anchor_market_info.beth_token_addr;

    // await register_basset_price_feeder(lcd_client, sender, oracle_addr, bluna_token_addr);
    // await register_basset_price_feeder(lcd_client, sender, oracle_addr, beth_token_addr);

    // await feed_price(lcd_client, sender, oracle_addr, bluna_token_addr, bluna_init_price);
    // await feed_price(lcd_client, sender, oracle_addr, beth_token_addr, beth_init_price);

    const addresses_holder_config = AddressesHolderConfig(prism_market_info);
    const addresses_holder_addr = await create_contract(lcd_client, sender, "addrs_holder", addresses_holder_wasm, addresses_holder_config);

    return addresses_holder_addr;
}