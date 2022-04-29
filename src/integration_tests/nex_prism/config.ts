import { PrismMarketInfo } from "../deploy_prism/config";
export interface AddressesHolderConfig {
  prism_token_addr: string,
  prism_gov_addr: string,
}

export function AddressesHolderConfig(
  prism_market_info: PrismMarketInfo,
): AddressesHolderConfig {
  return {
    prism_token_addr: prism_market_info.prism_token_addr,
    prism_gov_addr: "",
  }
}

// source:
// https://github.com/Nexus-Protocol/nex-prism-convex/blob/master/packages/nexus-prism-protocol/src/staking.rs
// pub struct InstantiateMsg {
//     pub owner: Option<String>,
//     pub staking_token: String,
//     pub rewarder: String,
//     pub reward_token: String,
//     pub staker_reward_pair: Vec<String>,
//     pub governance: String,
// }
export interface StakingConfig {
  owner: string,
  staking_token: string,
  rewarder: string,
  reward_token: string,
  staker_reward_pair: string[],
  governance: string,
}

export function StakingConfig(
  sender: string,
  xprism_token_addr: string,
  psi_token_addr: string,
  governance: string
): StakingConfig {
  return {
    owner: sender,
    staking_token: xprism_token_addr, // xprism
    rewarder: "",
    reward_token: psi_token_addr,
    staker_reward_pair: [],
    governance: governance,
  }
}

// source:
// https://finder.terra.money/testnet/address/terra139w6neqzdk9uqvn6v7sjcr7vpexh3pe0ty7w3m
// pub struct InstantiateMsg {
//     pub owner: String,
//     pub governance: String,
//     pub psi_token: String,
//     pub cw20_token_code_id: u64,
//     pub staking_code_id: u64,
//     pub astroport_factory: String,
//     pub xprism_nexprism_amp_coef: u64,
//     pub xprism_token: String,
//     pub yluna_token: String,
//     pub prism_token: String,
//     pub prism_launch_pool: String,
//     pub prism_xprism_boost: String,
//     pub xprism_prism_pair: String,
//     pub yluna_prism_pair: String,
//     pub rewards_distribution_update_period: Option<u64>,
//     pub rewards_distribution_update_step: Decimal,
//     pub nexprism_stakers_reward_ratio: Decimal,
//     pub yluna_depositors_reward_ratio: Decimal,
//     pub psi_stakers_reward_ratio: Decimal,
//     pub min_nexprism_stakers_reward_ratio: Decimal,
//     pub max_nexprism_stakers_reward_ratio: Decimal,
//     pub min_yluna_depositors_reward_ratio: Decimal,
//     pub max_yluna_depositors_reward_ratio: Decimal,
// }

export interface VaultConfig {
  owner: string,
  governance: string,
  psi_token: string,
  cw20_token_code_id: number,
  staking_code_id: number,
  astroport_factory: string,
  xprism_nexprism_amp_coef: number,
  xprism_token: string,
  yluna_token: string,
  prism_token: string,
  prism_launch_pool: string,
  prism_xprism_boost: string,
  xprism_prism_pair: string,
  yluna_prism_pair: string,
  rewards_distribution_update_period: number,
  rewards_distribution_update_step: number,
  nexprism_stakers_reward_ratio: number,
  yluna_depositors_reward_ratio: number,
  psi_stakers_reward_ratio: number,
  min_nexprism_stakers_reward_ratio: number,
  max_nexprism_stakers_reward_ratio: number,
  min_yluna_depositors_reward_ratio: number,
  max_yluna_depositors_reward_ratio: number,
}

export function VaultConfig(
  sender: string,
  psi_token_addr: string,
  cw20_code_id: number,
  staking_code_id: number,
  xprism_token_addr: string,
  astroport_factory_contract_addr: string,
  prism_token_addr: string,
  governance_addr: string,
  yluna_addr: string,
): VaultConfig {
  return {
    owner: sender,
    governance: governance_addr,
    psi_token: psi_token_addr,
    cw20_token_code_id: cw20_code_id,
    staking_code_id: staking_code_id,
    astroport_factory: astroport_factory_contract_addr,
    xprism_token: xprism_token_addr,
    yluna_token: yluna_addr,
    prism_token: prism_token_addr,
    prism_launch_pool: "",
    prism_xprism_boost: "",
    xprism_prism_pair: "",
    yluna_prism_pair: "",
    rewards_distribution_update_period: 1,
    rewards_distribution_update_step: 1.05,
    nexprism_stakers_reward_ratio: 0.6,
    yluna_depositors_reward_ratio: 0.35,
    psi_stakers_reward_ratio: 0.05,
    min_nexprism_stakers_reward_ratio: 0.1,
    max_nexprism_stakers_reward_ratio: 0.9,
    min_yluna_depositors_reward_ratio: 0.1,
    max_yluna_depositors_reward_ratio: 0.9,
    xprism_nexprism_amp_coef: 5
  }
}
