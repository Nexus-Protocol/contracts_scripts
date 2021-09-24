import { build_merkel_tree } from "./airdrop_merkle_tree"
import {Command} from 'commander';

async function run() {
	const program = new Command();

	program
		.requiredOption('-G, --gov_stakers_file <filepath>', `relative path to goverance stakers file`)
		.requiredOption('-O, --output_path <filepath>', `filepath for output json`)
		.requiredOption('-T, --tokens_amount <amount>', `amount of tokens to airdrop`)
		.requiredOption('-C, --psi_to_anc_ratio_cfg_path <filepath>', `path to psi_to_anc_ratio config file`)
		.action(async (options) => {
			const psi_tokens_to_airdrop: number = parseInt(options.tokens_amount);
			build_merkel_tree(options.gov_stakers_file, options.output_path, psi_tokens_to_airdrop, options.psi_to_anc_ratio_cfg_path);
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
