import {getContractEvents, LCDClient, Wallet} from '@terra-money/terra.js';
import {airdrop_contract_wasm} from './../basset_vault/definition';
import {execute_contract, create_contract, sleep} from './../utils';

export interface AirdropConfig {
	owner: string,
	psi_token: string,
}

export async function init_airdrop_contract(lcd_client: LCDClient, sender: Wallet, airdrop_config: AirdropConfig) {
	await create_contract(lcd_client, sender, "airdrop_contract", airdrop_contract_wasm, airdrop_config);
	console.log(`=======================`);
}

export async function register_merkle_tree(lcd_client: LCDClient, sender: Wallet, airdrop_contract_addr: string, merkle_root: string) {
	const register_merkle_root_msg = {
		register_merkle_root: {
			merkle_root: merkle_root
		}
	};

	while (true) {
		let register_merkle_tree_result = await execute_contract(lcd_client, sender, airdrop_contract_addr, register_merkle_root_msg);
		if (register_merkle_tree_result !== undefined) {
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
			return;
		} else {
			await sleep(1000);
		}
	}
}
