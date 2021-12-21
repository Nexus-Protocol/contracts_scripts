import {existsSync, lstatSync, readFileSync, readdirSync} from 'fs';
import {Decimal} from 'decimal.js'

class SnapshotFileReader {
	FilePath: string;
	MinAncStaked: Decimal;

	constructor(filepath: string, min_anc_staked: number) {
		this.FilePath = filepath;
		this.MinAncStaked = new Decimal(min_anc_staked);
	}

	read_stakers(): Map<string, Decimal> {
		if (!existsSync(this.FilePath) && lstatSync(this.FilePath).isFile()) {
			console.error(`filepath '${this.FilePath}' does not exists or not a file`);
			process.exit(1);
		}

		const result = new Map();
		const file_strings = readFileSync(this.FilePath, 'utf8');
		for (const line of file_strings.split('\n')) {
			const trimmed = line.trim();
			if (trimmed !== "") {
				const splitted = line.split(':');
				const stake_amount = new Decimal(splitted[1].trim());
				if (stake_amount.gt(this.MinAncStaked)) {
					result.set(splitted[0].toLowerCase().trim(), stake_amount.mul(new Decimal(1_000_000)));
				}
			}
		}

		return result;
	}
}

class SnapshotDirReader {
	DirPath: string;
	MinAncStaked: number;

	constructor(dirpath: string, min_anc_staked: number) {
		this.DirPath = dirpath;
		this.MinAncStaked = min_anc_staked;
	}

	read_stakers(): Map<string, Decimal> {
		if (!existsSync(this.DirPath) && lstatSync(this.DirPath).isDirectory()) {
			console.error(`dirpath '${this.DirPath}' does not exists or not a directory`);
			process.exit(1);
		}

		let result = new Map();
		const files_in_dir = readdirSync(this.DirPath);
		const total_files = files_in_dir.length;
		for (const file of files_in_dir) {
			const full_filepath = `${this.DirPath}/${file}`;
			if (lstatSync(full_filepath).isFile()) {
				const snapshot_reader = new SnapshotFileReader(full_filepath, this.MinAncStaked);
				const stakers = snapshot_reader.read_stakers();
				result = merge_maps(result, stakers, total_files);
			}
		}

		return result;
	}
}

export {SnapshotFileReader, SnapshotDirReader};

function merge_maps(map1: Map<string, Decimal>, map2: Map<string, Decimal>, total_number_of_files: number): Map<string, Decimal> {
	const result = new Map(map1);

	for (const [key2, value2] of map2) {
		const value1 = result.get(key2);
		const value_to_add = value2.div(total_number_of_files);
		if (value1 !== undefined) {
			result.set(key2, value_to_add.add(value1));
		} else {
			result.set(key2, value_to_add);
		}
	}

	return result;
}
