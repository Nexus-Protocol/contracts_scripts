import { readFileSync } from 'fs';
import {Command} from 'commander';
import {get_lcd_config_with_wallet, LCDConfig} from './../utils';
import {LCDClient} from "@terra-money/terra.js";

interface Config {
	lcd_client: LCDConfig,
	psi_token_initial_owner: string
}

const DEFAULT_CONFIG_PATH: string = 'src/basset_vault/config.json';

async function run_program() {
	const program = new Command();
	program
		.requiredOption('-A --address <address>', `nexus basset vault address`)
		.requiredOption('-H --height <number>', `initial block height`)
		.option('-C, --config <filepath>', `relative path to json config`)
		.action(async (options) => {
			let config_path: string;
			if (options.config === undefined) {
				config_path = DEFAULT_CONFIG_PATH;
			} else {
				config_path = options.config;
			}
			await run(config_path, options.address, options.height);
		});

	await program.parseAsync(process.argv);
}

async function run(config_path: string, addr: string, h: number) {
	const config: Config = JSON.parse(readFileSync(config_path, 'utf-8'))
	const [lcd_client, _] = await get_lcd_config_with_wallet(config.lcd_client);
	let block_height = await find_liquidation_height(lcd_client, addr, h);
}

async function find_liquidation_height(lcd_client: LCDClient, addr: string, height: number): Promise<number> {
	while (true) {
		return -1;
	}
}

run_program()
    .then(text => {
        console.log(text);
    })
	.catch(err => {
        console.log(err);
    });
