import { fetchRoyalty, putTrade, putBid, putRoyalty, fetchBids } from "../database/database"
import { makeTrade, makeBid, makeRoyalty } from "../shared/model"
import { 
    prepareCreateBid, 
    prepareCreateTrade,
    prepareReadRoyalty,
    prepareReadTrade,
    prepareSetRoyalty
} from "../server/prepare";
import { 
    APITrade, APIWallet, APIRoyalty, 
    makeAPITrade, makeAPIWallet, makeAPIRoyalty, makeAPIMessage, APIMessage
} from "../server/api_contract"

async function createTrade(params: any): Promise<APIWallet> {
    let prep = prepareCreateTrade(params);
    let new_trade = await makeTrade(
        prep.asset_id,
        prep.ask,
        prep.mode,
        prep.proceeds_address,
        prep.chain);
    await putTrade(new_trade);
    return makeAPIWallet(new_trade)
}

async function createBid(params: any): Promise<APIWallet> {
    let prep = await prepareCreateBid(params);
    let trade = prep.trade;
    let new_bid = await makeBid(trade, prep.proceeds_address);
    await putBid(new_bid);
    return makeAPIWallet(trade, new_bid)
}

async function setRoyalty(params: any): Promise<APIRoyalty> {
    let prep = prepareSetRoyalty(params);
    let new_royalty = makeRoyalty(
        prep.asset_id,
        prep.proceeds_address,
        prep.divisor,
        prep.chain,
        prep.timestamp,
        prep.minter_address,
        prep.minter_signature)
    await putRoyalty(new_royalty);
    return makeAPIRoyalty(new_royalty) 
}

async function readTrade(params: any): Promise<APITrade> {
    let prep = await prepareReadTrade(params);
    let trade = prep.trade;
    let bids = await fetchBids(trade, "FIRST");
    let royalty = await fetchRoyalty(trade.wallet.chain, trade.wallet.asset_ids[1]) //TODO: find better way to get asset_id
    return makeAPITrade(trade, bids, royalty)
}

async function readRoyalty(params: any): Promise<APIRoyalty | APIMessage> {
    let prep = await prepareReadRoyalty(params);
    let royalty = await fetchRoyalty(prep.chain, prep.asset_id);
    if (royalty === undefined) {
        return makeAPIMessage("Royalty does not yet exist for this asset.")
    }
    return makeAPIRoyalty(royalty)
}

export { createTrade, createBid, setRoyalty, readTrade, readRoyalty }