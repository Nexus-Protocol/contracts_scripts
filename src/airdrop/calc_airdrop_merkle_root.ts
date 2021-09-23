import { build_merkel_tree } from "./airdrop_merkle_tree"
import {Command} from 'commander';

async function run() {
	const program = new Command();

	program
		.requiredOption('-G, --gov_stakers_file <filepath>', `relative path to goverance stakers file`)
		.requiredOption('-O, --output_path <filepath>', `filepath for output json`)
		.requiredOption('-T, --tokens_count <filepath>', `amount of tokens to airdrop`)
		.requiredOption('-N, --min_psi_per_anc <filepath>', `minimum psi tokens per anchor token`)
		.requiredOption('-M, --max_psi_per_anc <filepath>', `maximum psi tokens per anchor token`)
		.action(async (options) => {
			const psi_tokens_to_airdrop: number = parseInt(options.tokens_count);
			const min_psi_per_anc: number = parseInt(options.min_psi_per_anc);
			const max_psi_per_anc: number = parseInt(options.max_psi_per_anc);
			build_merkel_tree(options.gov_stakers_file, options.output_path, psi_tokens_to_airdrop, min_psi_per_anc, max_psi_per_anc);
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
