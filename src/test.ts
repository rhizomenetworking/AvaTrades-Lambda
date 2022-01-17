/*
OUTCOME: Pending Trade
1) Pending Auction whoose wallet is not expired

OUTCOME: Locked Trade
1) Pending Auction only lacking service fee
2) Pending Auction only lacking NFT
3) Pending Auction only lacking FT
4) Pending Auction lacking both NFT and service fee
5) Pending Auction lacking both FT and service fee
6) Pending Auction with service fee and NFT, but too many UTXOs

OUTCOME: Open Trade
1) Pending Auction has service fee + one NFT
2) Pending Auction has service fee + many NFTs
3) Pending Auction has service fee + one FT
4) Pending Auction has service fee + many FT
5) Open Auction has no bids, but has not expired
6) Open Auction has bids above ask, but has not expired
7) Open Fixed has bids below ask, but has not expired

OUTCOME: Expired Trade
1) Open Auction has expired with zero bids
2) Open Auction has expired with many bids below ask

OUTCOME: Closed Trade
1) Open Auction has expired with many locked, open, and closed bids above ask
2) Open Fixed has expired with exactly one bid at ask price, but seller needs change
3) Open Fixed has expired with exactly one bid above ask price

TRADES
0) Fresh Pending Auction
1) 
2)
3)
4)
5)
6)


FAUCET 
1) At least 10 AVAX

USERS
1-5) 2 AVAX, 5 NFT of group i, 100000 FT 

*/

import { BN } from "avalanche";
import { runMonitor } from "./monitor"
import { prepareCreateTrade, prepareReadTrade } from "./prepare";
import { createTrade, readTrade } from "./service";
import { _deleteTrade } from "./database";


export async function runTest() {
    let context = await setup();
    //await runMonitor();
    context = await check(context);

    return {
        "statusCode": 200,
        "body": createReport(context)
    }
}

async function setup(): Promise<Context> {
    let context = await createContext();
    context = await addTrade0(context);
    return context
}

async function check(context: Context): Promise<Context> {
    context = await removeTrade0(context);
    return context
}
















interface Context {
    nft_asset_id: string;
    ft_asset_id: string;
    trade_ids: string[];
    result: Boolean[];
}

async function createContext(): Promise<Context> {
    return {
        "ft_asset_id": "TODO-ft_asset_id", //TODO
        "nft_asset_id": "TODO-nft_asset_id", //TODO
        "trade_ids": [],
        "result": [false]
    } 
}

function createReport(context: Context): string {
    let message = "Test Report\n\n"
    for (let i = 0; i < 1; i++) {
        let result_i = context.result[i] ? "PASSED" : "FAILED";
        message += "Test " + i.toString() + ": " + result_i + "\n";
    }
    return message
}

async function addTrade0(context: Context): Promise<Context> {
    let params = {
        "asset_id": context.nft_asset_id,
        "ask": "10000000000",
        "allows_bidding": "true",
        "address": "TODO-Trade1ProceedsAddress", //TODO
        "chain": "Fuji-x"
    }
    let prep = prepareCreateTrade(params);
    let response = await createTrade(prep);
    context.trade_ids.push(response.trade_id);
    return context
}

async function removeTrade0(context: Context): Promise<Context> {
    let params = {
        "trade_id": context.trade_ids[0]
    }
    let prep = await prepareReadTrade(params);
    let trade_1 = await readTrade(prep);
    if (trade_1.status === "PENDING") {
        await _deleteTrade(trade_1.trade_id)
        context.result[0] = true;
    } 
    return context
}
 

