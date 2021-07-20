import {BlockTxBroadcastResult, Coin, Coins, getCodeId, getContractAddress, Key, LCDClient, LocalTerra, Msg, MsgExecuteContract, MsgInstantiateContract, MsgStoreCode, StdFee, Wallet} from '@terra-money/terra.js';
import {calc_fee_and_send_tx, store_contract, instantiate_contract, execute_contract} from './utils';


let lcd_client = new LocalTerra();
const deployer = lcd_client.wallets["test1"];

const contract_file = "/Users/pronvis/terra/nexus/scripts/test-contract/artifacts/test_contract.wasm";

interface CountResponse {
	count: number
}

async function main() {
	let code_id = await store_contract(lcd_client, deployer, contract_file);
	console.log(`contract code_id: ${code_id}`);
	let contract_addr = await instantiate_contract(lcd_client, deployer, deployer.key.accAddress, code_id, {"count": 15});
	console.log(`contract uploaded, address: ${contract_addr}`);

	{
		let curr_count: CountResponse = await lcd_client.wasm.contractQuery(contract_addr, {"get_count": {}});
		console.log(`count before: ${JSON.stringify( curr_count )}`);
	}

	await execute_contract(lcd_client, deployer, contract_addr, {"increment": {}});
	await execute_contract(lcd_client, deployer, contract_addr, {"increment": {}});
	await execute_contract(lcd_client, deployer, contract_addr, {"increment": {}});
	await execute_contract(lcd_client, deployer, contract_addr, {"increment": {}});

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
