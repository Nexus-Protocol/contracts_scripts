import { LCDClient, Wallet, Coin} from '@terra-money/terra.js';
import {
	store_contract,
	execute_contract,
	create_contract,
	instantiate_contract
} from './../utils';
import { AnchorDistrConfig, AnchorInterstConfig, AnchorLiquidationConfig, AnchorMarkerConfig, AnchorOracleConfig, AnchorOverseerConfig } from './config';
import {Cw20CodeId, TokenConfig} from './../config';

const path_to_anchor_artifacts = "/Users/qdo_ln/terra/nexus/contracts_scripts/wasm_artifacts/anchor/mm/moneymarket_";

const anchor_market_wasm = `${path_to_anchor_artifacts}market.wasm`;
const anchor_oracle_wasm = `${path_to_anchor_artifacts}oracle.wasm`;
const anchor_liquidation_wasm = `${path_to_anchor_artifacts}liquidation.wasm`;
const anchor_distribution_model_wasm = `${path_to_anchor_artifacts}distribution_model.wasm`;
const anchor_interest_model_wasm = `${path_to_anchor_artifacts}interest_model.wasm`;
const anchor_overseer_wasm = `${path_to_anchor_artifacts}overseer.wasm`;

//STEPS:
// 1. deploy cw20 token
// 2. deploy Market
// 3. deploy InterestModel
// 4. deploy Oracle
// 5. deploy Liquidation
// 6. deploy Distribution model
// 7. deploy Overseer
// 8. deploy Interest model
// 9. register all contracts in Market

export async function init_anc_token(lcd_client: LCDClient, sender: Wallet, code_id: number, init_msg: TokenConfig): Promise<string> {
	let contract_addr = await instantiate_contract(lcd_client, sender, sender.key.accAddress, code_id, init_msg);
	console.log(`anc_token instantiated\n\taddress: ${contract_addr}`);
	return contract_addr;
}

export async function anchor_init(lcd_client: LCDClient, sender: Wallet){

	//deploy cw20_code_id
	let cw20_code_id = await Cw20CodeId(lcd_client, sender);
	console.log(`=======================`);

	let anchor_token_config = {
		name: "Anchor Terra USD",
		symbol: "aUST",
		decimals: 6,
		initial_balances: [],
	};
	let anc_token_addr = await init_anc_token(lcd_client, sender, cw20_code_id, anchor_token_config);
	console.log(`=======================`);

	console.log(`Instantiating Anchor contracts...\n\t`);

	//instantiate Market
	let anchor_market_code_id = await store_contract(lcd_client, sender, anchor_market_wasm );
	console.log(`anchor_market uploaded\n\tcode_id: ${anchor_market_code_id}`);
	let anchor_market_config = AnchorMarkerConfig(sender, cw20_code_id);

	let anchor_market_addr = await instantiate_contract(
		lcd_client,
		sender,
		sender.key.accAddress,
		anchor_market_code_id,
		anchor_market_config,
		[new Coin("uusd", 1_000_000)],
	);
	console.log(`anchor_market instantiated\n\taddress: ${anchor_market_addr}`);
	console.log(`=======================`);
	//instantiate oracle
	let anchor_oracle_config = AnchorOracleConfig(sender);
	let anchor_oracle_addr = await create_contract(lcd_client, sender, "anchor_oracle", anchor_oracle_wasm, anchor_oracle_config);
	console.log(`=======================`);
	//instantiate liquidation
	let anchor_liquidation_config = AnchorLiquidationConfig(sender, anchor_oracle_addr);
	let anchor_liquidation_addr = await create_contract(lcd_client, sender, "anchor_liquidation", anchor_liquidation_wasm, anchor_liquidation_config);
	console.log(`=======================`);
	//instantiate distribution
	let anchor_distribution_model_config = AnchorDistrConfig(sender);
	let anchor_distribution_model_addr = await create_contract(lcd_client, sender, "anchor_distribution_model", anchor_distribution_model_wasm, anchor_distribution_model_config);
	console.log(`=======================`);
	//instantiate overseer
	let anchor_overseer_config = AnchorOverseerConfig(sender, anchor_liquidation_addr, anchor_market_addr, anchor_oracle_addr);
	let anchor_overseer_addr = await create_contract(lcd_client, sender, "anchor_overseer", anchor_overseer_wasm, anchor_overseer_config);
	console.log(`=======================`);

	//instantiate interest model
	let anchor_interest_model_config = AnchorInterstConfig(sender);
	let anchor_interest_model_addr = await create_contract(lcd_client, sender, "anchor_interest_model", anchor_interest_model_wasm, anchor_interest_model_config);
	console.log(`=======================`);

	await execute_contract(lcd_client, sender, anchor_market_addr,
		{
				register_contracts: {
					overseer_contract: anchor_overseer_addr,
					interest_model: anchor_interest_model_addr,
					distribution_model: anchor_distribution_model_addr,
					collector_contract: sender.key.accAddress,
					distributor_contract: anchor_distribution_model_addr,
					}
				}
	);
	console.log(`contracts have been registered`);
	console.log(`=======================`);
}
