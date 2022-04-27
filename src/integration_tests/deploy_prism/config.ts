
export type Addr = string;

export interface PrismMarketInfo {
    prism_token_addr: Addr,
}

export function PrismMarketInfo(
    prism_token_addr: Addr
): PrismMarketInfo {
    return {
        prism_token_addr: prism_token_addr
    }
}

