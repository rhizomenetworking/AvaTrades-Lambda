"use strict";
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
exports.runMonitor = void 0;
const blockchain_1 = require("./blockchain/blockchain");
const database_1 = require("./database/database");
function updateBids(trade) {
    return __awaiter(this, void 0, void 0, function* () {
        let bids = [];
        let page = "FIRST";
        while (page !== undefined) {
            let [batch, nxt_page] = yield (0, database_1.fetchBids)(trade, page);
            for (let bid of batch) {
                let synced = yield (0, blockchain_1.syncBid)(bid);
                yield (0, database_1.putBid)(synced);
                bids.push(synced);
            }
            page = nxt_page;
        }
        return bids;
    });
}
function updateTrades() {
    return __awaiter(this, void 0, void 0, function* () {
        let page = "FIRST";
        while (page !== undefined) {
            let [batch, nxt_page] = yield (0, database_1.fetchLiveTrades)(page);
            for (let trade of batch) {
                let bids = yield updateBids(trade);
                let royalty = yield (0, database_1.fetchRoyalty)(trade.wallet.chain, trade.wallet.asset_ids[1]); //TODO: find better way to get asset_id
                let synced = yield (0, blockchain_1.syncTrade)(trade, bids, royalty);
                yield (0, database_1.putTrade)(synced);
            }
            page = nxt_page;
        }
    });
}
function runMonitor() {
    return __awaiter(this, void 0, void 0, function* () {
        yield updateTrades();
    });
}
exports.runMonitor = runMonitor;
