import {LCDClient, Wallet} from '@terra-money/terra.js';
import {readFileSync} from 'fs';
import {Command} from 'commander';
import {add_distribution_schedules, create_distribution_schedule, init_lp_staking_contract, query_state} from "./definition";
import {get_lcd_config_with_wallet} from './../utils';

export interface Config {
	lcd_client: {
		localterra: boolean,
		url: string,
		chain_id: string
	},
	multisig_address: string,
	psi_token_addr: string,
	lp_token_addr: string,
	distribution_schedule: DistributionScheduleRaw
}

export interface DistributionScheduleRaw {
	start_date: string,
	end_date: string,
	tokens_amount: string,
}

const DEFAULT_CONFIG_PATH: string = 'src/staking_lp/config.json';

async function run_program() {
	const program = new Command();

	program
		.command('instantiate')
		.option('-C, --config <filepath>', `relative path to json config`)
		.action(async (options) => {
			const [config, lcd_client, sender] = await get_lcd_and_wallet(options);
			await init_lp_staking_contract(lcd_client, sender, config);
		});

	program
		.command('add-distribution <start_date> <end_date> <tokens_amount>')
		.option('-A, --address <address>', `staking contract address`)
		.option('-C, --config <filepath>', `relative path to json config`)
		.action(async (start_date, end_date, tokens_amount, options) => {
			const [_config, lcd_client, sender] = await get_lcd_and_wallet(options);
			const distribution_schedule = create_distribution_schedule({
				start_date: start_date,
				end_date: end_date,
				tokens_amount: tokens_amount
			});
			await add_distribution_schedules(lcd_client, sender, options.address, [distribution_schedule]);
		});

	program
		.command('query-state')
		.option('-A, --address <address>', `staking contract address`)
		.option('-C, --config <filepath>', `relative path to json config`)
		.action(async (options) => {
			const [_config, lcd_client, _sender] = await get_lcd_and_wallet(options);
			await query_state(lcd_client, options.address);
		});

	await program.parseAsync(process.argv);
}

run_program()
    .then(text => {
        console.log(text);
    })
	.catch(err => {
        console.log(err);
    });

async function get_lcd_and_wallet(options: any): Promise<[Config, LCDClient, Wallet]> {
	let config_path: string;
	if (options.config === undefined) {
		config_path = DEFAULT_CONFIG_PATH;
	} else {
		config_path = options.config;
	}

	const config: Config = JSON.parse(readFileSync(config_path, 'utf-8'))
	const [lcd_client, sender] = await get_lcd_config_with_wallet(config.lcd_client);
	return [config, lcd_client, sender];
}
