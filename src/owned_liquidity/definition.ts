import { LCDClient, Wallet } from '@terra-money/terra.js';
import { execute_contract, create_contract, to_utc_seconds } from './../utils';

interface VestingPolConfig {
	owner: string,
	psi_token: string,
	genesis_time: number,
}

interface polConfig {
	governance: string,
	pairs: Array<string>,
	psi_token: string,
	min_staked_psi_amount: string,
	vesting_period: number,
	bond_control_var: string,
	excluded_psi: Array<string>,
	max_bonds_amount: string,
	community_pool: string,
	astro_generator: string,
	astro_token: string,
}

async function initVestingPol(lcdClient: LCDClient, sender: Wallet, initMsg: VestingPolConfig): Promise<string> {
	return await create_contract(lcdClient, sender, 'vesting_pol', 'wasm_artifacts/nexus/services/nexus_vesting_pol.wasm', initMsg);
}

async function initPol(lcdClient: LCDClient, sender: Wallet, initMsg: polConfig): Promise<string> {
	return await create_contract(lcdClient, sender, 'pol', 'wasm_artifacts/nexus/services/nexus_pol.wasm', initMsg);
}

export async function fullInit(
	lcdClient: LCDClient,
	sender: Wallet,
	psi: string,
	genesisTime: string,
	governance: string,
	minStakedPsiAmount: string,
	pairs: Array<string>,
	vestingPeriod: number,
	bondControlVar: string,
	excludedPsi: Array<string>,
	maxBondsAmount: string,
	communityPool: string,
	astroGenerator: string,
	astro: string,
	polPsiBalance: string,
) {
	console.log(`Sender: ${sender.key.accAddress}`);

	const vestingPolInit = {
		owner: sender.key.accAddress,
		psi_token: psi,
		genesis_time: to_utc_seconds(genesisTime),
	};
	const vestingPol = await initVestingPol(lcdClient, sender, vestingPolInit);
	console.log(`=======================`);

	const polInit = {
		governance,
		pairs,
		psi_token: psi,
		min_staked_psi_amount: minStakedPsiAmount,
		vesting: vestingPol,
		vesting_period: vestingPeriod,
		bond_control_var: bondControlVar,
		excluded_psi: excludedPsi,
		max_bonds_amount: maxBondsAmount,
		community_pool: communityPool,
		autostake_lp_tokens: true,
		astro_generator: astroGenerator,
		astro_token: astro,
	};
	const pol = await initPol(lcdClient, sender, polInit);
	console.log(`=======================`);

	console.log(`Transfer PSI tokens to PoL`);
	await execute_contract(lcdClient, sender, psi, {
		transfer: { recipient: pol, amount: polPsiBalance }
	});
	console.log(`=======================`);

	console.log(`Set PoL as vesting owner`);
	const updateConfig = { update_config: { owner: pol } };
	await execute_contract(lcdClient, sender, vestingPol, updateConfig);
	console.log(`=======================`);
}
