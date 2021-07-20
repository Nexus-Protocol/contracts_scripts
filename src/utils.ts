import { readFileSync } from 'fs';
import {BlockTxBroadcastResult, Coin, Coins, getCodeId, getContractAddress, LCDClient, Msg, MsgExecuteContract, MsgInstantiateContract, MsgStoreCode, StdFee, Wallet} from '@terra-money/terra.js';

export async function store_contract(lcd_client: LCDClient, sender: Wallet, wasm_path: string): Promise<string> {
	let contract_wasm = readFileSync(wasm_path, {encoding: 'base64'});
	const messages: Msg[] = [new MsgStoreCode(sender.key.accAddress, contract_wasm)];
	let result = await calc_fee_and_send_tx(lcd_client, sender, messages);
	return getCodeId(result)
}

export async function instantiate_contract(lcd_client: LCDClient, sender: Wallet, admin: string, code_id: string, init_msg: object): Promise<string> {
	const messages: Msg[] = [new MsgInstantiateContract(
		sender.key.accAddress,
		 	admin,
			parseInt(code_id),
			init_msg
	)];

	let result = await calc_fee_and_send_tx(lcd_client, sender, messages);
	return getContractAddress(result)
}

export async function execute_contract(lcd_client: LCDClient, sender: Wallet, contract_addr: string, execute_msg: object) {
	const messages: Msg[] = [new MsgExecuteContract(
		sender.key.accAddress,
		contract_addr,
		execute_msg
	)];
	let result = await calc_fee_and_send_tx(lcd_client, sender, messages);
	return result
}

// ============================================================
// ============================================================
// ============================================================

export async function calc_fee_and_send_tx(lcd_client: LCDClient, sender: Wallet, messages: Msg[]): Promise<BlockTxBroadcastResult> {
	try {
		const estimated_tx_fee = await get_tx_fee(lcd_client, sender, messages);
		if (estimated_tx_fee === undefined) {
			process.exit(1);
		}

		const signed_tx = await sender.createAndSignTx({
			msgs: messages,
			fee: estimated_tx_fee,
		});

		const tx_result = await lcd_client.tx.broadcast(signed_tx);
		return tx_result;
	} catch (err) {
		console.error(`calc_fee_and_send_tx return err: ${err}`)
		process.exit(1);
	}
}

async function get_tx_fee(lcd_client: LCDClient, sender: Wallet, msgs: Msg[]): Promise<StdFee | undefined> {
	try {
		const estimated_fee_res = await lcd_client.tx.estimateFee(sender.key.accAddress, msgs, {
			gasPrices: new Coins([new Coin("uusd", 0.15)]),
			gasAdjustment: 1.3,
			feeDenoms: ["uusd"],
		});
		return estimated_fee_res;
	} catch (err) {
		console.error(`get_tax_rate return err: ${err}`)
		return undefined;
	}
}

