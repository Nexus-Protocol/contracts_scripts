**CosmWasm compatible version: `0.16`**

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

1. https://github.com/Nexus-Protocol/basset-vault-contracts (`v1.1.0` tag)
2. https://github.com/terraswap/terraswap (`3ae1c1252ffcfff0a5b6f67d8a87a1604edae3a3` commit)
3. https://github.com/Nexus-Protocol/services-contracts (`v1.1.0` tag)
4. https://github.com/CosmWasm/cosmwasm-plus (`v0.8.0` tag)

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

## Upload basset-vault smart contracts:

`npm run upload-basset-vault`
