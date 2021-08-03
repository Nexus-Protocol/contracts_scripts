import { Airdrop } from "./Airdrop";
import { SnapshotReader } from "./SnapshotReader";

export function build_merkel_tree(snapshot_path: string) {
	const snapshot_reader = new SnapshotReader(snapshot_path);
	let stakers = snapshot_reader.read_stakers();
	console.log("stakers count", stakers.size);
	
	let accounts = new Array<{address: string; amount: string}>();
	// for (let [address, tokens] of stakers) {
	// 	accounts.push({address: address, amount: tokens.floor().toString()});
	// }
	// accounts = accounts.slice(137, 145);
	// for (let acc of accounts) {
	// 	console.log(`address: ${acc.address}, amount: ${acc.amount}`);
	// }
	accounts.push({ "address": "terra1p9vmueyym5a9spvpntkez5dxef57gsxlxy2tft", "amount": "201801210" });
	accounts.push({ "address": "terra1uw39v8y5czse25wvy4g6vdepfzlyhgt2s7nk23", "amount": "32291175 "});
	accounts.push({ "address": "terra1z9tnq0crcqzrwh9qsdt6gn673h5qyvmpjn68wn", "amount": "112285394" });
	accounts.push({ "address": "terra1zzjzccljgc3cp5ay46e5qm9x50czktvdzqvfzm", "amount": "221850450" });
	accounts.push({ "address": "terra15dga6y8edcvkyafu56cve0shre9g6ftc3udyyg", "amount": "38123638" });
	accounts.push({ "address": "terra1326678nwpeamc7zpp562nv4rqnvgkmpwlfv9e0", "amount": "31338086" });
	accounts.push({ "address": "terra1qh63k4j3gvttvrrjd8e0swru8jcgcymgv9p7w2", "amount": "2123142" });
	accounts.push({ "address": "terra1spqs8qdy4kyu5x0hejrptq73vj4vt25d70sswk", "amount": "239046652" });

	const airdrop = new Airdrop(accounts);
	console.log("Merkle Root", airdrop.getMerkleRoot());

	const proof = airdrop.getMerkleProof(accounts[0]);
	console.log("Merkle Proof", proof);
	console.log("Target Acc", accounts[0]);
	console.log("Verified", airdrop.verify(proof, accounts[0]));
}
