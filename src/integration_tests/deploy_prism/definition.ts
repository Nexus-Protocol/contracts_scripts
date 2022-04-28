import { LCDClient, Wallet } from "@terra-money/terra.js";

const artifacts_path = "wasm_artifacts";
const path_to_anchor_mm_artifacts = `${artifacts_path}/anchor/mm`;
const prism_market_wasm = `${path_to_anchor_mm_artifacts}/moneymarket_market.wasm`;


export async function prism_init(lcd_client: LCDClient, sender: Wallet) {
	const result = await prism_init_verbose(
		lcd_client,
		sender
	);
	return result;
}

async function prism_init_verbose(
    lcd_client: LCDClient,
	sender: Wallet,
) {
    // TODOD:
}