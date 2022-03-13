import { LCDClient, Wallet } from '@terra-money/terra.js';
import { execute_contract, create_contract, to_utc_seconds, instantiate_contract } from './../utils';

async function initVestingPol(lcdClient: LCDClient, sender: Wallet, initMsg: object): Promise<string> {
	return await create_contract(lcdClient, sender, 'vesting_pol', 'wasm_artifacts/nexus/services/nexus_vesting_pol.wasm', initMsg);
}

async function initPol(lcdClient: LCDClient, sender: Wallet, initMsg: object): Promise<string> {
	return await create_contract(lcdClient, sender, 'pol', 'wasm_artifacts/nexus/services/nexus_pol.wasm', initMsg);
}

async function instantiateUtilityToken(lcdClient: LCDClient, sender: Wallet, tokenCodeId: number, minter: string) {
	const config = {
		name: 'Nexus Utility Token for PoL',
		symbol: 'upolPsi',
		decimals: 6,
		initial_balances: [],
		mint: {
			minter,
		}
	};
	return await instantiate_contract(lcdClient, sender, sender.key.accAddress, tokenCodeId, config);
}

export async function fullInit(
	lcdClient: LCDClient,
	sender: Wallet,
	psi: string,
	governance: string,
	tokenCodeId: number,
	genesisTime: string,
	pairs: Array<string>,
	vestingPeriod: number,
	communityPool: string,
	astroGenerator: string,
	astro: string,
	bondCost: string,
	maxDiscount: string,
	psiAmountTotal: string,
	psiAmountStart: string,
	startTime: number,
	endTime: number,
	polPsiBalance: string,
) {
	console.log(`Sender: ${sender.key.accAddress}`);

	const utilityToken = await instantiateUtilityToken(lcdClient, sender, tokenCodeId, governance);
	console.log(`upolPSI: ${utilityToken}`);
	console.log(`=======================`);

	console.log(`Register upolPSI in the governance contract`);
	const utilityMsg = { governance: { governance_msg: { init_utility: { token: utilityToken } } } };
	await execute_contract(lcdClient, sender, governance, utilityMsg);
	console.log(`=======================`);

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
		vesting: vestingPol,
		vesting_period: vestingPeriod,
		community_pool: communityPool,
		autostake_lp_tokens: true,
		astro_generator: astroGenerator,
		astro_token: astro,
		utility_token: utilityToken,
		bond_cost_in_utility_tokens: bondCost,
		initial_phase: {
			max_discount: maxDiscount,
			psi_amount_total: psiAmountTotal,
			psi_amount_start: psiAmountStart,
			start_time: startTime,
			end_time: endTime,
		}
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
