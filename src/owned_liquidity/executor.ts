import { fullInit } from "./definition";
import { readFileSync } from 'fs';
import { Command } from 'commander';
import { get_lcd_config_with_wallet, LCDConfig } from './../utils';
import { Decimal } from "decimal.js";

interface Config {
	lcdClient: LCDConfig,
	psi: string,
	genesisTime: string,
	governance: string,
	pairs: Array<string>,
	vestingPeriod: number,
	bondControlVar: Decimal,
	excludedPsi: Array<string>,
	maxBondsAmount: Decimal,
	communityPool: string,
	astroGenerator: string,
	astro: string,
	polPsiBalance: Decimal,
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
		config.genesisTime,
		config.governance,
		config.pairs,
		config.vestingPeriod,
		config.bondControlVar,
		config.excludedPsi,
		config.maxBondsAmount,
		config.communityPool,
		config.astroGenerator,
		config.astro,
		config.polPsiBalance,
	);
}

runProgram()
	.then(text => {
		console.log(text);
	})
	.catch(err => {
		console.log(err);
	});
