import {full_init} from "./definition";
import { readFileSync } from 'fs';
import {Command} from 'commander';
import {get_lcd_config_with_wallet, LCDConfig} from './../utils';

interface Config {
	lcd_client: LCDConfig,
	psi_token_initial_owner: string
}

const DEFAULT_CONFIG_PATH: string = 'src/basset_vault/config.json';

async function run_program() {
	const program = new Command();
	program
		.option('-C, --config <filepath>', `relative path to json config`)
		.action(async (options) => {
			let config_path: string;
			if (options.config === undefined) {
				config_path = DEFAULT_CONFIG_PATH;
			} else {
				config_path = options.config;
			}
			await run(config_path);
		});

	await program.parseAsync(process.argv);
}

async function run(config_path: string) {
	const config: Config = JSON.parse(readFileSync(config_path, 'utf-8'))
	const [lcd_client, sender] = await get_lcd_config_with_wallet(config.lcd_client);

	await full_init(lcd_client, sender, config.psi_token_initial_owner);
}

run_program()
    .then(text => {
        console.log(text);
    })
	.catch(err => {
        console.log(err);
    });
