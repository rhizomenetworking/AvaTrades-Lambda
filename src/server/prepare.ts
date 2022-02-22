import { BN, Buffer } from "avalanche"
import { fetchTrade } from "../database/database"
import { WALLET_DURATION } from "../shared/constants";
import { Trade, TradeMode } from "../shared/model"
import { Chain, assetIdFromString, addressFromString, signatureFromString, getNetwork, makeKeyPair } from "../shared/utilities"

type PreparationError = string

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
    numerator: BN;
    divisor: BN;
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

async function prepareCreateTrade(params: any): Promise<PreparedCreateTrade | PreparationError> {
    let ask = paramAsBN(params.ask);
    let MIN = new BN(1000);
    if (ask === undefined || ask.lt(MIN)) {
        return "Invalid ask"
    }
    let chain = paramAsChain(params.chain);
    if (chain === undefined) {
        return "Invalid chain"
    }
    let asset_id = await paramAsAssetID(params.listed_asset, chain);
    if (asset_id === undefined) {
        return "Invalid listed_asset"
    }
    let mode = paramAsTradeMode(params.mode);
    if (mode === undefined) {
        return "Invalid mode"
    }
    let proceeds_address = paramAsAddress(params.seller_address, chain);
    if (proceeds_address === undefined) {
        return "Invalid seller_address"
    }
    return {
        "asset_id": asset_id,
        "ask": ask,
        "mode": mode,
        "proceeds_address": proceeds_address,
        "chain": chain
    }
}

async function prepareCreateBid(params: any): Promise<PreparedCreateBid | PreparationError> {
    let trade = await paramAsTrade(params.trade_id);
    if (trade === undefined) {
        return "Invalid trade_id"
    }
    let proceeds_address = paramAsAddress(params.bidder_address, trade.wallet.chain);
    if (proceeds_address === undefined) {
        return "Invalid bidder_address"
    }
    let now = new Date().getTime();
    let buffer = 60000;
    let time_needed = WALLET_DURATION + buffer;
    if (trade.deadline < (now + time_needed)) {
        return "This trade is no longer accepting new bids"
    }
    return {
        "trade": trade,
        "proceeds_address": proceeds_address
    }
}

async function prepareReadTrade(params: any): Promise<PreparedReadTrade | PreparationError> {
    let trade = await paramAsTrade(params.trade_id);
    if (trade === undefined) {
        return "Invalid trade_id"
    }
    return {
        "trade": trade
    }
}

async function prepareReadRoyalty(params: any): Promise<PreparedReadRoyalty | PreparationError> {
    let chain = paramAsChain(params.chain);
    if (chain === undefined) {
        return "Invalid chain"
    }
    let asset_id = await paramAsAssetID(params.asset_id, chain);
    if (asset_id === undefined) {
        return "Invalid asset_id"
    }
    return {
        "asset_id": asset_id,
        "chain": chain
    }
}

async function prepareSetRoyalty(params: any): Promise<PreparedSetRoyalty | PreparationError> {
    let chain = paramAsChain(params.chain);
    if (chain === undefined) {
        return "Invalid chain"
    }
    let asset_id = await paramAsAssetID(params.asset_id, chain);
    if (asset_id === undefined) {
        return "Invalid asset_id"
    }
    let MIN = new BN(0);
    let MAX = new BN(10000);
    let size = paramAsBN(params.royalty);
    if (MIN.gte(size) || MAX.lte(size)) {
        return "Invalid royalty"
    }
    let timestamp = paramAsNumber(params.timestamp);
    if (timestamp === undefined) {
        return "Invalid timestamp"
    }
    let now = new Date().getTime();
    let diff = Math.abs(now - timestamp);
    if (diff > 180000) {
        return "Provided timestamp is too distant from current time"
    }
    let minter_address = await paramAsMinterAddress(params.proceeds_address, chain, asset_id);
    if (minter_address === undefined) {
        return "Invalid proceeds_address"
    }
    let minter_signature = paramAsSignature(params.signed_timestamp);
    if (minter_signature === undefined) {
        return "Invalid signed_timestamp"
    }
    let message = Buffer.from(timestamp.toString());
    let actual_signer = makeKeyPair(chain).recover(message, minter_signature);
    if (!actual_signer.equals(minter_address)) {
        "signed_timestamp is not signed by proceeds_address"
    }
    return {
        "asset_id": asset_id,
        "proceeds_address": minter_address,
        "numerator": size,
        "divisor": MAX,
        "chain": chain,
        "timestamp": timestamp,
        "minter_address": minter_address,
        "minter_signature": minter_signature,
    }
}

function paramAsChain(param: string): Chain | undefined {
    if (param === "Fuji-X") {
        return "Fuji-x"
    } else if (param === "Avalanche-x") {
        return "Avalanche-x"
    }
    return undefined
}



//TODO
async function paramAsAssetID(param: string, chain: Chain): Promise<Buffer | undefined> { return {} as any } //TODO verify asset exists on chain
function paramAsAddress(param: string, chain: Chain): Buffer | undefined { return {} as any } //TODO: ensure that it is not one of the profit addresses
function paramAsBN(param: string): BN | undefined { return {} as any } //TODO: first convert to a number
async function paramAsTrade(param: string): Promise<Trade | undefined> { return {} as any } 
function paramAsTradeMode(param: string): TradeMode | undefined { return {} as any }
function paramAsNumber(param: string): number | undefined { return {} as any }
function paramAsSignature(param: string): Buffer | undefined { return {} as any }
async function paramAsMinterAddress(param: string, chain: Chain, asset_id: Buffer): Promise<Buffer | undefined> { return {} as any } 


export { prepareCreateTrade, prepareCreateBid, prepareSetRoyalty, prepareReadTrade, prepareReadRoyalty }