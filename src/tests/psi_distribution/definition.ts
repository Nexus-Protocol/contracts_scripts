import {BlockTxBroadcastResult, isTxError, LCDClient, Wallet} from "@terra-money/terra.js";
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
import * as assert from "assert";

const path_to_contracts = "/Users/qdo_ln/terra/nexus/contracts_scripts/artifacts/contracts";
const path_to_mocks = "/Users/qdo_ln/terra/nexus/contracts_scripts/artifacts/mocks";

const psi_distributor_wasm = `${path_to_contracts}/basset_vault_psi_distributor.wasm`;

const nasset_token_rewards_mock_wasm = `${path_to_mocks}/basset_vault_nasset_rewards_mock_update_global_index.wasm`;
const mock_ltv_aim_wasm = `${path_to_mocks}/basset_vault_strategy_mock_ltv_aim.wasm`;

async function init_psi_token(
    lcd_client: LCDClient,
    sender: Wallet,
    code_id: number,
    init_msg: TokenConfig
): Promise<string> {
    let contract_addr = await instantiate_contract(lcd_client, sender, sender.key.accAddress, code_id, init_msg);
    console.log(`psi_token instantiated\n\taddress: ${contract_addr}`);
    return contract_addr;
}

export async function psi_distributor_init (
    lcd_client: LCDClient,
    sender: Wallet
): Promise<PsiDistributorDeploymentResult> {

    //deploy psi_token (cw20)
    let cw20_code_id = await Cw20CodeId(lcd_client, sender);
    console.log(`=======================`);

    let psi_token_config = {
        name: "Nexus Governance Token",
        symbol: "Psi",
        decimals: 6,
        initial_balances: [
        ],
        mint: {
            minter: sender.key.accAddress,
        }
    }
    let psi_token_addr = await init_psi_token(lcd_client, sender, cw20_code_id, psi_token_config);
    console.log(`=======================`);

    // deploy basset_vault_strategy_mock
    let basset_vault_strategy_mock_config = BassetVaultStrategyMockConfig("0"); //this value is set up for every test case manually
    let basset_vault_strategy_mock_addr = await create_contract(
        lcd_client,
        sender,
        "mock_aim_ltv",
        mock_ltv_aim_wasm,
        basset_vault_strategy_mock_config
    );
    console.log(`=======================`);

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
        sender.key.accAddress,
        nasset_token_rewards_mock_addr,
        community_pool_random_addr_mock,
        basset_vault_strategy_mock_addr,
        "0",  //this value is set up for every test case manually
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

async function set_borrow_ltv_aim(lcd_client: LCDClient, sender: Wallet, strategy_mock_ltv_aim_addr: string, borrow_ltv_aim: number){
    await execute_contract(lcd_client, sender, strategy_mock_ltv_aim_addr, {
        governance: {
            governance_msg: {
                update_config: {borrow_ltv_aim: borrow_ltv_aim.toString()}
            }
        }
    });
}

async function set_manual_ltv(lcd_client: LCDClient, sender: Wallet, psi_distributor_addr: string, manual_ltv: number){
    await execute_contract(lcd_client, sender, psi_distributor_addr, {
        governance: {
            governance_msg: {
                update_config: {
                    manual_ltv: manual_ltv.toString(),
                }
            }
        }
    });
}

async function query_config(lcd_client: LCDClient, contract_addr: string) {
    let config_response = await lcd_client.wasm.contractQuery(contract_addr, {config: {}});
    return JSON.stringify( config_response );
}

async function send_tokens_and_distribute(lcd_client: LCDClient, sender: Wallet, token_contract: string, psi_distributor_addr: string, amount: number) : Promise<BlockTxBroadcastResult | undefined> {
    await mint(lcd_client, sender, token_contract, psi_distributor_addr, amount.toString());

    return distribute(lcd_client, sender, psi_distributor_addr);
}

async function mint (lcd_client: LCDClient, sender: Wallet, token_contract: string, recipient: string, amount: string) {
    return await execute_contract(lcd_client, sender, token_contract, {
        mint: {
            recipient: recipient,
            amount: amount,
        }
    });
}

async function distribute (lcd_client: LCDClient, sender: Wallet, contract_addr: string) {
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

async function parse_distribution_response(result: BlockTxBroadcastResult) {
    if (isTxError(result)) {
        throw new Error(
            `Error while instantiating: ${result.code} - ${result.raw_log}`
        );
    }

    const event = result.logs[0].events.find((event) => {
        return event.type == "from_contract";
    });


    let nassest_holder_rewards = event?.attributes[2].value as string;
    let governance_rewards = event?.attributes[3].value as string;
    let community_pool_rewards = event?.attributes[4].value as string;

    return [nassest_holder_rewards, governance_rewards, community_pool_rewards];
}

export async function execute_psi_distribution_test(
    test_name: string,
    lcd_client: LCDClient,
    sender: Wallet,
    psi_distributor_deployment_result: PsiDistributorDeploymentResult,
    borrow_ltv_aim: number,
    manual_ltv: number,
    amount_for_distribution: number,
    expect_nassest_holder_rewards : number,
    expect_governance_rewards: number,
    expect_community_pool_rewards: number,
     ){
    await set_borrow_ltv_aim(lcd_client, sender, psi_distributor_deployment_result.psi_distributor_config.basset_vault_strategy_contract_addr, borrow_ltv_aim);

    await set_manual_ltv(lcd_client, sender, psi_distributor_deployment_result.psi_distributor_addr, manual_ltv);

    const psi_distributor_response = await send_tokens_and_distribute(
        lcd_client,
        sender,
        psi_distributor_deployment_result.psi_distributor_config.psi_token_addr,
        psi_distributor_deployment_result.psi_distributor_addr,
        amount_for_distribution);

    if (psi_distributor_response === undefined) {
        throw new Error(
            `Invalid translation`
        );
    } else {
        const distribution_results = await parse_distribution_response(psi_distributor_response);
        assert(distribution_results[0] === expect_nassest_holder_rewards.toString());
        assert( distribution_results[1] === expect_governance_rewards.toString());
        assert(distribution_results[2] === expect_community_pool_rewards.toString());
        console.log(`psi_distribution test: "${test_name}" passed!`);
    }
}