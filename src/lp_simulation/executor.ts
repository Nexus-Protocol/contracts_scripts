import {main} from "./definition";

main()
    .then(text => {
        console.log(text);
    })
	.catch(err => {
        console.log(err);
    });
