import {LCDClient, Wallet} from '@terra-money/terra.js';
import {full_init as full_basset_vault_init} from "../../basset_vault/definition";
import {anchor_init} from "../deploy_anchor/definition";

//STEPS
// 1. Deploy anchor_market_contracts
// 2. Deploy basset_vault_init

export async function init(lcd_client: LCDClient, sender: Wallet, psi_token_initial_owner: string) {

    const anchor_market_info = await anchor_init(lcd_client, sender);
    let [basset_vault_for_bluna_addr, basset_vault_for_beth_addr] = await full_basset_vault_init(lcd_client, sender, psi_token_initial_owner, anchor_market_info);
}