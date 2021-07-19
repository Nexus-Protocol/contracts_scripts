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
		 	deployer.key.accAddress,
			parseInt(code_id),
			init_msg
	)];

	let result = await calc_fee_and_send_tx(lcd_client, deployer, messages);
	return getContractAddress(result)
}

async function execute_contract(sender: Wallet, contract_addr: string, execute_msg: object) {
	const messages: Msg[] = [new MsgExecuteContract(
		sender.key.accAddress,
		contract_addr,
		execute_msg
	)];
	let result = await calc_fee_and_send_tx(lcd_client, deployer, messages);
	return result
}

interface CountResponse {
	count: number
}

async function main() {
	let code_id = await store_contract(contract_file);
	console.log(`contract code_id: ${code_id}`);
	let contract_addr = await instantiate_contract(code_id, {"count": 15});

	{
		let curr_count: CountResponse = await lcd_client.wasm.contractQuery(contract_addr, {"get_count": {}});
		console.log(`count before: ${JSON.stringify( curr_count )}`);
	}

	await execute_contract(deployer, contract_addr, {"increment": {}});
	await execute_contract(deployer, contract_addr, {"increment": {}});
	await execute_contract(deployer, contract_addr, {"increment": {}});
	await execute_contract(deployer, contract_addr, {"increment": {}});

	{
		let curr_count: CountResponse = await lcd_client.wasm.contractQuery(contract_addr, {"get_count": {}});
		console.log(`count afre: ${JSON.stringify( curr_count )}`);
	}
}

main()
    .then(text => {
        console.log(text);
    })
	.catch(err => {
        console.log(err);
    });
