**CosmWasm compatible version: `0.16`**

## Setup:

`npm install`

**If you want to use precompiled wasm artifacts** - jump to [start localterra](#start-localterra)

#### Download dependency repos:

1. https://github.com/Nexus-Protocol/basset-vault-contracts (`v1.3.4` tag)
2. https://github.com/terraswap/terraswap (`3ae1c1252ffcfff0a5b6f67d8a87a1604edae3a3` commit)
3. https://github.com/Nexus-Protocol/services-contracts (`v1.4.2` tag)
4. https://github.com/CosmWasm/cosmwasm-plus (`v0.9.0` tag)

##### build cosmwasm-plus

In `cosmwasm-plus` project directory create bash file:
```sh
# Optimized builds
docker run --rm -v "$(pwd)":/code \
  --mount type=volume,source="$(basename "$(pwd)")_cache",target=/code/target \
  --mount type=volume,source=registry_cache,target=/usr/local/cargo/registry \
  cosmwasm/workspace-optimizer:0.11.5
```
and execute it. It will create `artifacts` directory with `*.wasm` files.

---

Now change paths to artifacts [here](src/basset_vault/definition.ts)

## Start localterra:

1. `git clone --depth 1 git@github.com:terra-money/LocalTerra.git`
2. `cd LocalTerra`
3. `git fetch --tags`, `git checkout tags/v0.5.0`
3. `docker pull terramoney/localterra-core:bombay`
4. `docker-compose up`

# Usage

### upload basset vault

TODO: add localterra instructions

- `npm run upload-basset-vault` - full upload cycle (governance, psi token, psi-ust swap pair, community pool, basset vault, nasset-psi swap pair)

### airdrop

- `npm run airdrop -- instantiate` - instantiate airdrop contract
- `npm run calc-airdrop -- merkle-root -G gov_stakers.txt -O airdrop_output -T 100000000 -C ./src/airdrop/default_psi_to_anc_ratio.json` - calculate merkle tree for airdrop and save csv & json files with `<address>;<anc_tokens>;<psi_tokens>;<psi_to_anc_ratio>` data
- `npm run calc-airdrop -- users-proof --stage 1 -G gov_stakers.txt -O users_airdrop_data -T 100000000 -C ./src/airdrop/default_psi_to_anc_ratio.json` - saves json with users proof and claimable psi tokens amount
- `npm run airdrop -- register-merkle-tree -A terra1lk26r9kcysvd3g2lfmsuavf7s5g59wnyu5u6fh -R asdsadyhsafdsfdsfdsgsdfsdfs` - register merkle root (`asdsadyhsafdsfdsfdsgsdfsdfs`) in airdrop contract (`terra1lk26r9kcysvd3g2lfmsuavf7s5g59wnyu5u6fh`)
- `npm run calc-airdrop -- send-airdrop -G gov_stakers.txt -T 100000000 -C ./src/airdrop/default_psi_to_anc_ratio.json` - send airdrop to all accounts, split to transactions with max 1000 messages

### staking lp

- `npm run staking-lp -- instantiate` - instantiate LP staking contract
- `npm run staking-lp -- add-distribution {start_date} {end_date} {tokens_amount} -A {staking_contract_addr}` - add new staking distribution schedule, for example: `npm run staking-lp -- add-distribution 2021-03-17T11:00:00 2021-03-18T11:00:00 1000 -A terra1qeedgtvrtjkqjn6fkezddjjlrwxmt5peafp8fx`
- `npm run staking-lp -- query-state -A terra1qeedgtvrtjkqjn6fkezddjjlrwxmt5peafp8fx` - query state of staking LP contract (`terra1qeedgtvrtjkqjn6fkezddjjlrwxmt5peafp8fx`)

### vesting

- `npm run vesting -- instantiate` - instantiate vesting contract
- `npm run vesting -- add-vesting {address} {start_date} {end_date} {cliff_end_date} {tokens_amount} -A {vesting_contract_addr}` - add new vesting, for example: `npm run vesting -- add-vesting terra1x46rqay4d3cssq8gxxvqz8xt6nwlz4td20k38v 2021-03-17T11:00:00 2021-03-18T11:00:00 2021-03-18T11:00:00 1000 -A terra1u3zhxxmqq9fkuxmuzkzlzjgzerejqpk64xpmx8`
- `npm run vesting -- query-state -A terra1ef44l7ayrzcjr7980gjqdqmndgy3cw04gtaj25` - query state of vesting contract (`terra1qeedgtvrtjkqjn6fkezddjjlrwxmt5peafp8fx`)

### lp simulation

- `npm run lp-simulation` - run lp simulation (provide liquidity, buy some tokens in loop, return token price at the end)

### rebalance

- `npm run rebalance` - run cycle that send `Rebalance` message to bAsset vault if needed

### honest work

- `npm run honest-work` - run cycle that send `HonestWork` (claim ANC rewards, sell them, buy PSI token) message to bAsset vault

### claim lp rewards for psi-nasset pool

- `npm run claim-lp-rewards` - run cycle that claim nAsset holding rewards for PSI-nAsset liquidity pool with some delay

# Integration tests

TODO: add localterra instructions

- `npm test` or `npm tst` or `npm t` - run integration tests

P.S.
- currently only psi_distribution_test done;
TODO:
- implement other tests;
- add cli args to run particular test with cli;
