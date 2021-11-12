import {Wallet} from "@terra-money/terra.js"
import {BassetVaultInfo} from "../../utils";

export type Uint256 = string;
export type Decimal256 = string;
export type Addr = string;
export type OfBlocksPerEpochPeriod = number;

export const LOCALTERRA_DEFAULT_VALIDATOR_ADDR = "terravaloper1dcegyrekltswvyy0xy69ydgxn9x8x32zdy3ua5";

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
    return{
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

export function AnchorOracleConfig (
    wallet: Wallet
    ): AnchorOracleConfig{
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
): AnchorLiquidationConfig{
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
    ): AnchorDistrConfig{
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
    ): AnchorOverseerConfig{
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

export interface AnchorInterestConfig {
    base_rate: Decimal256,
    interest_multiplier: Decimal256,
    owner: Addr,
}

export function AnchorInterestConfig(
    wallet: Wallet,
): AnchorInterestConfig {
    return {
        owner: wallet.key.accAddress,
        base_rate: '0.000000004076272770',
        interest_multiplier: '0.000000085601728176',
    }
}

// ============================================================

export interface RegisterContractsConfig{
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

// ============================================================
export interface AnchorHubConfig {
    epoch_period: number,
    underlying_coin_denom: Decimal256,
    unbonding_period: number,
    peg_recovery_fee: Decimal256,
    er_threshold: Decimal256,
    reward_denom: Decimal256,
    validator: Addr,
}

export function AnchorHubBLunaConfig(): AnchorHubConfig {
    return {
        epoch_period: 30,
        underlying_coin_denom: "uluna",
        unbonding_period: 210,
        peg_recovery_fee: "0.001",
        er_threshold: "1",
        reward_denom: "uusd",
        validator: LOCALTERRA_DEFAULT_VALIDATOR_ADDR,
    }
}

// ============================================================
export interface BassetRewardConfig {
    hub_contract: Addr,
    reward_denom: String,
}

export function BassetRewardConfig(
    hub_contract: Addr,
): BassetRewardConfig {
    return {
        hub_contract: hub_contract,
        reward_denom: "uusd",
    }
}

// ============================================================
export interface BassetTokenConfig {
    name: String,
    symbol: String,
    decimals: number,
    initial_balances: [],
    mint: {
        minter: Addr,
    },
    hub_contract: Addr,
}

export function BassetTokenConfig(
    hub_contract: Addr,
    minter_addr: Addr,
): BassetTokenConfig {
    return {
        name: "bLuna",
        symbol: "BLUNA",
        decimals: 6,
        initial_balances: [],
        mint: {
            minter: minter_addr,
        },
        hub_contract: hub_contract,
    }
}

// ============================================================
export interface AnchorCustodyBlunaConfig {
    // owner address
    owner: Addr,
    // bAsset token address
    collateral_token: Addr,
    overseer_contract: Addr,
    market_contract: Addr,
    reward_contract: Addr,
    liquidation_contract: Addr,
    /// Expected reward denom. If bAsset reward is not same with
    /// it, we try to convert the reward to the `stable_denom`.
    stable_denom: String,
    basset_info: {
        name: String,
        symbol: String,
        decimals: number,
    },
}

export function AnchorCustodyBassetConfig(
    owner: Addr,
    collateral_token: Addr,
    overseer_contract: Addr,
    market_contract: Addr,
    reward_contract: Addr,
    liquidation_contract: Addr,
    basset_name: string,
    basset_symbol: string,
): AnchorCustodyBlunaConfig {
    return {
        owner: owner,
        collateral_token: collateral_token,
        overseer_contract: overseer_contract,
        market_contract: market_contract,
        reward_contract: reward_contract,
        liquidation_contract: liquidation_contract,
        stable_denom: "uusd",
        basset_info: {
            name: basset_name,
            symbol: basset_symbol,
            decimals: 6
        }
    }
}

// ============================================================
export interface BethRewardConfig {
    owner: Addr,
    reward_denom: String,
}

export function BethRewardConfig(
    owner: Addr,
): BethRewardConfig {
    return {
        owner: owner,
        reward_denom: "uusd",
    }
}

// ============================================================
export interface BethTokenConfig {
    name: String,
    symbol: String,
    decimals: number,
    initial_balances: [],
    reward_contract: Addr,
    mint: {
        minter: Addr
    }
}

export function BethTokenConfig(
    reward_contract: Addr,
    minter_addr: Addr,
): BethTokenConfig {
    return {
        name: "beth",
        symbol: "BETH",
        decimals: 6,
        initial_balances: [],
        mint: {
            minter: minter_addr
        },
        reward_contract: reward_contract,
    }
}

// ============================================================
export interface AnchorMarketInfo {
    contract_addr: Addr,
    overseer_addr: Addr,
    oracle_addr: Addr,
    basset_hub_addr: Addr,
    anchor_token_addr: Addr,
    anc_stable_swap_addr: Addr,
    aterra_token_addr: Addr,
    bluna_token_addr: Addr,
    beth_token_addr: Addr,
    bluna_custody_addr: Addr,
    beth_custody_addr: Addr,
}

export function AnchorMarketInfo(
    contract_addr: Addr,
    overseer_addr: Addr,
    oracle_addr: Addr,
    basset_hub_addr: Addr,
    anchor_token_addr: Addr,
    anc_stable_swap_addr: Addr,
    aterra_token_addr: Addr,
    bluna_token_addr: Addr,
    beth_token_addr: Addr,
    bluna_custody_addr: Addr,
    beth_custody_addr: Addr,
): AnchorMarketInfo {
    return {
        contract_addr: contract_addr,
        overseer_addr: overseer_addr,
        oracle_addr: oracle_addr,
        basset_hub_addr: basset_hub_addr,
        anchor_token_addr: anchor_token_addr,
        aterra_token_addr: aterra_token_addr,
        anc_stable_swap_addr: anc_stable_swap_addr,
        bluna_token_addr: bluna_token_addr,
        beth_token_addr: beth_token_addr,
        bluna_custody_addr: bluna_custody_addr,
        beth_custody_addr: beth_custody_addr,
    }
}

// ============================================================
export interface AnchorAndNexusDeploymentResult {
    anchor_market_info: AnchorMarketInfo,
    basset_vault_info_for_bluna: BassetVaultInfo,
    basset_vault_info_for_beth: BassetVaultInfo,
}

export function AnchorAndNexusDeploymentResult(
    anchor_market_info: AnchorMarketInfo,
    basset_vault_info_for_bluna: BassetVaultInfo,
    basset_vault_info_for_beth: BassetVaultInfo,
): AnchorAndNexusDeploymentResult {
    return {
        anchor_market_info: anchor_market_info,
        basset_vault_info_for_bluna: basset_vault_info_for_bluna,
        basset_vault_info_for_beth: basset_vault_info_for_beth,
    }
}

