import { getContractAddress, getContractEvents, LCDClient, Wallet } from "@terra-money/terra.js";
import { Cw20CodeId, TokenConfig } from '../../config';
import { instantiate_contract, instantiate_contract_raw, store_contract } from '../../utils';
import { PrismGovConfig, PrismMarketInfo } from "./config";

// ===================================================
const artifacts_path = "wasm_artifacts";
const path_to_prism_artifacts = `${artifacts_path}/prism`;
const prism_gov_wasm = `${path_to_prism_artifacts}/prism_gov.wasm`;

// ===================================================


export async function init_token(lcd_client: LCDClient, sender: Wallet, code_id: number, init_msg: TokenConfig): Promise<string> {
	let contract_addr = await instantiate_contract(lcd_client, sender, sender.key.accAddress, code_id, init_msg);
	return contract_addr;
}

export async function prism_init(lcd_client: LCDClient, sender: Wallet, cw20_code_id: number) {
	const result = await prism_init_verbose(
		lcd_client,
		sender,
        cw20_code_id
	);
	return result;
}

async function prism_init_verbose(
    lcd_client: LCDClient,
	sender: Wallet,
    cw20_code_id: number
): Promise<PrismMarketInfo> {
    // source: 
    // https://finder.terra.money/mainnet/address/terra1dh9478k2qvqhqeajhn75a2a7dsnf74y5ukregw
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
	console.log(`prism_token instantiated\n\taddress: ${prism_token_addr}`);
	console.log(`=======================`);

    // instantiate prism governance contract (xprism)
    let prism_gov_code_id = await store_contract(lcd_client, sender, prism_gov_wasm)
	console.log(`prism_gov uploaded\n\tcode_id: ${prism_gov_code_id}`);

    let prism_gov_config = PrismGovConfig(prism_token_addr, cw20_code_id);
    // let prism_gov_deployment_addr = await instantiate_contract(
	// 	lcd_client,
	// 	sender,
	// 	sender.key.accAddress,
	// 	prism_gov_code_id,
	// 	prism_gov_config,
	// );

    let init_contract_res = await instantiate_contract_raw(lcd_client, sender, sender.key.accAddress, prism_gov_code_id, prism_gov_config);
	let prism_gov_deployment_addr = getContractAddress(init_contract_res);

    var xprism_token_addr = ''
	let contract_events = getContractEvents(init_contract_res);
	for (let contract_event of contract_events) {		
        let xprism_token_addr_from_contract = contract_event["xprism_token_addr"];
		if (xprism_token_addr_from_contract !== undefined) {
			xprism_token_addr = xprism_token_addr_from_contract;
		}
    }

    console.log(`prism_gov instantiated\n\taddress: ${prism_gov_deployment_addr}`);
	console.log(`=======================`);

    return PrismMarketInfo(
        prism_token_addr,
        prism_gov_deployment_addr,
        prism_gov_config,
        xprism_token_addr
    )
}

