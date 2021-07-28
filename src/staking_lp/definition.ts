import {getContractEvents, LCDClient, LocalTerra, Wallet} from '@terra-money/terra.js';
import {BassetVaultConfig, TokenConfig, BassetVaultStrategyConfig, GovernanceConfig, Cw20CodeId, init_terraswap_factory, PSiTokensOwner, CommunityPoolConfig} from './../config';
import { deployer, IS_PROD, lcd_client, MULTISIG_ADDR, staking_contract_wasm} from './../basset_vault/definition';
import {store_contract, instantiate_contract, execute_contract, create_contract, create_usd_to_token_terraswap_pair, init_basset_vault, create_token_to_token_terraswap_pair} from './../utils';

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

function create_distribution_schedule(
	start_time: string,
	end_time: string,
	amount: string
): DistributionSchedule {
	let start_time_secs = Date.parse(start_time) / 1000;
	let end_time_secs = Date.parse(end_time) / 1000;

	return {
		start_time: start_time_secs,
		end_time: end_time_secs,
		amount: amount
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

// ===================================================
// ==================== IMPORTANT ====================
// ===================================================
//TODO
const PSI_TOKEN_ADDR = "terra1...";
const LP_TOKEN_ADDR = "terra1...";
// ===================================================
// ===================================================
// ===================================================

export async function main() {
	let distribution_schedule = create_distribution_schedule(
		"2021-03-18T11:00:00",
		"2021-03-19T11:00:00",
		"5000000"
	);
	// instantiate lp tokens staking contract
	let staking_config = StakingConfig(PSI_TOKEN_ADDR, LP_TOKEN_ADDR, distribution_schedule);
	await init_staking_contract(lcd_client, deployer, staking_config);
	console.log(`=======================`);
}

export async function query_state() {
	let config_response = await lcd_client.wasm.contractQuery("terra14npwmxc8lk7em77xc8w84k8spgk7qzsuz4hlsg", {config: {}});
	console.log(`config:\n${JSON.stringify( config_response )}`)

	let state_response = await lcd_client.wasm.contractQuery("terra14npwmxc8lk7em77xc8w84k8spgk7qzsuz4hlsg", {state: {}});
	console.log(`state:\n${JSON.stringify( state_response )}`)
}
