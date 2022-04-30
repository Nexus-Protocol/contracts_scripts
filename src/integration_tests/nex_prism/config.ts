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
// {
//   "owner": "terra1m6w200dw3gwfp2drrmj7amdwm47lg5w82ne6we",
//   "governance": "terra1u7tnl4326ge86mzqeqnzxxjg7xkgj8nfg65a2h",
//   "psi_token": "terra18nle009rtynpjgleh2975rleu5zts0zdtqryte",
//   "cw20_token_code_id": 9324,
//   "staking_code_id": 67946,
//   "astroport_factory": "terra15jsahkaf9p0qu8ye873p0u5z6g07wdad0tdq43",
//   "xprism_token": "terra1tz4lxls6gp05m20tgx4t9ljhtvqnmcpujaadc2",
//   "yluna_token": "terra1utwws3p0qzqrw7jslsuvt6drd7jsjhpu0rxauj",
//   "prism_token": "terra1cwle4remlf03mucutzhxfayvmdqsulx8xaahvy",
//   "prism_launch_pool": "terra1rmctd835vmx46mtgxt8mpq9ek0h2e6xm4rff4y",
//   "prism_xprism_boost": "terra1vxejeqv8rjyvycy7gfm3sh0z58xwez6d7jdk42",
//   "xprism_prism_pair": "terra1ez9ad3ms373pv7j373qc2clsp7x5y9lws8lwln",
//   "yluna_prism_pair": "terra1xp77h4dl8nhv6s5q9qaynefg772l4p449cwmum",
//   "rewards_distribution_update_period": 1,
//   "rewards_distribution_update_step": "1.05",
//   "nexprism_stakers_reward_ratio": "0.6",
//   "yluna_depositors_reward_ratio": "0.35",
//   "psi_stakers_reward_ratio": "0.05",
//   "min_nexprism_stakers_reward_ratio": "0.1",
//   "max_nexprism_stakers_reward_ratio": "0.9",
//   "min_yluna_depositors_reward_ratio": "0.1",
//   "max_yluna_depositors_reward_ratio": "0.9",
//   "xprism_nexprism_amp_coef": 5
// }

export interface VaultConfig {
  owner: string,
  governance: string,
  psi_token: string,
  cw20_token_code_id: number,
  staking_code_id: number,
  astroport_factory: string,
  xprism_token: string,
  yluna_token: string,
  prism_token: string,
  prism_launch_pool: string,
  prism_xprism_boost: string,
  xprism_prism_pair: string,
  yluna_prism_pair: string,
  rewards_distribution_update_period: number,
  rewards_distribution_update_step: string,
  nexprism_stakers_reward_ratio: string,
  yluna_depositors_reward_ratio: string,
  psi_stakers_reward_ratio: string,
  min_nexprism_stakers_reward_ratio: string,
  max_nexprism_stakers_reward_ratio: string,
  min_yluna_depositors_reward_ratio: string,
  max_yluna_depositors_reward_ratio: string,
  xprism_nexprism_amp_coef: number,
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

    // TODO:
    prism_launch_pool: "terra1rmctd835vmx46mtgxt8mpq9ek0h2e6xm4rff4y",
    prism_xprism_boost: "terra1rmctd835vmx46mtgxt8mpq9ek0h2e6xm4rff4y",
    xprism_prism_pair: "terra1rmctd835vmx46mtgxt8mpq9ek0h2e6xm4rff4y",
    yluna_prism_pair: "terra1rmctd835vmx46mtgxt8mpq9ek0h2e6xm4rff4y",
    
    rewards_distribution_update_period: 1,
    rewards_distribution_update_step: "1.05",
    nexprism_stakers_reward_ratio: "0.6",
    yluna_depositors_reward_ratio: "0.35",
    psi_stakers_reward_ratio: "0.05",
    min_nexprism_stakers_reward_ratio: "0.1",
    max_nexprism_stakers_reward_ratio: "0.9",
    min_yluna_depositors_reward_ratio: "0.1",
    max_yluna_depositors_reward_ratio: "0.9",
    xprism_nexprism_amp_coef: 5
  }
}
