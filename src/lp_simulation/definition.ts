import {getContractEvents, MsgExecuteContract, LCDClient, Wallet, Coin, Coins, BlockTxBroadcastResult} from '@terra-money/terra.js';
import {TokenConfig, Cw20CodeId, init_terraswap_factory, PSiTokensOwner} from '../config';
import {send_message, instantiate_contract, create_usd_to_token_terraswap_pair, sleep} from '../utils';
import {appendFileSync, existsSync} from 'fs';
import {isTxSuccess} from '../transaction';

interface LpSimulationConfig {
	swap_pair_contract_addr: string,
	psi_token_addr: string,
	psi_price: number,
	lp_size: number,
	buyback_size: number,
	purchase_count: number,
	final_buy_ust_amount: number,
}
interface LpSimulationResult {
	psi_price_at_the_end: number,
	buyback_prices: number[],
}
async function init_psi_token(lcd_client: LCDClient, sender: Wallet, code_id: number, init_msg: TokenConfig): Promise<string> {
	const contract_addr = await instantiate_contract(lcd_client, sender, sender.key.accAddress, code_id, init_msg);
	// console.log(`psi_token instantiated\n\taddress: ${contract_addr}`);
	return contract_addr;
}

export async function main(lcd_client: LCDClient, sender: Wallet) {
	//get cw20_code_id
	const cw20_code_id = await Cw20CodeId(lcd_client, sender);
	console.log(`=======================`);

	// instantiate terraswap_factory contract
	const terraswap_factory_contract_addr = await init_terraswap_factory(lcd_client, sender, cw20_code_id);
	console.log(`=======================`);

	const psi_prices = [0.0025, 0.005, 0.01];
	const lp_sizes = [500_000, 1_000_000, 2_000_000, 10_000_000, 30_000_000, 50_000_000];
	const buyback_sizes = [35_000, 70_000, 140_000, 280_000, 560_000];
	const purchase_counts = [3, 6, 12, 24];
	const result_filename = get_file_name( "lp_simulation_result.csv" );
	await write_csv_header(result_filename, purchase_counts);

	for (const psi_price of psi_prices) {
		for (const lp_size of lp_sizes) {
			for (const buyback_size of buyback_sizes) {
				for (const purchase_count of purchase_counts) {
					// instantiate psi_token
					const token_config = TokenConfig(lcd_client, sender.key.accAddress, PSiTokensOwner(lcd_client, sender, "mock_address"));
					const psi_token_addr = await init_psi_token(lcd_client, sender, cw20_code_id, token_config);
					// console.log(`=======================`);
	
					const psi_stable_swap_contract = await create_usd_to_token_terraswap_pair(lcd_client, sender, terraswap_factory_contract_addr, psi_token_addr);
					// console.log(`psi_stable_swap_contract created\n\taddress: ${psi_stable_swap_contract.pair_contract_addr}\n\tlp token address: ${psi_stable_swap_contract.liquidity_token_addr}`);
					const lp_simulation_cfg = {
						swap_pair_contract_addr: psi_stable_swap_contract.pair_contract_addr,
						psi_token_addr: psi_token_addr,
						psi_price: psi_price,
						lp_size: lp_size,
						buyback_size: buyback_size,
						purchase_count: purchase_count,
						final_buy_ust_amount: 2000,
					};
					const lp_simulation_result = await run_simulation(lcd_client, sender, lp_simulation_cfg);
					await append_result_to_csv(result_filename, lp_simulation_cfg, lp_simulation_result);
					console.log(`=======================`);
				}
			}
		}
	}
}

async function write_csv_header(filename: string, purchase_counts: number[]) {
	let header_string = `psi_price,lp_size,buyback_size,purchase_count,final_buy_ust_amount,final_psi_price`;
	const max_purchases = Math.max(...purchase_counts, 0);
	for (const purchase_index of [...Array(max_purchases).keys()]) {
		header_string += `,buyback #${purchase_index}`;
	}
	header_string += '\n';
	appendFileSync(filename, header_string);
}

async function append_result_to_csv(filename: string, lp_simulation_cfg: LpSimulationConfig, lp_simulation_result: LpSimulationResult) {
	let result_string = `${lp_simulation_cfg.psi_price}`;
	result_string += `,${lp_simulation_cfg.lp_size}`;
	result_string += `,${lp_simulation_cfg.buyback_size}`;
	result_string += `,${lp_simulation_cfg.purchase_count}`;
	result_string += `,${lp_simulation_cfg.final_buy_ust_amount}`;
	result_string += `,${lp_simulation_result.psi_price_at_the_end}`;
	for (const buyback_price of lp_simulation_result.buyback_prices) {
		result_string += `,${buyback_price}`;
	}
	result_string += '\n';
	appendFileSync(filename, result_string);
}

async function run_simulation(lcd_client: LCDClient, sender: Wallet, lp_simulation_cfg: LpSimulationConfig): Promise<LpSimulationResult> {
	console.log(`RUN SIMULATION WITH PARAMETERS:`);
	console.log(`\tpsi_price: ${lp_simulation_cfg.psi_price}`);
	console.log(`\tlp_size: ${lp_simulation_cfg.lp_size}`);
	console.log(`\tbuyback_size_total: ${lp_simulation_cfg.buyback_size}`);
	console.log(`\tpurchase_count: ${lp_simulation_cfg.purchase_count}`);
	const ust_amount = lp_simulation_cfg.lp_size / 2;
	const psi_amount = lp_simulation_cfg.lp_size / 2 / lp_simulation_cfg.psi_price;
	const provide_liquidity_resp = await provide_liquidity(lcd_client, sender, lp_simulation_cfg.swap_pair_contract_addr, lp_simulation_cfg.psi_token_addr, psi_amount, ust_amount);
	// console.log(`liquidity provided successfully:\n\tassets: ${provide_liquidity_resp.assets}\n\tshare: ${provide_liquidity_resp.share}`);

	const buyback_size = lp_simulation_cfg.buyback_size / lp_simulation_cfg.purchase_count;
	let i = 0;
	const result: LpSimulationResult = {
		psi_price_at_the_end: 0,
		buyback_prices: [],
	};
	while (i < lp_simulation_cfg.purchase_count) {
		const swap_response = await buy_psi_token(lcd_client, sender, lp_simulation_cfg.swap_pair_contract_addr, buyback_size);
		// console.log(`buyback #${i}:`);
		// // console.log(`\toffer_asset: ${swap_response.offer_asset}`);
		// // console.log(`\task_asset: ${swap_response.ask_asset}`);
		// console.log(`\toffer_amount: ${swap_response.offer_amount}`);
		// console.log(`\treturn_amount: ${swap_response.return_amount}`);
		// console.log(`\tprice: ${swap_response.offer_amount/swap_response.return_amount}`);
		// // console.log(`\ttax_amount: ${swap_response.tax_amount}`);
		// console.log(`\tspread_amount: ${swap_response.spread_amount / 1_000_000}`);
		// // console.log(`\tcommission_amount: ${swap_response.commission_amount}`);
		result.buyback_prices.push(swap_response.offer_amount/swap_response.return_amount);
		i++;
	}

	const last_swap_offer_uusd_amount = lp_simulation_cfg.final_buy_ust_amount * 1000000;
	const swap_sim_res = await query_simulate_swap(lcd_client, lp_simulation_cfg.swap_pair_contract_addr, last_swap_offer_uusd_amount.toString());
	const belief_price: number = last_swap_offer_uusd_amount / swap_sim_res.return_amount;
	result.psi_price_at_the_end = belief_price;
	console.log(`>>>`);
	console.log(`>>> psi price for swapping ${lp_simulation_cfg.final_buy_ust_amount}ust = ${belief_price}`);
	console.log(`>>>`);
	return result;
}

// ===================================================
// ===================================================
// ===================================================
 
export interface ProvideLiquidityResponse {
	assets: string,
	share: number
}
async function provide_liquidity(lcd_client: LCDClient, sender: Wallet, contract_addr: string, psi_token_addr: string, psi_amount: number, ust_amount: number): Promise<ProvideLiquidityResponse> {
	const uusd_amount = ( ust_amount * 1_000_000 ).toString().split('.')[0];
	const upsi_amount = ( psi_amount * 1_000_000 ).toString().split('.')[0];

	const allowance_msg = new MsgExecuteContract(
		sender.key.accAddress,
		psi_token_addr,
		{
			increase_allowance: {
				spender: contract_addr,
				amount: upsi_amount.toString(),
			}
		}
	);
	const provide_liquidity_msg = new MsgExecuteContract(
		sender.key.accAddress,
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
	let is_done = false;
	while (!is_done) {
		const allowance_resp = await send_message(lcd_client, sender, [allowance_msg]);
		if (allowance_resp === undefined || !isTxSuccess(allowance_resp)) {
			console.error("fail to send allowance message (provide liquidity context)");
			await sleep(2500);
			continue;
		}
		console.log(`successfully send allowance message (provide liquidity context)`);
		is_done = true;
	}

	let provide_liquidity_tx_result: BlockTxBroadcastResult | undefined;
	is_done = false;
	while (!is_done) {
		provide_liquidity_tx_result = await send_message(lcd_client, sender, [provide_liquidity_msg]);
		if (provide_liquidity_tx_result === undefined || !isTxSuccess(provide_liquidity_tx_result)) {
			console.error("fail to send provide liquidity message");
			await sleep(2500);
			continue;
		}
		console.log(`successfully send provide liquidity message`);
		is_done = true;
	}
	provide_liquidity_tx_result = provide_liquidity_tx_result as BlockTxBroadcastResult;

	const result: ProvideLiquidityResponse = {
		assets: '',
		share: 0
	};
	const contract_events = getContractEvents(provide_liquidity_tx_result);
	for (const contract_event of contract_events) {
		const assets_str = contract_event["assets"];
		if (assets_str !== undefined) {
			result.assets = assets_str;
		}

		const share_str = contract_event["share"];
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
async function buy_psi_token(lcd_client: LCDClient, sender: Wallet, contract_addr: string, ust_amount: number): Promise<SwapResponse> {
	const uusd_amount = ( ust_amount * 1_000_000 ).toString().split('.')[0];
	const buy_psi_token_msg = new MsgExecuteContract(
		sender.key.accAddress,
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
	let tx_result: BlockTxBroadcastResult | undefined;
	let is_done = false;
	while (!is_done) {
		tx_result = await send_message(lcd_client, sender, [buy_psi_token_msg]);
		if (tx_result === undefined || !isTxSuccess(tx_result)) {
			console.error("fail to send buy_psi_token message");
			await sleep(2500);
			continue;
		}
		is_done = true;
	}
	tx_result = tx_result as BlockTxBroadcastResult;

	const result: SwapResponse = {
		offer_asset: '',
		ask_asset: '',
		offer_amount: 0,
		return_amount: 0,
		tax_amount: 0,
		spread_amount: 0,
		commission_amount: 0,
	};

	const contract_events = getContractEvents(tx_result);
	for (const contract_event of contract_events) {
		const offer_asset_str = contract_event["offer_asset"];
		if (offer_asset_str !== undefined) {
			result.offer_asset = offer_asset_str;
		}

		const ask_asset_str = contract_event["ask_asset"];
		if (ask_asset_str !== undefined) {
			result.ask_asset = ask_asset_str;
		}

		const offer_amount_str = contract_event["offer_amount"];
		if (offer_amount_str !== undefined) {
			result.offer_amount = parseInt( offer_amount_str );
		}

		const return_amount_str = contract_event["return_amount"];
		if (return_amount_str !== undefined) {
			result.return_amount = parseInt( return_amount_str );
		}

		const tax_amount_str = contract_event["tax_amount"];
		if (tax_amount_str !== undefined) {
			result.tax_amount = parseInt( tax_amount_str );
		}

		const spread_amount_str = contract_event["spread_amount"];
		if (spread_amount_str !== undefined) {
			result.spread_amount = parseInt( spread_amount_str );
		}

		const commission_amount_str = contract_event["commission_amount"];
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
async function query_simulate_swap(lcd_client: LCDClient, pair_addr: string, offer_uusd_amount: string): Promise<SwapSimulation> {
	const swap_sim_resp = await lcd_client.wasm.contractQuery(pair_addr, {
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

function get_file_name(expected_filename: string): string {
	if (!existsSync(expected_filename)) {
		return expected_filename;
	}

	const splitted = expected_filename.split('.');
	const base_filename = splitted[0];
	let i = 1;
	let result_filename = `${base_filename}_${i}.${splitted[1]}`;
	while (existsSync(result_filename)) {
		i++;
		result_filename = `${base_filename}_${i}.${splitted[1]}`;
	}

	return result_filename;
}
