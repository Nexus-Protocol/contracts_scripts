export type Decimal256 = string;
export type Addr = string;

export interface PsiDistributorConfig {
    psi_token_addr: Addr,
    governance_contract_addr: Addr,
    nasset_token_rewards_contract_addr: Addr,
    community_pool_contract_addr: Addr,
    basset_vault_strategy_contract_addr: Addr,
    manual_ltv: Decimal256,
    fee_rate: Decimal256,
    tax_rate: Decimal256,
}

export function PsiDistributorConfig(
    psi_token_addr: Addr,
    basset_vault_strategy_contract_addr: Addr,
    manual_ltv: Decimal256,
    fee_rate: Decimal256,
    tax_rate: Decimal256,
): PsiDistributorConfig{
    return {
        psi_token_addr: psi_token_addr,
        governance_contract_addr: "terra15ep4r7zkxf7k3f9aramcgv6rg2zy4cgk6yum0e",
        nasset_token_rewards_contract_addr: "terra15ep4r7zkxf7k3f9aramcgv6rg2zy4cgk6yum0e",
        community_pool_contract_addr: "terra15ep4r7zkxf7k3f9aramcgv6rg2zy4cgk6yum0e",
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