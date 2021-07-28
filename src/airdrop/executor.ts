import {main, register_merkle_tree} from "./definition";

main()
    .then(text => {
        console.log(text);
    })
	.catch(err => {
        console.log(err);
    });
