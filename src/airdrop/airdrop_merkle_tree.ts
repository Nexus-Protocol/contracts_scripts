import {Airdrop} from "./Airdrop";
import {SnapshotReader} from "./SnapshotReader";
import {writeFile} from 'fs';
// import { accounts } from "../../airdrop.json";

export function build_merkel_tree(_snapshot_path: string) {
	// const snapshot_reader = new SnapshotReader(snapshot_path);
	// let stakers = snapshot_reader.read_stakers();
	// console.log("stakers count", stakers.size);
	
	// let accounts = new Array<{address: string; amount: string}>();
	// for (const [address, tokens] of stakers) {
	// 	accounts.push({address: address, amount: tokens.floor().toString()});
	// }
	// accounts = accounts.slice(137, 142);
	
	// let buggy_accounts = new Array<{address: string; amount: string}>();
	// buggy_accounts.push(accounts[0]);
	// buggy_accounts.push(accounts[accounts.length - 1]);
	// TODO: add those two and proof check will return False!
	// buggy_accounts.push(accounts[1]);
	// buggy_accounts.push(accounts[2]);
	// buggy_accounts.push(accounts[3]);
	// save_stakers_as_json(accounts);

	let buggy_accounts = new Array<{address: string; amount: string}>();
	buggy_accounts.push({address: "terra1p9vmueyym5a9spvpntkez5dxef57gsxlxy2tft", amount: "201801210"});
	buggy_accounts.push({address: "terra15dga6y8edcvkyafu56cve0shre9g6ftc3udyyg", amount: "38123638"});
	// TODO: add those two and proof check will return False!
	// buggy_accounts.push({address: "terra1uw39v8y5czse25wvy4g6vdepfzlyhgt2s7nk23", amount: "32291175"});
	// buggy_accounts.push({address: "terra1z9tnq0crcqzrwh9qsdt6gn673h5qyvmpjn68wn", amount: "112285394"});
	buggy_accounts.push({address: "terra1zzjzccljgc3cp5ay46e5qm9x50czktvdzqvfzm", amount: "221850450"});


	for (const acc of buggy_accounts) {
		console.log(`address: \"${acc.address}\", amount: \"${acc.amount}\"`);
	}
	const airdrop = new Airdrop(buggy_accounts);
	console.log(`\nMerkle Root: \"${airdrop.getMerkleRoot()}\"`);

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
