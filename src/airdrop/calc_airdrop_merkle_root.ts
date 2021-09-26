import {build_merkel_tree} from "./airdrop_merkle_tree"
import {Command} from 'commander';
import {lstatSync} from 'fs';
import {SnapshotDirReader, SnapshotFileReader} from "./SnapshotReader";
import {Decimal} from 'decimal.js'

async function run() {
	const program = new Command();

	program
		.requiredOption('-G, --gov-stakers-path <filepath>', `relative path to goverance stakers file or directory`)
		.requiredOption('-O, --output-path <filepath>', `filepath for output json`)
		.requiredOption('-T, --tokens-amount <amount>', `amount of tokens to airdrop`)
		.requiredOption('-C, --psi-to-anc-ratio-cfg-path <filepath>', `path to psi_to_anc_ratio config file`)
		.action(async (options) => {
			const stakers = read_stakers(options.govStakersPath, 2);
			const psi_tokens_to_airdrop: number = parseInt(options.tokensAmount);
			build_merkel_tree(stakers, options.outputPath, psi_tokens_to_airdrop, options.psiToAncRatioCfgPath);
		});

	await program.parseAsync(process.argv);
}

function read_stakers(snapshot_path: string, min_anc_staked: number): Map<string, Decimal> {
	if (lstatSync(snapshot_path).isDirectory()) {
		const snapshot_reader = new SnapshotDirReader(snapshot_path, min_anc_staked);
		return snapshot_reader.read_stakers();
	} else if (lstatSync(snapshot_path).isFile()) {
		const snapshot_reader = new SnapshotFileReader(snapshot_path, min_anc_staked);
		return snapshot_reader.read_stakers();
	} else {
		console.error(`'${snapshot_path}' is nor directory, nor file`);
		process.exit(1);
	}
}

run()
    .then(text => {
        console.log(text);
    })
	.catch(err => {
        console.log(err);
    });
