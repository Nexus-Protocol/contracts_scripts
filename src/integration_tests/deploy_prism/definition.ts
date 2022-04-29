import { getContractAddress, getContractEvents, LCDClient, Wallet } from "@terra-money/terra.js";
import { Cw20CodeId, TokenConfig } from '../../config';
import { instantiate_contract, instantiate_contract_raw, store_contract } from '../../utils';
import { Addr, PrismGovConfig, PrismGovernanceInfo, PrismLaunchPoolConfig, PrismMarketInfo, PrismYassetStakingConfig } from "./config";

// ===================================================
const artifacts_path = "wasm_artifacts";
const path_to_prism_contracts_artifacts = `${artifacts_path}/prism/prism_contracts`;
const prism_gov_wasm = `${path_to_prism_contracts_artifacts}/prism_gov.wasm`;
const prism_launch_pool_wasm = `${path_to_prism_contracts_artifacts}/prism_launch_pool.wasm`;
const prism_yasset_staking_wasm = `${path_to_prism_contracts_artifacts}/prism_yasset_staking.wasm`;

// ===================================================

export async function init_token(lcd_client: LCDClient, sender: Wallet, code_id: number, init_msg: TokenConfig): Promise<string> {
	let contract_addr = await instantiate_contract(lcd_client, sender, sender.key.accAddress, code_id, init_msg);
	return contract_addr;
}

// TODO: figure out the contract to put in the minter field from prism's code
async function init_yluna(lcd_client: LCDClient, sender: Wallet, cw20_code_id: number, minter_address: string) {
	// source: https://finder.terra.money/testnet/address/terra1knak0taqkas4y07mupvxpr89kvtew5dx9jystw
	let yluna_token_config = {
		name: "Prism yLuna Token",
		symbol: "yLuna",
		decimals: 6,
		initial_balances: [],
		mint: {
			minter: minter_address
		}
	}

	let yluna_token_addr = await init_token(lcd_client, sender, cw20_code_id, yluna_token_config);
	return yluna_token_addr
}

async function init_prism(lcd_client: LCDClient, sender: Wallet, cw20_code_id: number) {
	// instantiate prism token
	// source: 
	// https://finder.terra.money/mainnet/address/terra1dh9478k2qvqhqeajhn75a2a7dsnf74y5ukregw
	let prism_token_config = {
		name: "Prism governance token",
		symbol: "PRISM",
		decimals: 6,
		initial_balances: [],
		mint: {
			minter: sender.key.accAddress,
		},
	};

	let prism_token_addr = await init_token(lcd_client, sender, cw20_code_id, prism_token_config);
	return prism_token_addr
}

async function init_prism_governance(
	lcd_client: LCDClient,
	sender: Wallet,
	cw20_code_id: number,
	prism_token_addr: Addr
): Promise<PrismGovernanceInfo> {
	let prism_gov_code_id = await store_contract(lcd_client, sender, prism_gov_wasm)
	console.log(`prism_gov uploaded\n\tcode_id: ${prism_gov_code_id}`);

	let prism_gov_config = PrismGovConfig(prism_token_addr, cw20_code_id);
	let init_contract_res = await instantiate_contract_raw(lcd_client, sender, sender.key.accAddress, prism_gov_code_id, prism_gov_config);

	let prism_gov_deployment_addr = getContractAddress(init_contract_res);

	var xprism_token_addr = ''
	let contract_events = getContractEvents(init_contract_res);
	for (let contract_event of contract_events) {
		let xprism_token_addr_from_contract = contract_event["xprism_token_addr"];
		if (xprism_token_addr_from_contract !== undefined) {
			xprism_token_addr = xprism_token_addr_from_contract;
		}
	}

	return {
		prism_gov_deployment_addr,
		xprism_token_addr,
		prism_gov_config
	}
}

async function init_prism_launch_pool(
	lcd_client: LCDClient, 
	sender: Wallet, 
	prism_token_addr: Addr,
	yluna_token_addr: Addr,
	xprism_token_addr: Addr,
	prism_gov_deployment_addr: Addr,
) {
	let prism_launch_pool_code_id = await store_contract(lcd_client, sender, prism_launch_pool_wasm)
	console.log(`prism_launch_pool uploaded\n\tcode_id: ${prism_launch_pool_code_id}`);

	let prism_launch_pool_config = PrismLaunchPoolConfig(
		sender.key.accAddress,
		sender.key.accAddress,
		yluna_token_addr,
		prism_token_addr,
		xprism_token_addr,
		prism_gov_deployment_addr
	);
	let init_contract_res = await instantiate_contract(lcd_client, sender, sender.key.accAddress, prism_launch_pool_code_id, prism_launch_pool_config);

	return {
		address: ""
	}
}

async function init_prism_yasset_staking(
	lcd_client: LCDClient, 
	sender: Wallet,
	prism_gov_addr: Addr,
	yluna_token_addr: Addr,
	prism_token_addr: Addr,
	xprism_token_addr: Addr,
) {
	// source: https://finder.terra.money/testnet/address/terra1ysc9ktgwldm7fcw4ry6e7t9yhkm7p4u4ltw4ex

	let prism_yasset_staking_code_id = await store_contract(lcd_client, sender, prism_yasset_staking_wasm)
	let prism_yasset_staking_config = await PrismYassetStakingConfig(
		sender.key.accAddress,
		prism_gov_addr,
		yluna_token_addr,
		prism_token_addr,
		xprism_token_addr
	)

	return {}
}

export async function prism_init(lcd_client: LCDClient, sender: Wallet, cw20_code_id: number) {
	const result = await prism_init_verbose(
		lcd_client,
		sender,
		cw20_code_id
	);
	return result;
}

async function prism_init_verbose(
	lcd_client: LCDClient,
	sender: Wallet,
	cw20_code_id: number
): Promise<PrismMarketInfo> {
	// instantiate prism token
	let prism_token_addr = await init_prism(lcd_client, sender, cw20_code_id);
	console.log(`prism_token instantiated\n\taddress: ${prism_token_addr}`);
	console.log(`=======================`);

	// instantiate prism governance contract (prism -> xprism)
	let prism_governance_info = await init_prism_governance(lcd_client, sender, cw20_code_id, prism_token_addr);
	console.log(`prism_gov instantiated\n\taddress: ${prism_governance_info.prism_gov_deployment_addr}`);
	console.log(`=======================`);

	// instantiate yLuna token
	// TODO: figure out which contract is the minter
	// source: https://finder.terra.money/testnet/address/terra1knak0taqkas4y07mupvxpr89kvtew5dx9jystw
	let yluna_token_addr = await init_yluna(lcd_client, sender, cw20_code_id, prism_token_addr);
	console.log(`yluna_token instantiated\n\taddress: ${yluna_token_addr}`);
	console.log(`=======================`);

	// instantiate staking and yluna staking
	let prism_yasset_staking_info = await init_prism_yasset_staking(
		lcd_client,
		sender,
		prism_governance_info.prism_gov_deployment_addr,
		yluna_token_addr,
		prism_token_addr,
		prism_governance_info.xprism_token_addr
	);

	// instantiate prism launch pool
	let prism_launch_pool_info = await init_prism_launch_pool(
		lcd_client, 
		sender, 
		prism_token_addr,
		yluna_token_addr,
		prism_governance_info.xprism_token_addr,
		prism_governance_info.prism_gov_deployment_addr,
	);
	console.log(`prism_launch_pool instantiated\n\taddress: ${prism_launch_pool_info.address}`);
	console.log(`=======================`);

	return PrismMarketInfo(
		prism_token_addr,
		prism_governance_info.prism_gov_deployment_addr,
		prism_governance_info.prism_gov_config,
		prism_governance_info.xprism_token_addr,
		yluna_token_addr
	)
}

