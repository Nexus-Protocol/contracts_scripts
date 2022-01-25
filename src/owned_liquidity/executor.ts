// export NODE_OPTIONS=--openssl-legacy-provider

import { getCodeId, getContractAddress, LCDClient, LocalTerra, MsgInstantiateContract, MsgStoreCode } from "@terra-money/terra.js";
import { readFileSync } from "fs";

async function run_program() {
    const localTerra = new LocalTerra();
    const lcdClient: LCDClient = localTerra;
    const sender = localTerra.wallets['test1'];

    const wasmPath = '/home/ctor/Work/Blockchain/contracts_scripts/wasm_artifacts/nexus/services/nexus_pol.wasm';
    const contractWasm = readFileSync(wasmPath, { encoding: 'base64' });
    const msgStore = new MsgStoreCode(sender.key.accAddress, contractWasm);
    let signedTx = await sender.createAndSignTx({ msgs: [msgStore] });
    let txResult = await lcdClient.tx.broadcast(signedTx);
    const codeId = parseInt(getCodeId(txResult));
    console.log(`Contract code uploaded, id: ${codeId}`);

    const msgInst = new MsgInstantiateContract(sender.key.accAddress, sender.key.accAddress, codeId, {
        governance_addr: 'terra1qxxlalvsdjd07p07y3rc5fu6ll8k4tme7cye8y',
        pairs_addr: ['terra1tndcaqxkpc5ce9qee5ggqf430mr2z3pefe5wj6'],
        psi_token_addr: 'terra1hqrdl6wstt8qzshwc6mrumpjk9338k0l93hqyd',
        vesting_addr: 'terra1psm5jn08l2ms7sef2pxywr42fa8pay876d0p9m',
    });
    signedTx = await sender.createAndSignTx({ msgs: [msgInst] });
    txResult = await lcdClient.tx.broadcast(signedTx);
    const contractAddr = getContractAddress(txResult);
    console.log(`Contract instantiated, address: ${contractAddr}`);
}

run_program()
    .then(text => {
        console.log(text);
    })
    .catch(err => {
        console.log(err);
    });