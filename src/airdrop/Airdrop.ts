import { MerkleTree } from 'merkletreejs';
const keccak256 = require('keccak256');

class Airdrop {
	private tree: MerkleTree;

	constructor(accounts: Array<{address: string; amount: string}>) {
		const leaves: any[] = [];
		for (let account of accounts) {
			const leaf_str = account.address + account.amount;
			const leaf = keccak256(leaf_str);
			console.log(`leaf\n\tstr: ${leaf_str}\n\thex: ${leaf.toString('hex')}`);
			leaves.push(leaf);
		}
		this.tree = new MerkleTree(leaves, keccak256, { sort: true });
	}

	public getMerkleRoot(): string {
		return this.tree.getHexRoot().replace('0x', '');
	}

	public getMerkleProof(account: {
		address: string;
		amount: string;
	}): string[] {
		const leaf_str = account.address + account.amount;
		console.log(`leaf\n\tstr: \"${leaf_str}\"\n\thex: ${keccak256(leaf_str).toString('hex')}`);
		return this.tree
			.getHexProof(keccak256(leaf_str))
			.map((v) => v.replace('0x', ''));
	}

	public verify(
		proof: string[],
		account: { address: string; amount: string }
	): boolean {
		const leaf_str = account.address + account.amount;
		let hashBuf = keccak256(leaf_str);
		console.log(`leaf\n\tstr: ${leaf_str}\n\thex: ${hashBuf.toString('hex')}`);

		proof.forEach((proofElem) => {
			const proofBuf = Buffer.from(proofElem, 'hex');

			if (hashBuf < proofBuf) {
				hashBuf = keccak256(Buffer.concat([hashBuf, proofBuf]));
			} else {
				hashBuf = keccak256(Buffer.concat([proofBuf, hashBuf]));
			}
		});

		console.log(`merkle root on verify: ${this.getMerkleRoot()}`);
		return this.getMerkleRoot() === hashBuf.toString('hex');
	}
}

export { Airdrop };
