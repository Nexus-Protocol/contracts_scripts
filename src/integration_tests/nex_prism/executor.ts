import {Command} from 'commander';

async function run_program() {
    const program = new Command();

    program
        .action(async () => {
            // TODO:
            // const addresses_holder_addr = await deploy();
            // await run_recursive_repay_ok(addresses_holder_addr);
            // await run_simple_deposit(addresses_holder_addr);
            // await run_borrow_more_on_bluna_price_increasing(addresses_holder_addr);
            // await run_repay_on_bluna_price_decreasing(addresses_holder_addr);
            // await run_expired_basset_price_rebalance(addresses_holder_addr);
        });
}


run_program()
    .then(text => {
        console.log(text);
    })
    .catch(err => {
        console.log(err);
    });