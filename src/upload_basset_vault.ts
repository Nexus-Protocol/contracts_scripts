import {BlockTxBroadcastResult, Coin, Coins, getCodeId, getContractAddress, Key, LCDClient, LocalTerra, Msg, MsgExecuteContract, MsgInstantiateContract, MsgStoreCode, StdFee, Wallet} from '@terra-money/terra.js';
import {BassetVaultConfig, BassetVaultConfigHolderConfig, TokenConfig, BassetVaultStrategyConfig, GovernanceConfig, testnet_BassetVaultStrategyConfig, testnet_BassetVaultConfigHolderConfig, testnet_BassetVaultConfig} from './config';
import {calc_fee_and_send_tx, store_contract, instantiate_contract, execute_contract, create_contract, create_psi_usd_terraswap_pair} from './utils';

let lcd_client = new LocalTerra();
const deployer = lcd_client.wallets["test1"];

const initial_psi_tokens_owner = "multisig account";
const cw20_code_id = 4;
const governance_contract_wasm = "/Users/pronvis/terra/nexus/scripts/test-contract/artifacts/test_contract.wasm";
const basset_vault_strategy_contract_wasm = "/Users/pronvis/terra/nexus/scripts/test-contract/artifacts/test_contract.wasm";
const basset_vault_config_holder_contract_wasm = "/Users/pronvis/terra/nexus/scripts/test-contract/artifacts/test_contract.wasm";
const basset_vault_wasm = "/Users/pronvis/terra/nexus/scripts/test-contract/artifacts/test_contract.wasm";
const nasset_token_wasm = "/Users/pronvis/terra/nexus/scripts/test-contract/artifacts/test_contract.wasm";
const nasset_token_config_holder_wasm = "/Users/pronvis/terra/nexus/scripts/test-contract/artifacts/test_contract.wasm";
const nasset_token_rewards_wasm = "/Users/pronvis/terra/nexus/scripts/test-contract/artifacts/test_contract.wasm";
const psi_distributor_wasm = "/Users/pronvis/terra/nexus/scripts/test-contract/artifacts/test_contract.wasm";
const terraswap_factory_contract_addr = "xxxxxxxxxxxx";

async function init_psi_token(lcd_client: LCDClient, sender: Wallet, code_id: number, init_msg: TokenConfig): Promise<string> {
	let contract_addr = await instantiate_contract(lcd_client, sender, sender.key.accAddress, code_id, init_msg);
	console.log(`psi_token instantiated; address: ${contract_addr}`);
	return contract_addr;
}

async function init_governance_contract(wasm_path: string, init_msg: GovernanceConfig): Promise<string> {
	let contract_addr = await create_contract(lcd_client, deployer, "governance_contract", wasm_path, init_msg);
	return contract_addr;
}

async function init_basset_vault_strategy(wasm_path: string, init_msg: BassetVaultStrategyConfig): Promise<string> {
	let contract_addr = await create_contract(lcd_client, deployer, "basset_vault_strategy", wasm_path, init_msg);
	return contract_addr;
}

async function init_basset_vault_config_holder(wasm_path: string, init_msg: BassetVaultConfigHolderConfig): Promise<string> {
	let contract_addr = await create_contract(lcd_client, deployer, "basset_vault_config_holder", wasm_path, init_msg);
	return contract_addr;
}

async function init_basset_vault(wasm_path: string, init_msg: BassetVaultConfig): Promise<string> {
	let contract_addr = await create_contract(lcd_client, deployer, "basset_vault", wasm_path, init_msg);
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
	let governance_config = {
		quorum: "0.1",
		threshold: "0.5",
		voting_period: 94097,
		timelock_period: 40327,
		expiration_period: 13443,
		proposal_deposit: "1000000000",
		snapshot_period: 13443,
	};
	let governance_contract_addr = await init_governance_contract(governance_contract_wasm, governance_config);
	console.log(`=======================`);

	// instantiate psi_token
	let token_config = {
		name: "Nexus Token",
		symbol: "PSi",
		decimals: 6,
		initial_balances: [
			{
			address: initial_psi_tokens_owner,
			amount: "10000000000"
			}
		],
		mint: {
		  minter: governance_contract_addr,
		}
	};
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
	let psi_stable_swap_contract = await create_psi_usd_terraswap_pair(lcd_client, deployer, terraswap_factory_contract_addr, psi_token_addr);
	console.log(`psi_stable_swap_contract created; address: ${psi_stable_swap_contract.pair_contract_addr}, lp token address: ${psi_stable_swap_contract.liquidity_token_addr}`);
	console.log(`=======================`);

	// instantiate basset_vault_strategy
	let basset_vault_strategy_config = testnet_BassetVaultStrategyConfig(governance_contract_addr);
	let basset_vault_strategy_contract_addr = await init_basset_vault_strategy(basset_vault_strategy_contract_wasm, basset_vault_strategy_config);
	console.log(`=======================`);
	
	// instantiate basset_vault_config_holder
	let basset_vault_config_holder_config = testnet_BassetVaultConfigHolderConfig(governance_contract_addr, psi_token_addr, psi_stable_swap_contract.pair_contract_addr, basset_vault_strategy_contract_addr);
	let basset_vault_config_holder_contract_addr = await init_basset_vault_config_holder(basset_vault_config_holder_contract_wasm, basset_vault_config_holder_config);
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

	let basset_vault_config = testnet_BassetVaultConfig(governance_contract_addr, basset_vault_config_holder_contract_addr, nasset_token_code_id, nasset_token_config_holder_code_id, nasset_token_rewards_code_id, psi_distributor_code_id);
	await init_basset_vault(basset_vault_wasm, basset_vault_config);
	console.log(`=======================`);
}

main()
    .then(text => {
        console.log(text);
    })
	.catch(err => {
        console.log(err);
    });
