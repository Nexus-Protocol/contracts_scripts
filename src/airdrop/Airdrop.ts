import {MerkleTree} from 'merkletreejs';
import {AirdropAccount, tokens_to_drop_as_str} from './airdrop_merkle_tree';
const keccak256 = require('keccak256');

class Airdrop {
	private tree: MerkleTree;
	private accounts: Array<AirdropAccount>;

	constructor(accounts: Array<AirdropAccount>) {
		this.accounts = accounts;
		const leaves: any[] = [];
		for (let account of accounts) {
			const leaf_str = account.address + tokens_to_drop_as_str(account);
			const leaf = keccak256(leaf_str);
			leaves.push(leaf);
		}
		this.tree = new MerkleTree(leaves, keccak256, { sort: true });
	}

	public getMerkleRoot(): string {
		return this.tree.getHexRoot().replace('0x', '');
	}

	public getMerkleProof(account: AirdropAccount): string[] {
		const leaf_str = account.address + tokens_to_drop_as_str(account);
		return this.tree
			.getHexProof(keccak256(leaf_str))
			.map((v) => v.replace('0x', ''));
	}

	public verify(
		proof: string[],
		account: AirdropAccount
	): boolean {
		const leaf_str = account.address + tokens_to_drop_as_str(account);
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

	public getAccounts(): Array<AirdropAccount> {
		return this.accounts;
	}
}

export { Airdrop };
