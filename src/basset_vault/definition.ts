import {LCDClient, Wallet} from '@terra-money/terra.js';
import {
	BassetVaultConfigForbEth,
	BassetVaultConfigForbLuna,
	BassetVaultStrategyConfigForbEth,
	BassetVaultStrategyConfigForbLuna,
	CommunityPoolConfig,
	Cw20CodeId,
	GovernanceConfig,
	init_terraswap_factory,
	PSiTokensOwner,
	TokenConfig
} from './../config';
import {
	create_contract,
	create_usd_to_token_terraswap_pair,
	execute_contract,
	init_basset_vault,
	instantiate_contract,
	store_contract
} from './../utils';
import {AnchorMarketInfo} from "../integration_tests/deploy_anchor/config";

// ===================================================
const artifacts_path = "wasm_artifacts";
const path_to_cosmwasm_artifacts = `${artifacts_path}/cosmwasm_plus`
const path_to_basset_vault_artifacts = `${artifacts_path}/nexus/basset_vaults`
const path_to_services_contracts_artifacts = `${artifacts_path}/nexus/services`
const path_to_terraswap_contracts_artifacts = `${artifacts_path}/terraswap`
// ===================================================
export const cw20_contract_wasm = `${path_to_cosmwasm_artifacts}/cw20_base.wasm`;
export const terraswap_factory_wasm = `${path_to_terraswap_contracts_artifacts}/terraswap_factory.wasm`;
export const terraswap_pair_wasm = `${path_to_terraswap_contracts_artifacts}/terraswap_pair.wasm`;
// ===================================================
const governance_contract_wasm = `${path_to_services_contracts_artifacts}/nexus_governance.wasm`;
const basset_vault_strategy_contract_wasm = `${path_to_basset_vault_artifacts}/basset_vault_basset_vault_strategy.wasm`;
const community_pool_contract_wasm = `${path_to_services_contracts_artifacts}/nexus_community.wasm`;
export const vesting_contract_wasm = `${path_to_services_contracts_artifacts}/nexus_vesting.wasm`;
export const airdrop_contract_wasm = `${path_to_services_contracts_artifacts}/nexus_airdrop.wasm`;
export const staking_contract_wasm = `${path_to_services_contracts_artifacts}/nexus_staking.wasm`;
const basset_vault_wasm = `${path_to_basset_vault_artifacts}/basset_vault_basset_vault.wasm`;
const nasset_token_wasm = `${path_to_basset_vault_artifacts}/basset_vault_nasset_token.wasm`;
const nasset_token_config_holder_wasm = `${path_to_basset_vault_artifacts}/basset_vault_nasset_config_holder.wasm`;
const nasset_token_rewards_wasm = `${path_to_basset_vault_artifacts}/basset_vault_nasset_rewards.wasm`;
const psi_distributor_wasm = `${path_to_basset_vault_artifacts}/basset_vault_psi_distributor.wasm`;
// ===================================================

async function init_psi_token(lcd_client: LCDClient, sender: Wallet, code_id: number, init_msg: TokenConfig): Promise<string> {
	let contract_addr = await instantiate_contract(lcd_client, sender, sender.key.accAddress, code_id, init_msg);
	console.log(`psi_token instantiated\n\taddress: ${contract_addr}`);
	return contract_addr;
}

async function init_governance_contract(lcd_client: LCDClient, sender: Wallet, init_msg: GovernanceConfig): Promise<string> {
	let contract_addr = await create_contract(lcd_client, sender, "governance_contract", governance_contract_wasm, init_msg);
	return contract_addr;
}

async function init_community_pool(lcd_client: LCDClient, sender: Wallet, init_msg: CommunityPoolConfig): Promise<string> {
	let contract_addr = await create_contract(lcd_client, sender, "community_pool", community_pool_contract_wasm, init_msg);
	return contract_addr;
}

//STEPS:
// 1. instantiate governance_contract
// 2. instantiate psi_token, mint 10B
// 3. set psi_token address to governance contract
// 4. instantiate Psi-UST pair contract
// 5. instantiate basset_vault_strategy
// 6. instantiate basset_vault_config_holder
// 7. instantiate basset_vault
// 8. instantiate Psi-nAsset pair contract
export async function full_init(lcd_client: LCDClient, sender: Wallet, psi_token_initial_owner: string, anchor_market_info?: AnchorMarketInfo) {
	//get cw20_code_id
	let cw20_code_id = await Cw20CodeId(lcd_client, sender);
	console.log(`=======================`);

	// instantiate governance contract_addr
	let governance_config = GovernanceConfig(lcd_client);
	let governance_contract_addr = await init_governance_contract(lcd_client, sender, governance_config);
	console.log(`=======================`);

	// instantiate psi_token
	let token_config = TokenConfig(lcd_client, governance_contract_addr, PSiTokensOwner(lcd_client, sender, psi_token_initial_owner));
	let psi_token_addr = await init_psi_token(lcd_client, sender, cw20_code_id, token_config);
	console.log(`=======================`);

	// set psi token addr to governance contract
	await execute_contract(lcd_client, sender, governance_contract_addr,
		{
			anyone: {
				anyone_msg: {
					register_token: {
						psi_token: psi_token_addr
					}
				}
			}
		}
	);
	console.log(`psi_token address set in governance contract`);
	console.log(`=======================`);
	
	// instantiate Psi-UST pair contract
	let terraswap_factory_contract_addr = await init_terraswap_factory(lcd_client, sender, cw20_code_id);
	let psi_ust_pair_contract = await create_usd_to_token_terraswap_pair(lcd_client, sender, terraswap_factory_contract_addr, psi_token_addr);
	console.log(`Psi-UST pair contract instantiated\n\taddress: ${psi_ust_pair_contract.pair_contract_addr}\n\tlp token address: ${psi_ust_pair_contract.liquidity_token_addr}`);
	console.log(`=======================`);
	
	// instantiate community_pool
	let community_pool_config = CommunityPoolConfig(lcd_client, governance_contract_addr, psi_token_addr);
	let community_pool_contract_addr = await init_community_pool(lcd_client, sender, community_pool_config);
	console.log(`=======================`);
	
	// upload contracts for basset_vault
	let nasset_token_code_id = await store_contract(lcd_client, sender, nasset_token_wasm);
	console.log(`nasset_token uploaded\n\tcode_id: ${nasset_token_code_id}`);
	console.log(`=======================`);
	let nasset_token_config_holder_code_id = await store_contract(lcd_client, sender, nasset_token_config_holder_wasm);
	console.log(`nasset_token_config_holder uploaded\n\tcode_id: ${nasset_token_config_holder_code_id}`);
	console.log(`=======================`);
	let nasset_token_rewards_code_id = await store_contract(lcd_client, sender, nasset_token_rewards_wasm);
	console.log(`nasset_token_rewards uploaded\n\tcode_id: ${nasset_token_rewards_code_id}`);
	console.log(`=======================`);
	let psi_distributor_code_id = await store_contract(lcd_client, sender, psi_distributor_wasm);
	console.log(`psi_distributor uploaded\n\tcode_id: ${psi_distributor_code_id}`);
	console.log(`=======================`);

	let basset_vault_strategy_code_id = await store_contract(lcd_client, sender, basset_vault_strategy_contract_wasm);
	console.log(`basset_vault_strategy uploaded\n\tcode_id: ${basset_vault_strategy_code_id}`);
	let basset_vault_code_id = await store_contract(lcd_client, sender, basset_vault_wasm);
	console.log(`basset_vault uploaded\n\tcode_id: ${basset_vault_code_id}`);
	console.log(`=======================`);
	// bLUNA
	let basset_vault_info_for_bluna;
	{
		// instantiate basset_vault_strategy for bLuna
		let basset_vault_strategy_config_for_bluna = BassetVaultStrategyConfigForbLuna(lcd_client, governance_contract_addr);

		if (anchor_market_info != null && anchor_market_info !== undefined) {
			basset_vault_strategy_config_for_bluna.basset_token_addr = anchor_market_info.bluna_token_addr;
			basset_vault_strategy_config_for_bluna.oracle_contract_addr = anchor_market_info.oracle_addr;
		}

		let basset_vault_strategy_contract_addr_for_bluna = await instantiate_contract(lcd_client, sender, sender.key.accAddress, basset_vault_strategy_code_id, basset_vault_strategy_config_for_bluna);
		console.log(`basset_vault_strategy_for_bluna instantiated\n\taddress: ${basset_vault_strategy_contract_addr_for_bluna}`);
		console.log(`=======================`);

		// instantiate basset_vault for bLuna
		let basset_vault_config_for_bluna = BassetVaultConfigForbLuna(lcd_client, governance_contract_addr, community_pool_contract_addr, nasset_token_code_id, nasset_token_config_holder_code_id, nasset_token_rewards_code_id, psi_distributor_code_id, psi_token_addr, psi_ust_pair_contract.pair_contract_addr, basset_vault_strategy_contract_addr_for_bluna, terraswap_factory_contract_addr);

		if (anchor_market_info !== null && anchor_market_info !== undefined) {
			basset_vault_config_for_bluna.anchor_addr = anchor_market_info.anchor_token_addr;
			basset_vault_config_for_bluna.aterra_addr = anchor_market_info.aterra_token_addr;
			basset_vault_config_for_bluna.a_market_addr = anchor_market_info.contract_addr;
			basset_vault_config_for_bluna.a_overseer_addr = anchor_market_info.overseer_addr;
			basset_vault_config_for_bluna.anc_stable_swap_addr = anchor_market_info.anc_stable_swap_addr;
			basset_vault_config_for_bluna.basset_addr = anchor_market_info.bluna_token_addr;
			basset_vault_config_for_bluna.a_custody_basset_addr = anchor_market_info.bluna_custody_addr;
		}

		basset_vault_info_for_bluna = await init_basset_vault(lcd_client, sender, basset_vault_code_id, basset_vault_config_for_bluna);
		console.log(`basset_vault_for_bluna instantiated\n\taddress: ${basset_vault_info_for_bluna.addr}\n\tnasset_token address: ${basset_vault_info_for_bluna.nasset_token_addr}\n\tnasset_token_config_holder address: ${basset_vault_info_for_bluna.nasset_token_config_holder_addr}\n\tnasset_token_rewards address: ${basset_vault_info_for_bluna.nasset_token_rewards_addr}\n\tpsi_distributor address: ${basset_vault_info_for_bluna.psi_distributor_addr}\n\tnluna_psi_swap_contract_addr: ${basset_vault_info_for_bluna.nasset_psi_swap_contract_addr}`);
		console.log(`=======================`);
	}
	// bETH
	let basset_vault_info_for_beth;
	{
		// instantiate basset_vault_strategy for bETH
		let basset_vault_strategy_config_for_beth = BassetVaultStrategyConfigForbEth(lcd_client, governance_contract_addr);
		if (anchor_market_info != null && anchor_market_info !== undefined) {
			basset_vault_strategy_config_for_beth.basset_token_addr = anchor_market_info.beth_token_addr;
			basset_vault_strategy_config_for_beth.oracle_contract_addr = anchor_market_info.oracle_addr;
		}
		let basset_vault_strategy_contract_addr_for_beth = await instantiate_contract(lcd_client, sender, sender.key.accAddress, basset_vault_strategy_code_id, basset_vault_strategy_config_for_beth);
		console.log(`basset_vault_strategy_for_beth instantiated\n\taddress: ${basset_vault_strategy_contract_addr_for_beth}`);
		console.log(`=======================`);

		// instantiate basset_vault for bETH
		let basset_vault_config_for_beth = BassetVaultConfigForbEth(lcd_client, governance_contract_addr, community_pool_contract_addr, nasset_token_code_id, nasset_token_config_holder_code_id, nasset_token_rewards_code_id, psi_distributor_code_id, psi_token_addr, psi_ust_pair_contract.pair_contract_addr, basset_vault_strategy_contract_addr_for_beth, terraswap_factory_contract_addr);

		if (anchor_market_info !== null && anchor_market_info !== undefined) {
			basset_vault_config_for_beth.anchor_addr = anchor_market_info.anchor_token_addr;
			basset_vault_config_for_beth.aterra_addr = anchor_market_info.aterra_token_addr;
			basset_vault_config_for_beth.a_market_addr = anchor_market_info.contract_addr;
			basset_vault_config_for_beth.a_overseer_addr = anchor_market_info.overseer_addr;
			basset_vault_config_for_beth.anc_stable_swap_addr = anchor_market_info.anc_stable_swap_addr;
			basset_vault_config_for_beth.basset_addr = anchor_market_info.beth_token_addr;
			basset_vault_config_for_beth.a_custody_basset_addr = anchor_market_info.beth_custody_addr;
		}

		basset_vault_info_for_beth = await init_basset_vault(lcd_client, sender, basset_vault_code_id, basset_vault_config_for_beth);
		console.log(`basset_vault_for_beth instantiated\n\taddress: ${basset_vault_info_for_beth.addr}\n\tnasset_token address: ${basset_vault_info_for_beth.nasset_token_addr}\n\tnasset_token_config_holder address: ${basset_vault_info_for_beth.nasset_token_config_holder_addr}\n\tnasset_token_rewards address: ${basset_vault_info_for_beth.nasset_token_rewards_addr}\n\tpsi_distributor address: ${basset_vault_info_for_beth.psi_distributor_addr}\n\tneth_psi_swap_contract_addr: ${basset_vault_info_for_beth.nasset_psi_swap_contract_addr}`);
		console.log(`=======================`);
	}

	return [basset_vault_info_for_bluna, basset_vault_info_for_beth];
}
