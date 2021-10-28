# Test plan
## Test 1: [Psi distribution](psi_distribution)
1. Set up
   1. Deploy psi_token.
   2. Deploy mock `basset_vault_strategy_mock_aim_ltv`
      1. API similar to `basset_vault_strategy`;
      2. mock stores single `aim_ltv` field in config; 
      3. one extra handled message : 
      ```rust
          governance: {
               governance_msg: {
                   update_config: {borrow_ltv_aim: borrow_ltv_aim.toString()}
               }
           }
      ```
   3. Deploy mock `basset_vault_nasset_rewards_mock_update_global_index`:
      1. This mock does nothing on update_global_index message;
   4. Deploy `psi_distributor` with `basset_vault_strategy_mock_aim_ltv` and `basset_vault_nasset_rewards_mock_update_global_index`;
2. Tests
   1. Set `set_borrow_ltv_aim`;
   2. Set `set_manual_ltv`;
   3. Mint some psi_tokens for `psi_distributor`;
   4. Send `PsiDistributorAnyoneMsg::DistributeRewards {}`.
   5. Read response and check rewards recipients and values (all possible cases).
3. absence of assert error means that tests passed.