# Test plan
## Test 1: Psi distribution
1. Deploy psi_token.
2. `basset_vault_strategy_mock_aim_ltv`
   1. API similar to `basset_vault_strategy`;
   2. mock stores single `aim_ltv` field in config; 
   3. one extra entry_point : set_aim_ltv;
3. Deploy psi_distributor with `basset_vault_strategy_mock_aim_ltv` and initial balance.
4. Send `PsiDistributorAnyoneMsg::DistributeRewards {}`.
5. Read response and check rewards recipients and values (all possible cases).