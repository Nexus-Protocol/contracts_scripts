import {MerkleTree} from 'merkletreejs';
import {AirdropAccount} from './airdrop_merkle_tree';
const keccak256 = require('keccak256');

class Airdrop {
	private tree: MerkleTree;

	constructor(accounts: Array<AirdropAccount>) {
		const leaves: any[] = [];
		for (let account of accounts) {
			const leaf_str = account.address + account.psi_tokens_to_airdrop.toString();
			const leaf = keccak256(leaf_str);
			leaves.push(leaf);
		}
		this.tree = new MerkleTree(leaves, keccak256, { sort: true });
	}

	public getMerkleRoot(): string {
		return this.tree.getHexRoot().replace('0x', '');
	}

	public getMerkleProof(account: AirdropAccount): string[] {
		const leaf_str = account.address + account.psi_tokens_to_airdrop.toString();
		return this.tree
			.getHexProof(keccak256(leaf_str))
			.map((v) => v.replace('0x', ''));
	}

	public verify(
		proof: string[],
		account: AirdropAccount
	): boolean {
		const leaf_str = account.address + account.psi_tokens_to_airdrop.toString();
		let hashBuf = keccak256(leaf_str);

		proof.forEach((proofElem) => {
			const proofBuf = Buffer.from(proofElem, 'hex');

			if (Buffer.compare(hashBuf, proofBuf) === -1) {
				hashBuf = keccak256(Buffer.concat([hashBuf, proofBuf]));
			} else {
				hashBuf = keccak256(Buffer.concat([proofBuf, hashBuf]));
			}
		});

		return this.getMerkleRoot() === hashBuf.toString('hex');
	}
}

export { Airdrop };
