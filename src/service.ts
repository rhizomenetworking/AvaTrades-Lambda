import { fetchRoyalty, putTrade, putBid, putRoyalty, fetchBids } from "./database"
import { makeTrade, makeBid, makeRoyalty } from "./model"
import { 
    PreparedCreateBid, PreparedCreateTrade, PreparedReadRoyalty, PreparedReadTrade, PreparedSetRoyalty,
    prepareCreateBid, prepareCreateTrade, prepareReadRoyalty, prepareReadTrade, prepareSetRoyalty 
} from "./prepare";
import { 
    APITrade, APIWallet, APIRoyalty, 
    makeAPITrade, makeAPIWallet, makeAPIRoyalty, makeAPIMessage, APIMessage
} from "./api_contract"


async function serve(event: any): Promise<any> {
    let params = event.queryStringParameters;
    let resource = event.resource;
    let method = event.httpMethod;

    let status_code: number = 200;
    let response: any;
    if (resource === "/avatrades/trades" && method === "GET") {
        let prep = await prepareReadTrade(params);
        response = readTrade(prep);

    } else if (resource === "/avatrades/trades" && method === "POST") {
        let prep = prepareCreateTrade(params);
        response = createTrade(prep);

    } else if (resource === "/avatrades/bids" && method === "POST") {
        let prep = await prepareCreateBid(params);
        response = createBid(prep);

    } else if (resource === "/avatrades/royalties" && method === "GET") {
        let prep = await prepareReadRoyalty(params);
        response = readRoyalty(prep);

    } else if (resource === "/avatrades/royalties" && method === "PUT") {
        let prep = prepareSetRoyalty(params);
        response = setRoyalty(prep);

    } else {
        status_code = 404;
        response = makeAPIMessage("Resource not found");
    }

    return {
        'statusCode': status_code,
        'body': response
    }
}

async function createTrade(prep: PreparedCreateTrade): Promise<APIWallet> {
    let new_trade = makeTrade(
        prep.asset_id,
        prep.ask,
        prep.mode,
        prep.proceeds_address,
        prep.chain);
    await putTrade(new_trade);
    return makeAPIWallet(new_trade)
}

async function createBid(prep: PreparedCreateBid): Promise<APIWallet> {
    let trade = prep.trade;
    let new_bid = makeBid(trade, prep.proceeds_address);
    await putBid(new_bid);
    return makeAPIWallet(trade, new_bid)
}

async function setRoyalty(prep: PreparedSetRoyalty): Promise<APIRoyalty> {
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

async function readTrade(prep: PreparedReadTrade): Promise<APITrade> {
    let trade = prep.trade;
    let bids = await fetchBids(trade, "FIRST");
    let royalty = await fetchRoyalty(trade.wallet.chain, trade.wallet.asset_ids[1]) //TODO: find better way to get asset_id
    return makeAPITrade(trade, bids, royalty)
}

async function readRoyalty(prep: PreparedReadRoyalty): Promise<APIRoyalty | APIMessage> {
    let royalty = await fetchRoyalty(prep.chain, prep.asset_id);
    if (royalty === undefined) {
        return makeAPIMessage("Royalty does not yet exist for this asset.")
    }
    return makeAPIRoyalty(royalty)
}

export { serve, createTrade, createBid, setRoyalty, readTrade, readRoyalty }