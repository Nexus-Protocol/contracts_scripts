import { build_merkel_tree } from "./airdrop_merkle_tree"
import * as prompt from 'prompt';

const prompt_properties = [
	{
		name: 'gov_stakers_file'
	},
	{
		name: 'output_json_file'
	},
];

function prompt_for_filepath(): Promise<{input_path: string, output_path: string }> {
	return new Promise(resolve => {
		prompt.get(prompt_properties, (err, result) => {
			if (err) {
				process.exit(1);
			}
			resolve({ input_path: result.gov_stakers_file.toString(), output_path: result.output_json_file.toString() })
		});
	});
}


async function run() {
	const config = await prompt_for_filepath();
	build_merkel_tree(config.input_path, config.output_path);
}

run()
    .then(text => {
        console.log(text);
    })
	.catch(err => {
        console.log(err);
    });
