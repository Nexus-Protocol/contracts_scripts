import {BlockTxBroadcastResult, LCDClient, Msg, MsgExecuteContract, Wallet} from '@terra-money/terra.js';
import {AirdropAccount, anc_tokens_as_str, build_merkel_tree, tokens_to_drop_as_str} from "./airdrop_merkle_tree"
import {Command} from 'commander';
import {lstatSync, readFileSync} from 'fs';
import {SnapshotDirReader, SnapshotFileReader} from "./SnapshotReader";
import {Decimal} from 'decimal.js'
import {writeFile} from 'fs';
import {Airdrop} from "./Airdrop";
import {get_lcd_config_with_wallet, LCDConfig, send_message} from './../utils';
import {isTxSuccess} from './../transaction';

interface Config {
	lcd_client: LCDConfig,
	psi_token_addr: string,
}

const DEFAULT_CONFIG_PATH = 'src/airdrop/config.json';

async function run() {
	const program = new Command();

	program
		.command('merkle-root')
		.requiredOption('-G, --gov-stakers-path <filepath>', `relative path to goverance stakers file or directory`)
		.requiredOption('-O, --output-path <filepath>', `filepath for output json`)
		.requiredOption('-T, --tokens-amount <amount>', `amount of tokens to airdrop`)
		.requiredOption('-C, --psi-to-anc-ratio-cfg-path <filepath>', `path to psi_to_anc_ratio config file`)
		.action(async (options) => {
			const stakers = read_stakers(options.govStakersPath, 2);
			const psi_tokens_to_airdrop: number = parseInt(options.tokensAmount);
			const airdrop = build_merkel_tree(stakers, psi_tokens_to_airdrop, options.psiToAncRatioCfgPath);
			const root = airdrop.getMerkleRoot();
			console.log(`Merkle Root: \"${root}\"`);

			const airdrop_accounts = airdrop.getAccounts();
			save_stakers_as_csv(airdrop_accounts, options.outputPath);
			save_stakers_as_json(airdrop_accounts, options.outputPath);
		});

	program
		.command('users-proof')
		.requiredOption('-G, --gov-stakers-path <filepath>', `relative path to goverance stakers file or directory`)
		.requiredOption('-O, --output-path <filepath>', `filepath for output json`)
		.requiredOption('-T, --tokens-amount <amount>', `amount of tokens to airdrop`)
		.requiredOption('-C, --psi-to-anc-ratio-cfg-path <filepath>', `path to psi_to_anc_ratio config file`)
		.requiredOption('-S, --stage <stage_number>', `airdrop stage number`)
		.action(async (options) => {
			const stakers = read_stakers(options.govStakersPath, 2);
			const psi_tokens_to_airdrop: number = parseInt(options.tokensAmount);
			const stage: number = parseInt(options.stage);
			const airdrop = build_merkel_tree(stakers, psi_tokens_to_airdrop, options.psiToAncRatioCfgPath);
			const root = airdrop.getMerkleRoot();
			console.log(`Merkle Root: \"${root}\"`);

			save_users_proof(airdrop, options.outputPath, stage);
		});

	program
		.command('send-airdrop')
		.requiredOption('-G, --gov-stakers-path <filepath>', `relative path to goverance stakers file or directory`)
		.requiredOption('-T, --tokens-amount <amount>', `amount of tokens to airdrop`)
		.requiredOption('-C, --psi-to-anc-ratio-cfg-path <filepath>', `path to psi_to_anc_ratio config file`)
		.option('-F, --config <filepath>', `relative path to json config`)
		.action(async (options) => {
			const [config, lcd_client, sender] = await get_lcd_and_wallet(options);
			const stakers = read_stakers(options.govStakersPath, 2);
			const psi_tokens_to_airdrop: number = parseInt(options.tokensAmount);
			const airdrop = build_merkel_tree(stakers, psi_tokens_to_airdrop, options.psiToAncRatioCfgPath);
			const root = airdrop.getMerkleRoot();
			console.log(`Merkle Root: \"${root}\"`);

			const airdrop_accounts = airdrop.getAccounts();
			await send_all_airdrop(lcd_client, sender, airdrop_accounts, config.psi_token_addr);
		});

	await program.parseAsync(process.argv);
}

async function send_all_airdrop(lcd_client: LCDClient, sender: Wallet, airdrop_accounts: AirdropAccount[], psi_token_addr: string) {
	console.log(`=======================`);
	const batch_size = 1_000;
	let airdropped_accounts = 0;
	const total_accounts = airdrop_accounts.length;
	while (total_accounts > (airdropped_accounts + 1)) {
		const accounts_batch = [];
		for (const account_index of Array(batch_size).keys()) {
			const current_index = airdropped_accounts + account_index;
			if (current_index == total_accounts) {
				break;
			}
			accounts_batch.push(airdrop_accounts[current_index]);
		}
		airdropped_accounts += accounts_batch.length;

		const tx_result = await send_batch_airdrop(lcd_client, sender, accounts_batch, psi_token_addr);
		if (tx_result === undefined || !isTxSuccess(tx_result)) {
			console.log(`fail to send airdrop tokens for users from '${accounts_batch[0].address}' to '${accounts_batch[accounts_batch.length - 1].address}'`);
			console.log(`reason: ${JSON.stringify(tx_result)}`);
		} else {
			console.log(`successfully send airdrop for users from '${accounts_batch[0].address}' to '${accounts_batch[accounts_batch.length - 1].address}'`);
			console.log(`tx_hash: ${tx_result.txhash}`);
		}
		console.log(`=======================`);
	}
}

async function send_batch_airdrop(lcd_client: LCDClient, sender: Wallet, airdrop_accounts: AirdropAccount[], psi_token_addr: string): Promise<BlockTxBroadcastResult | undefined> {
	const send_msgs: Msg[] = [];
	for (const airdrop_acc of airdrop_accounts) {
		const msg = new MsgExecuteContract(
			sender.key.accAddress,
			psi_token_addr,
			{
				transfer: {
					recipient: airdrop_acc.address,
					amount: tokens_to_drop_as_str(airdrop_acc)
				}
			}
		);
		send_msgs.push(msg);
	}

	const tx_result: BlockTxBroadcastResult | undefined = await send_message(lcd_client, sender, send_msgs);
	return tx_result;
}


function read_stakers(snapshot_path: string, min_anc_staked: number): Map<string, Decimal> {
	if (lstatSync(snapshot_path).isDirectory()) {
		const snapshot_reader = new SnapshotDirReader(snapshot_path, min_anc_staked);
		return snapshot_reader.read_stakers();
	} else if (lstatSync(snapshot_path).isFile()) {
		const snapshot_reader = new SnapshotFileReader(snapshot_path, min_anc_staked);
		return snapshot_reader.read_stakers();
	} else {
		console.error(`'${snapshot_path}' is nor directory, nor file`);
		process.exit(1);
	}
}

function save_stakers_as_json(accounts_arr: Array<AirdropAccount>, filepath: string) {
	const accounts = {accounts: accounts_arr};
	writeFile(`${filepath}.json`, JSON.stringify(accounts, null, '\t'), function(err) {
	    if (err) {
		console.log(err);
	    }
	});
}

function save_stakers_as_csv(airdrop_accounts: Array<AirdropAccount>, filepath: string) {
	let csv_content = "address,psi_tokens_to_airdrop,anchor_tokens_staked,psi_tokens_per_anc\n";
	for (const airdrop of airdrop_accounts) {
		const psi_tokens_per_anc = airdrop.psi_tokens_to_airdrop.div(airdrop.anc_tokens);
		const staker_str = `${airdrop.address},${tokens_to_drop_as_str(airdrop)},${anc_tokens_as_str(airdrop)},${psi_tokens_per_anc}\n`;
		csv_content += staker_str;
	}
	writeFile(`${filepath}.csv`, csv_content, function(err) {
	    if (err) {
		console.log(err);
	    }
	});
}

interface UserAirdropData {
	address: string,
	claimable_psi_tokens: string,
	proofs: string[]
}

interface UsersAirdropData {
	stage: number,
	merkle_root: string,
	users: UserAirdropData[]
}

function save_users_proof(airdrop: Airdrop, filepath: string, stage: number) {
	const users: UserAirdropData[] = [];
	
	const airdrop_accounts = airdrop.getAccounts();
	for (const airdrop_account of airdrop_accounts) {
		const user_proofs = airdrop.getMerkleProof(airdrop_account);
		const user_airdrop_data = {
			address: airdrop_account.address,
			claimable_psi_tokens: tokens_to_drop_as_str(airdrop_account),
			proofs: user_proofs
		};
		users.push(user_airdrop_data);
	}

	const users_airdrop_data: UsersAirdropData = {
		stage: stage,
		merkle_root: airdrop.getMerkleRoot(),
		users: users

	};
	writeFile(`${filepath}.json`, JSON.stringify(users_airdrop_data, null, '\t'), function(err) {
	    if (err) {
		console.log(err);
	    }
	});
}

run()
    .then(text => {
        console.log(text);
    })
	.catch(err => {
        console.log(err);
    });

async function get_lcd_and_wallet(options: any): Promise<[Config, LCDClient, Wallet]> {
	let config_path: string;
	if (options.config === undefined) {
		config_path = DEFAULT_CONFIG_PATH;
	} else {
		config_path = options.config;
	}

	const config: Config = JSON.parse(readFileSync(config_path, 'utf-8'))
	const [lcd_client, sender] = await get_lcd_config_with_wallet(config.lcd_client);
	return [config, lcd_client, sender];
}

