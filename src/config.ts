import {LCDClient, Wallet} from '@terra-money/terra.js';
import * as assert from "assert";
import {
	astroport_factory_wasm,
	astroport_pair_wasm,
	cw20_contract_wasm,
	terraswap_factory_wasm,
	terraswap_pair_wasm
} from "./basset_vault/definition"
import { AnchorMarketInfo } from './integration_tests/deploy_anchor/config';
import {instantiate_contract, store_contract} from './utils';

// ================================================

export function PSiTokensOwner(lcd_client: LCDClient, sender: Wallet, multisig_address: string): string {
	if (is_prod(lcd_client)) {
		return multisig_address;
	} else {
		return sender.key.accAddress;
	}
}

// ================================================

export async function Cw20CodeId(lcd_client: LCDClient, sender: Wallet): Promise<number> {
	console.log(`storing our own cw20`);
	let cw20_code_id = await store_contract(lcd_client, sender, cw20_contract_wasm);
	console.log(`cw20_base uploaded; code_id: ${cw20_code_id}`);
	return cw20_code_id;
}

export function is_prod(lcd_client: LCDClient): boolean {
	return lcd_client.config.chainID.startsWith("columbus");
}

export function is_localterra(lcd_client: LCDClient): boolean {
	return lcd_client.config.chainID === "localterra";
}

// ================================================

export async function init_terraswap_factory(lcd_client: LCDClient, sender: Wallet, cw20_code_id: number): Promise<string> {
	if (is_localterra(lcd_client)) {
		console.log(`in localterra, so storing our own terraswap contracts`);
		let terraswap_factory_code_id = await store_contract(lcd_client, sender, terraswap_factory_wasm);
		console.log(`terraswap_factory uploaded\n\tcode_id: ${terraswap_factory_code_id}`);
		let terraswap_pair_code_id = await store_contract(lcd_client, sender, terraswap_pair_wasm);
		console.log(`terraswap_pair uploaded\n\tcode_id: ${terraswap_pair_code_id}`);
		let terraswap_factory_init_msg = {
			pair_code_id: terraswap_pair_code_id,
			token_code_id: cw20_code_id,
		};
		let terraswap_factory_contract_addr = await instantiate_contract(lcd_client, sender, sender.key.accAddress, terraswap_factory_code_id, terraswap_factory_init_msg);
		console.log(`terraswap_factory instantiated\n\taddress: ${terraswap_factory_contract_addr}`);
		return terraswap_factory_contract_addr;
	} else {
		return terraswap_factory_contract_addr(lcd_client);
	}
}

export async function init_astroport_factory(lcd_client: LCDClient, sender: Wallet, cw20_code_id: number): Promise<string> {
	if (is_localterra(lcd_client)) {
		console.log(`in localterra, so storing our own astroport contracts`);
		let astroport_factory_code_id = await store_contract(lcd_client, sender, astroport_factory_wasm);
		console.log(`astroport_factory uploaded\n\tcode_id: ${astroport_factory_code_id}`);
		let astroport_pair_code_id = await store_contract(lcd_client, sender, astroport_pair_wasm);
		console.log(`astroport_pair uploaded\n\tcode_id: ${astroport_pair_code_id}`);
		let astroport_factory_init_msg = {
			owner: sender.key.accAddress,
			pair_configs: [
				{
					code_id: astroport_pair_code_id,
					pair_type: {
						xyk: {}
					},
					total_fee_bps: 0,
					maker_fee_bps: 0
				},
			],
			token_code_id: cw20_code_id
		}
		let astroport_factory_contract_addr = await instantiate_contract(lcd_client, sender, sender.key.accAddress, astroport_factory_code_id, astroport_factory_init_msg);
		console.log(`astroport_factory instantiated\n\taddress: ${astroport_factory_contract_addr}`);
		return astroport_factory_contract_addr;
	} else {
		return astroport_factory_contract_addr(lcd_client);
	}
}

// ================================================

export interface Cw20Coin {
	address: string,
	amount: string,
}

export interface MinterResponse {
	minter: string,
	cap?: string,
}

export interface EmbeddedLogo {
	svg?: string,
	png?: string,
}

export interface Logo {
	url?: string,
	embedded?: EmbeddedLogo
}

export interface InstantiateMarketingInfo {
    project?: string,
    description?: string,
    marketing?: string,
    logo?: Logo,
}

export interface TokenConfig {
	name: string,
	symbol: string,
	decimals: number,
	initial_balances: Cw20Coin[],
	mint?: MinterResponse,
	marketing?: InstantiateMarketingInfo,
}

export function prod_TokenConfig(governance_contract_addr: string, initial_psi_tokens_owner: string): TokenConfig {
	return {
		name: "Nexus Governance Token",
		symbol: "Psi",
		decimals: 6,
		initial_balances: [
			{
				address: initial_psi_tokens_owner,
				amount: "10000000000000000"
			}
		],
		marketing: {
			logo: {
				embedded: {
					svg: "PD94bWwgdmVyc2lvbiA9ICIxLjAiIGVuY29kaW5nID0gInV0Zi04Ij8+IDxzdmcgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIHZpZXdCb3g9IjAgMCAyMDAgMjAwIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPiA8Y2lyY2xlIGN4PSIxMDAiIGN5PSIxMDAiIHI9IjEwMCIgZmlsbD0id2hpdGUiLz4gPHBhdGggZD0iTTk0LjgzNDMgMTE5LjM5MkM5Mi43Mjc3IDExOS4yNDYgOTAuNjIxMSAxMTkuMjY3IDg4LjU3NzEgMTE4LjkzNEM4NS44ODY0IDExOC40OTYgODMuMTMzMyAxMTguMDM3IDgwLjU2NzggMTE3LjE4MkM3NC42MDI2IDExNS4xNTggNzEuMzA3MSAxMTAuNTkxIDY5LjQ5MjUgMTA0Ljc5MkM2OC4yNjE5IDEwMC45MTMgNjcuODg2NCA5Ni45MDgxIDY3Ljg4NjQgOTIuODYxN0M2Ny44NjU2IDg3LjE4ODUgNjcuOTQ5IDgxLjUzNjEgNjcuODQ0NyA3NS44NjI5QzY3LjgwMyA3My45MDIzIDY3LjU3MzYgNzEuOSA2Ny4wOTM5IDcwLjAwMkM2Ni40NjgxIDY3LjQ5OTEgNjUuMTEyNCA2Ni42NDM5IDYyLjUyNjEgNjYuNjQzOUM2MS4wNDUyIDY2LjYyMyA1OS41NjQzIDY2LjYyMyA1OCA2Ni42MjNDNTggNjQuNzQ1OSA1OCA2Mi45NTIxIDU4IDYxLjE3OTJDNTguMDYyNiA2MS4xMzc1IDU4LjEyNTEgNjEuMDU0MSA1OC4xODc3IDYxLjA1NDFDNjEuODc5NSA2MS4wNTQxIDY1LjU3MTMgNjAuOTA4MSA2OS4yNDIyIDYxLjA5NThDNzMuNDM0NSA2MS4zMjUyIDc2LjE0NiA2My43MjM5IDc3LjM3NjYgNjcuODUzNkM3OC4xNjkyIDcwLjUwMjUgNzguNDYxMiA3My4yMzQ5IDc4LjQ0MDMgNzUuOTg4Qzc4LjQ0MDMgODEuNTc3OSA3OC4zOTg2IDg3LjE4ODUgNzguNDYxMiA5Mi43NzgzQzc4LjUwMjkgOTYuNjU3OCA3OC45NDA5IDEwMC40NzUgODAuMzE3NSAxMDQuMTI1QzgxLjY3MzIgMTA3LjczMyA4NC4wOTI3IDExMC4zNjEgODcuNzQyOCAxMTEuNjk2QzkwLjAxNjIgMTEyLjUwOSA5Mi4zNzMxIDExMy4xMTQgOTQuODM0MyAxMTMuODQ0Qzk0LjgzNDMgOTcuOTUxIDk0LjgzNDMgODIuMzcwNCA5NC44MzQzIDY2LjY4NTZDOTEuNjIyMyA2Ni42ODU2IDg4LjM4OTMgNjYuNjg1NiA4NS4wOTM5IDY2LjY4NTZDODUuMDkzOSA2NC43NjY3IDg1LjA5MzkgNjIuOTUyMSA4NS4wOTM5IDYxLjA3NUM5NS4xODg5IDYxLjA3NSAxMDUuMjQyIDYxLjA3NSAxMTUuMzc5IDYxLjA3NUMxMTUuMzc5IDYyLjkxMDQgMTE1LjM3OSA2NC43MDQyIDExNS4zNzkgNjYuNjAyMkMxMTIuMTQ2IDY2LjYwMjIgMTA4LjkzNCA2Ni42MDIyIDEwNS42MTggNjYuNjAyMkMxMDUuNjE4IDgyLjI4NyAxMDUuNjE4IDk3Ljg2NzUgMTA1LjYxOCAxMTMuNTUyQzEwNS45MSAxMTMuNTMyIDEwNi4yMDIgMTEzLjU1MiAxMDYuNDk0IDExMy40OUMxMDcuNTM3IDExMy4yNiAxMDguNiAxMTMuMDEgMTA5LjY0MyAxMTIuNzgxQzExNi4zMTggMTExLjI1OCAxMTkuOTI2IDEwNi45MiAxMjEuMjE5IDEwMC4zNUMxMjEuOTkxIDk2LjM2NTggMTIyLjAzMiA5Mi4zNDAzIDEyMi4wMzIgODguMzE0OEMxMjIuMDMyIDg0LjIwNTkgMTIyLjAzMiA4MC4xMTc4IDEyMi4wMzIgNzYuMDA4OUMxMjIuMDMyIDczLjI1NTcgMTIyLjI2MiA3MC41MjM0IDEyMy4xMTcgNjcuODc0NUMxMjQuNjE5IDYzLjIwMjQgMTI3LjU4MSA2MS4wMzMyIDEzMi41MDMgNjEuMDMzMkMxMzUuNDg2IDYxLjAzMzIgMTM4LjQ4OSA2MS4wMzMyIDE0MS40NzIgNjEuMDMzMkMxNDEuNzg0IDYxLjAzMzIgMTQyLjA3NiA2MS4wNTQxIDE0Mi40NzMgNjEuMDc1QzE0Mi40NzMgNjIuOTEwNCAxNDIuNDczIDY0LjY4MzMgMTQyLjQ3MyA2Ni42NDM5QzE0MC45MDggNjYuNjQzOSAxMzkuMzIzIDY2LjY0MzkgMTM3LjczOCA2Ni42NDM5QzEzNS41MDYgNjYuNjQzOSAxMzQuMzM4IDY3LjQzNjUgMTMzLjUyNSA2OS41MDE0QzEzMi42NyA3MS42OTE0IDEzMi42MDcgNzMuOTY0OSAxMzIuNTg2IDc2LjI4MDFDMTMyLjU2NSA4Mi44OTE5IDEzMi41ODYgODkuNDgyOCAxMzIuNDYxIDk2LjA5NDdDMTMyLjM5OSA5OS4zOTAxIDEzMS43NzMgMTAyLjY0NCAxMzAuNjg4IDEwNS43OTNDMTI4LjI0OCAxMTIuOTQ3IDEyMy4xMTcgMTE2Ljk1MiAxMTUuODggMTE4LjMwOEMxMTIuODU1IDExOC44NzEgMTA5Ljc0NyAxMTguOTk2IDEwNi42ODEgMTE5LjMwOUMxMDYuMzQ4IDExOS4zNTEgMTA2LjAxNCAxMTkuMzUxIDEwNS42MTggMTE5LjM3MkMxMDUuNjE4IDEyNC4wODUgMTA1LjYxOCAxMjguNzM3IDEwNS42MTggMTMzLjQ5MkMxMDguODUxIDEzMy40OTIgMTEyLjA4MyAxMzMuNDkyIDExNS4zNzkgMTMzLjQ5MkMxMTUuMzc5IDEzNS4zNjkgMTE1LjM3OSAxMzcuMTIxIDExNS4zNzkgMTM4Ljk1N0MxMDUuMzI2IDEzOC45NTcgOTUuMjMwNiAxMzguOTU3IDg1LjA5MzkgMTM4Ljk1N0M4NS4wOTM5IDEzNy4xODQgODUuMDkzOSAxMzUuNDMyIDg1LjA5MzkgMTMzLjU1NUM4OC4zNDc2IDEzMy41NTUgOTEuNTgwNSAxMzMuNTU1IDk0Ljg3NiAxMzMuNTU1Qzk0LjgzNDMgMTI4Ljc1NyA5NC44MzQzIDEyNC4wODUgOTQuODM0MyAxMTkuMzkyWiIgZmlsbD0iIzFBMUIyQSIvPiA8L3N2Zz4K"
				}
			}
		},
		mint: {
			minter: governance_contract_addr,
		}
	}
}

export function testnet_TokenConfig(governance_contract_addr: string, initial_psi_tokens_owner: string): TokenConfig {
	return {
		name: "Nexus Governance Token",
		symbol: "Psi",
		decimals: 6,
		initial_balances: [
			{
				address: initial_psi_tokens_owner,
				amount: "10000000000000000"
			}
		],
		marketing: {
			logo: {
				embedded: {
					svg: "PD94bWwgdmVyc2lvbiA9ICIxLjAiIGVuY29kaW5nID0gInV0Zi04Ij8+IDxzdmcgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIHZpZXdCb3g9IjAgMCAyMDAgMjAwIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPiA8Y2lyY2xlIGN4PSIxMDAiIGN5PSIxMDAiIHI9IjEwMCIgZmlsbD0id2hpdGUiLz4gPHBhdGggZD0iTTk0LjgzNDMgMTE5LjM5MkM5Mi43Mjc3IDExOS4yNDYgOTAuNjIxMSAxMTkuMjY3IDg4LjU3NzEgMTE4LjkzNEM4NS44ODY0IDExOC40OTYgODMuMTMzMyAxMTguMDM3IDgwLjU2NzggMTE3LjE4MkM3NC42MDI2IDExNS4xNTggNzEuMzA3MSAxMTAuNTkxIDY5LjQ5MjUgMTA0Ljc5MkM2OC4yNjE5IDEwMC45MTMgNjcuODg2NCA5Ni45MDgxIDY3Ljg4NjQgOTIuODYxN0M2Ny44NjU2IDg3LjE4ODUgNjcuOTQ5IDgxLjUzNjEgNjcuODQ0NyA3NS44NjI5QzY3LjgwMyA3My45MDIzIDY3LjU3MzYgNzEuOSA2Ny4wOTM5IDcwLjAwMkM2Ni40NjgxIDY3LjQ5OTEgNjUuMTEyNCA2Ni42NDM5IDYyLjUyNjEgNjYuNjQzOUM2MS4wNDUyIDY2LjYyMyA1OS41NjQzIDY2LjYyMyA1OCA2Ni42MjNDNTggNjQuNzQ1OSA1OCA2Mi45NTIxIDU4IDYxLjE3OTJDNTguMDYyNiA2MS4xMzc1IDU4LjEyNTEgNjEuMDU0MSA1OC4xODc3IDYxLjA1NDFDNjEuODc5NSA2MS4wNTQxIDY1LjU3MTMgNjAuOTA4MSA2OS4yNDIyIDYxLjA5NThDNzMuNDM0NSA2MS4zMjUyIDc2LjE0NiA2My43MjM5IDc3LjM3NjYgNjcuODUzNkM3OC4xNjkyIDcwLjUwMjUgNzguNDYxMiA3My4yMzQ5IDc4LjQ0MDMgNzUuOTg4Qzc4LjQ0MDMgODEuNTc3OSA3OC4zOTg2IDg3LjE4ODUgNzguNDYxMiA5Mi43NzgzQzc4LjUwMjkgOTYuNjU3OCA3OC45NDA5IDEwMC40NzUgODAuMzE3NSAxMDQuMTI1QzgxLjY3MzIgMTA3LjczMyA4NC4wOTI3IDExMC4zNjEgODcuNzQyOCAxMTEuNjk2QzkwLjAxNjIgMTEyLjUwOSA5Mi4zNzMxIDExMy4xMTQgOTQuODM0MyAxMTMuODQ0Qzk0LjgzNDMgOTcuOTUxIDk0LjgzNDMgODIuMzcwNCA5NC44MzQzIDY2LjY4NTZDOTEuNjIyMyA2Ni42ODU2IDg4LjM4OTMgNjYuNjg1NiA4NS4wOTM5IDY2LjY4NTZDODUuMDkzOSA2NC43NjY3IDg1LjA5MzkgNjIuOTUyMSA4NS4wOTM5IDYxLjA3NUM5NS4xODg5IDYxLjA3NSAxMDUuMjQyIDYxLjA3NSAxMTUuMzc5IDYxLjA3NUMxMTUuMzc5IDYyLjkxMDQgMTE1LjM3OSA2NC43MDQyIDExNS4zNzkgNjYuNjAyMkMxMTIuMTQ2IDY2LjYwMjIgMTA4LjkzNCA2Ni42MDIyIDEwNS42MTggNjYuNjAyMkMxMDUuNjE4IDgyLjI4NyAxMDUuNjE4IDk3Ljg2NzUgMTA1LjYxOCAxMTMuNTUyQzEwNS45MSAxMTMuNTMyIDEwNi4yMDIgMTEzLjU1MiAxMDYuNDk0IDExMy40OUMxMDcuNTM3IDExMy4yNiAxMDguNiAxMTMuMDEgMTA5LjY0MyAxMTIuNzgxQzExNi4zMTggMTExLjI1OCAxMTkuOTI2IDEwNi45MiAxMjEuMjE5IDEwMC4zNUMxMjEuOTkxIDk2LjM2NTggMTIyLjAzMiA5Mi4zNDAzIDEyMi4wMzIgODguMzE0OEMxMjIuMDMyIDg0LjIwNTkgMTIyLjAzMiA4MC4xMTc4IDEyMi4wMzIgNzYuMDA4OUMxMjIuMDMyIDczLjI1NTcgMTIyLjI2MiA3MC41MjM0IDEyMy4xMTcgNjcuODc0NUMxMjQuNjE5IDYzLjIwMjQgMTI3LjU4MSA2MS4wMzMyIDEzMi41MDMgNjEuMDMzMkMxMzUuNDg2IDYxLjAzMzIgMTM4LjQ4OSA2MS4wMzMyIDE0MS40NzIgNjEuMDMzMkMxNDEuNzg0IDYxLjAzMzIgMTQyLjA3NiA2MS4wNTQxIDE0Mi40NzMgNjEuMDc1QzE0Mi40NzMgNjIuOTEwNCAxNDIuNDczIDY0LjY4MzMgMTQyLjQ3MyA2Ni42NDM5QzE0MC45MDggNjYuNjQzOSAxMzkuMzIzIDY2LjY0MzkgMTM3LjczOCA2Ni42NDM5QzEzNS41MDYgNjYuNjQzOSAxMzQuMzM4IDY3LjQzNjUgMTMzLjUyNSA2OS41MDE0QzEzMi42NyA3MS42OTE0IDEzMi42MDcgNzMuOTY0OSAxMzIuNTg2IDc2LjI4MDFDMTMyLjU2NSA4Mi44OTE5IDEzMi41ODYgODkuNDgyOCAxMzIuNDYxIDk2LjA5NDdDMTMyLjM5OSA5OS4zOTAxIDEzMS43NzMgMTAyLjY0NCAxMzAuNjg4IDEwNS43OTNDMTI4LjI0OCAxMTIuOTQ3IDEyMy4xMTcgMTE2Ljk1MiAxMTUuODggMTE4LjMwOEMxMTIuODU1IDExOC44NzEgMTA5Ljc0NyAxMTguOTk2IDEwNi42ODEgMTE5LjMwOUMxMDYuMzQ4IDExOS4zNTEgMTA2LjAxNCAxMTkuMzUxIDEwNS42MTggMTE5LjM3MkMxMDUuNjE4IDEyNC4wODUgMTA1LjYxOCAxMjguNzM3IDEwNS42MTggMTMzLjQ5MkMxMDguODUxIDEzMy40OTIgMTEyLjA4MyAxMzMuNDkyIDExNS4zNzkgMTMzLjQ5MkMxMTUuMzc5IDEzNS4zNjkgMTE1LjM3OSAxMzcuMTIxIDExNS4zNzkgMTM4Ljk1N0MxMDUuMzI2IDEzOC45NTcgOTUuMjMwNiAxMzguOTU3IDg1LjA5MzkgMTM4Ljk1N0M4NS4wOTM5IDEzNy4xODQgODUuMDkzOSAxMzUuNDMyIDg1LjA5MzkgMTMzLjU1NUM4OC4zNDc2IDEzMy41NTUgOTEuNTgwNSAxMzMuNTU1IDk0Ljg3NiAxMzMuNTU1Qzk0LjgzNDMgMTI4Ljc1NyA5NC44MzQzIDEyNC4wODUgOTQuODM0MyAxMTkuMzkyWiIgZmlsbD0iIzFBMUIyQSIvPiA8L3N2Zz4K"
				}
			}
		},
		mint: {
			minter: governance_contract_addr,
		}
	}
}

export function TokenConfig(lcd_client: LCDClient, governance_contract_addr: string, initial_psi_tokens_owner: string): TokenConfig {
	if (is_prod(lcd_client)) {
		return prod_TokenConfig(governance_contract_addr, initial_psi_tokens_owner);
	} else {
		return testnet_TokenConfig(governance_contract_addr, initial_psi_tokens_owner);
	}
}

// ================================================

const terraswap_factory_contract_addr_prod = "terra1ulgw0td86nvs4wtpsc80thv6xelk76ut7a7apj";
const terraswap_factory_contract_addr_testnet = "terra18qpjm4zkvqnpjpw0zn0tdr8gdzvt8au35v45xf";

export function terraswap_factory_contract_addr(lcd_client: LCDClient): string {
	if (is_prod(lcd_client)) {
		return terraswap_factory_contract_addr_prod;
	} else {
		return terraswap_factory_contract_addr_testnet;
	}
}

const astroport_factory_contract_addr_prod = "terra1fnywlw4edny3vw44x04xd67uzkdqluymgreu7g";
const astroport_factory_contract_addr_testnet = "terra15jsahkaf9p0qu8ye873p0u5z6g07wdad0tdq43";

export function astroport_factory_contract_addr(lcd_client: LCDClient): string {
	if (is_prod(lcd_client)) {
		return astroport_factory_contract_addr_prod;
	} else {
		return astroport_factory_contract_addr_testnet;
	}
}

// ================================================
// Anchor params
// {
//   "quorum": "0.1",
//   "threshold": "0.5",
//   "voting_period": 94097,
//   "timelock_period": 40327,
//   "expiration_period": 13443,
//   "proposal_deposit": "1000000000",
//   "snapshot_period": 13443
// }
//
// Mirror params
// {
  // "quorum": "0.09998",
  // "threshold": "0.49989",
  // "voting_period": 604800,
  // "effective_delay": 86400,
  // "expiration_period": 86400,
  // "proposal_deposit": "100000000",
  // "voter_weight": "0.5",
  // "snapshot_period": 86400
// }

export interface GovernanceConfig {
	quorum: string,
	threshold: string,
	voting_period: number,
	timelock_period: number,
	proposal_deposit: string,
	snapshot_period: number,
}

export function prod_GovernanceConfig(): GovernanceConfig {
	return {
		quorum: "0.1",
		threshold: "0.5",
		voting_period: 432000, // 5 days (in seconds)
		timelock_period: 86400, // 1 day
		proposal_deposit: "10000000000",
		snapshot_period: 86400, // 1 day
	}
}

export function test_GovernanceConfig(): GovernanceConfig {
	return {
		quorum: "0.1",
		threshold: "0.5",
		voting_period: 172800, // 2 days (in seconds)
		timelock_period: 86400, // 1 day
		proposal_deposit: "10000000000",
		snapshot_period: 86400, // 1 day
	}
}

export function GovernanceConfig(lcd_client: LCDClient): GovernanceConfig {
	if (is_prod(lcd_client)) {
		return prod_GovernanceConfig();
	} else {
		return test_GovernanceConfig();
	}
}

// ================================================

export interface CommunityPoolConfig {
	governance_contract_addr: string,
	psi_token_addr: string,
}

export function prod_CommunityPoolConfig(governance_contract_addr: string, psi_token_addr: string): CommunityPoolConfig {
	return {
		governance_contract_addr: governance_contract_addr,
		psi_token_addr: psi_token_addr,
	}
}

export function test_CommunityPoolConfig(governance_contract_addr: string, psi_token_addr: string): CommunityPoolConfig {
	return {
		governance_contract_addr: governance_contract_addr,
		psi_token_addr: psi_token_addr,
	}
}

export function CommunityPoolConfig(lcd_client: LCDClient, governance_contract_addr: string, psi_token_addr: string): CommunityPoolConfig {
	if (is_prod(lcd_client)) {
		return prod_CommunityPoolConfig(governance_contract_addr, psi_token_addr);
	} else {
		return test_CommunityPoolConfig(governance_contract_addr, psi_token_addr);
	}
}


// ================================================

export interface BassetVaultStrategyConfig {
	governance_contract_addr: string,
	oracle_contract_addr: string,
	basset_token_addr: string,
	stable_denom: string,
	borrow_ltv_max: string,
	borrow_ltv_min: string,
	borrow_ltv_aim: string,
	basset_max_ltv: string,
	buffer_part: string,
	price_timeframe: number,
	anchor_market_addr: string,
    anchor_interest_model_addr: string,
    anchor_overseer_addr: string,
    anchor_token_addr: string,
    anc_ust_swap_addr: string,
	staking_apr: string,
}

export function prod_BassetVaultStrategyConfigForbLuna(governance_contract_addr: string): BassetVaultStrategyConfig {
	 return {
		governance_contract_addr: governance_contract_addr,
		oracle_contract_addr: "terra1cgg6yef7qcdm070qftghfulaxmllgmvk77nc7t",
		basset_token_addr: "terra1kc87mu460fwkqte29rquh4hc20m54fxwtsx7gp",
		stable_denom: "uusd",
		borrow_ltv_max: "0.85",
		borrow_ltv_min: "0.75",
		borrow_ltv_aim: "0.8",
		basset_max_ltv: "0.6",
		buffer_part: "0.018",
		price_timeframe: 25,
		anchor_market_addr: "terra1sepfj7s0aeg5967uxnfk4thzlerrsktkpelm5s",
    	anchor_interest_model_addr: "terra1kq8zzq5hufas9t0kjsjc62t2kucfnx8txf547n",
    	anchor_overseer_addr: "terra1tmnqgvg567ypvsvk6rwsga3srp7e3lg6u0elp8",
    	anchor_token_addr: "terra14z56l0fp2lsf86zy3hty2z47ezkhnthtr9yq76",
    	anc_ust_swap_addr: "terra1qr2k6yjjd5p2kaewqvg93ag74k6gyjr7re37fs",
		staking_apr: "0.0",
	}
}

export function testnet_BassetVaultStrategyConfigForbLuna(governance_contract_addr: string): BassetVaultStrategyConfig {
	return {
		governance_contract_addr: governance_contract_addr,
		oracle_contract_addr: "terra1p4gg3p2ue6qy2qfuxtrmgv2ec3f4jmgqtazum8",
		basset_token_addr: "terra1u0t35drzyy0mujj8rkdyzhe264uls4ug3wdp3x",
		stable_denom: "uusd",
		borrow_ltv_max: "0.85",
		borrow_ltv_min: "0.75",
		borrow_ltv_aim: "0.8",
		basset_max_ltv: "0.6",
		buffer_part: "0.018",
		price_timeframe: 25,
		anchor_market_addr: "terra15dwd5mj8v59wpj0wvt233mf5efdff808c5tkal",
    	anchor_interest_model_addr: "terra1m25aqupscdw2kw4tnq5ql6hexgr34mr76azh5x",
    	anchor_overseer_addr: "terra1qljxd0y3j3gk97025qvl3lgq8ygup4gsksvaxv",
    	anchor_token_addr: "terra1747mad58h0w4y589y3sk84r5efqdev9q4r02pc",
    	anc_ust_swap_addr: "terra1wfvczps2865j0awnurk9m04u7wdmd6qv3fdnvz",
		staking_apr: "0.0",
	}
}

export function BassetVaultStrategyConfigForbLuna(lcd_client: LCDClient, governance_contract_addr: string): BassetVaultStrategyConfig {
	if (is_prod(lcd_client)) {
		return prod_BassetVaultStrategyConfigForbLuna(governance_contract_addr);
	} else {
		return testnet_BassetVaultStrategyConfigForbLuna(governance_contract_addr);
	}
}

export function prod_BassetVaultStrategyConfigForbEth(governance_contract_addr: string): BassetVaultStrategyConfig {
	 return {
		governance_contract_addr: governance_contract_addr,
		oracle_contract_addr: "terra1cgg6yef7qcdm070qftghfulaxmllgmvk77nc7t",
		basset_token_addr: "terra1dzhzukyezv0etz22ud940z7adyv7xgcjkahuun",
		stable_denom: "uusd",
		borrow_ltv_max: "0.85",
		borrow_ltv_min: "0.75",
		borrow_ltv_aim: "0.8",
		basset_max_ltv: "0.6",
		buffer_part: "0.018",
		price_timeframe: 25,
		anchor_market_addr: "terra1sepfj7s0aeg5967uxnfk4thzlerrsktkpelm5s",
    	anchor_interest_model_addr: "terra1kq8zzq5hufas9t0kjsjc62t2kucfnx8txf547n",
    	anchor_overseer_addr: "terra1tmnqgvg567ypvsvk6rwsga3srp7e3lg6u0elp8",
    	anchor_token_addr: "terra14z56l0fp2lsf86zy3hty2z47ezkhnthtr9yq76",
    	anc_ust_swap_addr: "terra1qr2k6yjjd5p2kaewqvg93ag74k6gyjr7re37fs",
		staking_apr: "0.0",
	}
}

export function testnet_BassetVaultStrategyConfigForbEth(governance_contract_addr: string): BassetVaultStrategyConfig {
	return {
		governance_contract_addr: governance_contract_addr,
		oracle_contract_addr: "terra1p4gg3p2ue6qy2qfuxtrmgv2ec3f4jmgqtazum8",
		basset_token_addr: "terra19mkj9nec6e3y5754tlnuz4vem7lzh4n0lc2s3l",
		stable_denom: "uusd",
		borrow_ltv_max: "0.85",
		borrow_ltv_min: "0.75",
		borrow_ltv_aim: "0.8",
		basset_max_ltv: "0.6",
		buffer_part: "0.018",
		price_timeframe: 25,
		anchor_market_addr: "terra15dwd5mj8v59wpj0wvt233mf5efdff808c5tkal",
    	anchor_interest_model_addr: "terra1m25aqupscdw2kw4tnq5ql6hexgr34mr76azh5x",
    	anchor_overseer_addr: "terra1qljxd0y3j3gk97025qvl3lgq8ygup4gsksvaxv",
    	anchor_token_addr: "terra1747mad58h0w4y589y3sk84r5efqdev9q4r02pc",
    	anc_ust_swap_addr: "terra1wfvczps2865j0awnurk9m04u7wdmd6qv3fdnvz",
		staking_apr: "0.0",
	}
}

export function BassetVaultStrategyConfigForbEth(lcd_client: LCDClient, governance_contract_addr: string): BassetVaultStrategyConfig {
	if (is_prod(lcd_client)) {
		return prod_BassetVaultStrategyConfigForbEth(governance_contract_addr);
	} else {
		return testnet_BassetVaultStrategyConfigForbEth(governance_contract_addr);
	}
}
// ================================================

export interface BassetVaultConfig {
	gov_addr: string,
	community_addr: string,
	// nasset_token_code_id
	nasset_t_ci: number,
	// nasset_token_config_holder_code_id
	nasset_t_ch_ci: number,
	// nasset_token_rewards_code_id
	nasset_t_r_ci: number,
	// psi_distributor_code_id
	psi_distr_ci: number,
	//Luna / ETH / Sol, will be converted to nLuna, nETH, nSol
	// collateral_token_symbol
	collateral_ts: string,
	// basset_token_addr: String,
	basset_addr: string,
	// anchor_token_addr
	anchor_addr: string,
	// anchor_market_contract_addr
	a_market_addr: string,
	// anchor_overseer_contract_addr
	a_overseer_addr: string,
	// anchor_custody_basset_contract_addr
	a_custody_basset_addr: string,
	// anc_stable_swap_contract_addr
	anc_stable_swap_addr: string,
	// psi_stable_swap_contract_addr
	psi_stable_swap_addr: string,
	// aterra_token_addr
	aterra_addr: string,
	// psi_token_addr
	psi_addr: string,
	// basset_vault_strategy_contract_addr
	basset_vs_addr: string,
	stable_denom: string,
	claiming_rewards_delay: number,
	///UST value in balance should be more than loan
	///on what portion.
	///for example: 1.01 means 1% more than loan
	over_loan_balance_value: string,
	///mean ltv that user manage by himself (advise: 60%)
	manual_ltv: string,
	///fees, need to calc how much send to governance and community pools
	fee_rate: string,
	tax_rate: string,
	ts_factory_addr: string
	a_basset_reward_addr: string,
}

export function prod_BassetVaultConfigForbLuna(
	governance_contract_addr: string,
	community_pool_contract_addr: string,
	nasset_token_code_id: number,
	nasset_token_config_holder_code_id: number,
	nasset_token_rewards_code_id: number,
	psi_distributor_code_id: number,
	psi_token_addr: string,
	psi_stable_swap_contract_addr: string,
	basset_vault_strategy_contract_addr: string,
	ts_factory_addr: string,
): BassetVaultConfig {
	 return {
		 gov_addr: governance_contract_addr,
		 community_addr: community_pool_contract_addr,
		 nasset_t_ci: nasset_token_code_id,
		 nasset_t_ch_ci: nasset_token_config_holder_code_id,
		 nasset_t_r_ci: nasset_token_rewards_code_id,
		 psi_distr_ci: psi_distributor_code_id,
		 collateral_ts: "Luna",
		 basset_addr: "terra1kc87mu460fwkqte29rquh4hc20m54fxwtsx7gp",
		 anchor_addr: "terra14z56l0fp2lsf86zy3hty2z47ezkhnthtr9yq76",
		 a_market_addr: "terra1sepfj7s0aeg5967uxnfk4thzlerrsktkpelm5s",
		 a_overseer_addr: "terra1tmnqgvg567ypvsvk6rwsga3srp7e3lg6u0elp8",
		 a_custody_basset_addr: "terra1ptjp2vfjrwh0j0faj9r6katm640kgjxnwwq9kn",
		 anc_stable_swap_addr: "terra1gm5p3ner9x9xpwugn9sp6gvhd0lwrtkyrecdn3",
		 psi_stable_swap_addr: psi_stable_swap_contract_addr,
		 aterra_addr: "terra1hzh9vpxhsk8253se0vv5jj6etdvxu3nv8z07zu",
		 psi_addr: psi_token_addr,
		 basset_vs_addr: basset_vault_strategy_contract_addr,
		 stable_denom: "uusd",
		 claiming_rewards_delay: 120,
		 ///UST value in balance should be more than loan
		 ///on what portion.
		 ///for example: 1.01 means 1% more than loan
		 over_loan_balance_value: "1.01",
		 ///mean ltv that user manage by himself (advise: 58%)
		 manual_ltv: "0.58",
		 ///fees, need to calc how much send to governance and community pools
		 fee_rate: "0.5",
		 tax_rate: "0.25",
		 ts_factory_addr: ts_factory_addr,
		 a_basset_reward_addr: "terra17yap3mhph35pcwvhza38c2lkj7gzywzy05h7l0",
	 }
}

export function testnet_BassetVaultConfigForbLuna(
	governance_contract_addr: string,
	community_pool_contract_addr: string,
	nasset_token_code_id: number,
	nasset_token_config_holder_code_id: number,
	nasset_token_rewards_code_id: number,
	psi_distributor_code_id: number,
	psi_token_addr: string,
	psi_stable_swap_contract_addr: string,
	basset_vault_strategy_contract_addr: string,
	ts_factory_addr: string,
): BassetVaultConfig {
	return {
		gov_addr: governance_contract_addr,
		community_addr: community_pool_contract_addr,
		nasset_t_ci: nasset_token_code_id,
		nasset_t_ch_ci: nasset_token_config_holder_code_id,
		nasset_t_r_ci: nasset_token_rewards_code_id,
		psi_distr_ci: psi_distributor_code_id,
		collateral_ts: "Luna",
		basset_addr: "terra1u0t35drzyy0mujj8rkdyzhe264uls4ug3wdp3x",
		anchor_addr: "terra1747mad58h0w4y589y3sk84r5efqdev9q4r02pc",
		a_market_addr: "terra15dwd5mj8v59wpj0wvt233mf5efdff808c5tkal",
		a_overseer_addr: "terra1qljxd0y3j3gk97025qvl3lgq8ygup4gsksvaxv",
		a_custody_basset_addr: "terra1ltnkx0mv7lf2rca9f8w740ashu93ujughy4s7p",
		anc_stable_swap_addr: "terra1wfvczps2865j0awnurk9m04u7wdmd6qv3fdnvz",
		psi_stable_swap_addr: psi_stable_swap_contract_addr,
		aterra_addr: "terra1ajt556dpzvjwl0kl5tzku3fc3p3knkg9mkv8jl",
		psi_addr: psi_token_addr,
		basset_vs_addr: basset_vault_strategy_contract_addr,
		stable_denom: "uusd",
		claiming_rewards_delay: 120,
		///UST value in balance should be more than loan
		///on what portion.
		///for example: 1.01 means 1% more than loan
		over_loan_balance_value: "1.01",
		///mean ltv that user manage by himself (advise: 58%)
		manual_ltv: "0.58",
		///fees, need to calc how much send to governance and community pools
		fee_rate: "0.5",
		tax_rate: "0.25",
		ts_factory_addr: ts_factory_addr,
		a_basset_reward_addr: "terra1ac24j6pdxh53czqyrkr6ygphdeftg7u3958tl2",
	}
}

export function BassetVaultConfigForbLuna(
	lcd_client: LCDClient,
	governance_contract_addr: string,
	community_pool_contract_addr: string,
	nasset_token_code_id: number,
	nasset_token_config_holder_code_id: number,
	nasset_token_rewards_code_id: number,
	psi_distributor_code_id: number,
	psi_token_addr: string,
	psi_stable_swap_contract_addr: string,
	basset_vault_strategy_contract_addr: string,
	ts_factory_addr: string,
): BassetVaultConfig {
	if (is_prod(lcd_client)) {
		return prod_BassetVaultConfigForbLuna(
			governance_contract_addr,
			community_pool_contract_addr,
			nasset_token_code_id,
			nasset_token_config_holder_code_id,
			nasset_token_rewards_code_id,
			psi_distributor_code_id,
			psi_token_addr,
			psi_stable_swap_contract_addr,
			basset_vault_strategy_contract_addr,
			ts_factory_addr
		);
	} else {
		return testnet_BassetVaultConfigForbLuna(
			governance_contract_addr,
			community_pool_contract_addr,
			nasset_token_code_id,
			nasset_token_config_holder_code_id,
			nasset_token_rewards_code_id,
			psi_distributor_code_id,
			psi_token_addr,
			psi_stable_swap_contract_addr,
			basset_vault_strategy_contract_addr,
			ts_factory_addr,
		);
	}
}

export function prod_BassetVaultConfigForbEth(
	governance_contract_addr: string,
	community_pool_contract_addr: string,
	nasset_token_code_id: number,
	nasset_token_config_holder_code_id: number,
	nasset_token_rewards_code_id: number,
	psi_distributor_code_id: number,
	psi_token_addr: string,
	psi_stable_swap_contract_addr: string,
	basset_vault_strategy_contract_addr: string,
	ts_factory_addr: string
): BassetVaultConfig {
	 return {
		gov_addr: governance_contract_addr,
		community_addr: community_pool_contract_addr,
		nasset_t_ci: nasset_token_code_id,
		nasset_t_ch_ci: nasset_token_config_holder_code_id,
		nasset_t_r_ci: nasset_token_rewards_code_id,
		psi_distr_ci: psi_distributor_code_id,
		collateral_ts: "ETH",
		basset_addr: "terra1dzhzukyezv0etz22ud940z7adyv7xgcjkahuun",
		anchor_addr: "terra14z56l0fp2lsf86zy3hty2z47ezkhnthtr9yq76",
		a_market_addr: "terra1sepfj7s0aeg5967uxnfk4thzlerrsktkpelm5s",
		a_overseer_addr: "terra1tmnqgvg567ypvsvk6rwsga3srp7e3lg6u0elp8",
		a_custody_basset_addr: "terra10cxuzggyvvv44magvrh3thpdnk9cmlgk93gmx2",
		anc_stable_swap_addr: "terra1gm5p3ner9x9xpwugn9sp6gvhd0lwrtkyrecdn3",
		psi_stable_swap_addr: psi_stable_swap_contract_addr,
		aterra_addr: "terra1hzh9vpxhsk8253se0vv5jj6etdvxu3nv8z07zu",
		psi_addr: psi_token_addr,
		basset_vs_addr: basset_vault_strategy_contract_addr,
		stable_denom: "uusd",
		claiming_rewards_delay: 120,
		///UST value in balance should be more than loan
		///on what portion.
		///for example: 1.01 means 1% more than loan
		over_loan_balance_value: "1.01",
		///mean ltv that user manage by himself (advise: 58%)
		manual_ltv: "0.58",
		///fees, need to calc how much send to governance and community pools
		fee_rate: "0.5",
		tax_rate: "0.25",
		ts_factory_addr: ts_factory_addr,
		a_basset_reward_addr: "terra1939tzfn4hn960ychpcsjshu8jds3zdwlp8jed9",
	}
}

export function testnet_BassetVaultConfigForbEth(
	governance_contract_addr: string,
	community_pool_contract_addr: string,
	nasset_token_code_id: number,
	nasset_token_config_holder_code_id: number,
	nasset_token_rewards_code_id: number,
	psi_distributor_code_id: number,
	psi_token_addr: string,
	psi_stable_swap_contract_addr: string,
	basset_vault_strategy_contract_addr: string,
	ts_factory_addr: string,
): BassetVaultConfig {
	return {
		gov_addr: governance_contract_addr,
		community_addr: community_pool_contract_addr,
		nasset_t_ci: nasset_token_code_id,
		nasset_t_ch_ci: nasset_token_config_holder_code_id,
		nasset_t_r_ci: nasset_token_rewards_code_id,
		psi_distr_ci: psi_distributor_code_id,
		collateral_ts: "ETH",
		basset_addr: "terra19mkj9nec6e3y5754tlnuz4vem7lzh4n0lc2s3l",
		anchor_addr: "terra1747mad58h0w4y589y3sk84r5efqdev9q4r02pc",
		a_market_addr: "terra15dwd5mj8v59wpj0wvt233mf5efdff808c5tkal",
		a_overseer_addr: "terra1qljxd0y3j3gk97025qvl3lgq8ygup4gsksvaxv",
		a_custody_basset_addr: "terra1j6fey5tl70k9fvrv7mea7ahfr8u2yv7l23w5e6",
		anc_stable_swap_addr: "terra1wfvczps2865j0awnurk9m04u7wdmd6qv3fdnvz",
		psi_stable_swap_addr: psi_stable_swap_contract_addr,
		aterra_addr: "terra1ajt556dpzvjwl0kl5tzku3fc3p3knkg9mkv8jl",
		psi_addr: psi_token_addr,
		basset_vs_addr: basset_vault_strategy_contract_addr,
		stable_denom: "uusd",
		claiming_rewards_delay: 120,
		///UST value in balance should be more than loan
		///on what portion.
		///for example: 1.01 means 1% more than loan
		over_loan_balance_value: "1.01",
		///mean ltv that user manage by himself (advise: 58%)
		manual_ltv: "0.58",
		///fees, need to calc how much send to governance and community pools
		fee_rate: "0.5",
		tax_rate: "0.25",
		ts_factory_addr: ts_factory_addr,
		a_basset_reward_addr: "terra1ja3snkedk4t0zp7z3ljd064hcln8dsv5x004na",
	}
}

export function BassetVaultConfigForbEth(
	lcd_client: LCDClient,
	governance_contract_addr: string,
	community_pool_contract_addr: string,
	nasset_token_code_id: number,
	nasset_token_config_holder_code_id: number,
	nasset_token_rewards_code_id: number,
	psi_distributor_code_id: number,
	psi_token_addr: string,
	psi_stable_swap_contract_addr: string,
	basset_vault_strategy_contract_addr: string,
	ts_factory_addr: string,
): BassetVaultConfig {
	if (is_prod(lcd_client)) {
		return prod_BassetVaultConfigForbEth(
			governance_contract_addr,
			community_pool_contract_addr,
			nasset_token_code_id,
			nasset_token_config_holder_code_id,
			nasset_token_rewards_code_id,
			psi_distributor_code_id,
			psi_token_addr,
			psi_stable_swap_contract_addr,
			basset_vault_strategy_contract_addr,
			ts_factory_addr
		);
	} else {
		return testnet_BassetVaultConfigForbEth(
			governance_contract_addr,
			community_pool_contract_addr,
			nasset_token_code_id,
			nasset_token_config_holder_code_id,
			nasset_token_rewards_code_id,
			psi_distributor_code_id,
			psi_token_addr,
			psi_stable_swap_contract_addr,
			basset_vault_strategy_contract_addr,
			ts_factory_addr,
		);
	}
}
