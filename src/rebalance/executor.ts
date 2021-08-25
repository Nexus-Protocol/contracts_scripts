import { readFileSync } from 'fs';
import {Command} from 'commander';
import {start_rebalance_loop} from "./definition";
import {get_lcd_config_with_wallet} from './../utils';

interface Config {
	basset_vault_addr: string,
	lcd_client: {
		localterra: boolean,
		url: string,
		chain_id: string
	}
}

const DEFAULT_CONFIG_PATH: string = 'src/rebalance/config.json';

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

	await start_rebalance_loop(lcd_client, sender, config.basset_vault_addr);
}

run_program()
    .then(text => {
        console.log(text);
    })
	.catch(err => {
        console.log(err);
    });
