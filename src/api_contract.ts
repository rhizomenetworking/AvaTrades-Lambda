import { Trade, Bid, Royalty, TradeStatus } from "./model"

interface APIMessage {
    message: string;
}

interface APIRoyalty {
    chain: string;
    asset_id: string;
    divisor: string;
    owner: string;
}

interface APIWallet {
    trade_id: string;
    address: string;
    asset_ids: string[];
    expiration: string;
    chain: string;
    owner: string;
}

interface APITrade {
    trade_id: string;
    url: string;
    status: TradeStatus
}

function makeAPIWallet(trade: Trade, bid?: Bid): APIWallet {
    let wallet = (bid === undefined) ? trade.wallet : bid.wallet;
    return {
        "trade_id": trade.id,
        "address": wallet.address,
        "asset_ids": wallet.asset_ids,
        "expiration": wallet.expiration.toString(),
        "chain": wallet.chain,
        "owner": trade.proceeds_address
    }
}

function makeAPIRoyalty(royalty: Royalty): APIRoyalty {
    return {
        "chain": royalty.chain,
        "asset_id": royalty.asset_id,
        "divisor": royalty.divisor.toString(),
        "owner": royalty.proceeds_address
    }
}

function makeAPITrade(trade: Trade, bids: Bid[], royalty: Royalty | undefined): APITrade {
    return {
        "trade_id": trade.id,
        "url": "https://avatrades.io/" + trade.id,
        "status": trade.status  
    }
}

function makeAPIMessage(message: string) {
    return {
        "message": message
    }
}

export { APIMessage, APIRoyalty, APIWallet, APITrade }
export { makeAPITrade, makeAPIWallet, makeAPIRoyalty, makeAPIMessage }
