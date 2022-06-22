import {readFileSync} from 'fs';
import {Command} from 'commander';
import {get_lcd_config_with_wallet, LCDConfig} from './../utils';
import {LCDClient, MsgExecuteContract, TxInfo} from "@terra-money/terra.js";

interface Config {
    lcd_client: LCDConfig,
    psi_token_initial_owner: string
}

const DEFAULT_CONFIG_PATH: string = 'src/find_height/config.json';
const ANCHOR_OVERSEER_ADDR: string = "terra1tmnqgvg567ypvsvk6rwsga3srp7e3lg6u0elp8";
const PRE_ATTACK_HEIGHT: number = 7544910;
const POST_ATTACK_HEIGHT: number = 7790000;
const MAY_11_LAST_BLOCK_HEIGHT: number = 7596270;
const BATOM_VAULT_ADDR: string = "terra1lh3h7l5vsul2pxlevraucwev42ar6kyx33u4c8";
const WASAVAX_VAULT_ADDR: string = "terra1hn9rzu66s422rl9kg0a7j2yxdjef0szkqvy7ws";

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
    const [lcd_client, _] = await get_lcd_config_with_wallet(config.lcd_client);
    let block_height = await vault_liquidation_search(lcd_client);
}

async function vault_liquidation_search(lcd_client: LCDClient){
    let atom = false;
    let avax = false;
    let current_height = PRE_ATTACK_HEIGHT;
    while (!atom || !avax) {
        if (current_height > MAY_11_LAST_BLOCK_HEIGHT) {
            return;
        }
        let tx_infos;
        try{
            tx_infos = await lcd_client.tx.txInfosByHeight(current_height);
        } catch (e) {
            console.log(`-> Failed to get block: ${current_height}`);
            continue;
        }
        console.log(`Block_height : ${current_height}`);

        for (const tx_info of tx_infos) {
            let msgs = tx_info.tx.body.messages;

            for (const msg of msgs) {
                if (msg instanceof MsgExecuteContract) {
                    if (msg.contract == ANCHOR_OVERSEER_ADDR) {
                        let some = JSON.stringify(msg.execute_msg);
                        if (some.includes("liquidate_collateral") && some.includes(BATOM_VAULT_ADDR)){
                            console.log(`------> batom vault liquidation found!!!! block height: ${current_height}`);
                            atom = true;
                        }
                        if (some.includes("liquidate_collateral") && some.includes(WASAVAX_VAULT_ADDR)) {
                            console.log(`------>  wasavax vault liquidation found!!!! block height: ${current_height}`);
                            avax = true;
                        }
                    }
                }
            }
        }
        current_height++;
    }
}

run_program()
    .then(text => {
        console.log(text);
    })
    .catch(err => {
        console.log(err);
    });
