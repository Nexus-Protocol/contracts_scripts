import { readFileSync } from 'fs';
import {BlockTxBroadcastResult, Coin, Coins, getCodeId, getContractAddress, getContractEvents, LCDClient, Msg, MsgExecuteContract, MsgInstantiateContract, MsgStoreCode, StdFee, Wallet} from '@terra-money/terra.js';
import {BassetVaultConfig} from './config';

export async function create_contract(lcd_client: LCDClient, sender: Wallet, contract_name: string, wasm_path: string, init_msg: object): Promise<string> {
	let code_id = await store_contract(lcd_client, sender, wasm_path);
	console.log(`${contract_name} uploaded\n\tcode_id: ${code_id}`);
	let contract_addr = await instantiate_contract(lcd_client, sender, sender.key.accAddress, code_id, init_msg);
	console.log(`${contract_name} instantiated\n\taddress: ${contract_addr}`);
	return contract_addr;
}

// ============================================================
// ============================================================
// ============================================================

export async function store_contract(lcd_client: LCDClient, sender: Wallet, wasm_path: string): Promise<number> {
	let contract_wasm = readFileSync(wasm_path, {encoding: 'base64'});
	const messages: Msg[] = [new MsgStoreCode(sender.key.accAddress, contract_wasm)];

	while (true) {
		let result = await calc_fee_and_send_tx(lcd_client, sender, messages);
		if (result !== undefined) {
			return parseInt(getCodeId(result));
		} else {
			await sleep(1000);
		}
	}
}

async function instantiate_contract_raw(lcd_client: LCDClient, sender: Wallet, admin: string, code_id: number, init_msg: object): Promise<BlockTxBroadcastResult> {
	const messages: Msg[] = [new MsgInstantiateContract(
		sender.key.accAddress,
		 	admin,
			code_id,
			init_msg
	)];

	while (true) {
		let result = await calc_fee_and_send_tx(lcd_client, sender, messages);
		if (result !== undefined) {
			return result;
		} else {
			await sleep(1000);
		}
	}
}

export async function instantiate_contract(lcd_client: LCDClient, sender: Wallet, admin: string, code_id: number, init_msg: object): Promise<string> {
	let result = await instantiate_contract_raw(lcd_client, sender, admin, code_id, init_msg);
	return getContractAddress(result)
}

export async function execute_contract(lcd_client: LCDClient, sender: Wallet, contract_addr: string, execute_msg: object) {
	const messages: Msg[] = [new MsgExecuteContract(
		sender.key.accAddress,
		contract_addr,
		execute_msg
	)];
	let result = await send_message(lcd_client, sender, messages);
	return result
}

export async function send_message(lcd_client: LCDClient, sender: Wallet, messages: Msg[]) {
	let result = await calc_fee_and_send_tx(lcd_client, sender, messages);
	return result
}

// ============================================================
// ============================================================
// ============================================================

export interface TerraswapPairInfo {
	pair_contract_addr: string,
	liquidity_token_addr: string
}

export async function create_usd_to_token_terraswap_pair(lcd_client: LCDClient, sender: Wallet, terraswap_factory_contract_addr: string, token_addr: string): Promise<TerraswapPairInfo> {
	const create_pair_msg = {
		create_pair: {
			asset_infos: [
				{ token: { contract_addr: token_addr } },
				{ native_token: { denom: "uusd" } },
			]
		}
	};

	while (true) {
		let pair_creation_result = await execute_contract(lcd_client, sender, terraswap_factory_contract_addr, create_pair_msg);
		if (pair_creation_result !== undefined) {
			return parse_pair_creation(pair_creation_result);
		} else {
			await sleep(1000);
		}
	}
}

export async function create_token_to_token_terraswap_pair(lcd_client: LCDClient, sender: Wallet, terraswap_factory_contract_addr: string, token_1_addr: string, token_2_addr: string): Promise<TerraswapPairInfo> {
	const create_pair_msg = {
		create_pair: {
			asset_infos: [
				{token: {contract_addr: token_1_addr}},
				{token: {contract_addr: token_2_addr}},
			]
		}
	};

	while (true) {
		let pair_creation_result = await execute_contract(lcd_client, sender, terraswap_factory_contract_addr, create_pair_msg);
		if (pair_creation_result !== undefined) {
			return parse_pair_creation(pair_creation_result);
		} else {
			await sleep(1000);
		}
	}
}

function parse_pair_creation(pair_creation_result: BlockTxBroadcastResult): TerraswapPairInfo {
	var pair_info: TerraswapPairInfo = {
		pair_contract_addr: '',
		liquidity_token_addr: ''
	};
	let contract_events = getContractEvents(pair_creation_result);
	for (let contract_event of contract_events) {
		let pair_contract_addr = contract_event["pair_contract_addr"];
		if ( pair_contract_addr !== undefined ) {
			pair_info.pair_contract_addr = pair_contract_addr;
		}

		let liquidity_token_addr = contract_event["liquidity_token_addr"];
		if ( liquidity_token_addr !== undefined ) {
			pair_info.liquidity_token_addr = liquidity_token_addr;
		}
	}

	return pair_info;
}

// ============================================================
// ============================================================
// ============================================================

export interface BassetVaultInfo {
	addr: string,
	nasset_token_config_holder_addr: string,
	nasset_token_addr: string,
	nasset_token_rewards_addr: string,
	psi_distributor_addr: string
}

export async function init_basset_vault(lcd_client: LCDClient, sender: Wallet, basset_vault_wasm: string, init_msg: BassetVaultConfig): Promise<BassetVaultInfo> {
	let contract_name = "basset_vault";
	let code_id = await store_contract(lcd_client, sender, basset_vault_wasm);
	console.log(`${contract_name} uploaded; code_id: ${code_id}`);
	let init_contract_res = await instantiate_contract_raw(lcd_client, sender, sender.key.accAddress, code_id, init_msg);
	let contract_addr = getContractAddress(init_contract_res);

	var basset_vault_info: BassetVaultInfo = {
		addr: contract_addr,
		nasset_token_addr: '',
		nasset_token_config_holder_addr: '',
		nasset_token_rewards_addr: '',
		psi_distributor_addr: ''
	};
	let contract_events = getContractEvents(init_contract_res);
	for (let contract_event of contract_events) {
		let nasset_token_config_holder_addr = contract_event["nasset_token_config_holder_addr"];
		if (nasset_token_config_holder_addr !== undefined) {
			basset_vault_info.nasset_token_config_holder_addr = nasset_token_config_holder_addr;
		}

		let nasset_token_addr = contract_event["nasset_token_addr"];
		if (nasset_token_addr !== undefined) {
			basset_vault_info.nasset_token_addr = nasset_token_addr;
		}

		let nasset_token_rewards_addr = contract_event["nasset_token_rewards_addr"];
		if (nasset_token_rewards_addr !== undefined) {
			basset_vault_info.nasset_token_rewards_addr = nasset_token_rewards_addr;
		}

		let psi_distributor_addr = contract_event["psi_distributor_addr"];
		if (psi_distributor_addr !== undefined) {
			basset_vault_info.psi_distributor_addr = psi_distributor_addr;
		}

	}
	return basset_vault_info;
}

// ============================================================
// ============================================================
// ============================================================

export async function calc_fee_and_send_tx(lcd_client: LCDClient, sender: Wallet, messages: Msg[]): Promise<BlockTxBroadcastResult | undefined> {
	try {
		const estimated_tx_fee = await get_tx_fee(lcd_client, sender, messages);
		if (estimated_tx_fee === undefined) {
			return undefined;
		}

		const signed_tx = await sender.createAndSignTx({
			msgs: messages,
			fee: estimated_tx_fee,
		});

		const tx_result = await lcd_client.tx.broadcast(signed_tx);
		return tx_result;
	} catch (err) {
		console.error(`calc_fee_and_send_tx return err: ${err}`)
		return undefined;
	}
}


async function get_tx_fee(lcd_client: LCDClient, sender: Wallet, msgs: Msg[]): Promise<StdFee | undefined> {
	try {
		const estimated_fee_res = await lcd_client.tx.estimateFee(sender.key.accAddress, msgs, {
			gasPrices: new Coins([new Coin("uusd", 0.15)]),
			gasAdjustment: 1.2,
			feeDenoms: ["uusd"],
		});
		return estimated_fee_res;
	} catch (err) {
		console.error(`get_tax_rate return err: ${err}`)
		return undefined;
	}
}

// ============================================================
// ============================================================
// ============================================================

export function sleep(ms: number) {
  return new Promise(
    resolve => setTimeout(resolve, ms, [])
  );
}
