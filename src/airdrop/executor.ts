import {main, register_merkle_tree} from "./definition";

main()
    .then(text => {
        console.log(text);
    })
	.catch(err => {
        console.log(err);
    });

// const airdrop_contract_addr = "{ todo }";
// const merkle_root = "{ todo }";
// register_merkle_tree(airdrop_contract_addr, merkle_root)
//     .then(text => {
//         console.log(text);
//     })
// 	.catch(err => {
//         console.log(err);
//     });
