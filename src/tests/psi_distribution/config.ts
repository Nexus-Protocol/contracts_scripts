export type Decimal256 = string;
export type Addr = string;

export interface PsiDistributorConfig {
    governance_contract_addr: Addr,
    nasset_token_rewards_contract_addr: Addr,
    community_pool_contract_addr: Addr,
    basset_vault_strategy_contract_addr: Addr,
    manual_ltv: Decimal256,
    fee_rate: Decimal256,
    tax_rate: Decimal256,
}

export function PsiDistributorConfig(
    basset_vault_strategy_contract_addr: Addr,
    manual_ltv: Decimal256,
    fee_rate: Decimal256,
    tax_rate: Decimal256,
): PsiDistributorConfig{
    return {
        governance_contract_addr: "governance_contract_addr",
        nasset_token_rewards_contract_addr: "nasset_token_rewards_contract_addr",
        community_pool_contract_addr: "community_pool_contract_addr",
        basset_vault_strategy_contract_addr: basset_vault_strategy_contract_addr,
        manual_ltv: manual_ltv,
        fee_rate: fee_rate,
        tax_rate: tax_rate,
    }
}

//========================================================================================

export interface BassetVaultStrategyMockConfig {
    borrow_ltv_aim: Decimal256
}

export function BassetVaultStrategyMockConfig( borrow_ltv_aim: Decimal256): BassetVaultStrategyMockConfig {
    return  {
        borrow_ltv_aim: borrow_ltv_aim,
    }
}