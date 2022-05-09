import { Command } from 'commander';
import { get_lcd_config_with_wallet_for_integration_tests_only } from '../utils';
import { NexPrismAddrsAndInfo } from './config';
import { prism_nexprism_full_init, stake_nyluna_test, stake_unstake_nexprism_without_claiming_rewards } from './definition';

async function run_program() {
    const program = new Command();

    program
        .action(async () => {
            // TODO: put everything together here
            // const nex_prism_addrs_and_info = await deploy();
            // await run_stake_unstake_nexprism_without_claiming_rewards(nex_prism_addrs_and_info)
        });

    program
        .command('deploy')
        .action(async () => {
            await deploy();
        });

    program
        .command('stake_nyluna')
        .action(async () => {
            await run_stake_nyluna_test(await deploy());
        });

    // main test: npm run nex-prism-integration-tests -- stake_unstake_nexprism_without_claiming_rewards
    program
        .command('stake_unstake_nexprism_without_claiming_rewards')
        .action(async () => {
            await run_stake_unstake_nexprism_without_claiming_rewards(await deploy());
        })
    
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
    const nex_prism_addrs_and_info = await prism_nexprism_full_init(lcd_client, sender);
    return nex_prism_addrs_and_info;
}

async function run_stake_unstake_nexprism_without_claiming_rewards(nex_prism_addrs_and_info: NexPrismAddrsAndInfo) {
    const [lcd_client, sender] = await get_lcd_config_with_wallet_for_integration_tests_only();
    await stake_unstake_nexprism_without_claiming_rewards(lcd_client, sender, nex_prism_addrs_and_info);
}

async function run_stake_nyluna_test(nex_prism_addrs_and_info: NexPrismAddrsAndInfo) {
    const [lcd_client, sender] = await get_lcd_config_with_wallet_for_integration_tests_only();
    await stake_nyluna_test(lcd_client, sender, nex_prism_addrs_and_info);
}