import {readFileSync} from 'fs';
import {
	BlockTxBroadcastResult,
	Coin,
	Coins,
	getCodeId,
	getContractAddress,
	getContractEvents,
	LCDClient,
	LocalTerra,
	MnemonicKey,
	Msg,
	MsgExecuteContract,
	MsgInstantiateContract,
	MsgStoreCode,
	StdFee,
	Wallet
} from '@terra-money/terra.js';
import {BalanceResponse, BassetVaultConfig, is_localterra} from './config';
import {SecretsManager} from 'aws-sdk';
import * as prompt from 'prompt';
import {isTxSuccess} from './transaction';

export async function create_contract(lcd_client: LCDClient, sender: Wallet, contract_name: string, wasm_path: string, init_msg: object, init_funds?: Coin[]): Promise<string> {
	let code_id = await store_contract(lcd_client, sender, wasm_path);
	console.log(`${contract_name} uploaded\n\tcode_id: ${code_id}`);
	let contract_addr = await instantiate_contract(lcd_client, sender, sender.key.accAddress, code_id, init_msg, init_funds);
	console.log(`${contract_name} instantiated\n\taddress: ${contract_addr}`);
	return contract_addr;
}

export async function increase_token_allowance(lcd_client: LCDClient, sender: Wallet, token_addr: string, spender_addr: string, amount: number): Promise<any> {
	const msg = {
		increase_allowance: {
			spender: spender_addr,
			amount: amount.toString(),
		}
	};

	const tx_result = await execute_contract(lcd_client, sender, token_addr, msg);

	const allowance = await lcd_client.wasm.contractQuery(token_addr, {
			allowance: {
				owner: sender.key.accAddress,
				spender: spender_addr,
		}
	})

	return allowance;
}

export async function get_token_balance(lcd_client: LCDClient, token_holder_addr: string, token_addr: string) {
    const result: BalanceResponse = await lcd_client.wasm.contractQuery(token_addr, {
        balance: {
            address: token_holder_addr
        }
    });
    return +result.balance;
}

// ============================================================
// ============================================================
// ============================================================

export async function store_contract(lcd_client: LCDClient, sender: Wallet, wasm_path: string): Promise<number> {
	let contract_wasm = readFileSync(wasm_path, {encoding: 'base64'});
	const messages: Msg[] = [new MsgStoreCode(sender.key.accAddress, contract_wasm)];

	while (true) {
		let result = await calc_fee_and_send_tx(lcd_client, sender, messages);
		if (result !== undefined && isTxSuccess(result)) {
			return parseInt(getCodeId(result));
		} else {
			await sleep(1000);
		}
	}
}

export async function instantiate_contract_raw(lcd_client: LCDClient, sender: Wallet, admin: string, code_id: number, init_msg: object, init_funds?: Coin[]): Promise<BlockTxBroadcastResult> {
	const messages: Msg[] = [new MsgInstantiateContract(
		sender.key.accAddress,
		admin,
		code_id,
		init_msg,
		init_funds
	)];

	while (true) {
		let result = await calc_fee_and_send_tx(lcd_client, sender, messages);
		if (result !== undefined && isTxSuccess(result)) {
			return result;
		} else {
			await sleep(1000);
		}
	}
}

export async function instantiate_contract(lcd_client: LCDClient, sender: Wallet, admin: string, code_id: number, init_msg: object, init_funds?: Coin[]): Promise<string> {	
	let result = await instantiate_contract_raw(lcd_client, sender, admin, code_id, init_msg, init_funds);
	return getContractAddress(result)
}

export async function execute_contract(lcd_client: LCDClient, sender: Wallet, contract_addr: string, execute_msg: object, coins?: Coin[]): Promise<BlockTxBroadcastResult | undefined> {
	const messages: Msg[] = [new MsgExecuteContract(
		sender.key.accAddress,
		contract_addr,
		execute_msg,
		coins
	)];
	let result = await send_message(lcd_client, sender, messages);
	return result
}

export async function send_message(lcd_client: LCDClient, sender: Wallet, messages: Msg[], tax?: Coin[]) {
	let result = await calc_fee_and_send_tx(lcd_client, sender, messages, tax);
	return result
}

// ============================================================
// ============================================================
// ============================================================

export interface SwapPairInfo {
	pair_contract_addr: string,
	liquidity_token_addr: string
}

export async function create_usd_to_token_terraswap_pair(lcd_client: LCDClient, sender: Wallet, terraswap_factory_contract_addr: string, token_addr: string): Promise<SwapPairInfo> {
	const create_pair_msg = {
		create_pair: {
			asset_infos: [
				{token: {contract_addr: token_addr}},
				{native_token: {denom: "uusd"}},
			]
		}
	};

	while (true) {
		let pair_creation_result = await execute_contract(lcd_client, sender, terraswap_factory_contract_addr, create_pair_msg);
		if (pair_creation_result !== undefined && isTxSuccess(pair_creation_result)) {
			return parse_pair_creation(pair_creation_result);
		} else {
			await sleep(1000);
		}
	}
}

export async function create_token_to_token_terraswap_pair(lcd_client: LCDClient, sender: Wallet, terraswap_factory_contract_addr: string, token_1_addr: string, token_2_addr: string): Promise<SwapPairInfo> {
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
		if (pair_creation_result !== undefined && isTxSuccess(pair_creation_result)) {
			return parse_pair_creation(pair_creation_result);
		} else {
			await sleep(1000);
		}
	}
}

export async function create_usd_to_token_astroport_pair(lcd_client: LCDClient, sender: Wallet, astroport_factory_contract_addr: string, token_addr: string): Promise<SwapPairInfo> {
	const create_pair_msg = {
		create_pair: {
			pair_type: {
				xyk: {}
			},
			asset_infos: [
				{
					token: {
						contract_addr: token_addr
					}
				},
				{
					native_token: {
						denom: "uusd"
					}
				}
			],
		}
	}

	while (true) {
		let pair_creation_result = await execute_contract(lcd_client, sender, astroport_factory_contract_addr, create_pair_msg);
		if (pair_creation_result !== undefined && isTxSuccess(pair_creation_result)) {
			return parse_pair_creation(pair_creation_result);
		} else {
			await sleep(1000);
		}
	}
}

export async function create_token_to_token_astroport_pair(lcd_client: LCDClient, sender: Wallet, astroport_factory_contract_addr: string, token_1_addr: string, token_2_addr: string): Promise<SwapPairInfo> {
	const create_pair_msg = {
		create_pair: {
			pair_type: {
				xyk: {}
			},
			asset_infos: [
				{
					token: {
						contract_addr: token_1_addr
					}
				},
				{
					token: {
						contract_addr: token_2_addr
					}
				},
			],
		}
	}

	while (true) {
		let pair_creation_result = await execute_contract(lcd_client, sender, astroport_factory_contract_addr, create_pair_msg);
		if (pair_creation_result !== undefined && isTxSuccess(pair_creation_result)) {
			return parse_pair_creation(pair_creation_result);
		} else {
			await sleep(1000);
		}
	}
}

function parse_pair_creation(pair_creation_result: BlockTxBroadcastResult): SwapPairInfo {
	var pair_info: SwapPairInfo = {
		pair_contract_addr: '',
		liquidity_token_addr: ''
	};
	let contract_events = getContractEvents(pair_creation_result);
	for (let contract_event of contract_events) {
		let pair_contract_addr = contract_event["pair_contract_addr"];
		if (pair_contract_addr !== undefined) {
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
	psi_distributor_addr: string,
	nasset_psi_swap_contract_addr: string,
}

export async function init_basset_vault(lcd_client: LCDClient, sender: Wallet, code_id: number, init_msg: BassetVaultConfig): Promise<BassetVaultInfo> {
	let init_contract_res = await instantiate_contract_raw(lcd_client, sender, sender.key.accAddress, code_id, init_msg);
	let contract_addr = getContractAddress(init_contract_res);

	var basset_vault_info: BassetVaultInfo = {
		addr: contract_addr,
		nasset_token_addr: '',
		nasset_token_config_holder_addr: '',
		nasset_token_rewards_addr: '',
		psi_distributor_addr: '',
		nasset_psi_swap_contract_addr: ''
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

		let nasset_psi_swap_contract_addr = contract_event["nasset_psi_swap_contract_addr"];
		if (nasset_psi_swap_contract_addr !== undefined) {
			basset_vault_info.nasset_psi_swap_contract_addr = nasset_psi_swap_contract_addr;
		}
	}
	return basset_vault_info;
}

// ============================================================
// ============================================================
// ============================================================
export async function calc_fee_and_send_tx(lcd_client: LCDClient, sender: Wallet, messages: Msg[], tax?: Coin[]): Promise<BlockTxBroadcastResult | undefined> {
	try {
		let estimated_tx_fee = await get_tx_fee(lcd_client, sender, messages, tax);

		let estimation_failed = estimated_tx_fee === undefined;
		let is_local = is_localterra(lcd_client);

		if (is_local && estimation_failed) {
			estimated_tx_fee = new StdFee(20_000_000/0.15, [new Coin("uusd", 20_000_000)]);
		}
				
		if (estimated_tx_fee === undefined) {
			return undefined;
		}

		const signed_tx = await sender.createAndSignTx({
			msgs: messages,
			fee: estimated_tx_fee,
		});

		const tx_result = await lcd_client.tx.broadcast(signed_tx);

		if (is_local && estimation_failed) {
			console.error("FAILED TRANSACTION", tx_result);
			return undefined;
		}

		return tx_result;
	} catch (err) {
		console.error(`calc_fee_and_send_tx return err: ${err}`)
		return undefined;
	}
}

async function get_tx_fee(lcd_client: LCDClient, sender: Wallet, msgs: Msg[], tax?: Coin[]): Promise<StdFee | undefined> {
	try {
		let gasAdjustment;

		if (is_localterra(lcd_client)) {
			gasAdjustment = 2.0
		} else {
			gasAdjustment = 1.2
		}

		const estimated_fee_res = await lcd_client.tx.estimateFee(sender.key.accAddress, msgs, {
			gasPrices: new Coins([new Coin("uusd", 0.15)]),
			gasAdjustment,
			feeDenoms: ["uusd"],
		});

		if (tax !== undefined) {
			let fee_coins: Coins = estimated_fee_res.amount;
			for (const tax_coin of tax) {
				fee_coins.add(tax_coin);
			}
			const fee_with_tax = new StdFee(estimated_fee_res.gas, fee_coins);
			return fee_with_tax;
		}

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

export function get_date_str(): string {
	return new Date().toISOString().replace('T', ' ');
}

export function to_utc_seconds(date_str: string): number {
    const date = new Date(date_str)
    const time_zone_offset_in_ms = date.getTimezoneOffset() * 60 * 1_000
    return (date.getTime() - time_zone_offset_in_ms) / 1_000
}

const seed_prompt = [
	{
		name: 'seed',
		hidden: true
	}
];

export function prompt_for_seed(): Promise<string> {
	return new Promise(resolve => {
		prompt.get(seed_prompt, (err, result) => {
			if (err) {
				process.exit(1);
			}
			resolve(result.seed.toString())
		});
	});
}

export async function get_seed_from_aws_secrets(region: string, secret_name: string): Promise<string | undefined> {
	var client = new SecretsManager({
	    region: region
	});

	return client.getSecretValue({SecretId: secret_name}).promise().then((data) => {
		if (data.SecretString !== undefined) {
			return JSON.parse(data.SecretString).seed;
		} else {
			return undefined;
		}
	});
}

export interface AwsSecrets {
	region: string,
	secret_name: string
}

export interface LCDConfig {
	localterra: boolean,
	url?: string,
	chain_id?: string,
	account?: number,
	index?: number,
	aws_secrets?: AwsSecrets
}

function check_non_localterra(lcd_config: LCDConfig) {
	if (!lcd_config.localterra) {
		if (lcd_config.url === undefined || lcd_config.chain_id === undefined) {
			console.error(`wrong LCDConfig: 'url' or/and 'chain_id' is not set`);
			process.exit(1);
		}
	}
}

export async function get_lcd_config_with_wallet(lcd_config: LCDConfig): Promise<[LCDClient, Wallet]> {
	let lcd_client: LCDClient;
	let sender: Wallet;
	let account_id = lcd_config.account;
	if (account_id === undefined) {
		account_id = 0;
	}
	let index_id = lcd_config.index;
	if (index_id === undefined) {
		index_id = 0;
	}

	if (lcd_config.localterra) {
		const localterra = new LocalTerra()
		lcd_client = localterra;
		sender = localterra.wallets["test1"];
	} else if (lcd_config.aws_secrets !== undefined) {
		check_non_localterra(lcd_config);
		lcd_client = new LCDClient({
			URL: lcd_config.url!,
			chainID: lcd_config.chain_id!
		});

		const seed = await get_seed_from_aws_secrets(lcd_config.aws_secrets.region, lcd_config.aws_secrets.secret_name);

		if (seed === undefined) {
			console.error(`can't find seed on AWS; region: ${lcd_config.aws_secrets.region}, secret_name: ${lcd_config.aws_secrets.secret_name}`);
			process.exit(1);
		}

		const owner = new MnemonicKey({mnemonic: seed, account: account_id, index: index_id});
		sender = new Wallet(lcd_client, owner);
	} else {
		check_non_localterra(lcd_config);
		lcd_client = new LCDClient({
			URL: lcd_config.url!,
			chainID: lcd_config.chain_id!
		});
		const seed = await prompt_for_seed();
		const owner = new MnemonicKey({mnemonic: seed, account: account_id, index: index_id});
		sender = new Wallet(lcd_client, owner);
	}

	return [lcd_client, sender];
}

export async function get_lcd_config(lcd_config: LCDConfig): Promise<LCDClient> {
	let lcd_client: LCDClient;
	if (lcd_config.localterra) {
		const localterra = new LocalTerra()
		lcd_client = localterra;
	} else {
		check_non_localterra(lcd_config);
		lcd_client = new LCDClient({
			URL: lcd_config.url!,
			chainID: lcd_config.chain_id!
		});
	}

	return lcd_client;
}
