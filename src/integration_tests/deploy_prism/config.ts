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
    yluna_token_addr: Addr,
    prism_launch_pool_addr: Addr,
    prism_xprism_boost_addr: Addr,
}

export function PrismMarketInfo(
    prism_token_addr: Addr,
    prism_gov_addr: Addr,
    prism_gov_config: PrismGovConfig,
    xprism_token_addr: Addr,
    yluna_token_addr: Addr,
    prism_launch_pool_addr: Addr,
    prism_xprism_boost_addr: Addr,
): PrismMarketInfo {
    return {
        prism_token_addr,
        prism_gov_addr,
        prism_gov_config,
        xprism_token_addr,
        yluna_token_addr,
        prism_launch_pool_addr,
        prism_xprism_boost_addr
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

// source: https://finder.terra.money/testnet/address/terra1ysc9ktgwldm7fcw4ry6e7t9yhkm7p4u4ltw4ex
// {
//     "vault": "terra1knak0taqkas4y07mupvxpr89kvtew5dx9jystw",
//     "owner": "terra1ht2hlaz2fk20jskwz084xdltu3spkjcu9veyhj",
//     "gov": "terra1teddvnlz7jh00nvn67ezksheastm3saqec0um9",
//     "collector": "terra196fgs75ephnxc7xmfac2ra4ymcr7fx65yykq6x",
//     "reward_denom": "uluna",
//     "protocol_fee": "0.1",
//     "cluna_token": "terra108kj35ef46tptcw69a0x5r9qkfu8h7vmjp6w39",
//     "yluna_token": "terra1utwws3p0qzqrw7jslsuvt6drd7jsjhpu0rxauj",
//     "pluna_token": "terra1sev4e0u23l75g5spzsquw6n7c8g5efl6hg0zl6",
//     "prism_token": "terra1cwle4remlf03mucutzhxfayvmdqsulx8xaahvy",
//     "xprism_token": "terra1tz4lxls6gp05m20tgx4t9ljhtvqnmcpujaadc2"
// }
interface PrismYassetStakingConfig {
    vault: Addr,
    owner: Addr,
    gov: Addr,
    collector: Addr,
    reward_denom: string,
    protocol_fee: string,
    cluna_token: Addr,
    yluna_token: Addr,
    pluna_token: Addr,
    prism_token: Addr,
    xprism_token: Addr,
}

export function PrismYassetStakingConfig(
    owner_addr: Addr,
    prism_gov_addr: Addr,
    yluna_token: Addr,
    prism_token: Addr,
    xprism_token: Addr,
): PrismYassetStakingConfig {
    return {
        // TODO: set up prism vault
        // https://github.com/prism-finance/prism-contracts/blob/main/contracts/prism-vault/src/contract.rs
        vault: "terra1knak0taqkas4y07mupvxpr89kvtew5dx9jystw",
        owner: owner_addr,
        gov: prism_gov_addr,

        // TODO: set up prism collector
        collector: "terra196fgs75ephnxc7xmfac2ra4ymcr7fx65yykq6x",
        reward_denom: "uluna",
        protocol_fee: "0.1",

        // TODO: set up cluna and pluna contracts
        cluna_token: "terra108kj35ef46tptcw69a0x5r9qkfu8h7vmjp6w39",
        pluna_token: "terra1sev4e0u23l75g5spzsquw6n7c8g5efl6hg0zl6",
        
        yluna_token: yluna_token,

        prism_token: prism_token,
        xprism_token: xprism_token
    }
}

// source: https://finder.terra.money/testnet/address/terra1vxejeqv8rjyvycy7gfm3sh0z58xwez6d7jdk42
// {
//     "owner": "terra1ht2hlaz2fk20jskwz084xdltu3spkjcu9veyhj",
//     "xprism_token": "terra1tz4lxls6gp05m20tgx4t9ljhtvqnmcpujaadc2",
//     "boost_per_hour": "0.014",
//     "max_boost_per_xprism": "1"
// }
interface PrismXprismBoostConfig {
    owner: Addr,
    xprism_token: Addr,
    boost_per_hour: string,
    max_boost_per_xprism: string,
}

export function PrismXprismBoostConfig(
    owner: Addr,
    xprism_token: Addr,
): PrismXprismBoostConfig {
    return {
        owner: owner,
        xprism_token: xprism_token,
        boost_per_hour: "0.014",
        max_boost_per_xprism: "1"
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