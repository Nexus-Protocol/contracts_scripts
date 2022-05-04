import { getContractEvents, LCDClient, Wallet } from "@terra-money/terra.js";
import { assert } from "console";
import { init_governance_contract, init_psi_token } from "../../basset_vault/definition";
import { Cw20CodeId, GovernanceConfig, init_astroport_factory, init_astroport_factory_stableswap, PSiTokensOwner, TokenConfig } from "../../config";
import { instantiate_contract_raw, execute_contract, get_token_balance, instantiate_contract, sleep, store_contract, increase_token_allowance } from "../../utils";
import { PrismMarketInfo } from "../deploy_prism/config";
import { prism_init, stake_prism_for_xprism } from "../deploy_prism/definition";
import { NexPrismAddrsAndInfo, NexPrismDeploymentInfo, StakingConfig, VaultConfig } from "./config";

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
        nexprism_xprism_pair_addr
    }
}

async function provide_nexprism_xprism_liquidity(lcd_client: LCDClient, sender: Wallet, prism_market_info: PrismMarketInfo, nex_prism_info: NexPrismDeploymentInfo) {
    const liquidityAmount = 100_000_000_000;
    const liquidityAmountStr = String(100_000_000_000);

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

async function stake_nexprism(lcd_client: LCDClient, sender: Wallet, nexprism_token_addr: string, nexprism_staking_addr: string, amount: number) {    
    // https://github.com/Nexus-Protocol/nex-prism-convex/blob/20c0cce51e8e6810107c981e0189cd4c41701e1d/contracts/nexus_prism_staking/src/commands.rs#L42
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

    // deposit xprism to vault
    await deposit_xprism_to_nexprism_vault(
        lcd_client,
        sender,
        nex_prism_addrs_and_info.prism_market_info.xprism_token_addr,
        nex_prism_addrs_and_info.nex_prism_info.vault_deployment_addr,
        xprism_bal / 2
    )
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

    // stake the nexprism
    await stake_nexprism(
        lcd_client,
        sender,
        nex_prism_addrs_and_info.nex_prism_info.nexprism_token_addr,
        nex_prism_addrs_and_info.nex_prism_info.nexprism_staking_addr,
        nexprism_bal
    )
    const nexprism_bal_after_stake = await get_token_balance(
        lcd_client,
        sender.key.accAddress,
        nex_prism_addrs_and_info.nex_prism_info.nexprism_token_addr
    )
    assert(nexprism_bal_after_stake < nexprism_bal)
    console.log("nexprism balance after staking nexprism: ", nexprism_bal_after_stake);
}
