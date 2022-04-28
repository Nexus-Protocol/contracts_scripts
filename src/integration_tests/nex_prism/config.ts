import { PrismMarketInfo } from "../deploy_prism/config";

export interface AddressesHolderConfig {
    prism_token_addr: string,
    prism_gov_addr: string,
}

export function AddressesHolderConfig(
    prism_market_info: PrismMarketInfo,
): AddressesHolderConfig {
    return {
        prism_token_addr: prism_market_info.prism_token_addr,
        prism_gov_addr: "",
    }
}