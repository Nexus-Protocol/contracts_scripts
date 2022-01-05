import {TokenConfig} from "../../config";

export function MirrorTokenConfig(minter: string): TokenConfig {
    return {
        name: "Mirror Governance Token",
        symbol: "MIR",
        decimals: 6,
        initial_balances: [],
        mint: {
            minter: minter,
        }
    }
}

export function aUSTConfig(minter: string): TokenConfig {
    return {
        name: "Anchor Terra USD",
        symbol: "aUST",
        decimals: 6,
        initial_balances: [],
        mint: {
            minter: minter,
        }
    }
}
