import { BlockTxBroadcastResult, TxError } from '@terra-money/terra.js';

function isTxFailed(tx: any): boolean {
  return tx.code !== undefined
}

export function isTxSuccess(tx: BlockTxBroadcastResult, write_to_log: boolean = true): boolean {
	if (isTxFailed(tx)) {
		if (write_to_log) {
			const failed_tx = tx as TxError;
			console.log(`failed Tx; hash: ${tx.txhash}, code: ${failed_tx.code}, codespace: ${failed_tx.codespace}, error: ${JSON.stringify(tx)}`)
		}
		return false;
	}

	return true;
}
