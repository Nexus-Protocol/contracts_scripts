import { getContractEvents, LCDClient, LocalTerra, Wallet } from "@terra-money/terra.js";
import * as assert from "assert";
import Decimal from "decimal.js";
import { init_governance_contract, init_psi_token } from "../../basset_vault/definition";
import { Cw20CodeId, GovernanceConfig, init_astroport_factory, init_astroport_factory_stableswap, PSiTokensOwner, TokenConfig } from "../../config";
import { instantiate_contract_raw, execute_contract, get_token_balance, instantiate_contract, sleep, store_contract, increase_token_allowance } from "../../utils";
import { PrismMarketInfo } from "../deploy_prism/config";
import { prism_init, stake_prism_for_xprism } from "../deploy_prism/definition";
import { NexPrismAddrsAndInfo, NexPrismDeploymentInfo, StakerResponse, StakingConfig, VaultConfig } from "./config";

const artifacts_path = "wasm_artifacts";
const path_to_nexprism_artifacts = `${artifacts_path}/nexus/nexprism`;
const nexus_prism_autocompounder = `${path_to_nexprism_artifacts}/nexus_prism_autocompounder.wasm`;
const nexus_prism_staking = `${path_to_nexprism_artifacts}/nexus_prism_staking.wasm`;
const nexus_prism_vault = `${path_to_nexprism_artifacts}/nexus_prism_vault.wasm`;

async function full_nex_prism_init(
    lcd_client: LCDClient,
    sender: Wallet,
    xprism_token_addr: string,
    psi_token_addr: string,
    cw20_code_id: number,
    governance_contract_addr: string,
    astroport_factory_contract_addr: string,
    prism_token_addr: string,
    yluna_addr: string,
    xprism_prism_pair: string,
    prism_launch_pool: string,
    prism_xprism_boost_addr: string,
    yluna_prism_pair: string,
    prism_governance_addr: string,
): Promise<NexPrismDeploymentInfo> {
    let staking_code_id = await store_contract(lcd_client, sender, nexus_prism_staking)
    console.log(`nexus_prism_staking uploaded\n\tcode_id: ${staking_code_id}`);

    let vault_code_id = await store_contract(lcd_client, sender, nexus_prism_vault)
    console.log(`nexus_prism_vault uploaded\n\tcode_id: ${vault_code_id}`);

    let autocompounder_code_id = await store_contract(lcd_client, sender, nexus_prism_autocompounder)
    console.log(`nexus_prism_autocompounder uploaded\n\tcode_id: ${autocompounder_code_id}`);

    const vault_config = VaultConfig(
        sender.key.accAddress,
        psi_token_addr,
        cw20_code_id,
        staking_code_id,
        xprism_token_addr,
        astroport_factory_contract_addr,
        prism_token_addr,
        governance_contract_addr,
        yluna_addr,
        xprism_prism_pair,
        prism_launch_pool,
        prism_xprism_boost_addr,
        yluna_prism_pair,
        autocompounder_code_id,
        prism_governance_addr,
    )
    console.log("STEVENDEBUG vault_config ", vault_config);

    let vault_deploy_res = await instantiate_contract_raw(
        lcd_client,
        sender,
        sender.key.accAddress,
        vault_code_id,
        vault_config,
    )

    let vault_deployment_addr = ""
    let nexprism_token_addr = ""
    let nyluna_token_addr = ""
    let nyluna_staking_addr = ""
    let nexprism_staking_addr = ""
    let nexprism_xprism_pair_addr = ""
    let psi_staking_addr = ""

    let contract_events = vault_deploy_res ? getContractEvents(vault_deploy_res) : [];
    for (let contract_event of contract_events) {
        let nexprism_token = contract_event["nexprism_token"];
        if (nexprism_token) {
            nexprism_token_addr = nexprism_token;
        }

        let vault_addr = contract_event["contract_address"];
        if (vault_addr) {
            vault_deployment_addr = vault_addr;
        }

        let nyluna_token = contract_event["nyluna_token"];
        if (nyluna_token) {
            nyluna_token_addr = nyluna_token;
        }

        let nyluna_staking = contract_event["nyluna_staking"];
        if (nyluna_staking) {
            nyluna_staking_addr = nyluna_staking;
        }

        let nexprism_staking = contract_event["nexprism_staking"];
        if (nexprism_staking) {
            nexprism_staking_addr = nexprism_staking;
        }

        let nexprism_xprism_pair = contract_event["nexprism_xprism_pair"];
        if (nexprism_xprism_pair) {
            nexprism_xprism_pair_addr = nexprism_xprism_pair;
        }
        let psi_staking = contract_event["psi_staking"];
        if (psi_staking) {
            psi_staking_addr = psi_staking;
        }
    }

    console.log(`nexus_prism_vault instantiated\n\taddress: ${vault_deployment_addr}`);
    console.log(`=======================`);

    return {
        staking_code_id,
        vault_code_id,
        autocompounder_code_id,
        vault_config,
        vault_deployment_addr,
        nexprism_token_addr,
        nyluna_token_addr,
        nyluna_staking_addr,
        nexprism_staking_addr,
        nexprism_xprism_pair_addr,
        psi_staking_addr
    }
}

async function provide_nexprism_xprism_liquidity(lcd_client: LCDClient, sender: Wallet, prism_market_info: PrismMarketInfo, nex_prism_info: NexPrismDeploymentInfo) {
    const liquidityAmount = 100_000_000_000_000;
    const liquidityAmountStr = String(100_000_000_000_000);

    await execute_contract(
        lcd_client,
        sender,
        prism_market_info.prism_token_addr,
        { transfer: { recipient: prism_market_info.prism_launch_pool_addr, amount: "1000000000000000" } },
    );

    await stake_prism_for_xprism(
        lcd_client,
        sender,
        prism_market_info.prism_token_addr,
        prism_market_info.prism_gov_addr,
        2 * liquidityAmount
    );
    await deposit_xprism_to_nexprism_vault(
        lcd_client,
        sender,
        prism_market_info.xprism_token_addr,
        nex_prism_info.vault_deployment_addr,
        liquidityAmount
    );

    const msgIncreaseAllowance = {
        increase_allowance: {
            spender: nex_prism_info.nexprism_xprism_pair_addr,
            amount: liquidityAmountStr,
        }
    };
    await execute_contract(lcd_client, sender, nex_prism_info.nexprism_token_addr, msgIncreaseAllowance);
    await execute_contract(lcd_client, sender, prism_market_info.xprism_token_addr, msgIncreaseAllowance);

    const msgProvideLiquidity =
    {
        provide_liquidity: {
            assets: [
                {
                    amount: liquidityAmountStr,
                    info: {
                        token: {
                            contract_addr: nex_prism_info.nexprism_token_addr,
                        }
                    }
                },
                {
                    amount: liquidityAmountStr,
                    info: {
                        token: {
                            contract_addr: prism_market_info.xprism_token_addr,
                        }
                    }
                },
            ]
        }
    };
    await execute_contract(lcd_client, sender, nex_prism_info.nexprism_xprism_pair_addr, msgProvideLiquidity);

}

export async function prism_nexprism_full_init(
    lcd_client: LCDClient,
    sender: Wallet,
): Promise<NexPrismAddrsAndInfo> {
    // get cw20_code_id
    let cw20_code_id = await Cw20CodeId(lcd_client, sender);
    console.log(`=======================`);

    // instantiate governance contract_addr
    let governance_config = GovernanceConfig(lcd_client);
    let governance_contract_addr = await init_governance_contract(lcd_client, sender, governance_config);
    console.log(`=======================`);

    // instantiate psi_token
    let token_config = TokenConfig(lcd_client, governance_contract_addr, PSiTokensOwner(lcd_client, sender, sender.key.accAddress));
    let psi_token_addr = await init_psi_token(lcd_client, sender, cw20_code_id, token_config);
    console.log(`=======================`);

    // instantiate prism contracts
    const prism_market_info = await prism_init(lcd_client, sender, cw20_code_id);

    // astroport
    // source: https://docs.astroport.fi/astroport/smart-contracts/astroport-factory#3.-pool-creation-and-querying-walkthrough
    let astroport_stableswap_factory_contract_addr = await init_astroport_factory_stableswap(lcd_client, sender, cw20_code_id);

    // instantiate nexprism contracts
    const nex_prism_info = await full_nex_prism_init(
        lcd_client,
        sender,
        prism_market_info.xprism_token_addr,
        psi_token_addr,
        cw20_code_id,
        governance_contract_addr,
        astroport_stableswap_factory_contract_addr,
        prism_market_info.prism_token_addr,
        prism_market_info.yluna_token_addr,
        prism_market_info.xprism_prism_pair_addr,
        prism_market_info.prism_launch_pool_addr,
        prism_market_info.prism_xprism_boost_addr,
        prism_market_info.yluna_prism_pair_addr,
        prism_market_info.prism_gov_addr
    )
    // set psi token addr to governance contract
    await execute_contract(lcd_client, sender, governance_contract_addr,
        {
            anyone: {
                anyone_msg: {
                    register_token: {
                        psi_token: psi_token_addr
                    }
                }
            }
        }
    );
    //set psi_staking add to Governance
    {
        await execute_contract(lcd_client, sender, governance_contract_addr, {
            governance: {
                governance_msg: {
                    update_config: {
                        psi_nexprism_staking: nex_prism_info.psi_staking_addr
                    }
                }
            }
        });
    }

    await provide_nexprism_xprism_liquidity(lcd_client, sender, prism_market_info, nex_prism_info);
    console.log(`Liquidity provided for nexPRISM-xPRISM pair`);
    console.log(`=======================`);

    return {
        cw20_code_id,
        governance_config,
        governance_contract_addr,
        psi_token_addr,
        prism_market_info,
        nex_prism_info
    }
}

async function deposit_xprism_to_nexprism_vault(lcd_client: LCDClient, sender: Wallet, xprism_token_addr: string, recipient_addr: string, amount: number) {
    const deposit_msg = { deposit: {} };

    const send_result = await execute_contract(lcd_client, sender, xprism_token_addr, {
        send: {
            contract: recipient_addr,
            amount: amount.toString(),
            msg: Buffer.from(JSON.stringify(deposit_msg)).toString('base64'),
        }
    });

    return send_result;
}

async function deposit_yluna_to_nyluna_vault(lcd_client: LCDClient, sender: Wallet, yluna_token_addr: string, recipient_addr: string, amount: number) {
    const deposit_msg = { deposit: {} };

    const send_result = await execute_contract(lcd_client, sender, yluna_token_addr, {
        send: {
            contract: recipient_addr,
            amount: amount.toString(),
            msg: Buffer.from(JSON.stringify(deposit_msg)).toString('base64'),
        }
    });

    return send_result;
}

async function stake_nexprism(lcd_client: LCDClient, sender: Wallet, nexprism_token_addr: string, nexprism_staking_addr: string, amount: number) {
    const msg = { bond: {} };
    const recipient_addr = nexprism_staking_addr;

    const send_result = await execute_contract(lcd_client, sender, nexprism_token_addr, {
        send: {
            contract: recipient_addr,
            amount: amount.toString(),
            msg: Buffer.from(JSON.stringify(msg)).toString('base64'),
        }
    });

    return send_result;
}

export async function deposit_yluna(lcd_client: LCDClient, sender: Wallet, yluna_token: string, nexprism_vault: string, amount: number) {
    const msg = { deposit: {} };

    const send_result = await execute_contract(lcd_client, sender, yluna_token, {
        send: {
            contract: nexprism_vault,
            amount: amount.toString(),
            msg: Buffer.from(JSON.stringify(msg)).toString('base64'),
        }
    });

    return send_result;
}

async function claim_all_nexprism_rewards(lcd_client: LCDClient, sender: Wallet, _nexprism_token_addr: string, nexprism_staking_addr: string) {
    // query amt of rewards
    let rewards_earned_resp = await lcd_client.wasm.contractQuery(nexprism_staking_addr, {
        rewards: {
            address: sender.key.accAddress
        }
    });
    console.log("STEVENDEBUG rewards_earned_resp ", rewards_earned_resp);


    // TODO:
    // const claim_rewards_result = await execute_contract(lcd_client, sender, nexprism_staking_addr, {
    //     anyone: {
    //         anyone_msg: {
    //             claim_rewards: {
    //                 recipient: sender.key.accAddress,
    //             }
    //         }
    //     }
    // });

    // console.log("STEVENDEBUG claim_rewards_result ", claim_rewards_result);
    return null;
}

async function stake_nyluna(lcd_client: LCDClient, sender: Wallet, nyluna_token: string, nyluna_staking: string, amount: number) {
    const msg = { bond: {} };

    const send_result = await execute_contract(lcd_client, sender, nyluna_token, {
        send: {
            contract: nyluna_staking,
            amount: amount.toString(),
            msg: Buffer.from(JSON.stringify(msg)).toString('base64'),
        }
    });

    return send_result;
}

export async function simple_deposit(
    lcd_client: LCDClient,
    sender: Wallet,
    nex_prism_addrs_and_info: NexPrismAddrsAndInfo
) {
    // check xprism balance
    const prism_bal = await get_token_balance(
        lcd_client,
        sender.key.accAddress,
        nex_prism_addrs_and_info.prism_market_info.prism_token_addr
    )
    assert(prism_bal > 0)
    console.log("prism balance: ", prism_bal);

    // stake some prism for xprism
    await stake_prism_for_xprism(
        lcd_client,
        sender,
        nex_prism_addrs_and_info.prism_market_info.prism_token_addr,
        nex_prism_addrs_and_info.prism_market_info.prism_gov_addr,
        prism_bal / 2
    )
    const xprism_bal = await get_token_balance(
        lcd_client,
        sender.key.accAddress,
        nex_prism_addrs_and_info.prism_market_info.xprism_token_addr
    )
    assert(xprism_bal > 0)
    console.log("xprism balance: ", xprism_bal);

    console.log("deposit xprism to vault");
    const x = await deposit_xprism_to_nexprism_vault(
        lcd_client,
        sender,
        nex_prism_addrs_and_info.prism_market_info.xprism_token_addr,
        nex_prism_addrs_and_info.nex_prism_info.vault_deployment_addr,
        xprism_bal / 2
    )
    console.log(`EVENTS: ${JSON.stringify(getContractEvents(x!))}`);
    const xprism_bal_after_dep = await get_token_balance(
        lcd_client,
        sender.key.accAddress,
        nex_prism_addrs_and_info.prism_market_info.xprism_token_addr
    )
    assert(xprism_bal > xprism_bal_after_dep)
    console.log("xprism balance after deposit: ", xprism_bal_after_dep);

    // assert recieve correct amount of nexprism back
    const nexprism_bal = await get_token_balance(
        lcd_client,
        sender.key.accAddress,
        nex_prism_addrs_and_info.nex_prism_info.nexprism_token_addr
    )
    assert(nexprism_bal > 0)
    console.log("nexprism balance after staking xprism: ", nexprism_bal);

    await sleep(5000);
    console.log("deposit xprism to vault");
    const y = await deposit_xprism_to_nexprism_vault(
        lcd_client,
        sender,
        nex_prism_addrs_and_info.prism_market_info.xprism_token_addr,
        nex_prism_addrs_and_info.nex_prism_info.vault_deployment_addr,
        xprism_bal_after_dep / 10
    )
    console.log(`EVENTS: ${JSON.stringify(getContractEvents(y!))}`);

    const q1: any = await lcd_client.wasm.contractQuery(
        nex_prism_addrs_and_info.prism_market_info.prism_xprism_boost_addr, { get_boost: { user: nex_prism_addrs_and_info.nex_prism_info.vault_deployment_addr } });
    console.log(`q: ${JSON.stringify(q1)}`);
    const q2: any = await lcd_client.wasm.contractQuery(
        nex_prism_addrs_and_info.prism_market_info.prism_launch_pool_addr, { distribution_status: {} });
    console.log(`q: ${JSON.stringify(q2)}`);
    const q3: any = await lcd_client.wasm.contractQuery(
        nex_prism_addrs_and_info.prism_market_info.prism_launch_pool_addr, { config: {} });
    console.log(`q: ${JSON.stringify(q3)}`);
    const q4: any = await lcd_client.wasm.contractQuery(
        nex_prism_addrs_and_info.prism_market_info.prism_launch_pool_addr, { reward_info: { staker_addr: nex_prism_addrs_and_info.nex_prism_info.vault_deployment_addr } });
    console.log(`q: ${JSON.stringify(q4)}`);

    let r: any = await lcd_client.wasm.contractQuery(
        nex_prism_addrs_and_info.nex_prism_info.vault_deployment_addr, { simulate_update_rewards_distribution: {} });
    console.log(`UPDATE: ${JSON.stringify(r)}`);

    // stake nexprism
    await stake_nexprism(
        lcd_client,
        sender,
        nex_prism_addrs_and_info.nex_prism_info.nexprism_token_addr,
        nex_prism_addrs_and_info.nex_prism_info.nexprism_staking_addr,
        nexprism_bal
    )

    // assert recieve correct amount of reward
    const mins = 0.5;
    const millisecs = mins * 60 * 1000;
    console.log("waiting for ", mins, " mins to accumulate rewards. Edit the mins variable to change the wait times.");
    await sleep(millisecs)

    await claim_all_nexprism_rewards(
        lcd_client,
        sender,
        nex_prism_addrs_and_info.nex_prism_info.nexprism_token_addr,
        nex_prism_addrs_and_info.nex_prism_info.nexprism_staking_addr
    )
}

async function depositYLUNAAndStakeNyLUNA(
    lcd_client: LCDClient,
    sender: Wallet,
    nex_prism_addrs_and_info: NexPrismAddrsAndInfo,
    amount: number,
) {
    const yluna_token = nex_prism_addrs_and_info.prism_market_info.yluna_token_addr;
    const nyluna_token = nex_prism_addrs_and_info.nex_prism_info.nyluna_token_addr;
    const nyluna_staking = nex_prism_addrs_and_info.nex_prism_info.nyluna_staking_addr;
    const nexprism_vault = nex_prism_addrs_and_info.nex_prism_info.vault_deployment_addr;

    const yluna_deposit_amount = amount;

    // check yluna balance
    const yluna_bal = await get_token_balance(
        lcd_client,
        sender.key.accAddress,
        yluna_token,
    )
    assert(yluna_bal >= yluna_deposit_amount);

    const x = await deposit_yluna(lcd_client, sender, yluna_token, nexprism_vault, yluna_deposit_amount);
    console.log(`EVENTS: ${JSON.stringify(getContractEvents(x!))}`);

    const nyluna_bal = await get_token_balance(
        lcd_client,
        sender.key.accAddress,
        nyluna_token,
    )
    assert(nyluna_bal == yluna_deposit_amount);

    await stake_nyluna(lcd_client, sender, nyluna_token, nyluna_staking, nyluna_bal);
}

export async function stake_nyluna_test(
    lcd_client: LCDClient,
    sender: Wallet,
    nex_prism_addrs_and_info: NexPrismAddrsAndInfo
) {
    console.log("Start staking nyluna test");

    const nyluna_staking = nex_prism_addrs_and_info.nex_prism_info.nyluna_staking_addr;

    const amount = 100_000_000;

    await depositYLUNAAndStakeNyLUNA(lcd_client, sender, nex_prism_addrs_and_info, amount);

    const staker: StakerResponse = await lcd_client.wasm.contractQuery(nyluna_staking, {
        staker: {
            address: sender.key.accAddress,
        }
    });

    console.log("Staker:", staker);
    assert(Number(staker.balance) == amount);

    console.log("Staked nyluna successfully");
}

export async function claim_reward_from_stacking_nyluna(
    lcd_client: LCDClient,
    sender: Wallet,
    nex_prism_addrs_and_info: NexPrismAddrsAndInfo
) {
    console.log("Start claim_reward_from_stacking_nyluna test");
    console.log("deposit yluna to vault");
    const x = await deposit_yluna_to_nyluna_vault(
        lcd_client,
        sender,
        nex_prism_addrs_and_info.prism_market_info.yluna_token_addr,
        nex_prism_addrs_and_info.nex_prism_info.vault_deployment_addr,
        5_000_000_000
    );
    console.log(`EVENTS: ${JSON.stringify(getContractEvents(x!))}`);
    await sleep(20000);

    const yluna_token = nex_prism_addrs_and_info.prism_market_info.yluna_token_addr;
    const nyluna_token = nex_prism_addrs_and_info.nex_prism_info.nyluna_token_addr;
    const nyluna_staking = nex_prism_addrs_and_info.nex_prism_info.nyluna_staking_addr;
    const prism_token = nex_prism_addrs_and_info.prism_market_info.prism_token_addr;

    const nyluna_bal = await get_token_balance(
        lcd_client,
        sender.key.accAddress,
        nyluna_token,
    )

    await stake_nyluna(lcd_client, sender, nyluna_token, nyluna_staking, nyluna_bal);

    const sender2: Wallet = (lcd_client as LocalTerra).wallets.test2;

    const deposit_from_sender2_amount = 3_000_000_000;

    await execute_contract(lcd_client, sender, yluna_token, {
        transfer: {
            recipient: sender2.key.accAddress,
            amount: (deposit_from_sender2_amount).toString(),
        }
    });

    await depositYLUNAAndStakeNyLUNA(lcd_client, sender2, nex_prism_addrs_and_info, deposit_from_sender2_amount / 2);

    const prism_bal_before_claim = await get_token_balance(
        lcd_client,
        sender.key.accAddress,
        prism_token,
    )
    const prism_bal_before_claim2 = await get_token_balance(
        lcd_client,
        sender2.key.accAddress,
        prism_token,
    )
    console.log("prism balance before reward:", prism_bal_before_claim, prism_bal_before_claim2);

    await sleep(10000);
    await depositYLUNAAndStakeNyLUNA(lcd_client, sender2, nex_prism_addrs_and_info, deposit_from_sender2_amount / 2);

    const staker: StakerResponse = await lcd_client.wasm.contractQuery(nyluna_staking, {
        staker: {
            address: sender.key.accAddress,
        }
    });
    console.log("Staker:", staker);

    const staker2: StakerResponse = await lcd_client.wasm.contractQuery(nyluna_staking, {
        staker: {
            address: sender2.key.accAddress,
        }
    });
    console.log("Staker2:", staker2);

    // Claim Prism reward
    await execute_contract(lcd_client, sender, nyluna_staking, {
        anyone: {
            anyone_msg: {
                claim_rewards: {
                }
            }
        }
    });
    // Claim Prism reward
    await execute_contract(lcd_client, sender2, nyluna_staking, {
        anyone: {
            anyone_msg: {
                claim_rewards: {
                }
            }
        }
    });

    const prism_bal_after_claim = await get_token_balance(
        lcd_client,
        sender.key.accAddress,
        prism_token,
    )
    const prism_bal_after_claim2 = await get_token_balance(
        lcd_client,
        sender2.key.accAddress,
        prism_token,
    )
    console.log("prism balance after reward:", prism_bal_after_claim, prism_bal_after_claim2);

    assert(prism_bal_after_claim > prism_bal_before_claim);
    assert(prism_bal_after_claim2 > prism_bal_before_claim2);

    console.log("Test claim_reward_from_stacking_nyluna passed!");
}

async function printVaultConfig(lcdClient: LCDClient, vault: string) {
    console.log("===================================");
    const config = await lcdClient.wasm.contractQuery(vault, { config: {} });
    console.log(`nexPRISM/nyLUNA vault config: ${JSON.stringify(config!)}`);
    console.log("===================================");
}

async function stakePSI(
    lcdClient: LCDClient,
    sender: Wallet,
    psiToken: string,
    governance: string,
    amount: Decimal,
) {
    const msg = { stake_voting_tokens: {} };
    await execute_contract(lcdClient, sender, psiToken, {
        send: {
            contract: governance,
            amount: amount.toFixed(0),
            msg: Buffer.from(JSON.stringify(msg)).toString('base64'),
        }
    });
}

async function unstakePSI(
    lcdClient: LCDClient,
    sender: Wallet,
    governance: string,
    amount: Decimal,
) {
    let r = await execute_contract(lcdClient, sender, governance, {
        anyone: {
            anyone_msg: {
                withdraw_voting_tokens: {
                    amount: amount.toFixed(0),
                }
            }
        }
    });
}

async function getStaker(lcdClient: LCDClient, sender: Wallet, staking: string) {
    const staker: StakerResponse = await lcdClient.wasm.contractQuery(staking, {
        staker: {
            address: sender.key.accAddress,
        }
    });
    return {
        virtualPendingRewards: new Decimal(staker.virtual_pending_rewards),
        realPendingRewards: new Decimal(staker.real_pending_rewards),
    };
}

async function transfer(
    lcdClient: LCDClient,
    from: Wallet,
    to: Wallet,
    token: string,
    amount: Decimal,
) {
    await execute_contract(lcdClient, from, token, {
        transfer: {
            recipient: to.key.accAddress,
            amount: amount.toFixed(0),
        }
    });
}

async function makeVaultClaimAllRewards(lcdClient: LCDClient, sender: Wallet, vault: string) {
    await execute_contract(lcdClient, sender, vault, {
        claim_all_rewards: {}
    });
}

async function claimRewards(lcdClient: LCDClient, sender: Wallet, staking: string) {
    await execute_contract(lcdClient, sender, staking, {
        anyone: {
            anyone_msg: {
                claim_rewards: {}
            }
        }
    });
}

type BalanceResponse = {
    balance: string,
}

async function getTokenBalance(lcdClient: LCDClient, token: string, addr: string) {
    let r: BalanceResponse = await lcdClient.wasm.contractQuery(token, { balance: { address: addr } });
    return r;
}

export async function psiStakingAndGovernanceCommunicateProperly(
    lcdClient: LCDClient,
    sender: Wallet,
    info: NexPrismAddrsAndInfo,
) {
    console.log("TEST psiStakingAndGovernanceCommunicateProperly START");

    const vault = info.nex_prism_info.vault_deployment_addr;
    const ylunaToken = info.prism_market_info.yluna_token_addr;
    const nexprismToken = info.nex_prism_info.nexprism_token_addr;
    const psiToken = info.psi_token_addr;
    const psiStaking = info.nex_prism_info.psi_staking_addr;
    const governance = info.governance_contract_addr;

    const sender2: Wallet = (lcdClient as LocalTerra).wallets.test2;

    await printVaultConfig(lcdClient, vault);

    console.log(`Stake PSI tokens into governance`);
    {
        await stakePSI(lcdClient, sender, psiToken, governance, new Decimal(1_000_000_000));
        const pendingRewards = await getStaker(lcdClient, sender, psiStaking);
        assert.strictEqual(pendingRewards.virtualPendingRewards.toFixed(), "0");
        assert.strictEqual(pendingRewards.realPendingRewards.toFixed(), "0");
    }
    console.log("===================================");

    console.log(`Deposit yLUNA tokens to vault`);
    {
        const sender2YLUNABalance = new Decimal(10_000_000_000);
        await transfer(lcdClient, sender, sender2, ylunaToken, sender2YLUNABalance);
        await depositYLUNAAndStakeNyLUNA(lcdClient, sender2, info, sender2YLUNABalance.toNumber());
    }
    console.log("===================================");

    console.log(`Wait for rewards and make vault claim PRISM rewards`);
    {
        await sleep(11000);
        await makeVaultClaimAllRewards(lcdClient, sender, vault);
    }
    console.log("===================================");

    console.log(`Stake PSI tokens into governance`);
    {
        await stakePSI(lcdClient, sender, psiToken, governance, new Decimal(1_000_000_000));
        const pendingRewards = await getStaker(lcdClient, sender, psiStaking);
        assert.notStrictEqual(pendingRewards.virtualPendingRewards.toFixed(), "0");
        assert.notStrictEqual(pendingRewards.realPendingRewards.toFixed(), "0");
    }
    console.log("===================================");

    console.log(`Wait for rewards and make vault claim PRISM rewards`);
    {
        await sleep(11000);
        await makeVaultClaimAllRewards(lcdClient, sender, vault);
    }
    console.log("===================================");

    console.log(`Unstake a half of PSI tokens from governance`);
    {
        await unstakePSI(lcdClient, sender, governance, new Decimal(1_000_000_000));
    }
    console.log("===================================");

    console.log(`Collect rewards from PSI staking`);
    {
        await claimRewards(lcdClient, sender, psiStaking);
        const nexprismBalance =
            await getTokenBalance(lcdClient, nexprismToken, sender.key.accAddress);
        console.log(`Amount of nexPRISM rewards got: ${nexprismBalance.balance}`);
        assert(new Decimal(nexprismBalance.balance) > new Decimal(0));
    }
    console.log("===================================");

    console.log("TEST psiStakingAndGovernanceCommunicateProperly END");
}
