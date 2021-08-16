import {LCDClient, Wallet} from '@terra-money/terra.js';
import {CW20_CODE_ID, cw20_contract_wasm, INITIAL_PSI_TOKENS_OWNER, terraswap_factory_wasm, terraswap_pair_wasm, IS_PROD} from "./basset_vault/definition"
import {instantiate_contract, store_contract} from './utils';

// ================================================

export function PSiTokensOwner(sender: Wallet): string {
	if (IS_PROD) {
		return INITIAL_PSI_TOKENS_OWNER;
	} else {
		return sender.key.accAddress;
	}
}

// ================================================

export async function Cw20CodeId(lcd_client: LCDClient, sender: Wallet): Promise<number> {
	if (lcd_client.config.chainID === "localterra") {
		console.log(`in localterra, so storing our own cw20`);
		let cw20_code_id = await store_contract(lcd_client, sender, cw20_contract_wasm);
		console.log(`cw20_base uploaded; code_id: ${cw20_code_id}`);
		return cw20_code_id;
	} else {
		return CW20_CODE_ID;
	}
}

// ================================================

export async function init_terraswap_factory(lcd_client: LCDClient, sender: Wallet, cw20_code_id: number): Promise<string> {
	if (lcd_client.config.chainID === "localterra") {
		console.log(`in localterra, so storing our own terraswap contracts`);
		let terraswap_factory_code_id = await store_contract(lcd_client, sender, terraswap_factory_wasm);
		console.log(`terraswap_factory uploaded; code_id: ${terraswap_factory_code_id}`);
		let terraswap_pair_code_id = await store_contract(lcd_client, sender, terraswap_pair_wasm);
		console.log(`terraswap_pair uploaded; code_id: ${terraswap_pair_code_id}`);
		let terraswap_factory_init_msg = {
			 pair_code_id: terraswap_pair_code_id,
			 token_code_id: cw20_code_id,
		};
		let terraswap_factory_contract_addr = await instantiate_contract(lcd_client, sender, sender.key.accAddress, terraswap_factory_code_id, terraswap_factory_init_msg);
		console.log(`terraswap_factory instantiated; address: ${terraswap_factory_contract_addr}`);
		return terraswap_factory_contract_addr;
	} else {
		return terraswap_factory_contract_addr();
	}
}

// ================================================

export interface Cw20Coin {
	address: string,
	amount: string,
}

export interface MinterResponse {
	minter: string,
	cap?: string,
}

export interface TokenConfig {
	name: string,
	symbol: string,
	decimals: number,
	initial_balances: Cw20Coin[],
	mint?: MinterResponse,
}

export function prod_TokenConfig(governance_contract_addr: string, initial_psi_tokens_owner: string): TokenConfig {
	return {
		name: "Nexus Governance Token",
		symbol: "Psi",
		decimals: 6,
		initial_balances: [
			{
				address: initial_psi_tokens_owner,
				amount: "10000000000000000"
			}
		],
		mint: {
			minter: governance_contract_addr,
		}
	}
}

export function testnet_TokenConfig(governance_contract_addr: string, initial_psi_tokens_owner: string): TokenConfig {
	return {
		name: "Nexus Governance Token",
		symbol: "Psi",
		decimals: 6,
		initial_balances: [
			{
				address: initial_psi_tokens_owner,
				amount: "10000000000000000"
			}
		],
		mint: {
			minter: governance_contract_addr,
		}
	}
}

export function TokenConfig(governance_contract_addr: string, initial_psi_tokens_owner: string): TokenConfig {
	if (IS_PROD) {
		return prod_TokenConfig(governance_contract_addr, initial_psi_tokens_owner);
	} else {
		return testnet_TokenConfig(governance_contract_addr, initial_psi_tokens_owner);
	}
}

// ================================================

const terraswap_factory_contract_addr_prod = "terra1ulgw0td86nvs4wtpsc80thv6xelk76ut7a7apj";
const terraswap_factory_contract_addr_testnet = "terra18qpjm4zkvqnpjpw0zn0tdr8gdzvt8au35v45xf";

export function terraswap_factory_contract_addr(): string {
	if (IS_PROD) {
		return terraswap_factory_contract_addr_prod;
	} else {
		return terraswap_factory_contract_addr_testnet;
	}
}

// ================================================
// Anchor params
// {
//   "quorum": "0.1",
//   "threshold": "0.5",
//   "voting_period": 94097,
//   "timelock_period": 40327,
//   "expiration_period": 13443,
//   "proposal_deposit": "1000000000",
//   "snapshot_period": 13443
// }
//
// Mirror params
// {
  // "quorum": "0.09998",
  // "threshold": "0.49989",
  // "voting_period": 604800,
  // "effective_delay": 86400,
  // "expiration_period": 86400,
  // "proposal_deposit": "100000000",
  // "voter_weight": "0.5",
  // "snapshot_period": 86400
// }

export interface GovernanceConfig {
	quorum: string,
	threshold: string,
	voting_period: number,
	timelock_period: number,
	expiration_period: number,
	proposal_deposit: string,
	snapshot_period: number,
}

export function prod_GovernanceConfig(): GovernanceConfig {
	return {
		quorum: "0.1",
		threshold: "0.5",
		voting_period: 94097, // change to 4 days
		timelock_period: 40327, // to investigate (maybe half of voting)
		expiration_period: 13443,
		proposal_deposit: "10000000000",
		snapshot_period: 13443,
	}
}

export function test_GovernanceConfig(): GovernanceConfig {
	return {
		quorum: "0.1",
		threshold: "0.5",
		voting_period: 94097,
		timelock_period: 40327,
		expiration_period: 13443,
		proposal_deposit: "10000000000",
		snapshot_period: 13443,
	}
}

export function GovernanceConfig(): GovernanceConfig {
	if (IS_PROD) {
		return prod_GovernanceConfig();
	} else {
		return test_GovernanceConfig();
	}
}

// ================================================

export interface CommunityPoolConfig {
	governance_contract_addr: string,
	psi_token_addr: string,
	spend_limit: string
}

export function prod_CommunityPoolConfig(governance_contract_addr: string, psi_token_addr: string): CommunityPoolConfig {
	return {
		governance_contract_addr: governance_contract_addr,
		psi_token_addr: psi_token_addr,
		spend_limit: "1000000000000"
	}
}

export function test_CommunityPoolConfig(governance_contract_addr: string, psi_token_addr: string): CommunityPoolConfig {
	return {
		governance_contract_addr: governance_contract_addr,
		psi_token_addr: psi_token_addr,
		spend_limit: "1000000000000"
	}
}

export function CommunityPoolConfig(governance_contract_addr: string, psi_token_addr: string): CommunityPoolConfig {
	if (IS_PROD) {
		return prod_CommunityPoolConfig(governance_contract_addr, psi_token_addr);
	} else {
		return test_CommunityPoolConfig(governance_contract_addr, psi_token_addr);
	}
}


// ================================================

export interface BassetVaultStrategyConfig {
	governance_contract_addr: string,
	oracle_contract_addr: string,
	basset_token_addr: string,
	stable_denom: string,
	borrow_ltv_max: string,
	borrow_ltv_min: string,
	borrow_ltv_aim: string,
	basset_max_ltv: string,
	buffer_part: string,
	price_timeframe: number,
}

export function prod_BassetVaultStrategyConfig(governance_contract_addr: string): BassetVaultStrategyConfig {
	 return {
		governance_contract_addr: governance_contract_addr,
		oracle_contract_addr: "terra1cgg6yef7qcdm070qftghfulaxmllgmvk77nc7t",
		basset_token_addr: "terra1kc87mu460fwkqte29rquh4hc20m54fxwtsx7gp",
		stable_denom: "uusd",
		borrow_ltv_max: "0.85",
		borrow_ltv_min: "0.75",
		borrow_ltv_aim: "0.8",
		basset_max_ltv: "0.6",
		buffer_part: "0.018",
		price_timeframe: 50,
	}
}

export function testnet_BassetVaultStrategyConfig(governance_contract_addr: string): BassetVaultStrategyConfig {
	return {
		governance_contract_addr: governance_contract_addr,
		oracle_contract_addr: "terra1p4gg3p2ue6qy2qfuxtrmgv2ec3f4jmgqtazum8",
		basset_token_addr: "terra1u0t35drzyy0mujj8rkdyzhe264uls4ug3wdp3x",
		stable_denom: "uusd",
		borrow_ltv_max: "0.85",
		borrow_ltv_min: "0.75",
		borrow_ltv_aim: "0.8",
		basset_max_ltv: "0.6",
		buffer_part: "0.018",
		price_timeframe: 50,
	}
}

export function BassetVaultStrategyConfig(governance_contract_addr: string): BassetVaultStrategyConfig {
	if (IS_PROD) {
		return prod_BassetVaultStrategyConfig(governance_contract_addr);
	} else {
		return testnet_BassetVaultStrategyConfig(governance_contract_addr);
	}
}

// ================================================

export interface BassetVaultConfig {
	gov_addr: string,
	community_addr: string,
        // nasset_token_code_id
	nasset_t_ci: number,
        // nasset_token_config_holder_code_id
	nasset_t_ch_ci: number,
        // nasset_token_rewards_code_id
	nasset_t_r_ci: number,
        // psi_distributor_code_id
	psi_distr_ci: number,
	//Luna / ETH / Sol, will be converted to nLuna, nETH, nSol
        // collateral_token_symbol
	collateral_ts: string,
        // basset_token_addr: String,
        basset_addr: string,
        // anchor_token_addr
        anchor_addr: string,
        // anchor_market_contract_addr
        a_market_addr: string,
        // anchor_overseer_contract_addr
        a_overseer_addr: string,
        // anchor_custody_basset_contract_addr
        a_custody_basset_addr: string,
        // anc_stable_swap_contract_addr
        anc_stable_swap_addr: string,
        // psi_stable_swap_contract_addr
        psi_stable_swap_addr: string,
        // aterra_token_addr
        aterra_addr: string,
        // psi_token_addr
        psi_addr: string,
        // basset_vault_strategy_contract_addr
	basset_vs_addr: string,
	stable_denom: string,
        claiming_rewards_delay: number,
	///UST value in balance should be more than loan
	///on what portion.
	///for example: 1.01 means 1% more than loan
        over_loan_balance_value: string,
        ///mean ltv that user manage by himself (advise: 60%)
        manual_ltv: string,
        ///fees, need to calc how much send to governance and community pools
        fee_rate: string,
        tax_rate: string,
}


export function prod_BassetVaultConfig(
	governance_contract_addr: string,
	community_pool_contract_addr: string,
	nasset_token_code_id: number,
	nasset_token_config_holder_code_id: number,
	nasset_token_rewards_code_id: number,
	psi_distributor_code_id: number,
	psi_token_addr: string,
	psi_stable_swap_contract_addr: string,
	basset_vault_strategy_contract_addr: string
): BassetVaultConfig {
	 return {
		gov_addr: governance_contract_addr,
		community_addr: community_pool_contract_addr,
		nasset_t_ci: nasset_token_code_id,
		nasset_t_ch_ci: nasset_token_config_holder_code_id,
		nasset_t_r_ci: nasset_token_rewards_code_id,
		psi_distr_ci: psi_distributor_code_id,
		collateral_ts: "Luna",
		basset_addr: "terra1kc87mu460fwkqte29rquh4hc20m54fxwtsx7gp",
		anchor_addr: "terra14z56l0fp2lsf86zy3hty2z47ezkhnthtr9yq76",
		a_market_addr: "terra1sepfj7s0aeg5967uxnfk4thzlerrsktkpelm5s",
		a_overseer_addr: "terra1tmnqgvg567ypvsvk6rwsga3srp7e3lg6u0elp8",
		a_custody_basset_addr: "terra1ptjp2vfjrwh0j0faj9r6katm640kgjxnwwq9kn",
		anc_stable_swap_addr: "terra1gm5p3ner9x9xpwugn9sp6gvhd0lwrtkyrecdn3",
		psi_stable_swap_addr: psi_stable_swap_contract_addr,
		aterra_addr: "terra1hzh9vpxhsk8253se0vv5jj6etdvxu3nv8z07zu",
		psi_addr: psi_token_addr,
		basset_vs_addr: basset_vault_strategy_contract_addr,
		stable_denom: "uusd",
		claiming_rewards_delay: 120,
		///UST value in balance should be more than loan
		///on what portion.
		///for example: 1.01 means 1% more than loan
		over_loan_balance_value: "1.01",
		///mean ltv that user manage by himself (advise: 70%)
		manual_ltv: "0.7",
		///fees, need to calc how much send to governance and community pools
		fee_rate: "0.5",
		tax_rate: "0.25",
	}
}

export function testnet_BassetVaultConfig(
	governance_contract_addr: string,
	community_pool_contract_addr: string,
	nasset_token_code_id: number,
	nasset_token_config_holder_code_id: number,
	nasset_token_rewards_code_id: number,
	psi_distributor_code_id: number,
	psi_token_addr: string,
	psi_stable_swap_contract_addr: string,
	basset_vault_strategy_contract_addr: string
): BassetVaultConfig {
	return {
		gov_addr: governance_contract_addr,
		community_addr: community_pool_contract_addr,
		nasset_t_ci: nasset_token_code_id,
		nasset_t_ch_ci: nasset_token_config_holder_code_id,
		nasset_t_r_ci: nasset_token_rewards_code_id,
		psi_distr_ci: psi_distributor_code_id,
		collateral_ts: "Luna",
		basset_addr: "terra1u0t35drzyy0mujj8rkdyzhe264uls4ug3wdp3x",
		anchor_addr: "terra1747mad58h0w4y589y3sk84r5efqdev9q4r02pc",
		a_market_addr: "terra15dwd5mj8v59wpj0wvt233mf5efdff808c5tkal",
		a_overseer_addr: "terra1qljxd0y3j3gk97025qvl3lgq8ygup4gsksvaxv",
		a_custody_basset_addr: "terra1ltnkx0mv7lf2rca9f8w740ashu93ujughy4s7p",
		anc_stable_swap_addr: "terra1wfvczps2865j0awnurk9m04u7wdmd6qv3fdnvz",
		psi_stable_swap_addr: psi_stable_swap_contract_addr,
		aterra_addr: "terra1ajt556dpzvjwl0kl5tzku3fc3p3knkg9mkv8jl",
		psi_addr: psi_token_addr,
		basset_vs_addr: basset_vault_strategy_contract_addr,
		stable_denom: "uusd",
		claiming_rewards_delay: 120,
		///UST value in balance should be more than loan
		///on what portion.
		///for example: 1.01 means 1% more than loan
		over_loan_balance_value: "1.01",
		///mean ltv that user manage by himself (advise: 70%)
		manual_ltv: "0.7",
		///fees, need to calc how much send to governance and community pools
		fee_rate: "0.5",
		tax_rate: "0.25",
	}
}

export function BassetVaultConfig(
	governance_contract_addr: string,
	community_pool_contract_addr: string,
	nasset_token_code_id: number,
	nasset_token_config_holder_code_id: number,
	nasset_token_rewards_code_id: number,
	psi_distributor_code_id: number,
	psi_token_addr: string,
	psi_stable_swap_contract_addr: string,
	basset_vault_strategy_contract_addr: string
): BassetVaultConfig {
	if (IS_PROD) {
		return prod_BassetVaultConfig(
			governance_contract_addr,
			community_pool_contract_addr,
			nasset_token_code_id,
			nasset_token_config_holder_code_id,
			nasset_token_rewards_code_id,
			psi_distributor_code_id,
			psi_token_addr,
			psi_stable_swap_contract_addr,
			basset_vault_strategy_contract_addr
		);
	} else {
		return testnet_BassetVaultConfig(
			governance_contract_addr,
			community_pool_contract_addr,
			nasset_token_code_id,
			nasset_token_config_holder_code_id,
			nasset_token_rewards_code_id,
			psi_distributor_code_id,
			psi_token_addr,
			psi_stable_swap_contract_addr,
			basset_vault_strategy_contract_addr
		);
	}
}
