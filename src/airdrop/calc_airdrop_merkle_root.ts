import { build_merkel_tree } from "./airdrop_merkle_tree"
import {Command} from 'commander';

async function run() {
	const program = new Command();

	program
		.requiredOption('-G, --gov-stakers-file <filepath>', `relative path to goverance stakers file`)
		.requiredOption('-O, --output-path <filepath>', `filepath for output json`)
		.requiredOption('-T, --tokens-amount <amount>', `amount of tokens to airdrop`)
		.requiredOption('-C, --psi-to-anc-ratio-cfg-path <filepath>', `path to psi_to_anc_ratio config file`)
		.action(async (options) => {
			const psi_tokens_to_airdrop: number = parseInt(options.tokensAmount);
			build_merkel_tree(options.govStakersFile, options.outputPath, psi_tokens_to_airdrop, options.psiToAncRatioCfgPath);
		});

	await program.parseAsync(process.argv);
}

run()
    .then(text => {
        console.log(text);
    })
	.catch(err => {
        console.log(err);
    });
