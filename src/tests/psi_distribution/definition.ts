import {Coin, LCDClient, Wallet} from "@terra-money/terra.js";
import {create_contract, instantiate_contract_with_init_funds, store_contract} from "../../utils";
import {BassetVaultStrategyMockConfig, PsiDistributorConfig} from "./config";
import {Cw20CodeId} from "../../config";
import {init_psi_token} from "../../basset_vault/definition";

const path_to_basset_vault_artifacts = "/Users/qdo_ln/terra/nexus/basset-vault-contracts/artifacts";
const path_to_basset_vault_mocks_artifacts = "/Users/qdo_ln/terra/nexus/basset-vault-mocks/artifacts";

const psi_distributor_wasm = `${path_to_basset_vault_artifacts}/basset_vault_psi_distributor.wasm`;
const basset_vault_strategy_mock_aim_ltv_wasm = `${path_to_basset_vault_mocks_artifacts}/basset_vault_strategy_mock_aim_ltv.wasm`;

export async function psi_distributor_init (lcd_client: LCDClient, sender: Wallet) {

    //deploy psi_token (cw20)
    let cw20_code_id = await Cw20CodeId(lcd_client, sender);
    console.log(`=======================`);

    let psi_token_config = {
        name: "psi_token",
        symbol: "PSI",
        decimals: 6,
        initial_balances: [],
    };
    let anc_token_addr = await init_psi_token(lcd_client, sender, cw20_code_id, psi_token_config);
    console.log(`=======================`);

    // deploy basset_vault_strategy_mock
    let basset_vault_strategy_mock_config = BassetVaultStrategyMockConfig("0.8");
    let basset_vault_strategy_mock_addr = await create_contract(
        lcd_client,
        sender,
        "basset_vault_strategy_mock",
        basset_vault_strategy_mock_aim_ltv_wasm,
        basset_vault_strategy_mock_config
    );
    console.log(`=======================`);

    // deploy psi_distributor
    let psi_distributor_code_id = await store_contract(lcd_client, sender, psi_distributor_wasm);
    console.log(`psi_distributor uploaded\n\tcode_id: ${psi_distributor_code_id}`);
    let psi_distributor_config = PsiDistributorConfig(
        basset_vault_strategy_mock_addr,
        "0.8",
        "0.6",
        "0.25",
    );

    let psi_distributor_addr = await instantiate_contract_with_init_funds(
        lcd_client,
        sender,
        sender.key.accAddress,
        psi_distributor_code_id,
        psi_distributor_config,
        [new Coin("psi", 1_000_000_000)],
    );
    console.log(`psi_distributor instantiated\n\taddress: ${psi_distributor_addr}`);
    console.log(`=======================`);
}