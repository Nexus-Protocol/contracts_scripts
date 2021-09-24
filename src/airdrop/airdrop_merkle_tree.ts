import {Airdrop} from "./Airdrop";
import {SnapshotReader} from "./SnapshotReader";
import {writeFile} from 'fs';
import {Decimal} from 'decimal.js'

export function build_merkel_tree(snapshot_path: string, output_file: string, tokens_to_aidrop: number, min_psi_per_anc: number, max_psi_per_anc: number) {
	const snapshot_reader = new SnapshotReader(snapshot_path);
	let stakers = snapshot_reader.read_stakers();
	console.log("stakers count", stakers.size);

	const total_airdrop: Decimal = new Decimal(tokens_to_aidrop).mul(new Decimal(1_000_000));
	const airdrop_accounts = get_airdropped_accounts_from_stakers(stakers, total_airdrop, min_psi_per_anc, max_psi_per_anc);

	const airdrop = new Airdrop(airdrop_accounts);
	const root = airdrop.getMerkleRoot();
	if (validate_merkle_tree(airdrop, airdrop_accounts)) {
		console.log(`Merkle Root: \"${root}\"`);

		save_stakers_as_csv(airdrop_accounts, output_file);
		save_stakers_as_json(airdrop_accounts, output_file);
	} else {
		console.log(`Wrong MerkleTree!!!`);
	}
}

export interface AirdropAccount {
	address: string,
	anc_tokens: Decimal,
	psi_tokens_to_airdrop: Decimal
}

function get_airdropped_accounts_from_stakers(stakers: Map<string, Decimal>, total_airdrop: Decimal, min_psi_per_anc: number, max_psi_per_anc: number): Array<AirdropAccount> {
	let address_to_anc_tokens_sorted = new Array<{address: string; anc_tokens: Decimal}>();
	let total_anc_staked = new Decimal(0);
	for (const [addr, tokens] of stakers) {
		total_anc_staked = total_anc_staked.add(tokens);
		address_to_anc_tokens_sorted.push({address: addr, anc_tokens: tokens.floor()});
	}
	console.log(`total anc staked: ${tokens_to_str(total_anc_staked)}`);

	address_to_anc_tokens_sorted.sort(function (a, b) {
		return a.anc_tokens.cmp(b.anc_tokens)
	});

	console.log(`===================================================================`);

	let processed_anc_staked = new Decimal(0);
	let total_psi_tokens_without_normalization = new Decimal(0);
	let counter = 0;
	const default_normalization_factor = new Decimal(1);
	for (const {anc_tokens} of address_to_anc_tokens_sorted) {
		let debug = false;
		if (counter < 2 || (stakers.size - counter) < 3) {
			debug = true;
		}
		counter += 1;

		const user_psi_tokens = get_psi_amount(anc_tokens, processed_anc_staked, total_anc_staked, min_psi_per_anc, max_psi_per_anc, default_normalization_factor, debug);
		processed_anc_staked = processed_anc_staked.add(anc_tokens);
		total_psi_tokens_without_normalization = total_psi_tokens_without_normalization.add(user_psi_tokens);
	}

	console.log(`total psi tokens without normalization: ${tokens_to_str(total_psi_tokens_without_normalization)}`);

	console.log(`===================================================================`);
	console.log(`===================================================================`);
	console.log(`===================================================================`);
	let result = new Array<AirdropAccount>();

	counter = 0;
	processed_anc_staked = new Decimal(0);
	let total_psi_tokens = new Decimal(0);
	const psi_token_normalization_ratio = total_airdrop.div(total_psi_tokens_without_normalization);
	for (const {address, anc_tokens} of address_to_anc_tokens_sorted) {
		let debug = false;
		if (counter < 2 || (stakers.size - counter) < 3) {
			debug = true;
		}
		counter += 1;

		const user_psi_tokens = get_psi_amount(anc_tokens, processed_anc_staked, total_anc_staked, min_psi_per_anc, max_psi_per_anc, psi_token_normalization_ratio, debug);
		processed_anc_staked = processed_anc_staked.add(anc_tokens);
		total_psi_tokens = total_psi_tokens.add(user_psi_tokens);
		result.push({address: address, anc_tokens: anc_tokens, psi_tokens_to_airdrop: user_psi_tokens});
	}
	console.log(`total psi tokens to airdrop: ${tokens_to_str(total_psi_tokens)}`);
	
	return result;
}

function get_psi_amount(user_anc_tokens: Decimal, already_processed_anc_tokens: Decimal, total_anc_staked: Decimal, min_psi_per_anc: number, max_psi_per_anc: number, normalization_factor: Decimal, debug: boolean): Decimal {
	const max_psi_per_anc_decimal = new Decimal(max_psi_per_anc);
	const processed_anc_tokens_ratio = already_processed_anc_tokens.div(total_anc_staked);
	const processed_after_user_anc_tokens_ratio = already_processed_anc_tokens.add(user_anc_tokens).div(total_anc_staked);
	const avg_processed_anc_tokens_ratio = processed_anc_tokens_ratio.add(processed_after_user_anc_tokens_ratio).div(2);

	const avg_psi_to_anc_ratio = max_psi_per_anc_decimal.sub(avg_processed_anc_tokens_ratio.mul(max_psi_per_anc - min_psi_per_anc));
	const user_psi_tokens = user_anc_tokens.mul(avg_psi_to_anc_ratio);
	const user_psi_tokens_normalized = user_psi_tokens.mul(normalization_factor).floor();

	if (debug) {
		console.log(`\talready processed anc tokens: ${tokens_to_str(already_processed_anc_tokens)}`);
		console.log(`\tpsi to anc ratio: ${(avg_psi_to_anc_ratio)}`);
		console.log(`\tuser psi tokens: ${tokens_to_str(user_psi_tokens_normalized)}`);
		console.log(`\tuser anc tokens: ${tokens_to_str(user_anc_tokens)}`);
		console.log(`\tpsi tokens per 1 anc: ${user_psi_tokens.div(user_anc_tokens)}`)
		console.log(`===================================================================`);
	}
	return user_psi_tokens_normalized;
}

function tokens_to_str(tokens_amount: Decimal): string {
	const human_format = tokens_amount.div(1_000_000);
	if (human_format.cmp(1_000_000) === 1) {
		const result_number = human_format.div(1_000_000);
		return `${result_number} millions`;
	} else if (human_format.cmp(1_000) === 1) {
		const result_number = human_format.div(1_000_000);
		return `${result_number} thousands`;
	} else {
		return `${human_format}`;
	}
}

function validate_merkle_tree(airdrop: Airdrop, accounts_arr: Array<AirdropAccount>): boolean {
	const validate_arr: boolean[] = [];
	for (const airdrop_acc of accounts_arr) {
		const proof = airdrop.getMerkleProof(airdrop_acc);
		validate_arr.push(airdrop.verify(proof, airdrop_acc));
	}

	const wrong_proofs_cnt = validate_arr.filter(p => p === false);
	console.log(`wrong proofs count: ${wrong_proofs_cnt.length}`);

	return wrong_proofs_cnt.length === 0;
}

function save_stakers_as_json(accounts_arr: Array<AirdropAccount>, filepath: string) {
	let accounts = {accounts: accounts_arr};
	writeFile(`${filepath}.json`, JSON.stringify( accounts ), function(err) {
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
