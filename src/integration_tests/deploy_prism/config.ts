import { Wallet } from "@terra-money/terra.js";

export type Addr = string;

export interface PrismGovernanceInfo {
    xprism_token_addr: Addr,
    prism_gov_config: PrismGovConfig,
    prism_gov_deployment_addr: Addr,
}
export interface PrismMarketInfo {
    prism_token_addr: Addr,
    prism_gov_addr: Addr,
    prism_gov_config: PrismGovConfig,
    xprism_token_addr: Addr,
    yluna_token_addr: Addr
}

export function PrismMarketInfo(
    prism_token_addr: Addr,
    prism_gov_addr: Addr,
    prism_gov_config: PrismGovConfig,
    xprism_token_addr: Addr,
    yluna_token_addr: Addr
): PrismMarketInfo {
    return {
        prism_token_addr,
        prism_gov_addr,
        prism_gov_config,
        xprism_token_addr,
        yluna_token_addr
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

// source: https://finder.terra.money/testnet/address/terra1rmctd835vmx46mtgxt8mpq9ek0h2e6xm4rff4y
// operator, info: https://github.com/prism-finance/prism-contracts/commit/2ec8f25c983fed1323296c259d3f320dce297ae4
interface PrismLaunchPoolConfig {
    owner: Addr,
    operator: Addr,
    yluna_staking: Addr,
    yluna_token: Addr,
    prism_token: Addr,
    vesting_period: number,
    boost_contract: Addr,
    distribution_schedule: any[],
    base_pool_ratio: string,
    min_bond_amount: string,
    xprism_token: Addr,
    gov: Addr,
}

// source: 
// https://finder.terra.money/testnet/address/terra1rmctd835vmx46mtgxt8mpq9ek0h2e6xm4rff4y
export function PrismLaunchPoolConfig(
    owner_addr: Addr,
    operator_addr: Addr,
    yluna_token: Addr,
    prism_token: Addr,
    xprism_token: Addr,
    prism_gov_deployment_addr: Addr,
): PrismLaunchPoolConfig {
    return {
        owner: owner_addr,
        operator: operator_addr,
        // TODO:
        yluna_staking: "terra1ysc9ktgwldm7fcw4ry6e7t9yhkm7p4u4ltw4ex",
        yluna_token: yluna_token,
        prism_token: prism_token,
        vesting_period: 10800,
        // TODO:
        boost_contract: "terra1vxejeqv8rjyvycy7gfm3sh0z58xwez6d7jdk42",
        distribution_schedule: [
            1646560800,
            1649239200,
            "130000000000"
        ],
        base_pool_ratio: "0.8",
        min_bond_amount: "1000000",
        xprism_token: xprism_token,
        gov: prism_gov_deployment_addr
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