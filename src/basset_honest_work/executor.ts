import { LCDClient, Wallet } from '@terra-money/terra.js';
import { readFileSync } from 'fs';
import {Command} from 'commander';
import {execute_contract, get_date_str, get_lcd_config_with_wallet, LCDConfig, sleep} from './../utils';
import {isTxSuccess} from './../transaction';

interface Config {
	basset_vault_addr: string,
	lcd_client: LCDConfig,
	honest_work_delay: {
		days: number,
		hours: number,
		minutes: number,
		seconds: number
	}
}

const DEFAULT_CONFIG_PATH = 'src/basset_honest_work/config.json';

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

	const honest_work_delay = config.honest_work_delay;
	const delay_millis =
		honest_work_delay.seconds * 1000 +
		honest_work_delay.minutes * (60 * 1000) +
		honest_work_delay.hours * (60 * 60 * 1000) +
		honest_work_delay.days * (24 * 60 * 60 * 100);

	await start_honest_work_loop(lcd_client, sender, config.basset_vault_addr, delay_millis);
}

export async function start_honest_work_loop(lcd_client: LCDClient, sender: Wallet, basset_vault_addr: string, delay_millis: number) {
	const honest_work_msg = {
		anyone: {
			anyone_msg: {
				honest_work: {}
			}
		}
	};

	while (true) {
		const result = await execute_contract(lcd_client, sender, basset_vault_addr, honest_work_msg);
		if (result !== undefined && isTxSuccess(result)) {
			console.log(`${get_date_str()} :: Honest work successfully executed`);
			console.log(`=======================`);
			await sleep(delay_millis);
		} else {
			await sleep(1000);
		}
	}
}

run_program()
    .then(text => {
        console.log(text);
    })
	.catch(err => {
        console.log(err);
    });
