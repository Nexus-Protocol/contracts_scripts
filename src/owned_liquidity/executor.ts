import { fullInit } from "./definition";
import { readFileSync } from 'fs';
import { Command } from 'commander';
import { get_lcd_config_with_wallet, LCDConfig } from './../utils';

interface Config {
	lcdClient: LCDConfig,
	psi: string,
	governance: string,
	tokenCodeId: number,
	vesting: VestingConfig,
	pol: PolConfig,
}

interface PolConfig {
	pairs: Array<string>,
	vestingPeriod: number,
	communityPool: string,
	astroGenerator: string,
	astro: string,
	phase: PhaseConfig,
	bondCost: string,
	psiBalance: string,
}

interface PhaseConfig {
	maxDiscount: string,
	psiAmountTotal: string,
	psiAmountStart: string,
	startTime: number,
	endTime: number,
}

interface VestingConfig {
	genesisTime: string,
}

const DEFAULT_CONFIG_PATH = 'src/owned_liquidity/config.json';

async function runProgram() {
	const program = new Command();
	program
		.option('-C, --config <filepath>', `relative path to json config`)
		.action(async (options) => {
			let configPath: string;
			if (options.config === undefined) {
				configPath = DEFAULT_CONFIG_PATH;
			} else {
				configPath = options.config;
			}
			await run(configPath);
		});

	await program.parseAsync(process.argv);
}

async function run(configPath: string) {
	const config: Config = JSON.parse(readFileSync(configPath, 'utf-8'))
	const [lcdClient, sender] = await get_lcd_config_with_wallet(config.lcdClient);

	await fullInit(
		lcdClient,
		sender,
		config.psi,
		config.governance,
		config.tokenCodeId,
		config.vesting.genesisTime,
		config.pol.pairs,
		config.pol.vestingPeriod,
		config.pol.communityPool,
		config.pol.astroGenerator,
		config.pol.astro,
		config.pol.bondCost,
		config.pol.phase.maxDiscount,
		config.pol.phase.psiAmountTotal,
		config.pol.phase.psiAmountStart,
		config.pol.phase.startTime,
		config.pol.phase.endTime,
		config.pol.psiBalance,
	);
}

runProgram()
	.then(text => {
		console.log(text);
	})
	.catch(err => {
		console.log(err);
	});
