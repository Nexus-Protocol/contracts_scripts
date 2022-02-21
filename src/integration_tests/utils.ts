import {LCDClient, LocalTerra, MnemonicKey, Wallet} from '@terra-money/terra.js';

export async function get_lcd_config_with_wallet_for_integration_tests_only(): Promise<[LCDClient, Wallet]> {
	const localterra = new LocalTerra()
	const lcd_client: LCDClient = localterra;
	const sender: Wallet = localterra.wallets["test3"];

	return [lcd_client, sender];
}

export async function get_random_addr(){
	const source ="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	const seed = get_random_seed(source, 64);
	const owner = new MnemonicKey({account: 1, index: 1, mnemonic: seed});
	return owner.accAddress;
}

function get_random_seed(source: string, seed_length: number){
	let result = '';
	for (let i = 0; i < seed_length; i++) {
		result = result.concat(source.charAt(Math.random() * source.length));
	}
	return result;
}
