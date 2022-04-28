import { Command } from 'commander';
import { get_lcd_config_with_wallet_for_integration_tests_only } from '../utils';
import { prism_nexprism_full_init } from './definition';

async function run_program() {
    const program = new Command();

    program
        .action(async () => {
            const addresses_holder_addr = await deploy();
            
            // TODO sample:
            // await run_recursive_repay_ok(addresses_holder_addr);
            // await run_simple_deposit(addresses_holder_addr);
            // await run_borrow_more_on_bluna_price_increasing(addresses_holder_addr);
            // await run_repay_on_bluna_price_decreasing(addresses_holder_addr);
            // await run_expired_basset_price_rebalance(addresses_holder_addr);

            // TODO: xprism deposit/lock 1 month and withdraw (also check nexprism conversion)
            // TODO: xprism deposit/lock 3 month and withdraw
            // TODO: xprism deposit/lock and withdraw within 7 days
        });

    program
        .command('deploy')
        .action(async () => {
            await deploy();
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

async function deploy() {
    const [lcd_client, sender] = await get_lcd_config_with_wallet_for_integration_tests_only();
    const addresses_holder_addr = await prism_nexprism_full_init(lcd_client, sender);
    return addresses_holder_addr;
}
