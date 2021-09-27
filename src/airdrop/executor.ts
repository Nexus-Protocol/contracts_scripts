import {LCDClient, Wallet} from '@terra-money/terra.js';
import {readFileSync} from 'fs';
import {Command} from 'commander';
import {register_merkle_tree, init_airdrop_contract, AirdropConfig} from "./definition";
import {get_lcd_config_with_wallet, LCDConfig} from './../utils';

interface Config {
	lcd_client: LCDConfig,
	psi_token_addr: string,
	airdrop_contract_owner: string
}

const DEFAULT_CONFIG_PATH: string = 'src/airdrop/config.json';

async function run_program() {
	const program = new Command();

	program
		.command('instantiate')
		.option('-C, --config <filepath>', `relative path to json config`)
		.action(async (options) => {
			const [config, lcd_client, sender] = await get_lcd_and_wallet(options);
			const airdrop_config: AirdropConfig = {
				owner: config.airdrop_contract_owner,
				psi_token: config.psi_token_addr,
			}
			await init_airdrop_contract(lcd_client, sender, airdrop_config);
		});

	program
		.command('register-merkle-tree')
		.option('-A, --address <address>', `airdrop contract address`)
		.option('-R, --merkle-root <string>', `merkle root to register`)
		.option('-C, --config <filepath>', `relative path to json config`)
		.action(async (options) => {
			const [_config, lcd_client, sender] = await get_lcd_and_wallet(options);
			await register_merkle_tree(lcd_client, sender, options.address, options.merkleRoot);
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

export async function get_lcd_and_wallet(options: any): Promise<[Config, LCDClient, Wallet]> {
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

