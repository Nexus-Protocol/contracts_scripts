import {main, register_merkle_tree} from "./definition";
import { build_merkel_tree } from "./airdrop_merkle_tree"

// main()
//     .then(text => {
//         console.log(text);
//     })
// 	.catch(err => {
//         console.log(err);
//     });

build_merkel_tree("/Users/pronvis/Yandex.Disk.localized/crypto/nexus/gov_stakers_4000000.txt");
