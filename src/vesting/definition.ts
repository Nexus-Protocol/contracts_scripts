import {LCDClient, LocalTerra, Wallet} from '@terra-money/terra.js';
import {BassetVaultConfig, TokenConfig, BassetVaultStrategyConfig, GovernanceConfig, Cw20CodeId, init_terraswap_factory, PSiTokensOwner, CommunityPoolConfig} from './../config';
import {deployer, IS_PROD, lcd_client, MULTISIG_ADDR, vesting_contract_wasm} from './../basset_vault/definition';
import {store_contract, instantiate_contract, execute_contract, create_contract, create_usd_to_token_terraswap_pair, init_basset_vault, create_token_to_token_terraswap_pair} from './../utils';

interface VestingConfig {
	owner: string,
	psi_token: string,
        genesis_time: number,
}

export function VestingConfig(psi_token_addr: string, genesis_time: number): VestingConfig {
	return {
		owner: MULTISIG_ADDR,
		psi_token: psi_token_addr,
		genesis_time: genesis_time,
	}
}

async function init_vesting_contract(lcd_client: LCDClient, sender: Wallet, init_msg: VestingConfig): Promise<string> {
	let contract_addr = await create_contract(lcd_client, sender, "vesting_contract", vesting_contract_wasm, init_msg);
	return contract_addr;
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

function create_vesting_account(
	address: string,
	start_time: string,
	end_time: string,
	cliff_end_time: string,
	amount: string

): VestingAccount {
	let start_time_secs = Date.parse(start_time) / 1000;
	let end_time_secs = Date.parse(end_time) / 1000;
	let cliff_end_time_secs = Date.parse(cliff_end_time) / 1000;

	return {
		address: address,
		schedules: [
			{
				start_time: start_time_secs,
				end_time: end_time_secs,
				cliff_end_time: cliff_end_time_secs,
				amount: amount
			}
		]
	};
}

// ===================================================
// ==================== IMPORTANT ====================
// ===================================================
const GENESIS_DATE = Date.parse("2021-03-17T11:00:00");
//TODO
const PSI_TOKEN_ADDR = "terra1...";
// ===================================================
// ===================================================
// ===================================================

function get_vesting_accounts(): VestingAccount[] {
	let vesting_accounts = [];
	// add Hashed
	vesting_accounts.push(create_vesting_account(
		"terra1...",
		"2021-03-17T11:00:00",
		"2021-03-18T11:00:00",
		"2021-03-19T11:00:00",
		"5000000"
	));
	// add DeFi alliance
	vesting_accounts.push(create_vesting_account(
		"terra1...",
		"2021-03-17T11:00:00",
		"2021-03-18T11:00:00",
		"2021-03-19T11:00:00",
		"5000000"
	));
	return vesting_accounts;
}

export async function main() {
	let genesis_time = GENESIS_DATE / 1000;
	// instantiate vesting contract
	let vesting_config = VestingConfig(PSI_TOKEN_ADDR, genesis_time);
	let vesting_contract_addr = await init_vesting_contract(lcd_client, deployer, vesting_config);
	console.log(`=======================`);

	// register vesting accounts
	let vesting_accounts: VestingAccount[] = get_vesting_accounts();
	await execute_contract(lcd_client, deployer, vesting_contract_addr, 
	       {
		       register_vesting_accounts: {
			       vesting_accounts: vesting_accounts
		       }
		}
	);
	console.log(`vesting accounts registered`);
	console.log(`=======================`);
}

export async function query_state() {
	let config_response = await lcd_client.wasm.contractQuery("terra1xj66nvjusnsqann74xlpymapymhhd4az7x32yd", {config: {}});
	console.log(`config:\n${JSON.stringify( config_response )}`)

	let vesting_accounts_response = await lcd_client.wasm.contractQuery("terra1xj66nvjusnsqann74xlpymapymhhd4az7x32yd", {vesting_accounts: {}});
	console.log(`vesting_accounts:\n${JSON.stringify( vesting_accounts_response )}`)
}
