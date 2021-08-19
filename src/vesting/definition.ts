import {LCDClient, Wallet} from '@terra-money/terra.js';
import {vesting_contract_wasm} from './../basset_vault/definition';
import {execute_contract, create_contract} from './../utils';
import {VestingAccountRaw, Config} from './executor';

interface VestingConfig {
	owner: string,
	psi_token: string,
        genesis_time: number,
}

export function VestingConfig(psi_token_addr: string, genesis_time: number, multisig_address: string): VestingConfig {
	return {
		owner: multisig_address,
		psi_token: psi_token_addr,
		genesis_time: genesis_time,
	}
}

interface VestingAccount {
	address: string,
	schedules: VestingSchedule[]
}

interface VestingSchedule {
	start_time: number;
	end_time: number;
	cliff_end_time: number;
	amount: string;
}

function create_vesting_account(vesting_account_raw: VestingAccountRaw): VestingAccount {
	let start_time_secs = Date.parse(vesting_account_raw.start_date) / 1000;
	let end_time_secs = Date.parse(vesting_account_raw.end_date) / 1000;
	let cliff_end_time_secs = Date.parse(vesting_account_raw.cliff_end_date) / 1000;

	return {
		address: vesting_account_raw.address,
		schedules: [
			{
				start_time: start_time_secs,
				end_time: end_time_secs,
				cliff_end_time: cliff_end_time_secs,
				amount: vesting_account_raw.tokens_amount
			}
		]
	};
}

export async function init_vesting_contract(lcd_client: LCDClient, sender: Wallet, config: Config) {
	const genesis_date = Date.parse(config.genesis_date_str);
	let genesis_time = genesis_date / 1000;
	// instantiate vesting contract
	let vesting_config = VestingConfig(config.psi_token_addr, genesis_time, config.multisig_address);
	let vesting_contract_addr = await create_contract(lcd_client, sender, "vesting_contract", vesting_contract_wasm, vesting_config);
	console.log(`=======================`);

	// register vesting accounts
	let vesting_accounts: VestingAccount[] = config.vesting_accounts.map(create_vesting_account);
	await execute_contract(lcd_client, sender, vesting_contract_addr, 
	       {
		       register_vesting_accounts: {
			       vesting_accounts: vesting_accounts
		       }
		}
	);
	console.log(`vesting accounts registered`);
	console.log(`=======================`);
}

export async function query_state(lcd_client: LCDClient, vesting_contract_addr: string) {
	let config_response = await lcd_client.wasm.contractQuery(vesting_contract_addr, {config: {}});
	console.log(`config:\n${JSON.stringify( config_response )}`)

	let vesting_accounts_response = await lcd_client.wasm.contractQuery(vesting_contract_addr, {vesting_accounts: {}});
	console.log(`vesting_accounts:\n${JSON.stringify( vesting_accounts_response )}`)
}
