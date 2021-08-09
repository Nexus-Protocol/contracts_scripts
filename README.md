**CosmWasm compatible version: `0.15`**

## Setup:

`npm install`

To setup `terra-js` from `bombay` branch:
1. `git clone https://github.com/terra-money/terra.js`
2. `cd terra.js` && `git checkout bombay`
3. `npm install`
4. `npm run build`
5. `npm link`
now you are done with terra-js repo, go to your project directory
6. `cd {my_bombay_js_project_dir}`
7. `npm link @terra-money/terra.js`

#### Download dependency repos:

1. https://github.com/Nexus-Protocol/basset-vault-contracts
2. https://github.com/terraswap/terraswap (`92f65af98a5b1ae985bc16208143098d92954b2f` branch)
3. https://github.com/Nexus-Protocol/services-contracts
4. https://github.com/CosmWasm/cosmwasm-plus (`v0.7.0` branch)

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

1. `git clone git@github.com:invis87/LocalTerra.git`
2. `cd LocalTerra`
3. `git checkout bombay`
4. `docker-compose up`

## Upload basset-vault smart contracts:

`npm run upload-basset-vault`
