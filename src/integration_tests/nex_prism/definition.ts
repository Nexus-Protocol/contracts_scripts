import { LCDClient, Wallet } from "@terra-money/terra.js";
import { init_governance_contract, init_psi_token } from "../../basset_vault/definition";
import { Cw20CodeId, GovernanceConfig, init_astroport_factory, init_astroport_factory_stableswap, PSiTokensOwner, TokenConfig } from "../../config";
import { create_token_to_token_astroport_pair, instantiate_contract, store_contract } from "../../utils";
import { prism_init } from "../deploy_prism/definition";
import { StakingConfig, VaultConfig } from "./config";

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
    yluna_prism_pair: string
) {
    let staking_code_id = await store_contract(lcd_client, sender, nexus_prism_staking)
    console.log(`nexus_prism_staking uploaded\n\tcode_id: ${staking_code_id}`);

    let vault_code_id = await store_contract(lcd_client, sender, nexus_prism_vault)
    console.log(`nexus_prism_vault uploaded\n\tcode_id: ${vault_code_id}`);

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
        yluna_prism_pair
    )

    console.log("STEVENDEBUG vault_config ", vault_config);
    console.log("STEVENDEBUG sender.key.accAddress ", sender.key.accAddress);

    let vault_deployment_addr = await instantiate_contract(
        lcd_client,
        sender,
        sender.key.accAddress,
        vault_code_id,
        vault_config,
    )
    return

    console.log(`nexus_prism_vault instantiated\n\taddress: ${vault_deployment_addr}`);
    console.log(`=======================`);

    let autocompounder_code_id = await store_contract(lcd_client, sender, nexus_prism_autocompounder)
    console.log(`nexus_prism_autocompounder uploaded\n\tcode_id: ${autocompounder_code_id}`);

    // TODO:
    // const autocompounder_config = AutocompounderGovConfig(sender.key.accAddress, xprism_token_addr);
    // let autocompounder_deployment_addr = await instantiate_contract(
    // 	lcd_client,
    // 	sender,
    // 	sender.key.accAddress,
    // 	autocompounder_code_id,
    // 	autocompounder_config,
    // );
}

export async function prism_nexprism_full_init(
    lcd_client: LCDClient,
    sender: Wallet,
) {
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
    // let astroport_stableswap_factory_contract_addr = await init_astroport_factory_stableswap(lcd_client, sender, cw20_code_id);
    // let astroport_constant_prod_factory_contract_addr = await init_astroport_factory(lcd_client, sender, cw20_code_id);
    
    // let yluna_prism_pair = await create_token_to_token_astroport_pair(
    //     lcd_client,
    //     sender,
    //     astroport_constant_prod_factory_contract_addr,
    //     prism_market_info.prism_token_addr,
    //     prism_market_info.yluna_token_addr
    // )
    
    // return 

    // let xprism_prism_pair = await create_token_to_token_astroport_pair(
    //     lcd_client,
    //     sender,
    //     astroport_stableswap_factory_contract_addr,
    //     prism_market_info.prism_token_addr,
    //     prism_market_info.xprism_token_addr
    // )

    // instantiate nexprism contracts
    const nex_prism_info = await full_nex_prism_init(
        lcd_client,
        sender,
        prism_market_info.xprism_token_addr,
        psi_token_addr,
        cw20_code_id,
        governance_contract_addr,
        prism_market_info.prismswap_info.prismswap_factory_address,
        prism_market_info.prism_token_addr,
        prism_market_info.yluna_token_addr,
        prism_market_info.xprism_prism_pair_addr,
        prism_market_info.prism_launch_pool_addr,
        prism_market_info.prism_xprism_boost_addr,
        prism_market_info.yluna_prism_pair_addr
    )

    return

    // TODO: remove log and compile into result
    console.log("prism_market_info: ", prism_market_info);
    console.log("nex_prism_info: ", nex_prism_info);

    // sample
    // let [basset_vault_info_for_bluna, basset_vault_info_for_beth] = await full_basset_vault_init(lcd_client, sender, psi_token_initial_owner, anchor_market_info);

    // const oracle_addr = anchor_market_info.oracle_addr;
    // const bluna_token_addr = anchor_market_info.bluna_token_addr;
    // const beth_token_addr = anchor_market_info.beth_token_addr;

    // await register_basset_price_feeder(lcd_client, sender, oracle_addr, bluna_token_addr);
    // await register_basset_price_feeder(lcd_client, sender, oracle_addr, beth_token_addr);

    // await feed_price(lcd_client, sender, oracle_addr, bluna_token_addr, bluna_init_price);
    // await feed_price(lcd_client, sender, oracle_addr, beth_token_addr, beth_init_price);

    // const addresses_holder_config = AddressesHolderConfig(prism_market_info);
    // const addresses_holder_addr = await create_contract(lcd_client, sender, "addrs_holder", addresses_holder_wasm, addresses_holder_config);

    return {}
}
