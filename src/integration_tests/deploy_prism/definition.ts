import { getContractAddress, getContractEvents, LCDClient, Wallet } from "@terra-money/terra.js";
import { TokenConfig } from '../../config';
import { execute_contract, instantiate_contract, instantiate_contract_raw, store_contract, increase_token_allowance, get_token_balance } from '../../utils';
import { Addr, PrismGovConfig, PrismGovernanceInfo, PrismLaunchPoolConfig, PrismMarketInfo, PrismswapFactoryConfig, PrismSwapInfo, PrismXprismBoostConfig, PrismYassetStakingConfig, PrismYAssetStakingInfo } from "./config";

// ===================================================
const artifacts_path = "wasm_artifacts";
const path_to_prism_contracts_artifacts = `${artifacts_path}/prism/prism_contracts`;
const prism_gov_wasm = `${path_to_prism_contracts_artifacts}/prism_gov.wasm`;
const prism_launch_pool_wasm = `${path_to_prism_contracts_artifacts}/prism_launch_pool.wasm`;
const prism_yasset_staking_wasm = `${path_to_prism_contracts_artifacts}/prism_yasset_staking.wasm`;
const prism_xprism_boost_wasm = `${path_to_prism_contracts_artifacts}/prism_xprism_boost.wasm`;

const path_to_prismswap_artifacts = `${artifacts_path}/prism/prismswap_contracts`;
const prismswap_factory_wasm = `${path_to_prismswap_artifacts}/prismswap_factory.wasm`;
const prismswap_pair_wasm = `${path_to_prismswap_artifacts}/prismswap_pair.wasm`;
const prismswap_router_wasm = `${path_to_prismswap_artifacts}/prismswap_router.wasm`;
const prismswap_token_wasm = `${path_to_prismswap_artifacts}/prismswap_token.wasm`;

// ===================================================

export async function init_token(lcd_client: LCDClient, sender: Wallet, code_id: number, init_msg: TokenConfig): Promise<string> {
	let contract_addr = await instantiate_contract(lcd_client, sender, sender.key.accAddress, code_id, init_msg);
	return contract_addr;
}

async function init_yluna(lcd_client: LCDClient, sender: Wallet, cw20_code_id: number) {
	let yluna_token_config = {
		name: "Prism yLUNA Token",
		symbol: "yLUNA",
		decimals: 6,
		initial_balances: [
			{
				address: sender.key.accAddress,
				amount: "10000000000000000"
			}
		],
		mint: {
			minter: sender.key.accAddress,
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
		initial_balances: [
			{
				address: sender.key.accAddress,
				amount: "10000000000000000"
			}
		],
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
	yluna_staking_addr: Addr,
	prism_xprism_boost_addr: Addr,
): Promise<Addr> {
	let prism_launch_pool_code_id = await store_contract(lcd_client, sender, prism_launch_pool_wasm)
	console.log(`prism_launch_pool uploaded\n\tcode_id: ${prism_launch_pool_code_id}`);

	let prism_launch_pool_config = PrismLaunchPoolConfig(
		sender.key.accAddress,
		sender.key.accAddress,
		yluna_token_addr,
		prism_token_addr,
		xprism_token_addr,
		prism_gov_deployment_addr,
		yluna_staking_addr,
		prism_xprism_boost_addr,
	);
	let prism_launch_pool_address = await instantiate_contract(lcd_client, sender, sender.key.accAddress, prism_launch_pool_code_id, prism_launch_pool_config);

	return prism_launch_pool_address
}

async function init_prism_yasset_staking(
	lcd_client: LCDClient,
	sender: Wallet,
	prism_gov_addr: Addr,
	yluna_token_addr: Addr,
	prism_token_addr: Addr,
	xprism_token_addr: Addr,
): Promise<PrismYAssetStakingInfo> {
	// source: https://finder.terra.money/testnet/address/terra1ysc9ktgwldm7fcw4ry6e7t9yhkm7p4u4ltw4ex

	let prism_yasset_staking_code_id = await store_contract(lcd_client, sender, prism_yasset_staking_wasm)
	console.log(`prism_yasset_staking uploaded\n\tcode_id: ${prism_yasset_staking_code_id}`);

	let prism_yasset_staking_config = await PrismYassetStakingConfig(
		sender.key.accAddress,
		prism_gov_addr,
		yluna_token_addr,
		prism_token_addr,
		xprism_token_addr
	)
	let prism_yasset_staking_addr = await instantiate_contract(lcd_client, sender, sender.key.accAddress, prism_yasset_staking_code_id, prism_yasset_staking_config)

	return {
		prism_yasset_staking_addr,
		prism_yasset_staking_config
	}
}

async function init_prism_xprism_boost(
	lcd_client: LCDClient,
	sender: Wallet,
	xprism_token_addr: Addr,
) {
	let prism_xprism_boost_code_id = await store_contract(lcd_client, sender, prism_xprism_boost_wasm)
	let prism_xprism_boost_config = PrismXprismBoostConfig(
		sender.key.accAddress,
		xprism_token_addr,
	)
	let prism_xprism_boost_address = await instantiate_contract(lcd_client, sender, sender.key.accAddress, prism_xprism_boost_code_id, prism_xprism_boost_config)

	return prism_xprism_boost_address
}

export async function create_token_to_token_prismswap_pair(
	lcd_client: LCDClient,
	sender: Wallet,
	prismswap_factory_contract_addr: string,
	token_1_addr: string,
	token_2_addr: string,
	token_code_id: number,
	prismswap_pair_code_id: number
) {
	// source:
	// https://finder.terra.money/testnet/address/terra1xp77h4dl8nhv6s5q9qaynefg772l4p449cwmum
	const msg = {
		asset_infos: [
			{
				cw20: token_1_addr
			},
			{
				cw20: token_2_addr
			}
		],
		token_code_id: token_code_id,
		factory: prismswap_factory_contract_addr
	}

	return await instantiate_contract(lcd_client, sender, sender.key.accAddress, prismswap_pair_code_id, msg)
}

async function init_prismswap_factory(
	lcd_client: LCDClient,
	sender: Wallet,
	prismswap_token_code_id: number,
	prismswap_pair_code_id: number
): Promise<PrismSwapInfo> {
	let prismswap_factory_code_id = await store_contract(lcd_client, sender, prismswap_factory_wasm)

	// TODO: figure out what the "collector" should actually be, adding something here for now to get it working
	// source: https://finder.terra.money/testnet/address/terra1g6x8r77h7sywyxc8zgfdyh39y770nvdm0vnl0r
	let prismswap_factory_config = PrismswapFactoryConfig(
		sender.key.accAddress,
		sender.key.accAddress,
		prismswap_token_code_id,
		prismswap_pair_code_id,
	)
	let prismswap_factory_address = await instantiate_contract(lcd_client, sender, sender.key.accAddress, prismswap_factory_code_id, prismswap_factory_config)

	return {
		prismswap_factory_address,
		prismswap_factory_config
	}
}

export async function stake_prism_for_xprism(lcd_client: LCDClient, sender: Wallet, prism_token_addr: string, prism_gov_addr: string, amount: number) {
    // https://stackabuse.com/encoding-and-decoding-base64-strings-in-node-js/
    // {
    //     "send": {
    //       "msg": "eyJtaW50X3hwcmlzbSI6e319",
    //       "amount": "18474802",
    //       "contract": "terra1h4al753uvwmhxwhn2dlvm9gfk0jkf52xqasmq2"
    //     }
    //   }

    const msg = { mint_xprism: {} };
    const recipient_addr = prism_gov_addr;

    const send_result = await execute_contract(lcd_client, sender, prism_token_addr, {
        send: {
            contract: recipient_addr,
            amount: amount.toString(),
            msg: Buffer.from(JSON.stringify(msg)).toString('base64'),
        }
    });

    return send_result;
}


async function init_prism_xprism_pair_and_provide_liquidity(
	lcd_client: LCDClient,
	sender: Wallet,
	prismswap_factory_address: Addr,
	prism_token_addr: Addr,
	xprism_token_addr: Addr,
	prismswap_token_code_id: number,
	prismswap_pair_code_id: number,
	prism_gov_addr: Addr,
) {
	const liquidityAmount = 100_000_000;
    const liquidityAmountStr = String(100_000_000);

	// get some xprism
	await stake_prism_for_xprism(
		lcd_client,
		sender,
		prism_token_addr,
		prism_gov_addr,
		liquidityAmount,
	)
	
	// create the pair
	const xprism_prism_pair_addr = await create_token_to_token_prismswap_pair(
		lcd_client,
		sender,
		prismswap_factory_address,
		prism_token_addr,
		xprism_token_addr,
		prismswap_token_code_id, // TODO: double check this vs. prismswap_token later
		prismswap_pair_code_id
	)

	// increase allowance before providing liquidity
	await increase_token_allowance(lcd_client, sender, xprism_token_addr, xprism_prism_pair_addr, liquidityAmount)
	await increase_token_allowance(lcd_client, sender, prism_token_addr, xprism_prism_pair_addr, liquidityAmount)

	// provide liquidity
	// https://github.com/prism-finance/prismswap-contracts/blob/7cc03a91bf2006d19c0839ec3eaf7a35d1ca1d4f/packages/prismswap/src/pair.rs#L36:5
	// info from a mainnet transaction
	// {
	// 	"provide_liquidity": {
	// 		"assets": [
	// 			{
	// 			"info": {
	// 				"cw20": "terra1dh9478k2qvqhqeajhn75a2a7dsnf74y5ukregw"
	// 			},
	// 			"amount": "17951937"
	// 			},
	// 			{
	// 			"info": {
	// 				"cw20": "terra1042wzrwg2uk6jqxjm34ysqquyr9esdgm5qyswz"
	// 			},
	// 			"amount": "17479999"
	// 			}
	// 		],
	// 		"slippage_tolerance": "0.02"
	// 	}
	// }
	const msg_provide_liquidity = { 
		provide_liquidity: { 
			assets: [
				{
					info: {
						cw20: prism_token_addr,
					},
					amount: liquidityAmountStr
				},
				{
					info: {
						cw20: xprism_token_addr,
					},
					amount: liquidityAmountStr
				}
			],
			slippage_tolerance: "0.02",
			receiver: sender.key.accAddress,
		} 
	};
	await execute_contract(lcd_client, sender, xprism_prism_pair_addr, msg_provide_liquidity);
	console.log(`Provided ${liquidityAmountStr} xprism and ${liquidityAmountStr} prism in liquidity for prism-xprism pair on prismswap`);
	
	return xprism_prism_pair_addr
}

async function init_yluna_prism_pair_and_provide_liquidity(
	lcd_client: LCDClient,
	sender: Wallet,
	prismswap_factory_address: Addr,
	prism_token_addr: Addr,
	yluna_token_addr: Addr,
	prismswap_token_code_id: number,
	prismswap_pair_code_id: number,
) {
	const liquidityAmount = 100_000_000;
	const liquidityAmountStr = String(100_000_000);

	const yluna_prism_pair_addr = await create_token_to_token_prismswap_pair(
		lcd_client,
		sender,
		prismswap_factory_address,
		prism_token_addr,
		yluna_token_addr,
		prismswap_token_code_id, // TODO: double check this vs. prismswap_token later
		prismswap_pair_code_id
	)

	// increase allowance before providing liquidity
	await increase_token_allowance(lcd_client, sender, yluna_token_addr, yluna_prism_pair_addr, liquidityAmount)
	await increase_token_allowance(lcd_client, sender, prism_token_addr, yluna_prism_pair_addr, liquidityAmount)

	// https://github.com/prism-finance/prismswap-contracts/blob/7cc03a91bf2006d19c0839ec3eaf7a35d1ca1d4f/packages/prismswap/src/pair.rs#L36:5
	// info from a mainnet transaction
	// {
	// 	"provide_liquidity": {
	// 		"assets": [
	// 			{
	// 			"info": {
	// 				"cw20": "terra1dh9478k2qvqhqeajhn75a2a7dsnf74y5ukregw"
	// 			},
	// 			"amount": "17951937"
	// 			},
	// 			{
	// 			"info": {
	// 				"cw20": "terra1042wzrwg2uk6jqxjm34ysqquyr9esdgm5qyswz"
	// 			},
	// 			"amount": "17479999"
	// 			}
	// 		],
	// 		"slippage_tolerance": "0.02"
	// 	}
	// }
	const msg_provide_liquidity = { 
		provide_liquidity: { 
			assets: [
				{
					info: {
						cw20: yluna_token_addr,
					},
					amount: liquidityAmountStr
				},
				{
					info: {
						cw20: prism_token_addr,
					},
					amount: liquidityAmountStr
				},
			],
			slippage_tolerance: "0.02",
			receiver: sender.key.accAddress,
		} 
	};
	
	await execute_contract(lcd_client, sender, yluna_prism_pair_addr, msg_provide_liquidity);
	console.log(`Provided ${liquidityAmountStr} yluna and ${liquidityAmountStr} prism in liquidity for prism-yluna pair on prismswap`);
	
	return yluna_prism_pair_addr
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
	_cw20_code_id: number
): Promise<PrismMarketInfo> {
	let prismswap_token_code_id = await store_contract(lcd_client, sender, prismswap_token_wasm)

	// instantiate prism token
	let prism_token_addr = await init_prism(lcd_client, sender, prismswap_token_code_id);
	console.log(`prism_token instantiated\n\taddress: ${prism_token_addr}`);
	console.log(`=======================`);

	// instantiate prism governance contract (prism -> xprism)
	let prism_governance_info = await init_prism_governance(lcd_client, sender, prismswap_token_code_id, prism_token_addr);
	console.log(`prism_gov instantiated\n\taddress: ${prism_governance_info.prism_gov_deployment_addr}`);
	console.log(`=======================`);

	// instantiate yLuna token
	let yluna_token_addr = await init_yluna(lcd_client, sender, prismswap_token_code_id);
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
	console.log(`prism_yasset_staking instantiated\n\taddress: ${prism_yasset_staking_info.prism_yasset_staking_addr}`);
	console.log(`=======================`);

	// instanstiate boost contract
	let prism_xprism_boost_addr = await init_prism_xprism_boost(
		lcd_client,
		sender,
		prism_governance_info.xprism_token_addr
	)
	console.log(`prism_xprism_boost instantiated\n\taddress: ${prism_xprism_boost_addr}`);
	console.log(`=======================`);

	// instantiate prism launch pool
	let prism_launch_pool_addr = await init_prism_launch_pool(
		lcd_client,
		sender,
		prism_token_addr,
		yluna_token_addr,
		prism_governance_info.xprism_token_addr,
		prism_governance_info.prism_gov_deployment_addr,
		prism_yasset_staking_info.prism_yasset_staking_addr,
		prism_xprism_boost_addr,
	);
	console.log(`prism_launch_pool instantiated\n\taddress: ${prism_launch_pool_addr}`);
	console.log(`=======================`);

	// link launch pool and boost contracts together
	const msg_update_config = { update_config: { launch_pool_contract: prism_launch_pool_addr } };
	await execute_contract(lcd_client, sender, prism_xprism_boost_addr, msg_update_config);
	console.log(`launch_pool and xprism_boost are linked`);
	console.log(`=======================`);

	// xprism-prism pairs + yluna-prism using prismswap factory
	let prismswap_pair_code_id = await store_contract(lcd_client, sender, prismswap_pair_wasm)
	const prismswap_info = await init_prismswap_factory(
		lcd_client,
		sender,
		prismswap_token_code_id,
		prismswap_pair_code_id
	)
	console.log(`prismswap_factory instantiated\n\taddress: ${JSON.stringify(prismswap_info.prismswap_factory_address)}`);
	console.log(`=======================`);

	const xprism_prism_pair_addr = await init_prism_xprism_pair_and_provide_liquidity(
		lcd_client,
		sender,
		prismswap_info.prismswap_factory_address,
		prism_token_addr,
		prism_governance_info.xprism_token_addr,
		prismswap_token_code_id, // TODO: double check this vs. prismswap_token later
		prismswap_pair_code_id,
		prism_governance_info.prism_gov_deployment_addr,
	)
	console.log(`xprism_prism pair instantiated\n\taddress: ${xprism_prism_pair_addr}`);
	console.log(`=======================`);

	const yluna_prism_pair_addr = await init_yluna_prism_pair_and_provide_liquidity(
		lcd_client,
		sender,
		prismswap_info.prismswap_factory_address,
		prism_token_addr,
		yluna_token_addr,
		prismswap_token_code_id,
		prismswap_pair_code_id
	)
	console.log(`yluna_prism pair instantiated\n\taddress: ${yluna_prism_pair_addr}`);
	console.log(`=======================`);

	return PrismMarketInfo(
		prism_token_addr,
		prism_governance_info.prism_gov_deployment_addr,
		prism_governance_info.prism_gov_config,
		prism_governance_info.xprism_token_addr,
		yluna_token_addr,
		prism_launch_pool_addr,
		prism_xprism_boost_addr,
		prismswap_info,
		xprism_prism_pair_addr,
		yluna_prism_pair_addr,
		prism_yasset_staking_info
	)
}

