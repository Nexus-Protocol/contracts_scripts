import {MsgStoreCode, Msg, StdSignMsg, MsgSwap, Numeric, BlockTxBroadcastResult, StdFee, Coins, Coin, BankAPI, MsgExecuteContract, Wallet, LCDClient} from '@terra-money/terra.js';
import  axios, { AxiosRequestConfig } from 'axios';

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

