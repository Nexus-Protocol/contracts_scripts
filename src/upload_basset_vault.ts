import {LCDClient, LocalTerra, Wallet} from '@terra-money/terra.js';
import {BassetVaultConfig, BassetVaultConfigHolderConfig, TokenConfig, BassetVaultStrategyConfig, GovernanceConfig, terraswap_factory_contract_addr} from './config';
import {store_contract, instantiate_contract, execute_contract, create_contract, create_psi_usd_terraswap_pair} from './utils';

// ===================================================
const path_to_basset_vault_artifacts = "/Users/pronvis/terra/nexus/yield-optimizer-contracts/artifacts"
const path_to_services_contracts_artifacts = "/Users/pronvis/terra/nexus/services-contracts/artifacts"
// ===================================================
const governance_contract_wasm = `${path_to_services_contracts_artifacts}/nexus_governance.wasm`;
const basset_vault_strategy_contract_wasm = `${path_to_basset_vault_artifacts}/basset_vault_basset_vault_strategy.wasm`;
const basset_vault_config_holder_contract_wasm = `${path_to_basset_vault_artifacts}/basset_vault_basset_vault_config_holder.wasm`;
const basset_vault_wasm = `${path_to_basset_vault_artifacts}/basset_vault_basset_vault.wasm`;
const nasset_token_wasm = `${path_to_basset_vault_artifacts}/basset_vault_nasset_token.wasm`;
const nasset_token_config_holder_wasm = `${path_to_basset_vault_artifacts}/basset_vault_nasset_config_holder.wasm`;
const nasset_token_rewards_wasm = `${path_to_basset_vault_artifacts}/basset_vault_nasset_rewards.wasm`;
const psi_distributor_wasm = `${path_to_basset_vault_artifacts}/basset_vault_psi_distributor.wasm`;
// ===================================================

// ===================================================
let lcd_client = new LocalTerra();
const deployer = lcd_client.wallets["test1"];
// ===================================================

// ===================================================
// ==================== IMPORTANT ====================
// ===================================================
export const IS_PROD = false;
const cw20_code_id = 4;
const initial_psi_tokens_owner = "multisig account";
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

async function init_basset_vault_config_holder(init_msg: BassetVaultConfigHolderConfig): Promise<string> {
	let contract_addr = await create_contract(lcd_client, deployer, "basset_vault_config_holder", basset_vault_config_holder_contract_wasm, init_msg);
	return contract_addr;
}

async function init_basset_vault(init_msg: BassetVaultConfig): Promise<string> {
	let contract_addr = await create_contract(lcd_client, deployer, "basset_vault", basset_vault_wasm, init_msg);
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
async function main() {
	// instantiate governance contract_addr
	let governance_config = GovernanceConfig();
	let governance_contract_addr = await init_governance_contract(governance_config);
	console.log(`=======================`);

	// instantiate psi_token
	let token_config = TokenConfig(governance_contract_addr, initial_psi_tokens_owner);
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
	let psi_stable_swap_contract = await create_psi_usd_terraswap_pair(lcd_client, deployer, terraswap_factory_contract_addr(), psi_token_addr);
	console.log(`psi_stable_swap_contract created; address: ${psi_stable_swap_contract.pair_contract_addr}, lp token address: ${psi_stable_swap_contract.liquidity_token_addr}`);
	console.log(`=======================`);

	// instantiate basset_vault_strategy
	let basset_vault_strategy_config = BassetVaultStrategyConfig(governance_contract_addr);
	let basset_vault_strategy_contract_addr = await init_basset_vault_strategy(basset_vault_strategy_config);
	console.log(`=======================`);
	
	// instantiate basset_vault_config_holder
	let basset_vault_config_holder_config = BassetVaultConfigHolderConfig(governance_contract_addr, psi_token_addr, psi_stable_swap_contract.pair_contract_addr, basset_vault_strategy_contract_addr);
	let basset_vault_config_holder_contract_addr = await init_basset_vault_config_holder(basset_vault_config_holder_config);
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

	let basset_vault_config = BassetVaultConfig(governance_contract_addr, basset_vault_config_holder_contract_addr, nasset_token_code_id, nasset_token_config_holder_code_id, nasset_token_rewards_code_id, psi_distributor_code_id);
	await init_basset_vault(basset_vault_config);
	console.log(`=======================`);
}

main()
    .then(text => {
        console.log(text);
    })
	.catch(err => {
        console.log(err);
    });
