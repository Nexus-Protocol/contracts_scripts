/* eslint-disable no-empty */
// nvm install latest
// export NODE_OPTIONS=--openssl-legacy-provider

import { BlockTxBroadcastResult, Coin, Coins, getCodeId, getContractAddress, getContractEvents, LCDClient, LocalTerra, MsgExecuteContract, MsgInstantiateContract, MsgStoreCode, Wallet } from '@terra-money/terra.js';
import * as assert from "assert";
import Decimal from 'decimal.js';
import { readFileSync } from 'fs';

async function storeContract(lcdClient: LCDClient, sender: Wallet, wasmPath: string) {
    const contractWasm = readFileSync(wasmPath, { encoding: 'base64' });
    const msgStore = new MsgStoreCode(sender.key.accAddress, contractWasm);
    const signedTx = await sender.createAndSignTx({ msgs: [msgStore] });
    const txResult = await lcdClient.tx.broadcast(signedTx);
    return parseInt(getCodeId(txResult));
}

async function instantiateContract(lcdClient: LCDClient, sender: Wallet, codeId: number, msg: object) {
    const msgInst = new MsgInstantiateContract(sender.key.accAddress, sender.key.accAddress, codeId, msg);
    const signedTx = await sender.createAndSignTx({ msgs: [msgInst] });
    const txResult = await lcdClient.tx.broadcast(signedTx);
    return getContractAddress(txResult);
}

async function executeContract(lcdClient: LCDClient, sender: Wallet, contract_addr: string, msg: object, coins?: Coins) {
    const msgExecute = new MsgExecuteContract(sender.key.accAddress, contract_addr, msg, coins);
    const estimatedFee = await lcdClient.tx.estimateFee(sender.key.accAddress, [msgExecute], {
        gasPrices: new Coins([new Coin('uusd', 0.15)]),
        gasAdjustment: 1.2,
        feeDenoms: ['uusd'],
    });
    const signedTx = await sender.createAndSignTx({ msgs: [msgExecute], fee: estimatedFee });
    const txResult = await lcdClient.tx.broadcast(signedTx);
    return txResult;
}

async function instantiatePsiToken(lcdClient: LCDClient, sender: Wallet, tokenCodeId: number) {
    const config = {
        name: 'Nexus Governance Token',
        symbol: 'PSI',
        decimals: 6,
        initial_balances: [
            {
                address: sender.key.accAddress,
                amount: '10000000000000000'
            }
        ],
        mint: {
            minter: sender.key.accAddress,
        }
    };
    return await instantiateContract(lcdClient, sender, tokenCodeId, config);
}

async function instantiateTstToken(lcdClient: LCDClient, sender: Wallet, tokenCodeId: number) {
    const config = {
        name: 'Nexus Test Token',
        symbol: 'TST',
        decimals: 6,
        initial_balances: [
            {
                address: sender.key.accAddress,
                amount: '10000000000000000'
            }
        ],
        mint: {
            minter: sender.key.accAddress,
        }
    };
    return await instantiateContract(lcdClient, sender, tokenCodeId, config);
}

async function instantiateAstroToken(lcdClient: LCDClient, sender: Wallet) {
    const codeId = await storeContract(lcdClient, sender, 'wasm_artifacts/astroport/astroport_token.wasm');
    const config = {
        name: 'Astroport Governance Token',
        symbol: 'ASTRO',
        decimals: 6,
        initial_balances: [
            {
                address: sender.key.accAddress,
                amount: '1000000000000000'
            }
        ],
    };
    return await instantiateContract(lcdClient, sender, codeId, config);
}

async function instantiateAstroVesting(lcdClient: LCDClient, sender: Wallet, astro: string) {
    const codeId = await storeContract(lcdClient, sender, 'wasm_artifacts/astroport/astroport_vesting.wasm');

    const init = {
        owner: sender.key.accAddress,
        token_addr: astro,
    };
    return await instantiateContract(lcdClient, sender, codeId, init);
}

async function instantiateAstroGenerator(lcdClient: LCDClient, sender: Wallet, astro: string, astroVesting: string) {
    const codeId = await storeContract(lcdClient, sender, 'wasm_artifacts/astroport/astroport_generator.wasm');

    const init = {
        owner: sender.key.accAddress,
        astro_token: astro,
        tokens_per_block: '10000',
        start_block: '1',
        allowed_reward_proxies: [],
        vesting_contract: astroVesting,
    };
    return await instantiateContract(lcdClient, sender, codeId, init);
}

async function setAstroGeneratorBalance(lcdClient: LCDClient, sender: Wallet, astroGenerator: string, astroVesting: string, astro: string, balance: Decimal) {
    const balanceStr = balance.toFixed(0);
    const msg = {
        register_vesting_accounts: {
            vesting_accounts: [
                {
                    address: astroGenerator,
                    schedules: [
                        {
                            start_point: {
                                time: 0,
                                amount: '0',
                            },
                            end_point: {
                                time: 1,
                                amount: balanceStr
                            }
                        }
                    ]
                }
            ]
        }
    };
    const jsonMsg = JSON.stringify(msg);
    const B64Msg = Buffer.from(jsonMsg).toString('base64');
    await executeContract(lcdClient, sender, astro, {
        'send': {
            contract: astroVesting,
            amount: balanceStr,
            msg: B64Msg,
        }
    });
}

async function instantiateAstroFactory(lcdClient: LCDClient, sender: Wallet, tokenCodeId: number, astroGenerator: string) {
    const astroFactoryCodeId = await storeContract(lcdClient, sender, 'wasm_artifacts/astroport/astroport_factory.wasm');
    const astroPairCodeId = await storeContract(lcdClient, sender, 'wasm_artifacts/astroport/astroport_pair.wasm');

    const init = {
        owner: sender.key.accAddress,
        pair_code_id: astroPairCodeId,
        token_code_id: tokenCodeId,
        pair_configs: [{
            code_id: astroPairCodeId,
            pair_type: { xyk: {} },
            total_fee_bps: 0,
            maker_fee_bps: 0,
        },],
        generator_address: astroGenerator,
    };
    return await instantiateContract(lcdClient, sender, astroFactoryCodeId, init);
}

function parsePairCreation(pairCreationResult: BlockTxBroadcastResult) {
    const pairInfo = {
        pairContractAddr: '',
        liquidityTokenAddr: ''
    };
    const contractEvents = getContractEvents(pairCreationResult);
    for (const contractEvent of contractEvents) {
        const pairContractAddr = contractEvent['pair_contract_addr'];
        if (pairContractAddr !== undefined) {
            pairInfo.pairContractAddr = pairContractAddr;
        }

        const liquidityTokenAddr = contractEvent['liquidity_token_addr'];
        if (liquidityTokenAddr !== undefined) {
            pairInfo.liquidityTokenAddr = liquidityTokenAddr;
        }
    }
    return pairInfo;
}

async function createAstroPsiUstPair(lcdClient: LCDClient, sender: Wallet, astroFactory: string, psi: string, psiAmount: Decimal, ustAmount: Decimal) {
    const psiAmountStr = psiAmount.toFixed(0);
    const ustAmountStr = ustAmount.toFixed(0);

    const msgCreatePair = {
        create_pair: {
            asset_infos: [
                { token: { contract_addr: psi } },
                { native_token: { denom: 'uusd' } },
            ],
            pair_type: { xyk: {} },
        }
    };
    const txResult = await executeContract(lcdClient, sender, astroFactory, msgCreatePair);
    const pair = parsePairCreation(txResult);

    const msgIncreaseAllowance = {
        increase_allowance: {
            spender: pair.pairContractAddr,
            amount: psiAmountStr
        }
    };
    await executeContract(lcdClient, sender, psi, msgIncreaseAllowance);

    const msgProvideLiquidity =
    {
        provide_liquidity: {
            assets: [
                {
                    amount: psiAmountStr,
                    info: {
                        token: {
                            contract_addr: psi
                        }
                    }
                },
                {
                    amount: ustAmountStr,
                    info: {
                        native_token: {
                            denom: 'uusd'
                        }
                    }
                },
            ]
        }
    };
    await executeContract(lcdClient, sender, pair.pairContractAddr, msgProvideLiquidity, new Coins([new Coin('uusd', ustAmount.toNumber())]));

    return pair;
}

async function createAstroPsiTstPair(lcdClient: LCDClient, sender: Wallet, astroFactory: string, psi: string, psiAmount: Decimal, tst: string, tstAmount: Decimal) {
    const psiAmountStr = psiAmount.toFixed(0);
    const tstAmountStr = tstAmount.toFixed(0);

    const msgCreatePair = {
        create_pair: {
            asset_infos: [
                { token: { contract_addr: psi } },
                { token: { contract_addr: tst } },
            ],
            pair_type: { xyk: {} },
        }
    };
    const txResult = await executeContract(lcdClient, sender, astroFactory, msgCreatePair);
    const pair = parsePairCreation(txResult);

    const msgPsiIncreaseAllowance = {
        increase_allowance: {
            spender: pair.pairContractAddr,
            amount: psiAmountStr
        }
    };
    await executeContract(lcdClient, sender, psi, msgPsiIncreaseAllowance);

    const msgTstIncreaseAllowance = {
        increase_allowance: {
            spender: pair.pairContractAddr,
            amount: tstAmountStr
        }
    };
    await executeContract(lcdClient, sender, tst, msgTstIncreaseAllowance);

    const msgProvideLiquidity =
    {
        provide_liquidity: {
            assets: [
                {
                    amount: psiAmountStr,
                    info: {
                        token: {
                            contract_addr: psi
                        }
                    }
                },
                {
                    amount: tstAmountStr,
                    info: {
                        token: {
                            contract_addr: tst
                        }
                    }
                },
            ]
        }
    };
    await executeContract(lcdClient, sender, pair.pairContractAddr, msgProvideLiquidity);

    return pair;
}

async function instantiateNexusStakingWithBalance(lcdClient: LCDClient, sender: Wallet, psi: string, stakingToken: string, balance: Decimal) {
    const balanceStr = balance.toFixed(0);

    const codeId = await storeContract(lcdClient, sender, 'wasm_artifacts/nexus/services/nexus_staking.wasm');

    const init = {
        owner: sender.key.accAddress,
        psi_token: psi,
        staking_token: stakingToken,
        terraswap_factory: sender.key.accAddress, // anything
        distribution_schedule: [{
            start_time: Math.floor(Date.now() / 1000),
            end_time: Math.floor(Date.now() / 1000) + 365 * 24 * 3600,
            amount: balanceStr
        }],
    };
    const nexusStaking = await instantiateContract(lcdClient, sender, codeId, init);
    await executeContract(lcdClient, sender, psi, { transfer: { recipient: nexusStaking, amount: balanceStr } });
    return nexusStaking;
}

async function instantiateAstroGeneratorProxy(lcdClient: LCDClient, sender: Wallet, astroGenerator: string, lpToken: string, nexusStaking: string, psi: string) {
    const codeId = await storeContract(lcdClient, sender, 'wasm_artifacts/astroport/generator_proxy_to_psi.wasm');

    const init = {
        generator_contract_addr: astroGenerator,
        pair_addr: sender.key.accAddress, // anything
        lp_token_addr: lpToken,
        reward_contract_addr: nexusStaking,
        reward_token_addr: psi,
    };
    return await instantiateContract(lcdClient, sender, codeId, init);
}

async function addAstroGeneratorProxiesToGenerator(lcdClient: LCDClient, sender: Wallet, astroGeneratorProxies: Array<string>, astroGenerator: string) {
    const msg = {
        set_allowed_reward_proxies: {
            proxies: astroGeneratorProxies,
        }
    };
    await executeContract(lcdClient, sender, astroGenerator, msg);
}

type Pool = {
    lpToken: string,
    astroGeneratorProxy: string,
};

async function addPoolsToAstroGenerator(lcdClient: LCDClient, sender: Wallet, astroGenerator: string, pools: Array<Pool>) {
    for (const pool of pools) {
        const msg = {
            add: {
                lp_token: pool.lpToken,
                alloc_point: '1',
                reward_proxy: pool.astroGeneratorProxy,
            }
        };
        await executeContract(lcdClient, sender, astroGenerator, msg);
    }
}

async function instantiateNexusVestingWithBalance(lcdClient: LCDClient, sender: Wallet, psi: string, balance: Decimal) {
    const codeId = await storeContract(lcdClient, sender, 'wasm_artifacts/nexus/services/nexus_vesting_pol.wasm');
    const config = {
        owner: sender.key.accAddress,
        psi_token: psi,
        genesis_time: 100500,
    };
    const nexusVesting = await instantiateContract(lcdClient, sender, codeId, config);
    await executeContract(lcdClient, sender, psi, { transfer: { recipient: nexusVesting, amount: balance.toFixed(0) } });
    return nexusVesting;
}

async function instantiateNexusPolWithBalance(lcdClient: LCDClient, sender: Wallet, pairs: Array<string>, psi: string, nexusVesting: string, nexusVestingPeriod: number, excludedPsi: Array<string>, bcv: Decimal, maxBondsAmount: Decimal, communityPool: string, astroFactory: string, balance: Decimal) {
    const codeId = await storeContract(lcdClient, sender, 'wasm_artifacts/nexus/services/nexus_pol.wasm');

    const config = {
        governance: sender.key.accAddress,
        pairs: pairs,
        psi_token: psi,
        vesting: nexusVesting,
        vesting_period: nexusVestingPeriod,
        bond_control_var: bcv.toFixed(5),
        excluded_psi: excludedPsi,
        max_bonds_amount: maxBondsAmount.toFixed(5),
        community_pool: communityPool,
        autostake_lp_tokens: true,
        factory: astroFactory,
    };
    const pol = await instantiateContract(lcdClient, sender, codeId, config);
    await executeContract(lcdClient, sender, psi, { transfer: { recipient: pol, amount: balance.toFixed(0) } });
    return pol;
}

async function runProgram() {
    const localTerra = new LocalTerra();
    const lcdClient: LCDClient = localTerra;
    const sender = localTerra.wallets['test1'];

    //======================================================================
    // Prepare infrastructure for testing

    const tokenCodeId = await storeContract(lcdClient, sender, 'wasm_artifacts/cosmwasm_plus/cw20_base.wasm');

    const psi = await instantiatePsiToken(lcdClient, sender, tokenCodeId);
    console.log(`PSI: ${psi}`);

    const tst = await instantiateTstToken(lcdClient, sender, tokenCodeId);
    console.log(`TST: ${tst}`);

    const astro = await instantiateAstroToken(lcdClient, sender);
    console.log(`ASTRO: ${astro}`);

    const astroVesting = await instantiateAstroVesting(lcdClient, sender, astro);
    console.log(`astro vesting: ${astroVesting}`);

    const astroGenerator = await instantiateAstroGenerator(lcdClient, sender, astro, astroVesting);
    console.log(`astro generator: ${astroGenerator}`);

    await setAstroGeneratorBalance(lcdClient, sender, astroGenerator, astroVesting, astro, new Decimal('1000000000000'));

    const astroFactory = await instantiateAstroFactory(lcdClient, sender, tokenCodeId, astroGenerator);
    console.log(`astro factory: ${astroFactory}`);

    const ustLiquidity = new Decimal('4000000000000');
    const psiLiquidity = new Decimal('100000000000000');
    const tstLiquidity = new Decimal('4000000000000');

    const astroPsiUstPair = await createAstroPsiUstPair(lcdClient, sender, astroFactory, psi, psiLiquidity, ustLiquidity);
    console.log(`astro PSI-UST pair: ${astroPsiUstPair.pairContractAddr}, LP token: ${astroPsiUstPair.liquidityTokenAddr}`);

    const astroPsiTstPair = await createAstroPsiTstPair(lcdClient, sender, astroFactory, psi, psiLiquidity, tst, tstLiquidity);
    console.log(`astro PSI-TST pair: ${astroPsiTstPair.pairContractAddr}, LP token: ${astroPsiTstPair.liquidityTokenAddr}`);

    const nexusPsiUstStaking = await instantiateNexusStakingWithBalance(lcdClient, sender, psi, astroPsiUstPair.liquidityTokenAddr, new Decimal('500000000000'));
    console.log(`nexus PSI-UST LP staking: ${nexusPsiUstStaking}`);

    const nexusPsiTstStaking = await instantiateNexusStakingWithBalance(lcdClient, sender, psi, astroPsiTstPair.liquidityTokenAddr, new Decimal('500000000000'));
    console.log(`nexus PSI-TST LP staking: ${nexusPsiTstStaking}`);

    const astroPsiUstGeneratorProxy = await instantiateAstroGeneratorProxy(lcdClient, sender, astroGenerator, astroPsiUstPair.liquidityTokenAddr, nexusPsiUstStaking, psi);
    console.log(`astro PSI-UST generator proxy: ${astroPsiUstGeneratorProxy}`);

    const astroPsiTstGeneratorProxy = await instantiateAstroGeneratorProxy(lcdClient, sender, astroGenerator, astroPsiTstPair.liquidityTokenAddr, nexusPsiTstStaking, psi);
    console.log(`astro PSI-TST generator proxy: ${astroPsiTstGeneratorProxy}`);

    await addAstroGeneratorProxiesToGenerator(lcdClient, sender, [astroPsiUstGeneratorProxy, astroPsiTstGeneratorProxy], astroGenerator);
    await addPoolsToAstroGenerator(lcdClient, sender, astroGenerator, [{ lpToken: astroPsiUstPair.liquidityTokenAddr, astroGeneratorProxy: astroPsiUstGeneratorProxy }, { lpToken: astroPsiTstPair.liquidityTokenAddr, astroGeneratorProxy: astroPsiTstGeneratorProxy }]);

    const nexusVesting = await instantiateNexusVestingWithBalance(lcdClient, sender, psi, new Decimal('1000000000000000'));
    console.log(`nexus vesting: ${nexusVesting}`);

    const nexusPol = await instantiateNexusPolWithBalance(lcdClient, sender, [astroPsiUstPair.pairContractAddr, astroPsiTstPair.pairContractAddr], psi, nexusVesting, 5 * 24 * 3600, [nexusVesting], new Decimal('3.5'), new Decimal('0.0001'), astroFactory, astroFactory, new Decimal('3000000000000000'));
    console.log(`nexus PoL: ${nexusPol}`);

    const msgUpdateConfig = { update_config: { owner: nexusPol } };
    await executeContract(lcdClient, sender, nexusVesting, msgUpdateConfig);

    //======================================================================
    // Actually testing

    const buysInfo = [];

    // Make first buy with native tokens
    const msgBuy = { buy: { min_amount: '1' } };
    let result = await executeContract(lcdClient, sender, nexusPol, msgBuy, new Coins([new Coin('uusd', 1000000000)]));
    let buyInfo = parseBuy(result);
    console.log(`RESULT: ${JSON.stringify(buyInfo)}`);
    // Check result attributes
    assert.deepStrictEqual(buyInfo.bonds.toFixed(0), '27750027750');
    assert.deepStrictEqual(buyInfo.psi_liquidity.toFixed(0), '24975024975');
    assert.deepStrictEqual(buyInfo.asset_liquidity.toFixed(0), '999000999');
    buysInfo.push(buyInfo);
    // Check provided liquidity
    let poolResult: PoolResponse = await lcdClient.wasm.contractQuery(astroPsiUstPair.pairContractAddr, { pool: {} });
    assert.deepStrictEqual(poolResult.assets[0].amount, psiLiquidity.add(buyInfo.psi_liquidity).toFixed(0));
    assert.deepStrictEqual(poolResult.assets[1].amount, ustLiquidity.add(buyInfo.asset_liquidity).toFixed(0));

    // Wait for new blocks
    await new Promise(f => setTimeout(f, 3000));

    // Make second buy with CW20 tokens
    const msgBuyJson = JSON.stringify(msgBuy);
    const msgBuyBase64 = Buffer.from(msgBuyJson).toString('base64');
    result = await executeContract(lcdClient, sender, tst,
        {
            send: {
                contract: nexusPol,
                amount: '2000000000',
                msg: msgBuyBase64,
            }
        });
    buyInfo = parseBuy(result);
    console.log(`RESULT: ${JSON.stringify(buyInfo)}`);
    // Check result attributes
    assert.deepStrictEqual(buyInfo.bonds.toFixed(0), '55540571157');
    assert.deepStrictEqual(buyInfo.psi_liquidity.toFixed(0), '50000000000');
    assert.deepStrictEqual(buyInfo.asset_liquidity.toFixed(0), '2000000000');
    buysInfo.push(buyInfo);
    // Check provided liquidity
    poolResult = await lcdClient.wasm.contractQuery(astroPsiTstPair.pairContractAddr, { pool: {} });
    assert.deepStrictEqual(poolResult.assets[0].amount, psiLiquidity.add(buyInfo.psi_liquidity).toFixed(0));
    assert.deepStrictEqual(poolResult.assets[1].amount, tstLiquidity.add(buyInfo.asset_liquidity).toFixed(0));
    // Check transfered rewards
    const astroBalance1: BalanceResponse = await lcdClient.wasm.contractQuery(astro, { balance: { address: astroFactory } });
    const psiBalance1: BalanceResponse = await lcdClient.wasm.contractQuery(psi, { balance: { address: astroFactory } });
    console.log(`ASTRO: ${astroBalance1.balance}, PSI: ${psiBalance1.balance}`);

    // Wait for new blocks
    await new Promise(f => setTimeout(f, 3000));

    // Make third buy (rewards claimed implicitly)
    result = await executeContract(lcdClient, sender, nexusPol, msgBuy, new Coins([new Coin('uusd', 1000000000)]));
    buyInfo = parseBuy(result);
    console.log(`RESULT: ${JSON.stringify(buyInfo)}`);
    // Check result attributes
    assert.deepStrictEqual(buyInfo.bonds.toFixed(0), '27727574799');
    assert.deepStrictEqual(buyInfo.psi_liquidity.toFixed(0), '24975024975');
    assert.deepStrictEqual(buyInfo.asset_liquidity.toFixed(0), '999000999');
    buysInfo.push(buyInfo);
    const astroBalance2: BalanceResponse = await lcdClient.wasm.contractQuery(astro, { balance: { address: astroFactory } });
    const psiBalance2: BalanceResponse = await lcdClient.wasm.contractQuery(psi, { balance: { address: astroFactory } });
    console.log(`ASTRO: ${astroBalance2.balance}, PSI: ${psiBalance2.balance}`);

    // Wait for new blocks
    await new Promise(f => setTimeout(f, 3000));

    // Claim all rewards
    const msgClaimRewards = { claim_rewards: {} };
    const resClaimRewards = await executeContract(lcdClient, sender, nexusPol, msgClaimRewards);
    const claimInfo = parseClaimRewards(resClaimRewards);
    console.log(`RESULT: ${JSON.stringify(claimInfo)}`);
    const astroBalance3: BalanceResponse = await lcdClient.wasm.contractQuery(astro, { balance: { address: astroFactory } });
    const psiBalance3: BalanceResponse = await lcdClient.wasm.contractQuery(psi, { balance: { address: astroFactory } });
    console.log(`ASTRO: ${astroBalance3.balance}, PSI: ${psiBalance3.balance}`);

    // Check all added vesting records
    const vestingResult: VestingResponse = await lcdClient.wasm.contractQuery(nexusVesting, { vesting_account: { address: sender.key.accAddress } });
    for (const [i, schedule] of vestingResult.info.schedules.entries()) {
        assert.strictEqual(schedule.end_time - schedule.start_time, 5 * 24 * 3600);
        assert.strictEqual(schedule.start_time, schedule.cliff_end_time);
        assert.strictEqual(schedule.amount, buysInfo[i].bonds.toFixed(0));
        assert.strictEqual(vestingResult.info.last_claim_time, 100500);
    }
}

//======================================================================

type BalanceResponse = {
    balance: string,
}

type PoolResponse = {
    assets: [{ amount: string }, { amount: string }],
};

type VestingResponse = {
    info: {
        schedules: Array<{
            start_time: number,
            end_time: number,
            cliff_end_time: number,
            amount: string,
        }>,
        last_claim_time: number,
    }
};

function parseBuy(result: BlockTxBroadcastResult) {
    const buyInfo = {
        bonds: new Decimal(0),
        psi_liquidity: new Decimal(0),
        asset_liquidity: new Decimal(0),
        psi_rewards: new Decimal(0),
        astro_rewards: new Decimal(0),
    };
    const events = getContractEvents(result);
    for (const e of events) {
        const bonds = e['bonds_issued'];
        if (bonds !== undefined) {
            buyInfo.bonds = new Decimal(bonds);
        }
        const psi_liquidity = e['provided_liquidity_in_psi'];
        if (psi_liquidity !== undefined) {
            buyInfo.psi_liquidity = new Decimal(psi_liquidity);
        }
        const asset_liquidity = e['provided_liquidity_in_asset'];
        if (asset_liquidity !== undefined) {
            buyInfo.asset_liquidity = new Decimal(asset_liquidity);
        }
        const psi_rewards = e['psi_tokens_claimed'];
        if (psi_rewards !== undefined) {
            buyInfo.psi_rewards = new Decimal(psi_rewards);
        }
        const astro_rewards = e['astro_tokens_claimed'];
        if (astro_rewards !== undefined) {
            buyInfo.astro_rewards = new Decimal(astro_rewards);
        }
    }
    return buyInfo;
}

function parseClaimRewards(result: BlockTxBroadcastResult) {
    const claimInfo = {
        psi_rewards: '',
        astro_rewards: '',
    };
    const events = getContractEvents(result);
    for (const e of events) {
        const psi_rewards = e['psi_tokens_claimed'];
        if (psi_rewards !== undefined) {
            claimInfo.psi_rewards = psi_rewards;
        }
        const astro_rewards = e['astro_tokens_claimed'];
        if (astro_rewards !== undefined) {
            claimInfo.astro_rewards = astro_rewards;
        }
    }
    return claimInfo;
}

//======================================================================

runProgram()
    .then(text => {
        console.log(text);
    })
    .catch(err => {
        console.log(err);
    });
