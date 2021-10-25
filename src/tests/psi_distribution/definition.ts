import {BlockTxBroadcastResult, LCDClient, Wallet} from "@terra-money/terra.js";
import {
    create_contract,
    execute_contract,
    get_random_addr_mock,
    instantiate_contract,
    store_contract
} from "../../utils";
import {
    BassetVaultStrategyMockConfig,
    emptyJson,
    PsiDistributorConfig,
    PsiDistributorDeploymentResult,
} from "./config";
import {Cw20CodeId, TokenConfig} from "../../config";

const path_to_contracts = "/Users/qdo_ln/terra/nexus/contracts_scripts/artifacts/contracts";
const path_to_mocks = "/Users/qdo_ln/terra/nexus/contracts_scripts/artifacts/mocks";

const psi_distributor_wasm = `${path_to_contracts}/basset_vault_psi_distributor.wasm`;

const nasset_token_rewards_mock_wasm = `${path_to_mocks}/basset_vault_nasset_rewards_mock_update_global_index.wasm`;
const mock_ltv_aim_wasm = `${path_to_mocks}/basset_vault_strategy_mock_ltv_aim.wasm`;

export async function init_psi_token(lcd_client: LCDClient, sender: Wallet, code_id: number, init_msg: TokenConfig): Promise<string> {
    let contract_addr = await instantiate_contract(lcd_client, sender, sender.key.accAddress, code_id, init_msg);
    console.log(`psi_token instantiated\n\taddress: ${contract_addr}`);
    return contract_addr;
}

export async function psi_distributor_init (lcd_client: LCDClient, sender: Wallet): Promise<PsiDistributorDeploymentResult> {

    //deploy psi_token (cw20)
    let cw20_code_id = await Cw20CodeId(lcd_client, sender);
    console.log(`=======================`);

    let psi_token_config = {
        name: "Nexus Governance Token",
        symbol: "Psi",
        decimals: 6,
        initial_balances: [
            {
                address: sender.key.accAddress,
                amount: "10000000000000000"
            }
        ],
        mint: {
            minter: sender.key.accAddress,
        }
    }
    let psi_token_addr = await init_psi_token(lcd_client, sender, cw20_code_id, psi_token_config);
    console.log(`=======================`);

    // deploy basset_vault_strategy_mock
    let basset_vault_strategy_mock_config = BassetVaultStrategyMockConfig("0.8");
    let basset_vault_strategy_mock_addr = await create_contract(
        lcd_client,
        sender,
        "mock_aim_ltv",
        mock_ltv_aim_wasm,
        basset_vault_strategy_mock_config
    );
    console.log(`=======================`);

    let governance_random_addr_mock = await get_random_addr_mock(lcd_client, sender, cw20_code_id);
    let community_pool_random_addr_mock = await get_random_addr_mock(lcd_client, sender, cw20_code_id);

    let nasset_token_rewards_mock_addr = await create_contract(
        lcd_client,
        sender,
        "nasset_tokens_reward_mock", nasset_token_rewards_mock_wasm, emptyJson());

    // deploy psi_distributor
    let psi_distributor_code_id = await store_contract(lcd_client, sender, psi_distributor_wasm);
    console.log(`psi_distributor uploaded\n\tcode_id: ${psi_distributor_code_id}`);
    let psi_distributor_config = PsiDistributorConfig(
        psi_token_addr,
        governance_random_addr_mock,
        nasset_token_rewards_mock_addr,
        community_pool_random_addr_mock,
        basset_vault_strategy_mock_addr,
        "0.6",
        "0.5",
        "0.25",
    );
    let psi_distributor_addr = await instantiate_contract(
        lcd_client,
        sender,
        sender.key.accAddress,
        psi_distributor_code_id,
        psi_distributor_config
    );
    console.log(`psi_distributor instantiated\n\taddress: ${psi_distributor_addr}`);
    console.log(`=======================`);

    return PsiDistributorDeploymentResult(psi_distributor_addr, psi_distributor_config);
}

export async function query_config(lcd_client: LCDClient, contract_addr: string) {
    let config_response = await lcd_client.wasm.contractQuery(contract_addr, {config: {}});
    return JSON.stringify( config_response );
}

export async function send_1000_tokens_and_distribute(lcd_client: LCDClient, sender: Wallet, token_contract: string, recipient: string) : Promise<BlockTxBroadcastResult | undefined> {
    return await execute_contract(lcd_client, sender, token_contract, {
        send: {
            contract: recipient,
            amount: "1000",
            msg: {
                anyone: {
                    anyone_msg: {
                        distribute_rewards: {},
                    },
                },
            },
        }
    });
}

export async function mint (lcd_client: LCDClient, sender: Wallet, token_contract: string, recipient: string) {
    return await execute_contract(lcd_client, sender, token_contract, {
        mint: {
            recipient: recipient,
            amount: "1000",
        }
    });
}

export async function distribute (lcd_client: LCDClient, sender: Wallet, contract_addr: string) {
    let response = await execute_contract(lcd_client, sender, contract_addr, {
            anyone: {
                anyone_msg: {
                    distribute_rewards: {},
                },
            },
        }
    );
    return response;
}