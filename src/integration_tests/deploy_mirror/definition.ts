import {LCDClient, Wallet, Coin} from '@terra-money/terra.js';
import {
    store_contract,
    execute_contract,
    create_contract,
    instantiate_contract
} from '../../utils';
import {terraswap_factory_contract_addr, TokenConfig} from "../../config";
import {MirrorTokenConfig, aUSTConfig} from "./config";

//=============================================================================
const artifacts_path = "wasm_artifacts";
const path_to_mirror_artifacts = `${artifacts_path}/anchor`;
const path_to_terraswap_artifacts = `${artifacts_path}/terraswap`;
const path_to_cosmwasm_artifacts = `${artifacts_path}/cosmwasm_plus`
//=============================================================================
const mirror_collateral_oracle_wasm = `${path_to_mirror_artifacts}/mirror_collateral_oracle.wasm`;
const mirror_collector_wasm = `${path_to_mirror_artifacts}/mirror_collector.wasm`;
const mirror_community_wasm = `${path_to_mirror_artifacts}/mirror_community.wasm`;
const mirror_factory_wasm = `${path_to_mirror_artifacts}/mirror_factory.wasm`;
const mirror_gov_wasm = `${path_to_mirror_artifacts}/mirror_gov.wasm`;
const mirror_limit_order_wasm = `${path_to_mirror_artifacts}/mirror_limit_order.wasm`;
const mirror_lock_wasm = `${path_to_mirror_artifacts}/mirror_lock.wasm`;
const mirror_mint_wasm = `${path_to_mirror_artifacts}/mirror_mint.wasm`;
const mirror_oracle_wasm = `${path_to_mirror_artifacts}/mirror_oracle.wasm`;
const mirror_short_reward_wasm = `${path_to_mirror_artifacts}/mirror_short_reward.wasm`;
const mirror_staking_wasm = `${path_to_mirror_artifacts}/mirror_staking.wasm`;

export const cw20_contract_wasm = `${path_to_cosmwasm_artifacts}/cw20_base.wasm`;

const terraswap_token_wasm = `${path_to_terraswap_artifacts}/terraswap_token.wasm`;
const terraswap_factory_wasm = `${path_to_terraswap_artifacts}/terraswap_factory.wasm`;
const terraswap_pair_wasm = `${path_to_terraswap_artifacts}/terraswap_pair.wasm`;


//Steps
//1. Store cw20_base
//2. Store and instantiate terraswap_factory
//3. Store terraswap_token
//4. Instantiate mirror_token
//5. Instantiate aUST_token


export async function mirror_init(lcd_client: LCDClient, sender: Wallet) {

    const cw20_code_id = await Cw20CodeId(lcd_client, sender);

    const terraswap_factory_addr = await init_terraswap_factory(lcd_client, sender, cw20_code_id);

    const terraswap_token_code_id = await TerraswapTokenCodeId(lcd_client, sender);

    const mirror_token_config = MirrorTokenConfig(sender.key.accAddress);
    const mirror_token_addr = await init_token(lcd_client, sender, terraswap_token_code_id, mirror_token_config);

    const aust_token_config = aUSTConfig(sender.key.accAddress);
    const aust_token_addr = await init_token(lcd_client, sender, cw20_code_id, aust_token_config);


}

async function TerraswapTokenCodeId(lcd_client: LCDClient, sender: Wallet): Promise<number> {
    console.log(`storing terraswap token`);
    let terra_swap_token_code_id = await store_contract(lcd_client, sender, terraswap_token_wasm);
    console.log(`terraswap_token uploaded; code_id: ${terra_swap_token_code_id}`);
    return terra_swap_token_code_id;
}

export async function Cw20CodeId(lcd_client: LCDClient, sender: Wallet): Promise<number> {
    console.log(`storing our own cw20`);
    let cw20_code_id = await store_contract(lcd_client, sender, cw20_contract_wasm);
    console.log(`cw20_base uploaded; code_id: ${cw20_code_id}`);
    return cw20_code_id;
}

async function init_token(lcd_client: LCDClient, sender: Wallet, code_id: number, init_msg: TokenConfig): Promise<string> {
    let contract_addr = await instantiate_contract(lcd_client, sender, sender.key.accAddress, code_id, init_msg);
    console.log(`${init_msg.name} instantiated\n\taddress: ${contract_addr}`);
    return contract_addr;
}

async function init_terraswap_factory(lcd_client: LCDClient, sender: Wallet, cw20_code_id: number): Promise<string> {
    console.log(`storing our own terraswap contracts`);
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
}