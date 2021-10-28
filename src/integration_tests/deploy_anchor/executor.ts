import {anchor_init} from "./definition";
import {Command} from 'commander';
import {get_lcd_config_with_wallet_for_integration_tests_only} from '../../utils';

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

	await anchor_init(lcd_client, sender);
}

run_program()
    .then(text => {
        console.log(text);
    })
	.catch(err => {
        console.log(err);
    });
