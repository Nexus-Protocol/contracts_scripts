import {BlockTxBroadcastResult, Coin, Coins, getCodeId, getContractAddress, Key, LCDClient, LocalTerra, Msg, MsgExecuteContract, MsgInstantiateContract, MsgStoreCode, StdFee, Wallet} from '@terra-money/terra.js';
import { readFileSync, readFile } from 'fs';
import {calc_fee_and_send_tx} from './utils';


let lcd_client = new LocalTerra();
const deployer = lcd_client.wallets["test1"];

const contract_file = "/Users/pronvis/terra/nexus/scripts/test-contract/artifacts/test_contract.wasm";

async function store_contract(wasm_path: string): Promise<string> {
	let contract_wasm = readFileSync(wasm_path, {encoding: 'base64'});
	const messages: Msg[] = [new MsgStoreCode(deployer.key.accAddress, contract_wasm)];
	let result = await calc_fee_and_send_tx(lcd_client, deployer, messages);
	return getCodeId(result)
}

async function instantiate_contract(code_id: string, init_msg: object): Promise<string> {
	const messages: Msg[] = [new MsgInstantiateContract(
		 	deployer.key.accAddress,
			parseInt(code_id),
			init_msg
	)];
	// let result = await calc_fee_and_send_tx(lcd_client, deployer, messages);
	let tx = await deployer.createAndSignTx(
		{
			msgs: messages,
			fee: new StdFee(4000000, [new Coin("uluna", 10000000)]),
		});

	console.log(`${JSON.stringify(tx)}`);
	let result = await lcd_client.tx.broadcast(tx);
	console.log(`${JSON.stringify(result)}`);
	return getContractAddress(result)
}

async function execute_contract(sender: Wallet, contract_addr: string, execute_msg: object) {
	const messages: Msg[] = [new MsgExecuteContract(
		sender.key.accAddress,
		contract_addr,
		execute_msg
	)];
	let result = await calc_fee_and_send_tx(lcd_client, deployer, messages);
	// let tx = await deployer.createAndSignTx(
	// 	{
	// 		msgs: messages,
	// 		fee: new StdFee(4000000, [new Coin("uluna", 10000000)]),
	// 	});

	// let result = await lcd_client.tx.broadcast(tx);
	console.log(`xx: ${JSON.stringify(result)}`);
	return result
}

async function main() {
	let code_id = await store_contract(contract_file);
	console.log(`contract code_id: ${code_id}`);
	let contract_addr = await instantiate_contract(code_id, {"count": 15});

	// let curr_count = lcd_client.wasm.contractQuery(contract_addr, {"get_count": {}});
	// console.log(`current count: ${curr_count}`);

	// await execute_contract(deployer, contract_addr, {"increment": {}});
}

main()
    .then(text => {
        console.log(text);
    })
	.catch(err => {
        console.log(err);
    });


// async function store_contract_2(wasm_path: string): Promise<string> {
// 	console.log(`deployer lcd config: ${JSON.stringify( deployer.lcd.config )}`);
// 	let contract_wasm = readFileSync(wasm_path, {encoding: 'base64'});
// 	const messages: Msg[] = [new MsgStoreCode(deployer.key.accAddress, contract_wasm)];
// 	let tx = await deployer.createTx({
// 		msgs: messages,
// 		// fee: new StdFee(4000000, [new Coin("uusd", 10000000)]),
// 		gasPrices: new Coins([new Coin('uusd', 0.15)]),
// 		gasAdjustment: 1.3,
// 		feeDenoms: ['uusd'],
// 	});
// 	console.log(`2`);

// 	console.log(`tx fee after createTx: ${JSON.stringify( tx.fee )}`);
	
// 	// const estimated_fee_res = await lcd_client.tx.estimateFee(tx, {
// 	// 	gasPrices: new Coins([new Coin('uusd', 0.15)]),
// 	// 	gasAdjustment: 1.3,
// 	// 	feeDenoms: ['uusd'],
// 	// });
// 	// console.log(`tx fee after estimated_fee_res: ${estimated_fee_res}`);

// 	const signed_tx = await deployer.createAndSignTx({
// 		msgs: messages,
// 		fee: tx.fee,
// 		// fee: new StdFee(4000000, [new Coin("uusd", 10000000)]),
// 	});

// 	let result = await lcd_client.tx.broadcast(signed_tx);
// 	return getCodeId(result)
// }

