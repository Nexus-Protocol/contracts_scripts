import { MerkleTree } from 'merkletreejs';
const keccak256 = require('keccak256');

class Airdrop {
	private tree: MerkleTree;

	constructor(accounts: Array<{address: string; amount: string}>) {
		const leaves: any[] = [];
		for (let account of accounts) {
			const leave_str = account.address + account.amount;
			// console.log(`leave data: ${leave_str}`);
			const leave = keccak256(leave_str);
			leaves.push(leave);
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
		return this.tree
			.getHexProof(keccak256(account.address + account.amount))
			.map((v) => v.replace('0x', ''));
	}

	public verify(
		proof: string[],
		account: { address: string; amount: string }
	): boolean {
		let hashBuf = keccak256(account.address + account.amount);

		proof.forEach((proofElem) => {
			const proofBuf = Buffer.from(proofElem, 'hex');

			if (hashBuf < proofBuf) {
				hashBuf = keccak256(Buffer.concat([hashBuf, proofBuf]));
			} else {
				hashBuf = keccak256(Buffer.concat([proofBuf, hashBuf]));
			}
		});

		return this.getMerkleRoot() === hashBuf.toString('hex');
	}
}

export { Airdrop };
