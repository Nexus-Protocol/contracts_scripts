import {LCDClient, Wallet} from '@terra-money/terra.js';
import {staking_contract_wasm} from './../basset_vault/definition';
import {create_contract, execute_contract} from './../utils';
import {DistributionScheduleRaw, Config} from './executor';

interface StakingConfig {
	owner: string,
	psi_token: string,
	staking_token: string,
	distribution_schedule: any[],
}

interface DistributionSchedule {
	start_time: number,
	end_time: number,
	amount: string,
}

export function create_distribution_schedule(distribution_schedule_raw: DistributionScheduleRaw): DistributionSchedule {
	let start_time_secs = Date.parse(distribution_schedule_raw.start_date) / 1000;
	let end_time_secs = Date.parse(distribution_schedule_raw.end_date) / 1000;

	return {
		start_time: start_time_secs,
		end_time: end_time_secs,
		amount: (parseInt(distribution_schedule_raw.tokens_amount) * 1_000_000).toString()
	};
}

export function StakingConfig(multisig_address: string, psi_token_addr: string, staking_token_addr: string, schedule: DistributionSchedule): StakingConfig {
	return {
		owner: multisig_address,
		psi_token: psi_token_addr,
		staking_token: staking_token_addr,
		distribution_schedule: [schedule]
	};
}

async function init_staking_contract(lcd_client: LCDClient, sender: Wallet, init_msg: StakingConfig): Promise<string> {
	let contract_addr = await create_contract(lcd_client, sender, "staking_contract", staking_contract_wasm, init_msg);
	return contract_addr;
}

export async function init_lp_staking_contract(lcd_client: LCDClient, sender: Wallet, config: Config) {
	let distribution_schedule = create_distribution_schedule(config.distribution_schedule);
	// instantiate lp tokens staking contract
	let staking_config = StakingConfig(config.multisig_address, config.psi_token_addr, config.lp_token_addr, distribution_schedule);
	await init_staking_contract(lcd_client, sender, staking_config);
	console.log(`=======================`);
}

export async function add_distribution_schedules(lcd_client: LCDClient, sender: Wallet, staking_contract_addr: string, distribution_schedules: DistributionSchedule[]) {
	await execute_contract(lcd_client, sender, staking_contract_addr, {
			add_schedules: {
			       schedules: distribution_schedules
		       }
		}
	);
	console.log(`distribution schedules added`);
	console.log(`=======================`);
}


export async function query_state(lcd_client: LCDClient, staking_contract_addr: string) {
	let config_response = await lcd_client.wasm.contractQuery(staking_contract_addr, {config: {}});
	console.log(`config:\n${JSON.stringify( config_response )}`)

	let state_response = await lcd_client.wasm.contractQuery(staking_contract_addr, {state: {}});
	console.log(`state:\n${JSON.stringify( state_response )}`)
}
