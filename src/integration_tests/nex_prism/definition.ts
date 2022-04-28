import { LCDClient, Wallet } from "@terra-money/terra.js";
import { instantiate_contract, store_contract } from "../../utils";
import { prism_init } from "../deploy_prism/definition";
import { AutocompounderGovConfig } from "./config";

const artifacts_path = "wasm_artifacts";
const path_to_nexprism_artifacts = `${artifacts_path}/nexus/nexprism`;
const nexus_prism_autocompounder = `${path_to_nexprism_artifacts}/nexus_prism_autocompounder.wasm`;
const nexus_prism_staking = `${path_to_nexprism_artifacts}/nexus_prism_staking.wasm`;
const nexus_prism_vault = `${path_to_nexprism_artifacts}/nexus_prism_vault.wasm`;

async function full_nex_prism_init(
    lcd_client: LCDClient,
    sender: Wallet,
    xprism_token_addr: string,
) {
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


    let staking_code_id = await store_contract(lcd_client, sender, nexus_prism_staking)
    let vault_code_id = await store_contract(lcd_client, sender, nexus_prism_vault)


}

export async function prism_nexprism_full_init(
    lcd_client: LCDClient,
    sender: Wallet,
) {
    const prism_market_info = await prism_init(lcd_client, sender);
    const nex_prism_info = await full_nex_prism_init(
        lcd_client, 
        sender, 
        prism_market_info.xprism_token_addr
    )

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