import { LCDClient, LocalTerra, Wallet} from '@terra-money/terra.js';
import {BassetVaultConfig, TokenConfig, BassetVaultStrategyConfig, GovernanceConfig, Cw20CodeId, init_terraswap_factory, PSiTokensOwner, CommunityPoolConfig} from './../config';
import {store_contract, instantiate_contract, execute_contract, create_contract, create_usd_to_token_terraswap_pair, init_basset_vault, create_token_to_token_terraswap_pair} from './../utils';

// ===================================================
const path_to_cosmwasm_artifacts = "/Users/pronvis/terra/cosmwasm-plus/artifacts"
const path_to_basset_vault_artifacts = "/Users/pronvis/terra/nexus/yield-optimizer-contracts/artifacts"
const path_to_services_contracts_artifacts = "/Users/pronvis/terra/nexus/services-contracts/artifacts"
const path_to_terraswap_contracts_artifacts = "/Users/pronvis/terra/terraswap/artifacts"
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

// ===================================================
export let lcd_client = new LocalTerra();
export const deployer = lcd_client.wallets["test1"];
// ===================================================

// ===================================================
// ==================== IMPORTANT ====================
// ===================================================
export const IS_PROD = false;
export const CW20_CODE_ID = 4;
//TODO
export const MULTISIG_ADDR = "multisig account";
export const INITIAL_PSI_TOKENS_OWNER = MULTISIG_ADDR;
// ===================================================
// ===================================================
// ===================================================

async function init_psi_token(lcd_client: LCDClient, sender: Wallet, code_id: number, init_msg: TokenConfig): Promise<string> {
	let contract_addr = await instantiate_contract(lcd_client, sender, sender.key.accAddress, code_id, init_msg);
	console.log(`psi_token instantiated; address: ${contract_addr}`);
	return contract_addr;
}

async function init_governance_contract(init_msg: GovernanceConfig): Promise<string> {
	let contract_addr = await create_contract(lcd_client, deployer, "governance_contract", governance_contract_wasm, init_msg);
	return contract_addr;
}

async function init_basset_vault_strategy(init_msg: BassetVaultStrategyConfig): Promise<string> {
	let contract_addr = await create_contract(lcd_client, deployer, "basset_vault_strategy", basset_vault_strategy_contract_wasm, init_msg);
	return contract_addr;
}

async function init_community_pool(init_msg: CommunityPoolConfig): Promise<string> {
	let contract_addr = await create_contract(lcd_client, deployer, "community_pool", community_pool_contract_wasm, init_msg);
	return contract_addr;
}

//STEPS:
// 1. instantiate governance_contract
// 2. instantiate psi_token, mint 10B
// 3. set psi_token address to governance contract
// 4. instantiate psi_stable_swap_contract
// 5. instantiate basset_vault_strategy
// 6. instantiate basset_vault_config_holder
// 7. instantiate basset_vault
// 8. instantiate nasset_psi_swap_contract
export async function main() {
	//get cw20_code_id
	let cw20_code_id = await Cw20CodeId(lcd_client, deployer);
	console.log(`=======================`);

	// instantiate governance contract_addr
	let governance_config = GovernanceConfig();
	let governance_contract_addr = await init_governance_contract(governance_config);
	console.log(`=======================`);

	// instantiate psi_token
	let token_config = TokenConfig(governance_contract_addr, PSiTokensOwner(deployer));
	let psi_token_addr = await init_psi_token(lcd_client, deployer, cw20_code_id, token_config);
	console.log(`=======================`);

	// set psi token addr to governance contract
	await execute_contract(lcd_client, deployer, governance_contract_addr, 
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
	console.log(`psi_token address setted in governance contract`);
	console.log(`=======================`);
	
	// instantiate psi_stable_swap_contract
	let terraswap_factory_contract_addr = await init_terraswap_factory(lcd_client, deployer, cw20_code_id);
	let psi_stable_swap_contract = await create_usd_to_token_terraswap_pair(lcd_client, deployer, terraswap_factory_contract_addr, psi_token_addr);
	console.log(`psi_stable_swap_contract created\n\taddress: ${psi_stable_swap_contract.pair_contract_addr}\n\tlp token address: ${psi_stable_swap_contract.liquidity_token_addr}`);
	console.log(`=======================`);

	// instantiate basset_vault_strategy
	let basset_vault_strategy_config = BassetVaultStrategyConfig(governance_contract_addr);
	let basset_vault_strategy_contract_addr = await init_basset_vault_strategy(basset_vault_strategy_config);
	console.log(`=======================`);
	
	// instantiate community_pool
	let community_pool_config = CommunityPoolConfig(governance_contract_addr, psi_token_addr);
	let community_pool_contract_addr = await init_community_pool(community_pool_config);
	console.log(`=======================`);
	
	// instantiate basset_vault
	let nasset_token_code_id = await store_contract(lcd_client, deployer, nasset_token_wasm);
	console.log(`nasset_token uploaded; code_id: ${nasset_token_code_id}`);
	console.log(`=======================`);
	let nasset_token_config_holder_code_id = await store_contract(lcd_client, deployer, nasset_token_config_holder_wasm);
	console.log(`nasset_token_config_holder uploaded; code_id: ${nasset_token_config_holder_code_id}`);
	console.log(`=======================`);
	let nasset_token_rewards_code_id = await store_contract(lcd_client, deployer, nasset_token_rewards_wasm);
	console.log(`nasset_token_rewards uploaded; code_id: ${nasset_token_rewards_code_id}`);
	console.log(`=======================`);
	let psi_distributor_code_id = await store_contract(lcd_client, deployer, psi_distributor_wasm);
	console.log(`psi_distributor uploaded; code_id: ${psi_distributor_code_id}`);
	console.log(`=======================`);

	let basset_vault_config = BassetVaultConfig(governance_contract_addr, community_pool_contract_addr, nasset_token_code_id, nasset_token_config_holder_code_id, nasset_token_rewards_code_id, psi_distributor_code_id, psi_token_addr, psi_stable_swap_contract.pair_contract_addr, basset_vault_strategy_contract_addr);
	let basset_vault_info = await init_basset_vault(lcd_client, deployer, basset_vault_wasm, basset_vault_config);
	console.log(`basset_vault instantiated\n\taddress: ${basset_vault_info.addr}\n\tnasset_token address: ${basset_vault_info.nasset_token_addr}\n\tnasset_token_config_holder address: ${basset_vault_info.nasset_token_config_holder_addr}\n\tnasset_token_rewards address: ${basset_vault_info.nasset_token_rewards_addr}\n\tpsi_distributor address: ${basset_vault_info.psi_distributor_addr}`);
	console.log(`=======================`);

	// instantiate nasset_psi_swap_contract
	let nasset_psi_swap_contract = await create_token_to_token_terraswap_pair(lcd_client, deployer, terraswap_factory_contract_addr, basset_vault_info.nasset_token_addr, psi_token_addr);
	console.log(`nasset_psi_swap_contract created\n\taddress: ${nasset_psi_swap_contract.pair_contract_addr}\n\tlp token address: ${nasset_psi_swap_contract.liquidity_token_addr}`);
	console.log(`=======================`);
}
