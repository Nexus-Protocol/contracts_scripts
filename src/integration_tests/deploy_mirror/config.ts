import {TokenConfig} from "../../config";

export type Addr = string;
export type Decimal = string;
export type Uint128 = string;

export type u64 = number;

//=====================================================================================================================

export function MirrorTokenConfig(minter: string): TokenConfig {
    return {
        name: "Mirror Governance Token",
        symbol: "MIR",
        decimals: 6,
        initial_balances: [],
        mint: {
            minter: minter,
        }
    }
}

//=====================================================================================================================

export interface MirrorGovConfig {
    mirror_token: Addr,
    quorum: Decimal,
    threshold: Decimal,
    voting_period: u64,
    effective_delay: u64,
    proposal_deposit: Uint128,
    voter_weight: Decimal,
    snapshot_period: u64,
}

export function MirrorGovConfig(
    mirror_token: Addr,
): MirrorGovConfig {
    return {
        mirror_token: mirror_token,
        quorum: "0.1",
        threshold: "0.5",
        voting_period: 201600,
        effective_delay: 100800,
        proposal_deposit: "100000000",
        voter_weight: "1",
        snapshot_period: 14400,
    }
}

//=====================================================================================================================

export interface MirrorCommunityConfig {
    owner: Addr,            // mirror gov contract for prod, but my wallet for tests
    mirror_token: Addr,
    spend_limit: Uint128,
}

export function MirrorCommunityConfig(
    owner: Addr,
    mirror_token: Addr,
): MirrorCommunityConfig {
    return {
        owner: owner,
        mirror_token: mirror_token,
        spend_limit: "50000000000000",
    }
}

//=====================================================================================================================

export interface MirrorCollectorConfig {
    owner: Addr,    // mirror_factory
    distribution_contract: Addr, // collected rewards receiver(mirror_gov)
    terraswap_factory: Addr,
    mirror_token: Addr,
    base_denom: string,
    // aUST params
    aust_token: Addr,
    anchor_market: Addr,
    // bLuna params
    bluna_token: Addr,
    bluna_swap_denom: string,
}

export function MirrorCollectorConfig(
    owner: Addr,
    distribution_contract: Addr,
    terraswap_factory: Addr,
    mirror_token: Addr,
    aust_token: Addr,
    anchor_market: Addr,
    bluna_token: Addr,
): MirrorCollectorConfig {
    return {
        owner: owner,
        distribution_contract: distribution_contract,
        terraswap_factory: terraswap_factory,
        mirror_token: mirror_token,
        base_denom: "uusd",
        aust_token: aust_token,
        anchor_market: anchor_market,
        bluna_token: bluna_token,
        bluna_swap_denom: "uusd",
    }
}

//=====================================================================================================================

export interface MirrorOracleConfig {
    owner: Addr,    //mirror_factory
    base_asset: string,
}

export function MirrorOracleConfig(owner: Addr): MirrorOracleConfig {
    return {
        owner: owner,
        base_asset: "uusd"
    }
}

//=====================================================================================================================

export interface MirrorMintConfig {
    owner: Addr, //mirror_factory
    oracle: Addr,
    collector: Addr,
    collateral_oracle: Addr,
    staking: Addr,
    terraswap_factory: Addr,
    lock: Addr,
    base_denom: string,
    token_code_id: u64,
    protocol_fee_rate: Decimal,
}

export function MirrorMintConfig(
    owner: Addr, //mirror_factory
    oracle: Addr,
    collector: Addr,
    collateral_oracle: Addr,
    staking: Addr,
    terraswap_factory: Addr,
    lock: Addr,
    token_code_id: u64,
): MirrorMintConfig {
    return {
        owner: owner,
        oracle: oracle,
        collector: collector,
        collateral_oracle: collateral_oracle,
        staking: staking,
        terraswap_factory: terraswap_factory,
        lock: lock,
        base_denom: "uusd",
        token_code_id: token_code_id,
        protocol_fee_rate: "0.15",
    }
}

//=====================================================================================================================

export interface MirrorLockConfig {
    owner: Addr,
    mint_contract: Addr,
    base_denom: string,
    lockup_period: u64,
}

export function MirrorLockConfig(
    owner: Addr,
    mint_contract: Addr,
): MirrorLockConfig {
    return {
        owner: owner,
        mint_contract: mint_contract,
        base_denom: "uusd",
        lockup_period: 1209600,
    }
}

//=====================================================================================================================

export interface MirrorStakingConfig {
    owner: Addr,    //mirror_factory
    mirror_token: Addr,
    mint_contract: Addr,
    oracle_contract: Addr,
    terraswap_factory: Addr,
    base_denom: string,
    premium_min_update_interval: u64,
    short_reward_contract: string,
}

export function MirrorStakingConfig(
    owner: Addr,    //mirror_factory
    mirror_token: Addr,
    mint_contract: Addr,
    oracle_contract: Addr,
    terraswap_factory: Addr,
    short_reward_contract: string,
): MirrorStakingConfig {
    return {
        owner: owner,
        mirror_token: mirror_token,
        mint_contract: mint_contract,
        oracle_contract: oracle_contract,
        terraswap_factory: terraswap_factory,
        base_denom: "uusd",
        premium_min_update_interval: 360,
        short_reward_contract: short_reward_contract,
    }
}

//=====================================================================================================================

export interface MirrorCollateralOracleConfig{
    owner: Addr,
    mint_contract: Addr,
    base_denom: string,
    mirror_oracle: Addr,
    anchor_oracle: Addr,
    band_oracle: Addr,
}

export function MirrorCollateralOracleConfig(
    owner: Addr,
    mint_contract: Addr,
    mirror_oracle: Addr,
    anchor_oracle: Addr,
    band_oracle: Addr,
): MirrorCollateralOracleConfig {
    return {
        owner: owner,
        mint_contract: mint_contract,
        base_denom: "uusd",
        mirror_oracle: mirror_oracle,
        anchor_oracle: anchor_oracle,
        band_oracle: band_oracle,
    }
}

//=====================================================================================================================

export interface MirrorFactoryConfig {
    token_code_id: u64,
    base_denom: String,
    distribution_schedule: [u64, u64, Decimal][]
}

export function MirrorFactoryConfig(token_code_id: u64): MirrorFactoryConfig {
    return {
        token_code_id: token_code_id,
        base_denom: "uusd",
        distribution_schedule: [
            [
                21600,
                31557600,
                "54900000000000"
            ],
            [
                31557600,
                63093600,
                "27450000000000"
            ],
            [
                63093600,
                94629600,
                "13725000000000"
            ],
            [
                94629600,
                126165600,
                "6862500000000"
            ]
        ],
    }
}