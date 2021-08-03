import {Airdrop} from "./Airdrop";
import {SnapshotReader} from "./SnapshotReader";
import {writeFile} from 'fs';
// import { accounts } from "../../airdrop.json";

export function build_merkel_tree(snapshot_path: string) {
	const snapshot_reader = new SnapshotReader(snapshot_path);
	let stakers = snapshot_reader.read_stakers();
	console.log("stakers count", stakers.size);
	
	let accounts = new Array<{address: string; amount: string}>();
	for (const [address, tokens] of stakers) {
		accounts.push({address: address, amount: tokens.floor().toString()});
	}
	accounts = accounts.slice(137, 142);
	
	let buggy_accounts = new Array<{address: string; amount: string}>();
	buggy_accounts.push(accounts[0]);
	buggy_accounts.push(accounts[accounts.length - 1]);
	// TODO: add those two and proof check will return False!
	// buggy_accounts.push(accounts[1]);
	// buggy_accounts.push(accounts[2]);
	buggy_accounts.push(accounts[3]);
	// save_stakers_as_json(accounts);

	for (const acc of buggy_accounts) {
		console.log(`address: \"${acc.address}\", amount: \"${acc.amount}\"`);
	}
	const airdrop = new Airdrop(buggy_accounts);
	console.log("\nMerkle Root", airdrop.getMerkleRoot());

	const proof = airdrop.getMerkleProof(buggy_accounts[0]);
	console.log("\nMerkle Proof", proof);
	console.log("\nTarget Acc", buggy_accounts[0]);
	console.log("\nVerified", airdrop.verify(proof, buggy_accounts[0]));
}

function save_stakers_as_json(accounts_arr: Array<{address: string; amount: string}>) {
	let accounts = {accounts: accounts_arr};
	writeFile("airdrop.json", JSON.stringify( accounts ), function(err) {
	    if (err) {
		console.log(err);
	    }
	});
}
