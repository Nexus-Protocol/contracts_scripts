import {AnchorMarketInfo} from "../deploy_anchor/config";
import {BassetVaultInfo} from "../../utils";

export interface BalanceResponse {
    balance: string
}

//========================================================================================
export interface BorrowerInfoResponse {
    borrower: string,
    interest_index: string,
    reward_index: string,
    loan_amount: string,
    pending_rewards: string,
}

//========================================================================================
export interface TokenInfoResponse {
    name: string,
    symbol: string,
    decimals: number,
    total_supply: string,
}

//========================================================================================
export interface CollateralsResponse {
    borrower: String,
    collaterals: TokenHuman []
}

type TokenHuman = { [k: string]: string };

//========================================================================================

export interface AddressesHolderConfig {
    anchor_token_addr: string,
    anchor_market_addr: string,
    aterra_token_addr: string,
    anchor_oracle_addr: string,
    anchor_overseer_addr: string,
    basset_vault_for_bluna_addr: string,
    nluna_token_addr: string,
    basset_vault_for_beth_addr: string,
    neth_token_addr: string,
    bluna_hub_addr: string,
    bluna_token_addr: string,
    anchor_custody_bluna_addr: string,
    beth_token_addr: string,
    anchor_custody_beth_addr: string,
}

export function AddressesHolderConfig(
    anchor_market_info: AnchorMarketInfo,
    basset_vault_info_for_bluna: BassetVaultInfo,
    basset_vault_info_for_beth: BassetVaultInfo,
): AddressesHolderConfig {
    return {
        anchor_token_addr: anchor_market_info.anchor_token_addr,
        anchor_market_addr: anchor_market_info.contract_addr,
        aterra_token_addr: anchor_market_info.aterra_token_addr,
        anchor_oracle_addr: anchor_market_info.oracle_addr,
        anchor_overseer_addr: anchor_market_info.overseer_addr,
        basset_vault_for_bluna_addr: basset_vault_info_for_bluna.addr,
        nluna_token_addr: basset_vault_info_for_bluna.nasset_token_addr,
        basset_vault_for_beth_addr: basset_vault_info_for_beth.addr,
        neth_token_addr: basset_vault_info_for_beth.nasset_token_addr,
        bluna_hub_addr: anchor_market_info.basset_hub_addr,
        bluna_token_addr: anchor_market_info.bluna_token_addr,
        anchor_custody_bluna_addr: anchor_market_info.bluna_custody_addr,
        beth_token_addr: anchor_market_info.beth_token_addr,
        anchor_custody_beth_addr: anchor_market_info.beth_custody_addr,
    }
}

export interface AnchorEpochStateResponse {
    exchange_rate: string,
    aterra_supply: string,
}

