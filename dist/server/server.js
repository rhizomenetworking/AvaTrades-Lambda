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
exports.readRoyalty = exports.readTrade = exports.setRoyalty = exports.createBid = exports.createTrade = void 0;
const database_1 = require("../database/database");
const model_1 = require("../shared/model");
const prepare_1 = require("../server/prepare");
const api_contract_1 = require("../server/api_contract");
function createTrade(params) {
    return __awaiter(this, void 0, void 0, function* () {
        let prep = yield (0, prepare_1.prepareCreateTrade)(params);
        if (typeof prep === "string") {
            return (0, api_contract_1.makeAPIMessage)(prep);
        }
        let new_trade = yield (0, model_1.makeTrade)(prep.asset_id, prep.ask, prep.mode, prep.proceeds_address, prep.chain);
        yield (0, database_1.putTrade)(new_trade);
        return (0, api_contract_1.makeAPIWallet)(new_trade);
    });
}
exports.createTrade = createTrade;
function createBid(params) {
    return __awaiter(this, void 0, void 0, function* () {
        let prep = yield (0, prepare_1.prepareCreateBid)(params);
        if (typeof prep === "string") {
            return (0, api_contract_1.makeAPIMessage)(prep);
        }
        let trade = prep.trade;
        let new_bid = yield (0, model_1.makeBid)(trade, prep.proceeds_address);
        yield (0, database_1.putBid)(new_bid);
        return (0, api_contract_1.makeAPIWallet)(trade, new_bid);
    });
}
exports.createBid = createBid;
function setRoyalty(params) {
    return __awaiter(this, void 0, void 0, function* () {
        let prep = yield (0, prepare_1.prepareSetRoyalty)(params);
        if (typeof prep === "string") {
            return (0, api_contract_1.makeAPIMessage)(prep);
        }
        let new_royalty = (0, model_1.makeRoyalty)(prep.asset_id, prep.proceeds_address, prep.numerator, prep.divisor, prep.chain, prep.timestamp, prep.minter_address, prep.minter_signature);
        yield (0, database_1.putRoyalty)(new_royalty);
        return (0, api_contract_1.makeAPIRoyalty)(new_royalty);
    });
}
exports.setRoyalty = setRoyalty;
function readTrade(params) {
    return __awaiter(this, void 0, void 0, function* () {
        let prep = yield (0, prepare_1.prepareReadTrade)(params);
        if (typeof prep === "string") {
            return (0, api_contract_1.makeAPIMessage)(prep);
        }
        let trade = prep.trade;
        let bids = yield (0, database_1.fetchBids)(trade, "FIRST");
        let royalty = yield (0, database_1.fetchRoyalty)(trade.wallet.chain, trade.wallet.asset_ids[1]); //TODO: find better way to get asset_id
        return (0, api_contract_1.makeAPITrade)(trade, bids, royalty);
    });
}
exports.readTrade = readTrade;
function readRoyalty(params) {
    return __awaiter(this, void 0, void 0, function* () {
        let prep = yield (0, prepare_1.prepareReadRoyalty)(params);
        if (typeof prep === "string") {
            return (0, api_contract_1.makeAPIMessage)(prep);
        }
        let royalty = yield (0, database_1.fetchRoyalty)(prep.chain, prep.asset_id);
        if (royalty === undefined) {
            return (0, api_contract_1.makeAPIMessage)("Royalty does not yet exist for this asset.");
        }
        return (0, api_contract_1.makeAPIRoyalty)(royalty);
    });
}
exports.readRoyalty = readRoyalty;
