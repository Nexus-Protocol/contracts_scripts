import { Wallet } from "@terra-money/terra.js";

export type Addr = string;

export interface PrismMarketInfo {
    prism_token_addr: Addr,
    prism_gov_addr: Addr,
    prism_gov_config: PrismGovConfig
}

export function PrismMarketInfo(
    prism_token_addr: Addr,
    prism_gov_addr: Addr,
    prism_gov_config: PrismGovConfig
): PrismMarketInfo {
    return {
        prism_token_addr,
        prism_gov_addr,
        prism_gov_config
    }
}

// source: 
// https://finder.terra.money/mainnet/address/terra1h4al753uvwmhxwhn2dlvm9gfk0jkf52xqasmq2
export interface PrismGovConfig {
    prism_token: Addr,
    quorum: string,
    threshold: string,
    voting_period: number,
    effective_delay: number,
    proposal_deposit: string,
    snapshot_period: number,
    redemption_time: number,
    poll_gas_limit: number,
    token_code_id: number,
}

// source: 
// https://finder.terra.money/mainnet/address/terra1h4al753uvwmhxwhn2dlvm9gfk0jkf52xqasmq2
export function PrismGovConfig(
    prism_token_addr: Addr,
    token_code_id: number,
): PrismGovConfig {
    return {
        prism_token: prism_token_addr,
        quorum: "0.4",
        threshold: "0.6",
        voting_period: 604800,
        effective_delay: 259200,
        proposal_deposit: "100000000000",
        snapshot_period: 86400,
        redemption_time: 1814400,
        poll_gas_limit: 10000000,
        token_code_id: token_code_id
    }
}

interface PrismDeploymentResult {
    prism_gov_addr: Addr,
    prism_gov_config: PrismGovConfig
}

export function PrismDeploymentResult(
    prism_gov_addr: Addr,
    prism_gov_config: PrismGovConfig
) {
    return {
        prism_gov_addr,
        prism_gov_config
    }
}