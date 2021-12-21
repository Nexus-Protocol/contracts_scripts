import {LCDClient, Wallet} from '@terra-money/terra.js';
import {vesting_contract_wasm} from './../basset_vault/definition';
import {execute_contract, create_contract, to_utc_seconds} from './../utils';
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
	start_time: number,
	end_time: number,
	cliff_end_time: number,
	amount: string,
}

export function create_vesting_account(vesting_account_raw: VestingAccountRaw): VestingAccount {
	const start_time_secs = to_utc_seconds(vesting_account_raw.start_date);
	const end_time_secs = to_utc_seconds(vesting_account_raw.end_date);
	const cliff_end_time_secs = to_utc_seconds(vesting_account_raw.cliff_end_date);

	return {
		address: vesting_account_raw.address,
		schedules: [
			{
				start_time: start_time_secs,
				end_time: end_time_secs,
				cliff_end_time: cliff_end_time_secs,
				amount: (parseInt(vesting_account_raw.tokens_amount) * 1_000_000).toString()
			}
		]
	};
}

export async function init_vesting_contract(lcd_client: LCDClient, sender: Wallet, config: Config) {
	const genesis_time = to_utc_seconds(config.genesis_date_str);
	// instantiate vesting contract
	const vesting_config = VestingConfig(config.psi_token_addr, genesis_time, config.multisig_address);
	const vesting_contract_addr = await create_contract(lcd_client, sender, "vesting_contract", vesting_contract_wasm, vesting_config);
	console.log(`=======================`);

	// register vesting accounts
	const vesting_accounts: VestingAccount[] = config.vesting_accounts.map(create_vesting_account);
	await add_vesting_account(lcd_client, sender, vesting_contract_addr, vesting_accounts);
}

export async function add_vesting_account(lcd_client: LCDClient, sender: Wallet, vesting_contract_addr: string, vesting_accounts: VestingAccount[]) {
	for (const vesting_account of vesting_accounts) {
		const is_vesting_exists = await is_vesting_already_exists_for(lcd_client, vesting_contract_addr, vesting_account.address);
		if (is_vesting_exists) {
			console.log(`stop cause vesting already exists, will not overwrite it`);
			console.log(`=======================`);
			return;
		}
	}

	await execute_contract(lcd_client, sender, vesting_contract_addr, {
		       register_vesting_accounts: {
			       vesting_accounts: vesting_accounts
		       }
		}
	);
	console.log(`vesting accounts registered`);
	console.log(`=======================`);
}

async function is_vesting_already_exists_for(lcd_client: LCDClient, vesting_contract_addr: string, address: string): Promise<boolean> {
	try {
		await lcd_client.wasm.contractQuery(vesting_contract_addr, {vesting_account: {address: address}});
		console.log(`vesting already exists for ${address}`);
		return true;
	} catch (err) {
		return false;
	}
}

export async function query_state(lcd_client: LCDClient, vesting_contract_addr: string) {
	const config_response = await lcd_client.wasm.contractQuery(vesting_contract_addr, {config: {}});
	console.log(`config:\n${JSON.stringify( config_response )}`)

	const vesting_accounts_response = await lcd_client.wasm.contractQuery(vesting_contract_addr, {vesting_accounts: {}});
	console.log(`vesting_accounts:\n${JSON.stringify( vesting_accounts_response )}`)
}
