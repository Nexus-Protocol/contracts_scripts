import {getContractEvents, LCDClient, LocalTerra, Wallet} from '@terra-money/terra.js';
import {BassetVaultConfig, TokenConfig, BassetVaultStrategyConfig, GovernanceConfig, Cw20CodeId, init_terraswap_factory, PSiTokensOwner, CommunityPoolConfig} from './../config';
import {airdrop_contract_wasm, deployer, IS_PROD, lcd_client, MULTISIG_ADDR} from './../basset_vault/definition';
import {store_contract, instantiate_contract, execute_contract, create_contract, create_usd_to_token_terraswap_pair, init_basset_vault, create_token_to_token_terraswap_pair} from './../utils';

interface AirdropConfig {
	owner: string,
	psi_token: string,
}

export function AirdropConfig(psi_token_addr: string): AirdropConfig {
	return {
		owner: MULTISIG_ADDR,
		psi_token: psi_token_addr,
	}
}

async function init_airdrop_contract(lcd_client: LCDClient, sender: Wallet, init_msg: AirdropConfig): Promise<string> {
	let contract_addr = await create_contract(lcd_client, sender, "airdrop_contract", airdrop_contract_wasm, init_msg);
	return contract_addr;
}

// ===================================================
// ==================== IMPORTANT ====================
// ===================================================
//TODO
const PSI_TOKEN_ADDR = "terra1...";
// ===================================================
// ===================================================
// ===================================================

export async function main() {
	// instantiate airdrop contract
	let airdrop_config = AirdropConfig(PSI_TOKEN_ADDR);
	await init_airdrop_contract(lcd_client, deployer, airdrop_config);
	console.log(`=======================`);
}

export async function register_merkle_tree(airdrop_contract_addr: string, merkle_root: string) {
	let register_merkle_tree_result = await execute_contract(lcd_client, deployer, airdrop_contract_addr, 
		{
			register_merkle_root: {
				merkle_root: merkle_root
			}
		}
	);
	let stage;
	let tx_events = getContractEvents(register_merkle_tree_result);
	for (let event of tx_events) {
		let stage_from_event = event["stage"];
		if (stage_from_event !== undefined) {
			stage = parseInt( stage_from_event );
		}
	}

	console.log(`merkle_tree registered\n\tstage: ${stage}`);
	console.log(`=======================`);
}
