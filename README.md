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
2. https://github.com/terraswap/terraswap (columbus-5 branch)
3. https://github.com/Nexus-Protocol/services-contracts
4. https://github.com/CosmWasm/cosmwasm-plus

Now change paths to artifacts [here](src/basset_vault/definition.ts)

## Upload basset-vault smart contracts:

`npm run upload-basset-vault`
