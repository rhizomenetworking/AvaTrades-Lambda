import { BN } from "avalanche"
import { fetchTrade } from "./database"
import { Trade, Chain, TradeMode } from "./model"

interface PreparedCreateTrade {
    asset_id: string;
    ask: BN;
    mode: TradeMode;
    proceeds_address: string;
    chain: Chain;
}

interface PreparedCreateBid {
    trade: Trade;
    proceeds_address: string;
}

interface PreparedSetRoyalty {
    asset_id: string;
    proceeds_address: string;
    divisor: number;
    chain: Chain;
    timestamp: number;
    minter_address: string;
    minter_signature: string;
}

interface PreparedReadTrade {
    trade: Trade
}

interface PreparedReadRoyalty {
    chain: Chain;
    asset_id: string;
}

function prepareCreateTrade(params: any): PreparedCreateTrade {
    //TODO: Verification
    let allows_bidding = Boolean(params.allows_bidding);
    return {
        "asset_id": params.asset_id,
        "ask": new BN(params.ask),
        "mode": allows_bidding ? "AUCTION" : "FIXED",
        "proceeds_address": params.address,
        "chain": params.chain
    }
}

async function prepareCreateBid(params: any): Promise<PreparedCreateBid> {
    //TODO
    let trade = await fetchTrade(params.trade_id);
    if (trade === undefined) {
        throw "Create Bid - Trade not found"
    }

    return {
        "trade": trade,
        "proceeds_address": params.proceeds_address
    }
}

function prepareSetRoyalty(params: any): PreparedSetRoyalty {
    //TODO
    return {
        "asset_id": params.asset_id, 
        "proceeds_address": params.proceeds_address,
        "divisor": parseInt(params.divisor),
        "chain": params.chain,
        "timestamp": parseInt(params.timestamp),
        "minter_address": params.minter_address,
        "minter_signature": params.minter_signature,
    }
}

async function prepareReadTrade(params: any): Promise<PreparedReadTrade> {
    //TODO
    let trade = await fetchTrade(params.trade_id);
    if (trade === undefined) {
        throw "Read Trade - Trade not found"
    }
    return {
        "trade": trade
    }
}

async function prepareReadRoyalty(params: any): Promise<PreparedReadRoyalty> {
    //TODO
    return {
        "asset_id": params.asset_id,
        "chain": params.chain
    }
}

export { PreparedCreateTrade, PreparedCreateBid, PreparedSetRoyalty, PreparedReadTrade, PreparedReadRoyalty }
export { prepareCreateTrade, prepareCreateBid, prepareSetRoyalty, prepareReadTrade, prepareReadRoyalty }