import {existsSync, readFileSync} from 'fs';
import {Decimal} from 'decimal.js'

class SnapshotReader {
	FilePath: string;

	constructor(filepath: string) {
	  this.FilePath = filepath;
	}

	read_stakers(): Map<string, Decimal> {
		if (!existsSync(this.FilePath)) {
			return new Map();
		}

		let result = new Map();
		let file_strings = readFileSync(this.FilePath, 'utf8');
		for (const line of file_strings.split('\n')) {
			let trimmed = line.trim();
			if (trimmed !== "") {
				let splitted = line.split(':');
				let stake_amount = new Decimal(splitted[1].trim());
				if (stake_amount.gt(new Decimal(1))) {
					result.set(splitted[0].toLowerCase().trim(), stake_amount.mul(new Decimal(1_000_000)));
				}
			}
		}

		return result;
	}
}

export { SnapshotReader };
