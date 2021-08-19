import { LCDClient, Wallet } from '@terra-money/terra.js';
import { readFileSync } from 'fs';
import {Command} from 'commander';
import {execute_contract, get_date_str, get_lcd_config_with_wallet, sleep} from './../utils';

interface Config {
	nasset_token_rewards_addr: string,
	claim_rewards_for_addr: string,
	lcd_client: {
		localterra: boolean,
		url: string,
		chain_id: string
	},
	sender: {
		seed: string
	},
	claiming_rewards_delay: {
		days: number,
		hours: number,
		minutes: number,
		seconds: number
	}
}

const DEFAULT_CONFIG_PATH: string = 'src/claim_lp_rewards/config.json';

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

	const claiming_rewards_delay = config.claiming_rewards_delay;
	const delay_millis =
		claiming_rewards_delay.seconds * 1000 +
		claiming_rewards_delay.minutes * (60 * 1000) +
		claiming_rewards_delay.hours * (60 * 60 * 1000) +
		claiming_rewards_delay.days * (24 * 60 * 60 * 100);

	await start_claim_rewards_loop(lcd_client, sender, config.nasset_token_rewards_addr, delay_millis, config.claim_rewards_for_addr);
}

export async function start_claim_rewards_loop(lcd_client: LCDClient, sender: Wallet, nasset_token_rewards_addr: string, delay_millis: number, claim_rewards_for_address: string) {
	const claim_rewards_msg = {
		anyone: {
			anyone_msg: {
				claim_rewards_for_someone: {
					address: claim_rewards_for_address
				}
			}
		}
	};

	while (true) {
		let result = await execute_contract(lcd_client, sender, nasset_token_rewards_addr, claim_rewards_msg);
		if (result !== undefined) {
			console.log(`${get_date_str()} :: Successfully claim rewards for '${claim_rewards_for_address}'`);
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
