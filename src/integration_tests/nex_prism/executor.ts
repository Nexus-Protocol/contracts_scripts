import { Command } from 'commander';
import { get_lcd_config_with_wallet_for_integration_tests_only } from '../utils';
import { NexPrismAddrsAndInfo } from './config';
import { psiStakingAndGovernanceCommunicateProperly, claim_reward_from_stacking_nyluna, prism_nexprism_full_init, simple_deposit, stake_nyluna_test } from './definition';

async function run_program() {
    const program = new Command();

    program
        .action(async () => {
            const nex_prism_addrs_and_info = await deploy();
            await run_simple_deposit(nex_prism_addrs_and_info)
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

    program
        .command('claim_reward_from_stacking_nyluna')
        .action(async () => {
            await run_claim_reward_from_stacking_nyluna(await deploy());
        });

    program
        .command('governance_communication_to_nexprism_psi_staking')
        .action(async () => {
            await run_governance_communication_to_nexprism_psi_staking(await deploy());
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
    const nex_prism_addrs_and_info = await prism_nexprism_full_init(lcd_client, sender);
    return nex_prism_addrs_and_info;
}

async function run_simple_deposit(nex_prism_addrs_and_info: NexPrismAddrsAndInfo) {
    const [lcd_client, sender] = await get_lcd_config_with_wallet_for_integration_tests_only();
    await simple_deposit(lcd_client, sender, nex_prism_addrs_and_info);
}

async function run_stake_nyluna_test(nex_prism_addrs_and_info: NexPrismAddrsAndInfo) {
    const [lcd_client, sender] = await get_lcd_config_with_wallet_for_integration_tests_only();
    await stake_nyluna_test(lcd_client, sender, nex_prism_addrs_and_info);
}

async function run_claim_reward_from_stacking_nyluna(nex_prism_addrs_and_info: NexPrismAddrsAndInfo) {
    const [lcd_client, sender] = await get_lcd_config_with_wallet_for_integration_tests_only();
    await claim_reward_from_stacking_nyluna(lcd_client, sender, nex_prism_addrs_and_info);
}

async function run_governance_communication_to_nexprism_psi_staking(nex_prism_addrs_and_info: NexPrismAddrsAndInfo) {
    const [lcd_client, sender] = await get_lcd_config_with_wallet_for_integration_tests_only();
    await psiStakingAndGovernanceCommunicateProperly(lcd_client, sender, nex_prism_addrs_and_info);
}
