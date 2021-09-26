import {AirdropAccount, build_merkel_tree} from "./airdrop_merkle_tree"
import {Command} from 'commander';
import {lstatSync} from 'fs';
import {SnapshotDirReader, SnapshotFileReader} from "./SnapshotReader";
import {Decimal} from 'decimal.js'
import {writeFile} from 'fs';
import {Airdrop} from "./Airdrop";

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
			const airdrop = build_merkel_tree(stakers, psi_tokens_to_airdrop, options.psiToAncRatioCfgPath);
			const root = airdrop.getMerkleRoot();
			console.log(`Merkle Root: \"${root}\"`);

			save_users_proof(airdrop, options.outputPath, options.stage);
		});

	await program.parseAsync(process.argv);
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
	let accounts = {accounts: accounts_arr};
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
		let staker_str = `${airdrop.address},${airdrop.psi_tokens_to_airdrop},${airdrop.anc_tokens},${psi_tokens_per_anc}\n`;
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
	claimable_psi_tokens: Decimal,
	proofs: string[]
}

interface UsersAirdropData {
	stage: number,
	merkle_root: string,
	users: UserAirdropData[]
}

function save_users_proof(airdrop: Airdrop, filepath: string, stage: number) {
	let users: UserAirdropData[] = [];
	
	const airdrop_accounts = airdrop.getAccounts();
	for (const airdrop_account of airdrop_accounts) {
		if (!airdrop_account.psi_tokens_to_airdrop.isInt()) {
			console.error(`User ${JSON.stringify(airdrop_account)} have decimal psi tokens to claim, which is wrong`);
			process.exit(1);
		}
		const user_proofs = airdrop.getMerkleProof(airdrop_account);
		const user_airdrop_data = {
			address: airdrop_account.address,
			claimable_psi_tokens: airdrop_account.psi_tokens_to_airdrop,
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
