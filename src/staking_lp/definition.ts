import {LCDClient, Wallet} from '@terra-money/terra.js';
import {staking_contract_wasm} from './../basset_vault/definition';
import {create_contract} from './../utils';
import {DistributionScheduleRaw} from './executor';

interface StakingConfig {
	psi_token: string,
	staking_token: string,
	distribution_schedule: any[][],
}

interface DistributionSchedule {
	start_time: number;
	end_time: number;
	amount: string;
}

function create_distribution_schedule(distribution_schedule_raw: DistributionScheduleRaw): DistributionSchedule {
	let start_time_secs = Date.parse(distribution_schedule_raw.start_date) / 1000;
	let end_time_secs = Date.parse(distribution_schedule_raw.end_date) / 1000;

	return {
		start_time: start_time_secs,
		end_time: end_time_secs,
		amount: distribution_schedule_raw.tokens_amount
	};
}

export function StakingConfig(psi_token_addr: string, staking_token_addr: string, schedule: DistributionSchedule): StakingConfig {
	let distribution_schedule = [[schedule.start_time, schedule.end_time, schedule.amount]];
	return {
		psi_token: psi_token_addr,
		staking_token: staking_token_addr,
		distribution_schedule: distribution_schedule
	};
}

async function init_staking_contract(lcd_client: LCDClient, sender: Wallet, init_msg: StakingConfig): Promise<string> {
	let contract_addr = await create_contract(lcd_client, sender, "staking_contract", staking_contract_wasm, init_msg);
	return contract_addr;
}

export async function init_lp_staking_contract(lcd_client: LCDClient, sender: Wallet, distribution_schedule_raw: DistributionScheduleRaw, psi_token_addr: string, lp_token_addr: string) {
	let distribution_schedule = create_distribution_schedule(distribution_schedule_raw);
	// instantiate lp tokens staking contract
	let staking_config = StakingConfig(psi_token_addr, lp_token_addr, distribution_schedule);
	await init_staking_contract(lcd_client, sender, staking_config);
	console.log(`=======================`);
}

export async function query_state(lcd_client: LCDClient, staking_contract_addr: string) {
	let config_response = await lcd_client.wasm.contractQuery(staking_contract_addr, {config: {}});
	console.log(`config:\n${JSON.stringify( config_response )}`)

	let state_response = await lcd_client.wasm.contractQuery(staking_contract_addr, {state: {}});
	console.log(`state:\n${JSON.stringify( state_response )}`)
}
