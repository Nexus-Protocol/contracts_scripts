import {getContractEvents, Msg,MsgExecuteContract, LCDClient, LocalTerra, Wallet, Coin, Coins} from '@terra-money/terra.js';
import {BassetVaultConfig, TokenConfig, BassetVaultStrategyConfig, GovernanceConfig, Cw20CodeId, init_terraswap_factory, PSiTokensOwner, CommunityPoolConfig} from './../config';
import { deployer, IS_PROD, lcd_client, MULTISIG_ADDR, staking_contract_wasm} from './../basset_vault/definition';
import {execute_contract_messages, store_contract, instantiate_contract, execute_contract, create_contract, create_usd_to_token_terraswap_pair, init_basset_vault, create_token_to_token_terraswap_pair} from './../utils';

async function init_psi_token(lcd_client: LCDClient, sender: Wallet, code_id: number, init_msg: TokenConfig): Promise<string> {
	let contract_addr = await instantiate_contract(lcd_client, sender, sender.key.accAddress, code_id, init_msg);
	// console.log(`psi_token instantiated\n\taddress: ${contract_addr}`);
	return contract_addr;
}

export async function main() {
	//get cw20_code_id
	let cw20_code_id = await Cw20CodeId(lcd_client, deployer);
	console.log(`=======================`);

	// instantiate terraswap_factory contract
	let terraswap_factory_contract_addr = await init_terraswap_factory(lcd_client, deployer, cw20_code_id);
	console.log(`=======================`);

	let psi_prices = [0.0025, 0.005, 0.01];
	let lp_sizes = [500_000, 1_000_000, 2_000_000, 10_000_000, 30_000_000, 50_000_000];
	let buyback_sizes = [35_000, 70_000, 140_000, 280_000, 560_000];
	let purchase_counts = [3, 6, 12, 24];
	for (const psi_price of psi_prices) {
		for (const lp_size of lp_sizes) {
			for (const buyback_size of buyback_sizes) {
				for (const purchase_count of purchase_counts) {
					// instantiate psi_token
					let token_config = TokenConfig(deployer.key.accAddress, PSiTokensOwner(deployer));
					let psi_token_addr = await init_psi_token(lcd_client, deployer, cw20_code_id, token_config);
					// console.log(`=======================`);
	
					let psi_stable_swap_contract = await create_usd_to_token_terraswap_pair(lcd_client, deployer, terraswap_factory_contract_addr, psi_token_addr);
					// console.log(`psi_stable_swap_contract created\n\taddress: ${psi_stable_swap_contract.pair_contract_addr}\n\tlp token address: ${psi_stable_swap_contract.liquidity_token_addr}`);
					await run_simulation(psi_stable_swap_contract.pair_contract_addr, psi_token_addr, psi_price, lp_size, buyback_size, purchase_count);
					console.log(`=======================`);
				}
			}
		}
	}
}

async function run_simulation(contract_addr: string, psi_token_addr: string, psi_price: number, lp_size: number, buyback_size_total: number, purchase_count: number) {
	console.log(`RUN SIMULATION WITH PARAMETERS:`);
	console.log(`\tpsi_price: ${psi_price}`);
	console.log(`\tlp_size: ${lp_size}`);
	console.log(`\tbuyback_size_total: ${buyback_size_total}`);
	console.log(`\tpurchase_count: ${purchase_count}`);
	let ust_amount = lp_size / 2;
	let psi_amount = lp_size / 2 / psi_price;
	let provide_liquidity_resp = await provide_liquidity(contract_addr, psi_token_addr, psi_amount, ust_amount);
	// console.log(`liquidity provided successfully:\n\tassets: ${provide_liquidity_resp.assets}\n\tshare: ${provide_liquidity_resp.share}`);

	let buyback_size = buyback_size_total / purchase_count;
	let i = 0;
	while (i < purchase_count) {
		let swap_response = await buy_psi_token(contract_addr, buyback_size);
		// console.log(`buyback #${i}:`);
		// // console.log(`\toffer_asset: ${swap_response.offer_asset}`);
		// // console.log(`\task_asset: ${swap_response.ask_asset}`);
		// console.log(`\toffer_amount: ${swap_response.offer_amount}`);
		// console.log(`\treturn_amount: ${swap_response.return_amount}`);
		// console.log(`\tprice: ${swap_response.offer_amount/swap_response.return_amount}`);
		// // console.log(`\ttax_amount: ${swap_response.tax_amount}`);
		// console.log(`\tspread_amount: ${swap_response.spread_amount / 1_000_000}`);
		// // console.log(`\tcommission_amount: ${swap_response.commission_amount}`);
		i++;
	}

	let last_swap_offer_ust_amount = 2000;
	let last_swap_offer_uusd_amount = last_swap_offer_ust_amount * 1000000;
	let swap_sim_res = await query_simulate_swap(contract_addr, last_swap_offer_uusd_amount.toString());
	const belief_price: number = last_swap_offer_uusd_amount / swap_sim_res.return_amount;
	console.log(`>>>`);
	console.log(`>>> psi price for swapping ${last_swap_offer_ust_amount}ust = ${belief_price}`);
	console.log(`>>>`);
}

// ===================================================
// ===================================================
// ===================================================
 
export interface ProvideLiquidityResponse {
	assets: string,
	share: number
}
async function provide_liquidity(contract_addr: string, psi_token_addr: string, psi_amount: number, ust_amount: number): Promise<ProvideLiquidityResponse> {
	let uusd_amount = ( ust_amount * 1_000_000 ).toString().split('.')[0];
	let upsi_amount = ( psi_amount * 1_000_000 ).toString().split('.')[0];

	let allowance_msg = new MsgExecuteContract(
		deployer.key.accAddress,
		psi_token_addr,
		{
			increase_allowance: {
				spender: contract_addr,
				amount: upsi_amount.toString(),
			}
		}
	);
	let provide_liquidity_msg = new MsgExecuteContract(
		deployer.key.accAddress,
		contract_addr,
		{
			provide_liquidity: {
				assets: [
					{
						amount: upsi_amount,
						info: {
							token: {
								contract_addr: psi_token_addr
							}
						}
					},
					{
						amount: uusd_amount,
						info: {
							native_token: {
								denom: "uusd"
							}
						}
					},
				]
			}
		},
		new Coins([new Coin("uusd", uusd_amount)])
	);
	// ---------------------------------------------------
	// TODO: better to send in one transactions and save on fees
	// BUT, events returned from functions contains only events from first message
	// and I want here to get events from second (provide_liquidity_msg)
	// let messages = [allowance_msg, provide_liquidity_msg];
	// ---------------------------------------------------
	await execute_contract_messages(lcd_client, deployer, [allowance_msg]);
	let tx_result = await execute_contract_messages(lcd_client, deployer, [ provide_liquidity_msg ]);

	var result: ProvideLiquidityResponse = {
		assets: '',
		share: 0
	};
	let contract_events = getContractEvents(tx_result);
	for (let contract_event of contract_events) {
		let assets_str = contract_event["assets"];
		if (assets_str !== undefined) {
			result.assets = assets_str;
		}

		let share_str = contract_event["share"];
		if (share_str !== undefined) {
			result.share = parseInt( share_str );
		}
	}

	return result;
}

export interface SwapResponse {
	offer_asset: string,
	ask_asset: string,
	offer_amount: number,
	return_amount: number,
	tax_amount: number,
	spread_amount: number,
	commission_amount: number,
}
async function buy_psi_token(contract_addr: string, ust_amount: number): Promise<SwapResponse> {
	let uusd_amount = ( ust_amount * 1_000_000 ).toString().split('.')[0];
	let buy_psi_token_msg = new MsgExecuteContract(
		deployer.key.accAddress,
		contract_addr,
		{
			swap: {
				offer_asset: {
					amount: uusd_amount,
					info: {
						native_token: {
							denom: "uusd"
						}
					}
				}
			}
		},
		new Coins([new Coin("uusd", uusd_amount)])
	);
	let tx_result = await execute_contract_messages(lcd_client, deployer, [buy_psi_token_msg]);

	var result: SwapResponse = {
		offer_asset: '',
		ask_asset: '',
		offer_amount: 0,
		return_amount: 0,
		tax_amount: 0,
		spread_amount: 0,
		commission_amount: 0,
	};

	let contract_events = getContractEvents(tx_result);
	for (let contract_event of contract_events) {
		let offer_asset_str = contract_event["offer_asset"];
		if (offer_asset_str !== undefined) {
			result.offer_asset = offer_asset_str;
		}

		let ask_asset_str = contract_event["ask_asset"];
		if (ask_asset_str !== undefined) {
			result.ask_asset = ask_asset_str;
		}

		let offer_amount_str = contract_event["offer_amount"];
		if (offer_amount_str !== undefined) {
			result.offer_amount = parseInt( offer_amount_str );
		}

		let return_amount_str = contract_event["return_amount"];
		if (return_amount_str !== undefined) {
			result.return_amount = parseInt( return_amount_str );
		}

		let tax_amount_str = contract_event["tax_amount"];
		if (tax_amount_str !== undefined) {
			result.tax_amount = parseInt( tax_amount_str );
		}

		let spread_amount_str = contract_event["spread_amount"];
		if (spread_amount_str !== undefined) {
			result.spread_amount = parseInt( spread_amount_str );
		}

		let commission_amount_str = contract_event["commission_amount"];
		if (commission_amount_str !== undefined) {
			result.commission_amount = parseInt( commission_amount_str );
		}
	}

	return result;
}

interface SwapSimulation {
	commission_amount: number,
	return_amount: number,
	spread_amount: number,
}
async function query_simulate_swap(pair_addr: string, offer_uusd_amount: string): Promise<SwapSimulation> {
	let swap_sim_resp = await lcd_client.wasm.contractQuery(pair_addr, {
			simulation: {
				offer_asset: {
					amount: offer_uusd_amount,
					info: {
						native_token: {
							denom: "uusd"
						}
					}
				}
		}
	});
	const result: SwapSimulation = JSON.parse(JSON.stringify(swap_sim_resp));
	return result;
}
