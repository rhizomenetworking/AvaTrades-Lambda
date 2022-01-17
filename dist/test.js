"use strict";
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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runTest = void 0;
const prepare_1 = require("./prepare");
const service_1 = require("./service");
const database_1 = require("./database");
function runTest() {
    return __awaiter(this, void 0, void 0, function* () {
        let context = yield setup();
        //await runMonitor();
        context = yield check(context);
        return {
            "statusCode": 200,
            "body": createReport(context)
        };
    });
}
exports.runTest = runTest;
function setup() {
    return __awaiter(this, void 0, void 0, function* () {
        let context = yield createContext();
        context = yield addTrade0(context);
        return context;
    });
}
function check(context) {
    return __awaiter(this, void 0, void 0, function* () {
        context = yield removeTrade0(context);
        return context;
    });
}
function createContext() {
    return __awaiter(this, void 0, void 0, function* () {
        return {
            "ft_asset_id": "TODO-ft_asset_id",
            "nft_asset_id": "TODO-nft_asset_id",
            "trade_ids": [],
            "result": [false]
        };
    });
}
function createReport(context) {
    let message = "Test Report\n\n";
    for (let i = 0; i < 1; i++) {
        let result_i = context.result[i] ? "PASSED" : "FAILED";
        message += "Test " + i.toString() + ": " + result_i + "\n";
    }
    return message;
}
function addTrade0(context) {
    return __awaiter(this, void 0, void 0, function* () {
        let params = {
            "asset_id": context.nft_asset_id,
            "ask": "10000000000",
            "allows_bidding": "true",
            "address": "TODO-Trade1ProceedsAddress",
            "chain": "Fuji-x"
        };
        let prep = (0, prepare_1.prepareCreateTrade)(params);
        let response = yield (0, service_1.createTrade)(prep);
        context.trade_ids.push(response.trade_id);
        return context;
    });
}
function removeTrade0(context) {
    return __awaiter(this, void 0, void 0, function* () {
        let params = {
            "trade_id": context.trade_ids[0]
        };
        let prep = yield (0, prepare_1.prepareReadTrade)(params);
        let trade_1 = yield (0, service_1.readTrade)(prep);
        if (trade_1.status === "PENDING") {
            yield (0, database_1._deleteTrade)(trade_1.trade_id);
            context.result[0] = true;
        }
        return context;
    });
}
