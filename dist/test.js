"use strict";
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
const avalanche_1 = require("avalanche");
const monitor_1 = require("./monitor");
const prepare_1 = require("./prepare");
const service_1 = require("./service");
const database_1 = require("./database");
const tx_construction_1 = require("./tx_construction");
const secrets_1 = require("./secrets");
const constants_1 = require("./constants");
const blockchain_1 = require("./blockchain");
const model_1 = require("./model");
const bintools = avalanche_1.BinTools.getInstance();
function runTest() {
    return __awaiter(this, void 0, void 0, function* () {
        let context = yield setup();
        yield (0, monitor_1.runMonitor)();
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
        //context = await addTrade1(context);
        return context;
    });
}
function check(context) {
    return __awaiter(this, void 0, void 0, function* () {
        context = yield removeTrade0(context);
        return context;
    });
}
function tmp() {
    return __awaiter(this, void 0, void 0, function* () {
        let context = yield createContext();
        yield addTrade1(context);
    });
}
function createContext() {
    return __awaiter(this, void 0, void 0, function* () {
        return {
            "ft_asset_id": constants_1.TEST_FT_ID,
            "nft_asset_id": constants_1.TEST_NFT_ID,
            "trade_ids": [],
            "txc": (0, tx_construction_1.makeTxConstruction)("Fuji-x", "Ava Trades Test"),
            "result": [false, false]
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
            "address": constants_1.TEST_SINK_ADDRESSES[0],
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
            yield (0, database_1.deleteTrade)(trade_1.trade_id);
            context.result[0] = true;
        }
        return context;
    });
}
function addTrade1(context) {
    return __awaiter(this, void 0, void 0, function* () {
        let key = constants_1.FUJI_NETWORK.XChain().keyChain().importKey(secrets_1.TEST_SUPPLIER_PRIVATE_KEY);
        constants_1.FUJI_NETWORK.XChain().keyChain().addKey(key);
        let txc = context.txc;
        let supplier = (0, model_1.addressFromString)("Fuji-x", constants_1.TEST_SUPPLIER_ADDRESS);
        let utxo_response = yield constants_1.FUJI_NETWORK.XChain().getUTXOs((0, model_1.stringFromAddress)("Fuji-x", supplier));
        let utxos = utxo_response.utxos.getAllUTXOs();
        for (let u of utxos) {
            if (u.getAssetID().equals(bintools.cb58Decode(constants_1.FUJI_AVAX_ID))) {
                txc = (0, tx_construction_1.addInput)(txc, u);
            }
        }
        let avax_id = (0, model_1.getAvaxID)("Fuji-x");
        let balance_after_fee = (0, blockchain_1.getBalance)(utxos, avax_id).sub(new avalanche_1.BN(1000000));
        let sink = (0, model_1.addressFromString)("Fuji-x", constants_1.TEST_SINK_ADDRESSES[0]);
        txc = (0, tx_construction_1.addOutput)(txc, supplier, avax_id, balance_after_fee);
        txc = (0, tx_construction_1.addNFTTransferOp)(txc, utxos[200], sink);
        let tx_id = yield (0, tx_construction_1.issue)(txc);
        console.log(tx_id);
        return context;
    });
}
