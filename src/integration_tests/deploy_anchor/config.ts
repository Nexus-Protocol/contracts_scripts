import { Wallet } from "@terra-money/terra.js"

export type Uint256 = string;
export type Decimal256 = string;
export type Addr = string;
export type OfBlocksPerEpochPeriod = number;

export interface AnchorMarkerConfig {
    // Anchor token distribution speed
    anc_emission_rate: Decimal256,
    // Anchor token code ID used to instantiate
    aterra_code_id: number,
    // Maximum allowed borrow rate over deposited stable balance
    max_borrow_factor: Decimal256,
    // Owner address for config update
    owner_addr: Addr,
    // stable coin denom used to borrow & repay
    stable_denom: string,
}

export function AnchorMarkerConfig(
    wallet: Wallet,
    aterra_code_id: number,
): AnchorMarkerConfig {
    return {
        owner_addr: wallet.key.accAddress,
        stable_denom: 'uusd',
        aterra_code_id: aterra_code_id,
        anc_emission_rate: '6793787.950524103374549206',
        max_borrow_factor: '0.95'
    }
}

// ============================================================

export interface AnchorOracleConfig {
    base_asset: string,
    owner: Addr,
}

export function AnchorOracleConfig(
    wallet: Wallet
): AnchorOracleConfig {
    return {
        base_asset: 'uusd',
        owner: wallet.key.accAddress
    }
}

// ============================================================

export interface AnchorLiquidationConfig {
    // Fee applied to executed bids Sent to Overseer interest buffer
    bid_fee: Decimal256,
    // Liquidation threshold amount in stable denom. When the current collaterals value is smaller than the threshold, all collaterals will be liquidated
    liquidation_threshold: Uint256,
    // Maximum fee applied to liquidated collaterals Sent to liquidator as incentive
    max_premium_rate: Decimal256,
    oracle_contract: Addr,
    owner: Addr,
    // Valid oracle price timeframe
    price_timeframe: number,
    // borrow_amount / borrow_limit must always be bigger than safe_ratio.
    safe_ratio: Decimal256,
    stable_denom: string,
}

export function AnchorLiquidationConfig(
    wallet: Wallet,
    oracle_contract: string,
): AnchorLiquidationConfig {
    return {
        owner: wallet.key.accAddress,
        oracle_contract: oracle_contract,
        stable_denom: 'uusd',
        safe_ratio: '0.8',
        bid_fee: '0.01',
        max_premium_rate: '0.3',
        liquidation_threshold: '500',
        price_timeframe: 60
    }
}

// ============================================================

export interface AnchorDistrConfig {
    decrement_multiplier: Decimal256,
    emission_cap: Decimal256,
    emission_floor: Decimal256,
    increment_multiplier: Decimal256,
    owner: Addr,
}

export function AnchorDistrConfig(
    wallet: Wallet,
): AnchorDistrConfig {
    return {
        owner: wallet.key.accAddress,
        emission_cap: '20381363.851572310123647620',
        emission_floor: '6793787.950524103374549206',
        increment_multiplier: '1.007266723782294841',
        decrement_multiplier: '0.997102083349256160',
    }
}

// ============================================================

export interface AnchorOverseerConfig {
    // Ratio to be used for purchasing ANC token from the interest buffer
    anc_purchase_factor: Decimal256,
    // Ratio to be distributed from the interest buffer
    buffer_distribution_factor: Decimal256,
    // Collector contract address which is purchasing ANC token
    collector_contract: Addr,
    epoch_period: OfBlocksPerEpochPeriod,
    // Liquidation model contract address to compute liquidation amount
    liquidation_contract: Addr,
    // Market contract address to receive missing interest buffer
    market_contract: Addr,
    // Oracle contract address for collateral tokens
    oracle_contract: Addr,
    // Initial owner address
    owner_addr: Addr,
    //Valid oracle price timeframe
    price_timeframe: number,
    //The base denomination used when fetching oracle price, reward distribution, and borrow
    stable_denom: string,
    // Target deposit rate. When current deposit rate is bigger than this, Custody contracts send rewards to interest buffer
    target_deposit_rate: Decimal256,
    // Distribute interest buffer to market contract, when deposit_rate < threshold_deposit_rate
    threshold_deposit_rate: Decimal256,
}

export function AnchorOverseerConfig(
    wallet: Wallet,
    liquidation_contract: string,
    market_contract: string,
    oracle_contract: string,
): AnchorOverseerConfig {
    return {
        owner_addr: wallet.key.accAddress,
        oracle_contract: oracle_contract,
        market_contract: market_contract,
        liquidation_contract: liquidation_contract,
        collector_contract: wallet.key.accAddress,
        stable_denom: 'uusd',
        epoch_period: 1681,
        threshold_deposit_rate: '0.000000030572045778',
        target_deposit_rate: '0.000000040762727704',
        buffer_distribution_factor: '0.1',
        anc_purchase_factor: '0.1',
        price_timeframe: 60,
    }
}

// ============================================================

export interface AnchorInterstConfig {
    base_rate: Decimal256,
    interest_multiplier: Decimal256,
    owner: Addr,
}

export function AnchorInterstConfig(
    wallet: Wallet,
): AnchorInterstConfig {
    return {
        owner: wallet.key.accAddress,
        base_rate: '0.000000004076272770',
        interest_multiplier: '0.000000085601728176',
    }
}

// ============================================================

export interface RegisterContractsConfig {
    overseer_contract: Addr,
    interest_model: Addr,
    distribution_model: Addr,
    collector_contract: Addr,
    distributor_contract: Addr,
}

export function RegisterContractsConfig(
    overseer_contract: Addr,
    interest_model: Addr,
    distribution_model: Addr,
    collector_contract: Addr,
    distributor_contract: Addr,
): RegisterContractsConfig {
    return {
        overseer_contract: overseer_contract,
        interest_model: interest_model,
        distribution_model: distribution_model,
        collector_contract: collector_contract,
        distributor_contract: distributor_contract,
    }
}

