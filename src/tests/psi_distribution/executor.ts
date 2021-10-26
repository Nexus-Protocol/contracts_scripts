import {
	psi_distributor_init,
	send_tokens_and_distribute
} from "./definition";
import { readFileSync } from 'fs';
import {Command, option} from 'commander';
import {get_lcd_config_with_wallet, LCDConfig} from '../../utils';
import {BlockTxBroadcastResult, getContractEvents} from "@terra-money/terra.js";

interface Config {
	lcd_client: LCDConfig,
}

const DEFAULT_CONFIG_PATH: string = 'src/tests/psi_distribution/configuration.json';

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

	const psi_distributor_deployment_result = await psi_distributor_init(lcd_client, sender);
	console.log(`psi_distributor_addr: ${JSON.stringify(psi_distributor_deployment_result)}`);

	const psi_distribution_response =  await send_tokens_and_distribute(
		lcd_client,
		sender,
		psi_distributor_deployment_result.psi_distributor_config.psi_token_addr,
		psi_distributor_deployment_result.psi_distributor_addr,
		1000);
	console.log(`psi_distribution_response: ${JSON.stringify(psi_distribution_response)}`);
}

run_program()
    .then(text => {
        console.log(text);
    })
	.catch(err => {
        console.log(err);
    });
