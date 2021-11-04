import {Coin, LCDClient, Wallet} from '@terra-money/terra.js';
import {
	create_contract,
	create_usd_to_token_terraswap_pair,
	execute_contract,
	instantiate_contract,
	store_contract
} from '../../utils';
import {
	AnchorCustodyBassetConfig,
	AnchorDistrConfig,
	AnchorHubBLunaConfig,
	AnchorInterestConfig,
	AnchorLiquidationConfig,
	AnchorMarkerConfig,
	AnchorMarketInfo,
	AnchorOracleConfig,
	AnchorOverseerConfig,
	BassetRewardConfig,
	BassetTokenConfig,
	BethRewardConfig,
	BethTokenConfig
} from './config';
import {Cw20CodeId, init_terraswap_factory, TokenConfig} from '../../config';

//=============================================================================
const artifacts_path = "wasm_artifacts";
const path_to_anchor_mm_artifacts = `${artifacts_path}/anchor/mm`;
const path_to_anchor_basset_artifacts = `${artifacts_path}/anchor/basset`;
const path_to_anchor_beth_artifacts = `${artifacts_path}/anchor/beth`;
//=============================================================================
const anchor_market_wasm = `${path_to_anchor_mm_artifacts}/moneymarket_market.wasm`;
const anchor_oracle_wasm = `${path_to_anchor_mm_artifacts}/moneymarket_oracle.wasm`;
const anchor_liquidation_wasm = `${path_to_anchor_mm_artifacts}/moneymarket_liquidation.wasm`;
const anchor_distribution_model_wasm = `${path_to_anchor_mm_artifacts}/moneymarket_distribution_model.wasm`;
const anchor_interest_model_wasm = `${path_to_anchor_mm_artifacts}/moneymarket_interest_model.wasm`;
const anchor_overseer_wasm = `${path_to_anchor_mm_artifacts}/moneymarket_overseer.wasm`;
const anchor_custody_bluna_wasm = `${path_to_anchor_mm_artifacts}/moneymarket_custody_bluna.wasm`;
const anchor_custody_beth_wasm = `${path_to_anchor_mm_artifacts}/moneymarket_custody_beth.wasm`;
//=============================================================================
const anchor_basset_hub_wasm = `${path_to_anchor_basset_artifacts}/anchor_basset_hub.wasm`;
const anchor_basset_reward_wasm = `${path_to_anchor_basset_artifacts}/anchor_basset_reward.wasm`;
const anchor_basset_token_wasm = `${path_to_anchor_basset_artifacts}/anchor_basset_token.wasm`;
//=============================================================================
const anchor_beth_reward_wasm = `${path_to_anchor_beth_artifacts}/anchor_beth_reward.wasm`;
const anchor_beth_token_wasm = `${path_to_anchor_beth_artifacts}/anchor_beth_token.wasm`;

//STEPS:
// 1. deploy cw20 tokens
// 1.1 store cw20 contract
// 1.2 instantiate ANC_token
// 1.3 instantiate aterra_token
// 2. deploy Market
// 3. deploy InterestModel
// 4. deploy Oracle
// 5. deploy Liquidation
// 6. deploy Distribution model
// 7. deploy Overseer
// 8. deploy Interest model
// 9. register all contracts in Market
// 10. deploy acn_stable_swap
// 11. deploy anchor_custody_contract for bLuna (reward_contract = bAsset_vault_contract will be set after its instantiation)
// 11.0 Store anchor_basset_hub
// 11.1 Instantiate anchor_bAsset_hub (bLuna)
// 11.2 Deploy anchor_bAsset_reward (bLuna)
// 11.3 Deploy anchor_bAsset_token (bLuna)
// 11.4 Deploy moneymarket_custody_bluna
// 12. deploy anchor_custody_contract for bEth (reward_contract = bAsset_vault_contract will be set after its instantiation)
// 12.0 Check whether step 11.0 is done
// 12.1 Instantiate anchor_bAsset_hub (bEth)
// 12.2 Deploy anchor_bEth_rewards
// 12.3 Deploy anchor_bEth_token
// 12.4 Deploy moneymarket_custody_bEth

export async function init_token(lcd_client: LCDClient, sender: Wallet, code_id: number, init_msg: TokenConfig): Promise<string> {
	let contract_addr = await instantiate_contract(lcd_client, sender, sender.key.accAddress, code_id, init_msg);
	return contract_addr;
}

export async function anchor_init(lcd_client: LCDClient, sender: Wallet): Promise<AnchorMarketInfo> {

	//deploy cw20_code_id
	let cw20_code_id = await Cw20CodeId(lcd_client, sender);
	console.log(`=======================`);

	let anchor_token_config = {
		name: "Anchor governance token",
		symbol: "ANC",
		decimals: 6,
		initial_balances: [],
	};

	let anchor_token_addr = await init_token(lcd_client, sender, cw20_code_id, anchor_token_config);
	console.log(`anchor_token instantiated\n\taddress: ${anchor_token_addr}`);
	console.log(`=======================`);

	let aterra_token_config = {
		name: "Anchor Terra USD",
		symbol: "aUST",
		decimals: 6,
		initial_balances: [],
	};

	let aterra_token_addr = await init_token(lcd_client, sender, cw20_code_id, aterra_token_config);
	console.log(`aterra_token instantiated\n\taddress: ${aterra_token_addr}`);
	console.log(`=======================`);

	console.log(`Instantiating Anchor contracts...\n\t`);

	//instantiate Market
	let anchor_market_code_id = await store_contract(lcd_client, sender, anchor_market_wasm);
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
	let anchor_interest_model_config = AnchorInterestConfig(sender);
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

	// instantiate ANC-UST pair contract
	let terraswap_factory_contract_addr = await init_terraswap_factory(lcd_client, sender, cw20_code_id);
	let anc_ust_pair_contract = await create_usd_to_token_terraswap_pair(lcd_client, sender, terraswap_factory_contract_addr, anchor_token_addr);
	console.log(`ANC-UST pair contract instantiated\n\taddress: ${anc_ust_pair_contract.pair_contract_addr}\n\tlp token address: ${anc_ust_pair_contract.liquidity_token_addr}`);
	console.log(`=======================`);

	//deploy anchor_custody_contract for bLuna
	let anchor_basset_hub_code_id = await store_contract(lcd_client, sender, anchor_basset_hub_wasm);
	let anchor_basset_hub_bluna_config = AnchorHubBLunaConfig();
	let anchor_basset_hub_bluna_addr = await instantiate_contract(
		lcd_client,
		sender,
		sender.key.accAddress,
		anchor_basset_hub_code_id,
		anchor_basset_hub_bluna_config,
		[new Coin("uluna", 100_000_000)]
	);
	console.log(`anchor_basset_hub_bluna instantiated\n\taddress: ${anchor_basset_hub_bluna_addr}`);
	console.log(`=======================`);

	let basset_reward_config = BassetRewardConfig(anchor_basset_hub_bluna_addr);
	let basset_reward_addr = await create_contract(
		lcd_client,
		sender,
		"basset_reward",
		anchor_basset_reward_wasm,
		basset_reward_config
	);
	console.log(`=======================`);

	let basset_token_config = BassetTokenConfig(anchor_basset_hub_bluna_addr, sender.key.accAddress);
	let basset_token_addr = await create_contract(
		lcd_client,
		sender,
		"basset_token",
		anchor_basset_token_wasm,
		basset_token_config
	);
	console.log(`=======================`);

	let anchor_custody_bluna_config = AnchorCustodyBassetConfig(
		sender.key.accAddress,
		basset_token_addr,
		anchor_overseer_addr,
		anchor_market_addr,
		basset_reward_addr,
		anchor_liquidation_addr,
		"bLuna",
		"BLUNA"
	);
	let anchor_custody_bluna_addr = await create_contract(
		lcd_client,
		sender,
		"bluna_custody",
		anchor_custody_bluna_wasm,
		anchor_custody_bluna_config
	);
	console.log(`=======================`);

	//deploy anchor_custody_contract for bEth
	let beth_reward_config = BethRewardConfig(sender.key.accAddress);
	let beth_reward_addr = await create_contract(
		lcd_client,
		sender,
		"beth_reward",
		anchor_beth_reward_wasm,
		beth_reward_config
	);
	console.log(`=======================`);

	let beth_token_config = BethTokenConfig(beth_reward_addr, sender.key.accAddress);
	let beth_token_addr = await create_contract(
		lcd_client,
		sender,
		"beth_token",
		anchor_beth_token_wasm,
		beth_token_config
	);
	console.log(`=======================`);

	let anchor_custody_beth_config = AnchorCustodyBassetConfig(
		sender.key.accAddress,
		beth_token_addr,
		anchor_overseer_addr,
		anchor_market_addr,
		beth_reward_addr,
		anchor_liquidation_addr,
		"bETH",
		"BETH"
	);
	let anchor_custody_beth_addr = await create_contract(
		lcd_client,
		sender,
		"beth_custody",
		anchor_custody_beth_wasm,
		anchor_custody_beth_config
	);
	console.log(`=======================`);

	return AnchorMarketInfo(
		anchor_market_addr,
		anchor_overseer_addr,
		anchor_token_addr,
		aterra_token_addr,
		anc_ust_pair_contract.pair_contract_addr,
		basset_token_addr,
		beth_token_addr,
		anchor_custody_bluna_addr,
		anchor_custody_beth_addr
	);
}
