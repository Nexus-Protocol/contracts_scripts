import {LCDClient, Wallet, Coin} from '@terra-money/terra.js';
import {
    store_contract,
    execute_contract,
    create_contract,
    instantiate_contract
} from '../../utils';
import {TokenConfig} from "../../config";
import {
    MirrorCollateralOracleConfig,
    MirrorCollectorConfig,
    MirrorCommunityConfig, MirrorFactoryConfig,
    MirrorGovConfig, MirrorLockConfig, MirrorMintConfig,
    MirrorOracleConfig, MirrorStakingConfig,
    MirrorTokenConfig
} from "./config";
import {anchor_init} from "../deploy_anchor/definition"

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

const cw20_contract_wasm = `${path_to_cosmwasm_artifacts}/cw20_base.wasm`;

const terraswap_token_wasm = `${path_to_terraswap_artifacts}/terraswap_token.wasm`;
const terraswap_factory_wasm = `${path_to_terraswap_artifacts}/terraswap_factory.wasm`;
const terraswap_pair_wasm = `${path_to_terraswap_artifacts}/terraswap_pair.wasm`;

//Steps
//1. Store cw20_base
//2. Deploy terraswap_factory
//3. Store terraswap_token
//4. Instantiate mirror_token
//5. Deploy anchor market contracts
//  5.1. get anchor_market_addr
//  5.2. get aust_addr (aterra_token)
//  5.1. get bluna_addr
//6. Deploy mirror_gov
//7. Deploy mirror_community
//8. Deploy mirror_collector
//9. Deploy mirror_oracle
//10. Deploy mirror_mint
//11. Deploy mirror_lock
//12. Deploy mirror_staking
//TODO: figure out how is short_reward_addr
//13. Deploy mirror_factory
//14. Setup mirror_factory (post_initialize)
//15. Deploy mirror_collateral_oracle
//TODO: figure out how is band_oracle
//16. Assign mirror_factory to be the owner for mirror_oracle, mirror_staking and mirror_collector.
//17. setup mirror_mint:
//  17.1 assign mirror_factory to be the owner;
//  17.2 set mirror_collateral_oracle;
//  17.3 set mirror_staking
//  17.4 set mirror_lock

export async function mirror_init(lcd_client: LCDClient, sender: Wallet) {

    const cw20_code_id = await Cw20CodeId(lcd_client, sender);

    const terraswap_factory_addr = await init_terraswap_factory(lcd_client, sender, cw20_code_id);

    const terraswap_token_code_id = await TerraswapTokenCodeId(lcd_client, sender);

    const mirror_token_config = MirrorTokenConfig(sender.key.accAddress);
    const mirror_token_addr = await init_token(lcd_client, sender, terraswap_token_code_id, mirror_token_config);

    const anchor_market_info = await anchor_init(lcd_client, sender);
    const anchor_market_addr = anchor_market_info.contract_addr;
    const aust_addr = anchor_market_info.aterra_token_addr;
    const bluna_addr = anchor_market_info.bluna_token_addr;
    const anchor_oracle_addr = anchor_market_info.oracle_addr;

    const mirror_gov_config = MirrorGovConfig(mirror_token_addr);
    const mirror_gov_addr = await create_contract(
        lcd_client,
        sender,
        "mirror_gov",
        mirror_gov_wasm,
        mirror_gov_config
    );

    const mirror_community_config = MirrorCommunityConfig(sender.key.accAddress, mirror_token_addr);
    const mirror_community_addr = await create_contract(
        lcd_client,
        sender,
        "mirror_community",
        mirror_community_wasm,
        mirror_community_config
    );

    const mirror_collector_config = MirrorCollectorConfig(
        sender.key.accAddress,  //owner will be changed to mirror_factory after its instantiation
        mirror_gov_addr,
        terraswap_factory_addr,
        mirror_token_addr,
        aust_addr,
        anchor_market_addr,
        bluna_addr
    );
    const mirror_collector_addr = await create_contract(
        lcd_client,
        sender,
        "mirror_collector",
        mirror_collector_wasm,
        mirror_collector_config
    );

    const mirror_oracle_config = MirrorOracleConfig(sender.key.accAddress); //owner will be changed to mirror_factory after its instantiation
    const mirror_oracle_addr = await create_contract(
        lcd_client,
        sender,
        "mirror_oracle",
        mirror_oracle_wasm,
        mirror_oracle_config
    );

    const mirror_mint_config = MirrorMintConfig(
        sender.key.accAddress,   //owner will be changed to mirror_factory after its instantiation
        mirror_oracle_addr,
        mirror_collector_addr,
        sender.key.accAddress, // collateral_oracle will be changed to mirror_collateral_oracle after its instantiation
        sender.key.accAddress, //staking will be changed to mirror_staking after its instantiation
        terraswap_factory_addr,
        sender.key.accAddress, // lock will be changed to mirror_lock after its instantiation
        terraswap_token_code_id
    );
    const mirror_mint_addr = await create_contract(
        lcd_client,
        sender,
        "mirror_mint",
        mirror_mint_wasm,
        mirror_mint_config
    );

    const mirror_lock_config = MirrorLockConfig(
        sender.key.accAddress,
        mirror_mint_addr
    );
    const mirror_lock_addr = await create_contract(
        lcd_client,
        sender,
        "mirror_lock",
        mirror_lock_wasm,
        mirror_lock_config
    );

    const mirror_staking_config = MirrorStakingConfig(
        sender.key.accAddress,   //owner will be changed to mirror_factory after its instantiation
        mirror_token_addr,
        mirror_mint_addr,
        mirror_oracle_addr,
        terraswap_factory_addr,
        sender.key.accAddress // figure out how is short_reward_contract?
    );
    const mirror_staking_addr = await create_contract(
        lcd_client,
        sender,
        "mirror_staking",
        mirror_staking_wasm,
        mirror_staking_config
    );

    const mirror_factory_config = MirrorFactoryConfig(cw20_code_id);
    const mirror_factory_addr = await create_contract(
        lcd_client,
        sender,
        "mirror_factory",
        mirror_factory_wasm,
        mirror_factory_config
    );

    await execute_contract(lcd_client, sender, mirror_factory_addr,
        {
            post_initialize: {
                owner: sender.key.accAddress,
                terraswap_factory: terraswap_factory_addr,
                mirror_token: mirror_token_addr,
                staking_contract: mirror_staking_addr,
                oracle_contract: mirror_oracle_addr,
                mint_contract: mirror_mint_addr,
                commission_collector: mirror_collector_addr,
            },
        }
    );

    const mirror_collateral_oracle_config = MirrorCollateralOracleConfig(
        mirror_factory_addr,     //owner will be changed to mirror_factory after its instantiation
        mirror_mint_addr,
        mirror_oracle_addr,
        anchor_oracle_addr,
        sender.key.accAddress
    );
    const mirror_collateral_oracle_addr = create_contract(
        lcd_client,
        sender,
        "mirror_collateral_oracle",
        mirror_collateral_oracle_wasm,
        mirror_collateral_oracle_config
    );

    await assign_owner(lcd_client, sender, mirror_oracle_addr, mirror_factory_addr);
    await assign_owner(lcd_client, sender, mirror_staking_addr, mirror_factory_addr);
    await assign_owner(lcd_client, sender, mirror_collector_addr, mirror_factory_addr);

    await execute_contract(lcd_client, sender, mirror_mint_addr, {
        update_config: {
            owner: mirror_factory_addr,
            collateral_oracle: mirror_collateral_oracle_addr,
            lock: mirror_lock_addr,
            staking: mirror_staking_addr
        },
    });
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

async function assign_owner(lcd_client: LCDClient, sender: Wallet, contract_addr: string, owner_addr: string) {
    await execute_contract(lcd_client, sender, contract_addr,
        {
            update_config: {
                owner: owner_addr,
            },
        }
    );
}