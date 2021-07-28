import {main, query_state} from "./definition";

main()
    .then(text => {
        console.log(text);
    })
	.catch(err => {
        console.log(err);
    });

