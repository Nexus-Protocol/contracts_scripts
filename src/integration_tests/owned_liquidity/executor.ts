/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable no-empty */
// nvm install latest
// export NODE_OPTIONS=--openssl-legacy-provider

import { BlockTxBroadcastResult, Coin, Coins, getContractEvents, LCDClient, LocalTerra, Wallet } from '@terra-money/terra.js';
import * as assert from "assert";
import Decimal from 'decimal.js';
import { create_contract, execute_contract, instantiate_contract, parse_pair_creation, sleep, store_contract } from '../../utils';

const totalSupply = new Decimal('10_000_000_000_000_000');
const justBigNumber = new Decimal('100_000_000_000_000');

async function instantiatePsiToken(lcdClient: LCDClient, sender: Wallet, tokenCodeId: number) {
    const init = {
        name: 'Nexus Governance Token',
        symbol: 'PSI',
        decimals: 6,
        initial_balances: [
            {
                address: sender.key.accAddress,
                amount: totalSupply.toFixed(),
            }
        ],
        mint: {
            minter: sender.key.accAddress,
        }
    };
    return await instantiate_contract(lcdClient, sender, sender.key.accAddress, tokenCodeId, init);
}

async function instantiateTstToken(lcdClient: LCDClient, sender: Wallet, tokenCodeId: number) {
    const config = {
        name: 'Nexus Test Token',
        symbol: 'TST',
        decimals: 6,
        initial_balances: [
            {
                address: sender.key.accAddress,
                amount: totalSupply.toFixed(),
            }
        ],
        mint: {
            minter: sender.key.accAddress,
        }
    };
    return await instantiate_contract(lcdClient, sender, sender.key.accAddress, tokenCodeId, config);
}

async function instantiateAstroToken(
    lcdClient: LCDClient,
    sender: Wallet,
    psi: string,
    notCirculatingPsi: Decimal,
) {
    const config = {
        name: 'Astroport Governance Token',
        symbol: 'ASTRO',
        decimals: 6,
        initial_balances: [
            {
                address: sender.key.accAddress,
                amount: totalSupply.toFixed(),
            }
        ],
    };

    const astro = await create_contract(
        lcdClient, sender, 'ASTRO', 'wasm_artifacts/astroport/astroport_token.wasm', config);

    await execute_contract(
        lcdClient,
        sender,
        psi,
        { transfer: { recipient: astro, amount: notCirculatingPsi.toFixed() } },
    );

    return astro;
}

async function instantiateAstroVesting(lcdClient: LCDClient, sender: Wallet, astro: string) {
    const init = {
        owner: sender.key.accAddress,
        token_addr: astro,
    };
    return await create_contract(
        lcdClient, sender, 'astro vesting', 'wasm_artifacts/astroport/astroport_vesting.wasm', init);
}

async function instantiateAstroGenerator(
    lcdClient: LCDClient,
    sender: Wallet,
    astro: string,
    astroVesting: string,
    tokensPerBlock: Decimal,
) {
    const init = {
        owner: sender.key.accAddress,
        astro_token: astro,
        tokens_per_block: tokensPerBlock.toFixed(),
        start_block: '1',
        allowed_reward_proxies: [],
        vesting_contract: astroVesting,
    };
    return await create_contract(
        lcdClient,
        sender,
        'astro generator',
        'wasm_artifacts/astroport/astroport_generator.wasm',
        init,
    );
}

async function setAstroGeneratorBalance(
    lcdClient: LCDClient,
    sender: Wallet,
    astroGenerator: string,
    astroVesting: string,
    astro: string,
    balance: Decimal,
) {
    const balanceStr = balance.toFixed();
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
                                amount: balanceStr,
                            }
                        }
                    ]
                }
            ]
        }
    };
    const jsonMsg = JSON.stringify(msg);
    const B64Msg = Buffer.from(jsonMsg).toString('base64');
    await execute_contract(lcdClient, sender, astro, {
        'send': {
            contract: astroVesting,
            amount: balanceStr,
            msg: B64Msg,
        }
    });
}

async function instantiateAstroFactory(
    lcdClient: LCDClient,
    sender: Wallet,
    tokenCodeId: number,
    astroGenerator: string,
) {
    const astroPairCodeId = await store_contract(
        lcdClient, sender, 'wasm_artifacts/astroport/astroport_pair.wasm');

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
    return await create_contract(
        lcdClient, sender, 'astro factory', 'wasm_artifacts/astroport/astroport_factory.wasm', init);
}

async function createAstroPsiUstPair(
    lcdClient: LCDClient,
    sender: Wallet,
    astroFactory: string,
    psi: string,
    psiAmount: Decimal,
    ustAmount: Decimal,
) {
    const psiAmountStr = psiAmount.toFixed();
    const ustAmountStr = ustAmount.toFixed();

    const msgCreatePair = {
        create_pair: {
            asset_infos: [
                { token: { contract_addr: psi } },
                { native_token: { denom: 'uusd' } },
            ],
            pair_type: { xyk: {} },
        }
    };
    const txResult = await execute_contract(lcdClient, sender, astroFactory, msgCreatePair);
    const pair = parse_pair_creation(txResult!);

    const msgIncreaseAllowance = {
        increase_allowance: {
            spender: pair.pair_contract_addr,
            amount: psiAmountStr,
        }
    };
    await execute_contract(lcdClient, sender, psi, msgIncreaseAllowance);

    const msgProvideLiquidity =
    {
        provide_liquidity: {
            assets: [
                {
                    amount: psiAmountStr,
                    info: {
                        token: {
                            contract_addr: psi,
                        }
                    }
                },
                {
                    amount: ustAmountStr,
                    info: {
                        native_token: {
                            denom: 'uusd',
                        }
                    }
                },
            ]
        }
    };
    await execute_contract(
        lcdClient,
        sender,
        pair.pair_contract_addr,
        msgProvideLiquidity,
        new Coins([new Coin('uusd', ustAmount.toNumber())]),
    );

    return pair;
}

async function createAstroPsiTstPair(
    lcdClient: LCDClient,
    sender: Wallet,
    astroFactory: string,
    psi: string,
    psiAmount: Decimal,
    tst: string,
    tstAmount: Decimal,
) {
    const psiAmountStr = psiAmount.toFixed();
    const tstAmountStr = tstAmount.toFixed();

    const msgCreatePair = {
        create_pair: {
            asset_infos: [
                { token: { contract_addr: psi } },
                { token: { contract_addr: tst } },
            ],
            pair_type: { xyk: {} },
        }
    };
    const txResult = await execute_contract(lcdClient, sender, astroFactory, msgCreatePair);
    const pair = parse_pair_creation(txResult!);

    const msgPsiIncreaseAllowance = {
        increase_allowance: {
            spender: pair.pair_contract_addr,
            amount: psiAmountStr,
        }
    };
    await execute_contract(lcdClient, sender, psi, msgPsiIncreaseAllowance);

    const msgTstIncreaseAllowance = {
        increase_allowance: {
            spender: pair.pair_contract_addr,
            amount: tstAmountStr,
        }
    };
    await execute_contract(lcdClient, sender, tst, msgTstIncreaseAllowance);

    const msgProvideLiquidity =
    {
        provide_liquidity: {
            assets: [
                {
                    amount: psiAmountStr,
                    info: {
                        token: {
                            contract_addr: psi,
                        }
                    }
                },
                {
                    amount: tstAmountStr,
                    info: {
                        token: {
                            contract_addr: tst,
                        }
                    }
                },
            ]
        }
    };
    await execute_contract(lcdClient, sender, pair.pair_contract_addr, msgProvideLiquidity);

    return pair;
}

async function instantiateNexusStakingWithBalance(
    lcdClient: LCDClient,
    sender: Wallet,
    name: string,
    psi: string,
    stakingToken: string,
    balance: Decimal,
) {
    const balanceStr = balance.toFixed();

    const init = {
        owner: sender.key.accAddress,
        psi_token: psi,
        staking_token: stakingToken,
        terraswap_factory: sender.key.accAddress, // anything
        distribution_schedule: [{
            start_time: Math.floor(Date.now() / 1000),
            end_time: Math.floor(Date.now() / 1000) + 365 * 24 * 3600,
            amount: balanceStr,
        }],
    };
    const nexusStaking = await create_contract(
        lcdClient,
        sender,
        name + ' nexus staking',
        'wasm_artifacts/nexus/services/nexus_staking.wasm',
        init,
    );

    await execute_contract(
        lcdClient, sender, psi, { transfer: { recipient: nexusStaking, amount: balanceStr } });

    return nexusStaking;
}

async function instantiateAstroGeneratorProxy(
    lcdClient: LCDClient,
    sender: Wallet,
    name: string,
    astroGenerator: string,
    lpToken: string,
    nexusStaking: string,
    psi: string,
) {
    const init = {
        generator_contract_addr: astroGenerator,
        pair_addr: sender.key.accAddress, // anything
        lp_token_addr: lpToken,
        reward_contract_addr: nexusStaking,
        reward_token_addr: psi,
    };
    return await create_contract(
        lcdClient,
        sender,
        name + ' astro generator proxy',
        'wasm_artifacts/astroport/generator_proxy_to_psi.wasm',
        init,
    );
}

async function addAstroGeneratorProxiesToGenerator(
    lcdClient: LCDClient,
    sender: Wallet,
    astroGeneratorProxies: Array<string>,
    astroGenerator: string,
) {
    const msg = {
        set_allowed_reward_proxies: {
            proxies: astroGeneratorProxies,
        }
    };
    await execute_contract(lcdClient, sender, astroGenerator, msg);
}

type Pool = {
    lpToken: string,
    astroGeneratorProxy: string,
};

async function addPoolsToAstroGenerator(
    lcdClient: LCDClient,
    sender: Wallet,
    astroGenerator: string,
    pools: Array<Pool>,
) {
    for (const pool of pools) {
        const msg = {
            add: {
                lp_token: pool.lpToken,
                alloc_point: '1',
                reward_proxy: pool.astroGeneratorProxy,
            }
        };
        await execute_contract(lcdClient, sender, astroGenerator, msg);
    }
}

async function instantiateNexusVesting(lcdClient: LCDClient, sender: Wallet, psi: string) {
    const init = {
        owner: sender.key.accAddress,
        psi_token: psi,
        genesis_time: 100500,
    };
    return await create_contract(
        lcdClient,
        sender,
        'nexus vesting',
        'wasm_artifacts/nexus/services/nexus_vesting_pol.wasm',
        init,
    );
}

async function instantiateNexusPolWithBalance(
    lcdClient: LCDClient,
    sender: Wallet,
    pairs: Array<string>,
    psi: string,
    nexusVesting: string,
    nexusVestingPeriod: number,
    excludedPsi: Array<string>,
    bcv: Decimal,
    maxBondsAmount: Decimal,
    communityPool: string,
    astroGenerator: string,
    astroToken: string,
    balance: Decimal,
) {
    const init = {
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
        astro_generator: astroGenerator,
        astro_token: astroToken,
    };
    const nexusPol = await create_contract(
        lcdClient, sender, 'nexus PoL', 'wasm_artifacts/nexus/services/nexus_pol.wasm', init);

    await execute_contract(lcdClient, sender, psi, {
        transfer: { recipient: nexusPol, amount: balance.toFixed(0) }
    });

    return nexusPol;
}

async function getTaxed(amount: Decimal, rate: Decimal, cap: Decimal) {
    const tax = amount.mul((new Decimal(1)).sub(new Decimal(1).div(rate.add(new Decimal(1)))));
    const taxCapped = Decimal.min(tax, cap);
    return amount.sub(Decimal.max(taxCapped, new Decimal(1)));
}

async function runProgram() {
    const localTerra = new LocalTerra();
    const lcdClient: LCDClient = localTerra;
    const sender = localTerra.wallets['test1'];

    const taxRate = await lcdClient.treasury.taxRate();
    const taxCap = await lcdClient.treasury.taxCap('uusd');

    const tokensPerBlock = new Decimal('10_000');
    const bcv = new Decimal('2.5');

    //======================================================================
    // Prepare infrastructure for testing

    const tokenCodeId = await store_contract(
        lcdClient, sender, 'wasm_artifacts/cosmwasm_plus/cw20_base.wasm');
    console.log(`======================================================`);

    const psi = await instantiatePsiToken(lcdClient, sender, tokenCodeId);
    console.log(`PSI: ${psi}`);
    console.log(`======================================================`);

    const tst = await instantiateTstToken(lcdClient, sender, tokenCodeId);
    console.log(`TST: ${tst}`);
    console.log(`======================================================`);

    const notCirculatingPsi = new Decimal('7_000_000_000_000_000');
    const astro = await instantiateAstroToken(lcdClient, sender, psi, notCirculatingPsi);
    console.log(`======================================================`);

    const astroVesting = await instantiateAstroVesting(lcdClient, sender, astro);
    console.log(`======================================================`);

    const astroGenerator = await instantiateAstroGenerator(
        lcdClient, sender, astro, astroVesting, tokensPerBlock);
    console.log(`======================================================`);

    await setAstroGeneratorBalance(
        lcdClient, sender, astroGenerator, astroVesting, astro, justBigNumber);

    const astroFactory = await instantiateAstroFactory(
        lcdClient, sender, tokenCodeId, astroGenerator);
    console.log(`======================================================`);

    let psiLiquidityU = new Decimal('100_000_000_000_000');
    let ustLiquidity = new Decimal('4_000_000_000_000');
    let psiLiquidityT = new Decimal('100_000_000_000_000');
    let tstLiquidity = new Decimal('2_000_000_000_000');

    const astroPsiUstPair = await createAstroPsiUstPair(
        lcdClient, sender, astroFactory, psi, psiLiquidityU, ustLiquidity);
    console.log(
        `astro PSI-UST pair: ${astroPsiUstPair.pair_contract_addr},
         LP token: ${astroPsiUstPair.liquidity_token_addr}`,
    );
    console.log(`======================================================`);

    const astroPsiTstPair = await createAstroPsiTstPair(
        lcdClient, sender, astroFactory, psi, psiLiquidityT, tst, tstLiquidity);
    console.log(
        `astro PSI-TST pair: ${astroPsiTstPair.pair_contract_addr},
        LP token: ${astroPsiTstPair.liquidity_token_addr}`,
    );
    console.log(`======================================================`);

    const nexusPsiUstStaking = await instantiateNexusStakingWithBalance(
        lcdClient, sender, 'PSI-UST LP', psi, astroPsiUstPair.liquidity_token_addr, justBigNumber);
    console.log(`======================================================`);

    const nexusPsiTstStaking = await instantiateNexusStakingWithBalance(
        lcdClient, sender, 'PSI-TST LP', psi, astroPsiTstPair.liquidity_token_addr, justBigNumber);
    console.log(`======================================================`);

    const astroPsiUstGeneratorProxy = await instantiateAstroGeneratorProxy(
        lcdClient,
        sender,
        'PSI-UST',
        astroGenerator,
        astroPsiUstPair.liquidity_token_addr,
        nexusPsiUstStaking,
        psi,
    );
    console.log(`======================================================`);

    const astroPsiTstGeneratorProxy = await instantiateAstroGeneratorProxy(
        lcdClient,
        sender,
        'PSI-TST',
        astroGenerator,
        astroPsiTstPair.liquidity_token_addr,
        nexusPsiTstStaking,
        psi,
    );
    console.log(`======================================================`);

    await addAstroGeneratorProxiesToGenerator(
        lcdClient, sender, [astroPsiUstGeneratorProxy, astroPsiTstGeneratorProxy], astroGenerator);
    await addPoolsToAstroGenerator(
        lcdClient,
        sender,
        astroGenerator,
        [
            {
                lpToken: astroPsiUstPair.liquidity_token_addr,
                astroGeneratorProxy: astroPsiUstGeneratorProxy,
            },
            {
                lpToken: astroPsiTstPair.liquidity_token_addr,
                astroGeneratorProxy: astroPsiTstGeneratorProxy,
            }
        ],
    );

    const nexusVesting = await instantiateNexusVesting(lcdClient, sender, psi);
    console.log(`======================================================`);

    const communityPool = astroFactory;
    const nexusPol = await instantiateNexusPolWithBalance(
        lcdClient,
        sender,
        [astroPsiUstPair.pair_contract_addr, astroPsiTstPair.pair_contract_addr],
        psi,
        nexusVesting,
        5 * 24 * 3600,
        [astro],
        bcv,
        new Decimal('0.0001'),
        communityPool,
        astroGenerator,
        astro,
        new Decimal('1_000_000_000_000_000'),
    );
    console.log(`======================================================`);

    const msgUpdateConfig = { update_config: { owner: nexusPol } };
    let result = await execute_contract(lcdClient, sender, nexusVesting, msgUpdateConfig);

    //======================================================================
    // Actually testing

    const buysInfo = [];

    console.log(`Make first buy with native tokens`);
    const ustPayment = new Decimal(1_000_000_000);
    const taxedUstPayment = await getTaxed(ustPayment, taxRate, taxCap.amount);
    let assetCostInPsi = taxedUstPayment.mul(psiLiquidityU).div(ustLiquidity);
    let bondsAmount = calculate(
        assetCostInPsi,
        psiLiquidityU,
        ustLiquidity,
        totalSupply.sub(notCirculatingPsi),
        new Decimal(0),
        bcv,
    ).truncated();

    const msgBuy = { buy: { min_amount: '0' } };
    result = await execute_contract(
        lcdClient, sender, nexusPol, msgBuy, new Coins([new Coin('uusd', ustPayment.toNumber())]));
    let buyInfo = parseBuy(result!);
    buysInfo.push(buyInfo);

    console.log(`Check contract attributes`);
    assert.deepStrictEqual(buyInfo.bonds.toFixed(), bondsAmount.toFixed());
    assert.deepStrictEqual(
        buyInfo.psi_liquidity.toFixed(),
        taxedUstPayment.mul(psiLiquidityU).div(ustLiquidity).toFixed(0),
    );
    assert.deepStrictEqual(buyInfo.asset_liquidity.toFixed(), taxedUstPayment.toFixed(0));
    assert.deepStrictEqual(buyInfo.psi_rewards.toFixed(), '0');
    assert.deepStrictEqual(buyInfo.astro_rewards.toFixed(), '0');

    console.log(`Check provided liquidity`);
    psiLiquidityU = psiLiquidityU.add(buyInfo.psi_liquidity);
    ustLiquidity = ustLiquidity.add(buyInfo.asset_liquidity);
    let poolResult: PoolResponse = await lcdClient.wasm.contractQuery(
        astroPsiUstPair.pair_contract_addr, { pool: {} });
    assert.deepStrictEqual(poolResult.assets[0].amount, psiLiquidityU.toFixed());
    assert.deepStrictEqual(poolResult.assets[1].amount, ustLiquidity.toFixed());

    console.log(`Check vesting balance`);
    let vestingBalance: BalanceResponse = await lcdClient.wasm.contractQuery(
        psi, { balance: { address: nexusVesting } });
    assert.deepStrictEqual(vestingBalance.balance, buyInfo.bonds.toFixed());
    console.log(`======================================================`);

    console.log(`Wait for new blocks`);
    await sleep(3000);
    console.log(`======================================================`);

    console.log(`Make second buy with CW20 tokens`);
    const tstPayment = new Decimal(2_000_000_000);
    assetCostInPsi = tstPayment.mul(psiLiquidityT).div(tstLiquidity);
    bondsAmount = calculate(
        assetCostInPsi,
        psiLiquidityU,
        ustLiquidity,
        totalSupply.sub(notCirculatingPsi),
        bondsAmount,
        bcv,
    ).truncated();

    const msgBuyJson = JSON.stringify(msgBuy);
    const msgBuyBase64 = Buffer.from(msgBuyJson).toString('base64');
    result = await execute_contract(lcdClient, sender, tst,
        {
            send: {
                contract: nexusPol,
                amount: tstPayment.toFixed(),
                msg: msgBuyBase64,
            }
        });
    buyInfo = parseBuy(result!);
    buysInfo.push(buyInfo);

    console.log(`Check contract attributes`);
    assert.deepStrictEqual(buyInfo.bonds.toFixed(), bondsAmount.toFixed());
    assert.deepStrictEqual(
        buyInfo.psi_liquidity.toFixed(),
        tstPayment.mul(psiLiquidityT).div(tstLiquidity).toFixed(0),
    );
    assert.deepStrictEqual(buyInfo.asset_liquidity.toFixed(), tstPayment.toFixed());
    assert.deepStrictEqual(buyInfo.psi_rewards.toFixed(), '0');
    assert.deepStrictEqual(buyInfo.astro_rewards.toFixed(), '0');

    console.log(`Check provided liquidity`);
    poolResult = await lcdClient.wasm.contractQuery(astroPsiTstPair.pair_contract_addr, { pool: {} });
    psiLiquidityT = psiLiquidityT.add(buyInfo.psi_liquidity);
    tstLiquidity = tstLiquidity.add(buyInfo.asset_liquidity);
    assert.deepStrictEqual(poolResult.assets[0].amount, psiLiquidityT.toFixed());
    assert.deepStrictEqual(poolResult.assets[1].amount, tstLiquidity.toFixed());

    console.log(`Check vesting balance`);
    vestingBalance = await lcdClient.wasm.contractQuery(psi, { balance: { address: nexusVesting } });
    assert.deepStrictEqual(vestingBalance.balance, buyInfo.bonds.add(buysInfo[0].bonds).toFixed());
    console.log(`======================================================`);

    console.log(`Wait for new blocks`);
    await sleep(3000);
    console.log(`======================================================`);

    console.log(`Make third buy (rewards claimed implicitly)`);
    result = await execute_contract(lcdClient, sender, tst,
        {
            send: {
                contract: nexusPol,
                amount: tstPayment.toFixed(),
                msg: msgBuyBase64,
            }
        });
    buyInfo = parseBuy(result!);
    buysInfo.push(buyInfo);

    console.log(`Check transfered rewards`);
    const rewards_1 = extractRewardsInfo(result!, nexusPol, astro, psi);
    assert.deepStrictEqual(buyInfo.psi_rewards.toFixed(), rewards_1.psiAmount);
    assert.deepStrictEqual(buyInfo.astro_rewards.toFixed(), rewards_1.astroAmount);
    assert(buyInfo.psi_rewards.greaterThan(0));
    assert(buyInfo.astro_rewards.greaterThan(0));
    let astroBalance: BalanceResponse =
        await lcdClient.wasm.contractQuery(astro, { balance: { address: communityPool } });
    let psiBalance: BalanceResponse =
        await lcdClient.wasm.contractQuery(psi, { balance: { address: communityPool } });
    assert.deepStrictEqual(psiBalance.balance, rewards_1.psiAmount);
    assert.deepStrictEqual(astroBalance.balance, rewards_1.astroAmount);
    console.log(`======================================================`);

    console.log(`Wait for new blocks`);
    await sleep(3000);
    console.log(`======================================================`);

    console.log(`Claim all rewards`);
    const msgClaimRewards = { claim_rewards: {} };
    result = await execute_contract(lcdClient, sender, nexusPol, msgClaimRewards);
    const claimInfo = parseClaimRewards(result!);
    const rewards_2 = extractRewardsInfo(result!, nexusPol, astro, psi);
    console.log(`Check contract attributes`);
    assert.deepStrictEqual(claimInfo.psi_rewards, rewards_2.psiAmount);
    assert.deepStrictEqual(claimInfo.astro_rewards, rewards_2.astroAmount);
    assert(buyInfo.psi_rewards.greaterThan(0));
    assert(buyInfo.astro_rewards.greaterThan(0));
    console.log(`Check transfered rewards`);
    astroBalance = await lcdClient.wasm.contractQuery(astro, { balance: { address: communityPool } });
    psiBalance = await lcdClient.wasm.contractQuery(psi, { balance: { address: communityPool } });
    assert.deepStrictEqual(
        psiBalance.balance,
        (new Decimal(rewards_1.psiAmount).add(new Decimal(rewards_2.psiAmount))).toFixed(),
    );
    assert.deepStrictEqual(
        astroBalance.balance,
        (new Decimal(rewards_1.astroAmount).add(new Decimal(rewards_2.astroAmount))).toFixed(),
    );
    console.log(`======================================================`);

    console.log(`Check all added vesting records`);
    const vestingResult: VestingResponse = await lcdClient.wasm.contractQuery(
        nexusVesting,
        { vesting_account: { address: sender.key.accAddress } },
    );
    for (const [i, schedule] of vestingResult.info.schedules.entries()) {
        assert.deepStrictEqual(schedule.end_time - schedule.start_time, 5 * 24 * 3600);
        assert.deepStrictEqual(schedule.start_time, schedule.cliff_end_time);
        assert.deepStrictEqual(schedule.amount, buysInfo[i].bonds.toFixed());
        assert.deepStrictEqual(vestingResult.info.last_claim_time, 100500);
    }

    console.log(`======================================================`);
    console.log(`SUCCEED`);
    return 0;
}

//======================================================================

function calculate(
    assetCostInPsi: Decimal,
    psiLiquidity: Decimal,
    ustLiquidity: Decimal,
    circulatingPsi: Decimal,
    issuedBonds: Decimal,
    bcv: Decimal,
) {
    const psiPrice = ustLiquidity.div(psiLiquidity);
    const instrinsic = circulatingPsi.mul(psiPrice).div(totalSupply);
    const premium = issuedBonds.mul(bcv).div(totalSupply);
    const bondPrice = instrinsic.add(premium);
    return assetCostInPsi.mul(psiPrice).div(bondPrice);
}

type BalanceResponse = {
    balance: string,
}

type PoolResponse = {
    assets: [{ amount: string }, { amount: string }],
}

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
}

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

function extractRewardsInfo(
    result: BlockTxBroadcastResult,
    nexusPol: string,
    astro: string,
    psi: string
) {
    let psiAmount = new Decimal(0);
    let astroAmount = new Decimal(0);
    const events = getContractEvents(result);
    for (const e of events) {
        if (e['action'] !== 'transfer' || e['to'] !== nexusPol) {
            continue;
        }
        if (e.contract_address === astro) {
            astroAmount = astroAmount.add(e['amount']);
        }
        if (e.contract_address === psi) {
            psiAmount = psiAmount.add(e['amount']);
        }
    }
    return {
        psiAmount: psiAmount.toFixed(),
        astroAmount: astroAmount.toFixed(),
    };
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
