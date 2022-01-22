import { BN, Buffer } from "avalanche"
import { fetchTrade } from "./database"
import { Trade, TradeMode } from "./model"
import { Chain, assetIdFromString, addressFromString, signatureFromString } from "./common"

interface PreparedCreateTrade {
    asset_id: Buffer;
    ask: BN;
    mode: TradeMode;
    proceeds_address: Buffer;
    chain: Chain;
}

interface PreparedCreateBid {
    trade: Trade;
    proceeds_address: Buffer;
}

interface PreparedSetRoyalty {
    asset_id: Buffer;
    proceeds_address: Buffer;
    divisor: number;
    chain: Chain;
    timestamp: number;
    minter_address: Buffer;
    minter_signature: Buffer;
}

interface PreparedReadTrade {
    trade: Trade
}

interface PreparedReadRoyalty {
    chain: Chain;
    asset_id: Buffer;
}

function prepareCreateTrade(params: any): PreparedCreateTrade {
    //TODO: Verification
    let allows_bidding = Boolean(params.allows_bidding);
    let chain: Chain = params.chain;
    return {
        "asset_id": assetIdFromString(params.asset_id),
        "ask": new BN(params.ask),
        "mode": allows_bidding ? "AUCTION" : "FIXED",
        "proceeds_address": addressFromString(chain, params.address),
        "chain": chain
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
        "proceeds_address": addressFromString(trade.wallet.chain, params.proceeds_address)
    }
}

function prepareSetRoyalty(params: any): PreparedSetRoyalty {
    //TODO
    let chain: Chain = params.chain;
    return {
        "asset_id": assetIdFromString(params.asset_id), 
        "proceeds_address": addressFromString(chain, params.proceeds_address),
        "divisor": parseInt(params.divisor),
        "chain": chain,
        "timestamp": parseInt(params.timestamp),
        "minter_address": addressFromString(chain, params.minter_address),
        "minter_signature": signatureFromString(params.minter_signature),
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
        "asset_id": assetIdFromString(params.asset_id),
        "chain": params.chain
    }
}

export { PreparedCreateTrade, PreparedCreateBid, PreparedSetRoyalty, PreparedReadTrade, PreparedReadRoyalty }
export { prepareCreateTrade, prepareCreateBid, prepareSetRoyalty, prepareReadTrade, prepareReadRoyalty }