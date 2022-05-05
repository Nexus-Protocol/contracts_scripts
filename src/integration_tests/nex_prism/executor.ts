import { Command } from 'commander';
import { get_lcd_config_for_mainnet, get_lcd_config_with_wallet_for_integration_tests_only } from '../utils';
import { NexPrismAddrsAndInfo } from './config';
import { prism_nexprism_full_init, simple_deposit, stake_xprism_and_verify_rewards } from './definition';

async function run_program() {
    const program = new Command();

    program
        .action(async () => {
            const nex_prism_addrs_and_info = await deploy();
            await run_stake_xprism_and_verify_rewards(nex_prism_addrs_and_info);
            await run_nexprism_simple_deposit(nex_prism_addrs_and_info);
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
    const nex_prism_addrs_and_info = await prism_nexprism_full_init(lcd_client, sender);
    return nex_prism_addrs_and_info;
}

async function run_nexprism_simple_deposit(nex_prism_addrs_and_info: NexPrismAddrsAndInfo) {
    const [lcd_client, sender] = await get_lcd_config_with_wallet_for_integration_tests_only();
    await simple_deposit(lcd_client, sender, nex_prism_addrs_and_info);
}

async function run_stake_xprism_and_verify_rewards(nex_prism_addrs_and_info: NexPrismAddrsAndInfo) {
    const [lcd_client, sender] = await get_lcd_config_with_wallet_for_integration_tests_only();
    await stake_xprism_and_verify_rewards(lcd_client, sender, nex_prism_addrs_and_info);
}

// run this to compare prism contracts on mainnet
async function _run_check_mainnet_prism_contracts() {
    const mainnet_prism_boost_addr = "terra1pa4amk66q8punljptzmmftf6ylq3ezyzx6kl9m";
    const sample_mainnet_wallet_addr = "<use-prism-and-post-address-here>";

    const [lcd_client] = await get_lcd_config_for_mainnet();
    const res = await lcd_client.wasm.contractQuery(
        mainnet_prism_boost_addr,
        {
            get_boost: {
                user: sample_mainnet_wallet_addr
            }
        }
    )

    console.log("res: ", res);
}