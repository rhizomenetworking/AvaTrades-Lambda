/*
OUTCOME: Pending Trade
1) Pending Auction whoose wallet is not expired

OUTCOME: Locked Trade
1) Pending Auction only lacking NFT       
2) Pending Auction only lacking service fee
3) Pending Auction lacking both NFT and service fee
4) Pending Auction with service fee and NFT, but too many UTXOs

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
3) Open Fixed has expired with exactly one bid above ask price and royalty

TRADES
0) Fresh Pending Auction
1) Pending Auction only lacking NFT
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

import { Avalanche, BN, Buffer, BinTools } from "avalanche";
import { runMonitor } from "./monitor"
import { prepareCreateTrade, prepareReadTrade } from "./prepare";
import { createTrade, readTrade } from "./service";
import { deleteTrade } from "./database";
import { TxConstruction, makeTxConstruction, addInput, addOutput, addNFTTransferOp, issue, addInputs } from "./tx_construction";
import { TEST_SUPPLIER_PRIVATE_KEY } from "./secrets";
import { TEST_SUPPLIER_ADDRESS, TEST_SINK_ADDRESSES, FUJI_NETWORK, FUJI_AVAX_ID, TEST_NFT_ID, TEST_FT_ID } from "./constants";
import { getBalance } from "./blockchain";
import { addressFromString, getAvaxID, stringFromAddress } from "./model";

const bintools = BinTools.getInstance();


export async function runTest() {
    let context = await setup();
    await runMonitor();
    context = await check(context);
    return {
        "statusCode": 200,
        "body": createReport(context)
    }
}

async function setup(): Promise<Context> {
    let context = await createContext();
    context = await addTrade0(context);
    //context = await addTrade1(context);
    return context
}

async function check(context: Context): Promise<Context> {
    context = await removeTrade0(context);
    return context
}

async function tmp() {
    let context = await createContext();
    await addTrade1(context);
}
//tmp()















interface Context {
    nft_asset_id: string;
    ft_asset_id: string;
    trade_ids: string[];
    txc: TxConstruction;
    result: Boolean[];
}

async function createContext(): Promise<Context> {
    return {
        "ft_asset_id": TEST_FT_ID, //TODO
        "nft_asset_id": TEST_NFT_ID, //TODO
        "trade_ids": [],
        "txc": makeTxConstruction("Fuji-x", "Ava Trades Test"),
        "result": [false, false]
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
        "address": TEST_SINK_ADDRESSES[0],
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
        await deleteTrade(trade_1.trade_id)
        context.result[0] = true;
    } 
    return context
}

async function addTrade1(context: Context): Promise<Context> {
    let key = FUJI_NETWORK.XChain().keyChain().importKey(TEST_SUPPLIER_PRIVATE_KEY);
    FUJI_NETWORK.XChain().keyChain().addKey(key)
    let txc = context.txc;
    let supplier = addressFromString("Fuji-x", TEST_SUPPLIER_ADDRESS);
    let utxo_response = await FUJI_NETWORK.XChain().getUTXOs(stringFromAddress("Fuji-x", supplier));
    let utxos = utxo_response.utxos.getAllUTXOs();
    for (let u of utxos) {
        if (u.getAssetID().equals(bintools.cb58Decode(FUJI_AVAX_ID))) {
            txc = addInput(txc, u);
        }
    }
    let avax_id = getAvaxID("Fuji-x");
    let balance_after_fee = getBalance(utxos, avax_id).sub(new BN(1000000))
    
    let sink = addressFromString("Fuji-x", TEST_SINK_ADDRESSES[0]);
    txc = addOutput(txc, supplier, avax_id, balance_after_fee)
    txc = addNFTTransferOp(txc, utxos[200], sink);
    let tx_id = await issue(txc);
    console.log(tx_id);


    return context
}



