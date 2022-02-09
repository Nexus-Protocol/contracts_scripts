import {Command} from 'commander';
import {get_lcd_config_with_wallet_for_integration_tests_only} from "../utils";
import {
    anchor_nexus_full_init,
    borrow_more_on_bluna_price_increasing,
    borrow_zero_amount_issue,
    expired_basset_price_rebalance,
    simple_deposit,
    recursive_repay_ok,
    repay_on_bluna_price_decreasing,
    recursive_repay_fail,
    deposit_and_withdraw_all,
} from "./definition";

async function run_program() {
    const program = new Command();

    program
        .action(async () => {
            const addresses_holder_addr = await deploy();
            await run_recursive_repay_ok(addresses_holder_addr);
            await run_simple_deposit(addresses_holder_addr);
            await run_borrow_more_on_bluna_price_increasing(addresses_holder_addr);
            await run_repay_on_bluna_price_decreasing(addresses_holder_addr);
            await run_expired_basset_price_rebalance(addresses_holder_addr);
        });

    program
        .command('deploy')
        .action(async () => {
            await deploy();
        });

    program
        .command('simple_deposit')
        .option('-A, --address <address>', `addresses holder contract address`)
        .action(async (options) => {
            await run_simple_deposit(options.address);
        });

    program
        .command('borrow_zero_amount_issue')
        .option('-A, --address <address>', `addresses holder contract address`)
        .action(async (options) => {
            await run_borrow_zero_amount_issue(options.address);
        });

    program
        .command('borrow_more_on_bluna_price_increasing')
        .option('-A, --address <address>', `addresses holder contract address`)
        .action(async (options) => {
            await run_borrow_more_on_bluna_price_increasing(options.address);
        });

    program
        .command('repay_on_bluna_price_decreasing')
        .option('-A, --address <address>', `addresses holder contract address`)
        .action(async (options) => {
            await run_repay_on_bluna_price_decreasing(options.address);
        });

    program
        .command('recursive_repay_ok')
        .option('-A, --address <address>', `addresses holder contract address`)
        .action(async (options) => {
            await run_recursive_repay_ok(options.address);
        });

    program
        .command('recursive_repay_fail')
        .option('-A, --address <address>', `addresses holder contract address`)
        .action(async (options) => {
            await run_recursive_repay_fail(options.address);
        });

    program
        .command('expired_basset_price_rebalance')
        .option('-A, --address <address>', `addresses holder contract address`)
        .action(async (options) => {
            await run_expired_basset_price_rebalance(options.address);
        });

    program
        .command('deposit_and_withdraw_all')
        .option('-A, --address <address>', `addresses holder contract address`)
        .action(async (options) => {
            await run_deposit_and_withdraw_all(options.address);
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
    const addresses_holder_addr = await anchor_nexus_full_init(lcd_client, sender, sender.key.accAddress, 1, 100);
    return addresses_holder_addr;
}

async function run_simple_deposit(addresses_holder_addr: string) {
    const [lcd_client, sender] = await get_lcd_config_with_wallet_for_integration_tests_only();
    await simple_deposit(lcd_client, sender, addresses_holder_addr);
}

async function run_borrow_zero_amount_issue(addresses_holder_addr: string) {
    const [lcd_client, sender] = await get_lcd_config_with_wallet_for_integration_tests_only();
    await borrow_zero_amount_issue(lcd_client, sender, addresses_holder_addr);
}

async function run_borrow_more_on_bluna_price_increasing(addresses_holder_addr: string) {
    const [lcd_client, sender] = await get_lcd_config_with_wallet_for_integration_tests_only();
    await borrow_more_on_bluna_price_increasing(lcd_client, sender, addresses_holder_addr);
}

async function run_repay_on_bluna_price_decreasing(addresses_holder_addr: string) {
    const [lcd_client, sender] = await get_lcd_config_with_wallet_for_integration_tests_only();
    await repay_on_bluna_price_decreasing(lcd_client, sender, addresses_holder_addr);
}

async function run_recursive_repay_ok(addresses_holder_addr: string) {
    const [lcd_client, sender] = await get_lcd_config_with_wallet_for_integration_tests_only();
    await recursive_repay_ok(lcd_client, sender, addresses_holder_addr);
}

async function run_recursive_repay_fail(addresses_holder_addr: string) {
    const [lcd_client, sender] = await get_lcd_config_with_wallet_for_integration_tests_only();
    await recursive_repay_fail(lcd_client, sender, addresses_holder_addr);
}

async function run_expired_basset_price_rebalance(addresses_holder_addr: string) {
    const [lcd_client, sender] = await get_lcd_config_with_wallet_for_integration_tests_only();
    await expired_basset_price_rebalance(lcd_client, sender, addresses_holder_addr);
}

async function run_deposit_and_withdraw_all(addresses_holder_addr: string) {
    const [lcd_client, sender] = await get_lcd_config_with_wallet_for_integration_tests_only();
    await deposit_and_withdraw_all(lcd_client, sender, addresses_holder_addr);
}
