import { LCDClient, LocalTerra, Wallet, MnemonicKey} from '@terra-money/terra.js';
import { readFileSync } from 'fs';
import {Command} from 'commander';
import {execute_contract, get_date_str, sleep} from './../utils';

interface Config {
	basset_vault_addr: string,
	lcd_client: {
		localterra: boolean,
		url: string,
		chain_id: string
	},
	sender: {
		seed: string
	},
	honest_work_delay: {
		days: number,
		hours: number,
		minutes: number,
		seconds: number
	}
}

const DEFAULT_CONFIG_PATH: string = 'src/basset_honest_work/config.json';

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

async function run(config_path: string) { const config: Config = JSON.parse(readFileSync(config_path, 'utf-8'))
	let lcd_client: LCDClient;
	let sender: Wallet;
	if (config.lcd_client.localterra) {
		const localterra = new LocalTerra()
		lcd_client = localterra;
		sender = localterra.wallets["test1"];
	} else {
		lcd_client = new LCDClient({
			URL: config.lcd_client.url,
			chainID: config.lcd_client.chain_id
		});
		const owner = new MnemonicKey({mnemonic: config.sender.seed});
		sender = new Wallet(lcd_client, owner);
	}

	const honest_work_delay = config.honest_work_delay;
	const delay_millis =
		honest_work_delay.seconds * 1000 +
		honest_work_delay.minutes * (60 * 1000) +
		honest_work_delay.hours * (60 * 60 * 1000) +
		honest_work_delay.days * (24 * 60 * 60 * 100);

	await start_honest_work_loop(lcd_client, sender, config.basset_vault_addr, delay_millis);
}

export async function start_honest_work_loop(lcd_client: LCDClient, sender: Wallet, basset_vault_addr: string, delay_millis: number) {
	const hones_work_msg = {
		anyone: {
			anyone_msg: {
				hones_work: {}
			}
		}
	};

	while (true) {
		let result = await execute_contract(lcd_client, sender, basset_vault_addr, hones_work_msg);
		if (result !== undefined) {
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
