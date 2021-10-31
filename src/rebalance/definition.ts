import {getContractEvents, BlockTxBroadcastResult, LCDClient,  Wallet} from '@terra-money/terra.js';
import {isTxSuccess} from './../transaction';
import {execute_contract, get_date_str, sleep} from './../utils';

enum RebalanceType {
	Nothing,
	Borrow,
	Repay
}

class NothingToRebalance {
	public get_type(): RebalanceType {
		return RebalanceType.Nothing;
	}
	public rabalance_needed(): boolean {
		return false;
	}

	public to_string(): string {
		return `NothingToRebalance`;
	}
}
class BorrowRebalance {
	public amount: number;
	public advised_buffer_size: number;
	public is_possible: boolean;
	constructor(amount: number, advised_buffer_size: number, is_possible: boolean) {
		this.amount = amount;
		this.advised_buffer_size = advised_buffer_size;
		this.is_possible = is_possible;
	}

	public get_type(): RebalanceType {
		return RebalanceType.Borrow;
	}

	public rabalance_needed(): boolean {
		return this.is_possible;
	}

	public to_string(): string {
		return `Borrow: { amount: ${this.amount}, advised_buffer_size: ${this.advised_buffer_size}, is_possible: ${this.is_possible} }`;
	}

	public static from_json(js: any): BorrowRebalance {
		return new BorrowRebalance(js.Borrow.amount, js.Borrow.advised_buffer_size, js.Borrow.is_possible);
	}
}
class RepayRebalance {
	public amount: number;
	public advised_buffer_size: number;
	constructor(amount: number, advised_buffer_size: number) {
		this.amount = amount;
		this.advised_buffer_size = advised_buffer_size;
	}

	public get_type(): RebalanceType {
		return RebalanceType.Repay;
	}

	public rabalance_needed(): boolean {
		return true;
	}

	public to_string(): string {
		return `Repay: { amount: ${this.amount}, advised_buffer_size: ${this.advised_buffer_size} }`;
	}

	public static from_json(js: any): RepayRebalance {
		return new RepayRebalance(js.Repay.amount, js.Repay.advised_buffer_size);
	}
}

type RebalanceResponse = NothingToRebalance | BorrowRebalance | RepayRebalance;

export function rebalance_response_from_json(json_val: any): RebalanceResponse {
	if (json_val.Nothing !== undefined) {
		return new NothingToRebalance();
	} else if (json_val.Borrow !== undefined) {
		return BorrowRebalance.from_json(json_val);
	} else {
		return RepayRebalance.from_json(json_val);
	}
}

export async function query_rebalance(lcd_client: LCDClient, basset_vault_addr: string): Promise<RebalanceResponse> {
	let rebalance_response = await lcd_client.wasm.contractQuery(basset_vault_addr, {rebalance: {}});

	const result: RebalanceResponse = rebalance_response_from_json(rebalance_response);
	return result;
}

export async function rebalance(lcd_client: LCDClient, sender: Wallet, basset_vault_addr: string): Promise<BlockTxBroadcastResult | undefined> {
	const rebalance_msg = {
		anyone: {
			anyone_msg: {
				rebalance: {}
			}
		}
	};

	let result = await execute_contract(lcd_client, sender, basset_vault_addr, rebalance_msg);
	return result;
}

export async function start_rebalance_loop(lcd_client: LCDClient, sender: Wallet, basset_vault_addr: string, ms_sleep_between_checks: number) {
	let price_printer: number = 0;
	while (true) {
		const query_rebalance_resp = await query_rebalance(lcd_client, basset_vault_addr);
		if (query_rebalance_resp.rabalance_needed()) {
			console.log(`${get_date_str()} :: rebalance needed: ${query_rebalance_resp.to_string()}`)
			const rebalance_response = await rebalance(lcd_client, sender, basset_vault_addr);
			if (rebalance_response === undefined) {
				console.log(`${get_date_str()} :: send message return undefined`);
				await sleep(7000);
			} else if (isTxSuccess(rebalance_response)) {
				console.log(`${get_date_str()} :: Rebalance Successfull`);
				const contract_events = getContractEvents(rebalance_response);
				for (let contract_event of contract_events) {
					if (contract_event.contract_address === basset_vault_addr) {
						Object.keys(contract_event).forEach(key => {
							console.log(`\t[${key}]: ${contract_event[key]}`)
						})
					}
				}
				console.log(`=======================`);
				await sleep(7000);
			} else {
				await sleep(7000);
			}
		} else {
			if (price_printer % 1000 === 0) {
				console.log(`${get_date_str()} :: rebalance not needed`);
				price_printer = 1;
			} else {
				price_printer += 1;
			}

			await sleep(ms_sleep_between_checks);
		}
	}
}
