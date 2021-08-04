import {Airdrop} from "./Airdrop";
import {SnapshotReader} from "./SnapshotReader";
import {writeFile, appendFileSync} from 'fs';
import {Decimal} from 'decimal.js'

export function build_merkel_tree(snapshot_path: string, output_file: string) {
	const snapshot_reader = new SnapshotReader(snapshot_path);
	let stakers = snapshot_reader.read_stakers();
	console.log("stakers count", stakers.size);

	const total_airdrop: Decimal = new Decimal(500000000).mul(new Decimal(1_000_000));
	const airdrop_accounts = get_airdropped_accounts_from_stakers(stakers, total_airdrop);

	const airdrop = new Airdrop(airdrop_accounts);
	const root = airdrop.getMerkleRoot();
	if (validate_merkle_tree(airdrop, airdrop_accounts)) {
		console.log(`Merkle Root: \"${root}\"`);

		let total_distributed_airdrop = new Decimal(0);
		for (const airdrop of airdrop_accounts) {
			total_distributed_airdrop = total_distributed_airdrop.add(airdrop.amount);
			let staker_str = `${airdrop.address}:${airdrop.amount}\n`;
			appendFileSync('airdrops.csv', staker_str);
		}
		console.log(`total_distributed_airdrop: ${total_distributed_airdrop}`);
		save_stakers_as_json(airdrop_accounts, output_file);
	} else {
		console.log(`Wrong MerkleTree!!!`);
	}
}

function get_airdropped_accounts_from_stakers(stakers: Map<string, Decimal>, total_airdrop: Decimal): Array<{address: string; amount: string}> {
	let result = new Array<{address: string; amount: string}>();
	let total_staked = new Decimal(0);
	for (const [_, tokens] of stakers) {
		const smoothed_tokens = fit_function(tokens);
		total_staked = total_staked.add(smoothed_tokens);
	}
	console.log(`total_staked: ${total_staked}`);
	
	for (const [address, tokens] of stakers) {
		const airdrop_amount = fit_function(tokens).div(total_staked).mul(total_airdrop);
		result.push({address: address, amount: airdrop_amount.floor().toString()});
	}
	return result;
}

//to smooth difference between whales and all others
function fit_function(tokens: Decimal): Decimal {
	return tokens.sqrt();
}

function validate_merkle_tree(airdrop: Airdrop, accounts_arr: Array<{address: string; amount: string}>): boolean {
	const validate_arr: boolean[] = [];
	for (const acc of accounts_arr) {
		const proof = airdrop.getMerkleProof(acc);
		validate_arr.push(airdrop.verify(proof, acc));
	}

	const wrong_proofs_cnt = validate_arr.filter(p => p === false);
	console.log(`wrong proofs count: ${wrong_proofs_cnt.length}`);

	return wrong_proofs_cnt.length === 0;
}

function save_stakers_as_json(accounts_arr: Array<{address: string; amount: string}>, filepath: string) {
	let accounts = {accounts: accounts_arr};
	writeFile(filepath, JSON.stringify( accounts ), function(err) {
	    if (err) {
		console.log(err);
	    }
	});
}
