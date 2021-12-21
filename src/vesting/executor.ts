import { LCDClient, Wallet } from '@terra-money/terra.js';
import { readFileSync } from 'fs';
import { Command } from 'commander';
import { add_vesting_account, create_vesting_account, init_vesting_contract, query_state } from "./definition";
import { get_lcd_config_with_wallet, LCDConfig } from './../utils';

export interface Config {
	lcd_client: LCDConfig,
	multisig_address: string,
	psi_token_addr: string,
	genesis_date_str: string,
	vesting_accounts: VestingAccountRaw[]
}

export interface VestingAccountRaw {
	address: string,
	start_date: string,
	end_date: string,
	cliff_end_date: string,
	tokens_amount: string,
}

const DEFAULT_CONFIG_PATH = 'src/vesting/config.json';

async function run_program() {
	const program = new Command();

	program
		.command('instantiate')
		.option('-C, --config <filepath>', `relative path to json config`)
		.action(async (options) => {
			const [config, lcd_client, sender] = await get_lcd_and_wallet(options);
			await init_vesting_contract(lcd_client, sender, config);
		});

	program
		.command('add-vesting <address> <start_date> <end_date> <cliff_end_date> <tokens_amount>')
		.requiredOption('-A, --address <address>', `vesting contract address`)
		.option('-C, --config <filepath>', `relative path to json config`)
		.action(async (address, start_date, end_date, cliff_end_date, tokens_amount, options) => {
			const [_config, lcd_client, sender] = await get_lcd_and_wallet(options);
			const vesting_accounts = create_vesting_account({
				address: address,
				start_date: start_date,
				end_date: end_date,
				cliff_end_date: cliff_end_date,
				tokens_amount: tokens_amount
			});
			await add_vesting_account(lcd_client, sender, options.address, [vesting_accounts]);
		});

	program
		.command('query-state')
		.option('-A, --address <address>', `vesting contract address`)
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

async function get_lcd_and_wallet(options: { config: string | undefined; }): Promise<[Config, LCDClient, Wallet]> {
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
