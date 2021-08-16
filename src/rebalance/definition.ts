import {getContractEvents, BlockTxBroadcastResult, LCDClient,  Wallet} from '@terra-money/terra.js';
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

	public static from_json(js: any): BorrowRebalance {
		return new BorrowRebalance(js.borrow.amount, js.borrow.advised_buffer_size, js.borrow.is_possible);
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

	public static from_json(js: any): RepayRebalance {
		return new RepayRebalance(js.repay.amount, js.repay.advised_buffer_size);
	}
}

type RebalanceResponse = NothingToRebalance | BorrowRebalance | RepayRebalance;


export function rebalance_response_from_json(json_val: any): RebalanceResponse {
	if (json_val.nothing !== undefined) {
		return new NothingToRebalance();
	} else if (json_val.borrow !== undefined) {
		return BorrowRebalance.from_json(json_val);
	} else {
		return RepayRebalance.from_json(json_val);
	}
}

export async function query_rebalance(lcd_client: LCDClient, basset_vault_addr: string): Promise<RebalanceResponse> {
	let rebalance_response = await lcd_client.wasm.contractQuery(basset_vault_addr, {rebalance: {}});
	console.log(`rebalance response:\n${JSON.stringify(rebalance_response)}`)

	const result: RebalanceResponse = rebalance_response_from_json(rebalance_response);
	return result;
}

export async function rebalance(lcd_client: LCDClient, sender: Wallet, basset_vault_addr: string): Promise<BlockTxBroadcastResult> {
	const rebalance_msg = {
		anyone: {
			anyone_msg: {
				rebalance: {}
			}
		}
	};

	while (true) {
		let result = await execute_contract(lcd_client, sender, basset_vault_addr, rebalance_msg);
		if (result !== undefined) {
			return result;
		} else {
			await sleep(1000);
		}
	}
}

export async function start_rebalance_loop(lcd_client: LCDClient, sender: Wallet, basset_vault_addr: string) {
	while (true) {
		const query_rebalance_resp = await query_rebalance(lcd_client, basset_vault_addr);
		if (query_rebalance_resp.rabalance_needed()) {
			const rebalance_response = await rebalance(lcd_client, sender, basset_vault_addr);
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
			await sleep(3000);
		} else {
			await sleep(200);
		}

	}
}
