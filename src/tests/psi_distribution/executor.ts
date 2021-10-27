import {
	execute_psi_distribution_test, psi_distributor_init,
} from "./definition";
import { readFileSync } from 'fs';
import {Command, option} from 'commander';
import {get_lcd_config_with_wallet, LCDConfig} from '../../utils';

interface Config {
	lcd_client: LCDConfig,
}

const DEFAULT_CONFIG_PATH: string = 'src/tests/psi_distribution/lcd_client_config.json';

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

	await execute_psi_distribution_test(
		"Normal case #1",
		lcd_client,
		sender,
		psi_distributor_deployment_result,
		0.8,
		0.6,
		1000,
		900,
		75,
		25
	);

	await execute_psi_distribution_test(
		"Normal case #2",
		lcd_client,
		sender,
		psi_distributor_deployment_result,
		1,
		0,
		1000,
		500,
		375,
		125
	);

	await execute_psi_distribution_test(
		"Manual_ltv equals to borrow_ltv_aim",
		lcd_client,
		sender,
		psi_distributor_deployment_result,
		0.8,
		0.8,
		1000,
		1000,
		0,
		0
	);

	await execute_psi_distribution_test(
		"Manual_ltv greater than borrow_ltv_aim",
		lcd_client,
		sender,
		psi_distributor_deployment_result,
		0.8,
		0.81,
		1000,
		1000,
		0,
		0
	);

	await execute_psi_distribution_test(
		"Small amount 1",
		lcd_client,
		sender,
		psi_distributor_deployment_result,
		0.8,
		0.6,
		9,
		9,
		0,
		0
	);

	await execute_psi_distribution_test(
		"Small amount 2",
		lcd_client,
		sender,
		psi_distributor_deployment_result,
		0.8,
		0.6,
		10,
		9,
		1,
		0
	);

	await execute_psi_distribution_test(
		"Small amount 3",
		lcd_client,
		sender,
		psi_distributor_deployment_result,
		0.8,
		0.6,
		40,
		36,
		3,
		1
	);
}

run_program()
    .then(text => {
        console.log(text);
    })
	.catch(err => {
        console.log(err);
    });
