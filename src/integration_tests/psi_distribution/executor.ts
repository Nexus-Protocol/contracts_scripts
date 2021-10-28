import {
	execute_psi_distribution_test, psi_distributor_init,
} from "./definition";
import {Command} from 'commander';
import {get_lcd_config_with_wallet_for_integration_tests_only} from "../../utils";

async function run_program() {
	const program = new Command();
	program
		.action(async () => {
			await run();
		});

	await program.parseAsync(process.argv);
}

async function run() {
	const [lcd_client, sender] = await get_lcd_config_with_wallet_for_integration_tests_only();

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
