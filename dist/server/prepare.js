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
exports.prepareReadRoyalty = exports.prepareReadTrade = exports.prepareSetRoyalty = exports.prepareCreateBid = exports.prepareCreateTrade = void 0;
const avalanche_1 = require("avalanche");
const database_1 = require("../database/database");
const utilities_1 = require("../shared/utilities");
function prepareCreateTrade(params) {
    //TODO: Verification
    let allows_bidding = Boolean(params.allows_bidding);
    let chain = params.chain;
    return {
        "asset_id": (0, utilities_1.assetIdFromString)(params.asset_id),
        "ask": new avalanche_1.BN(params.ask),
        "mode": allows_bidding ? "AUCTION" : "FIXED",
        "proceeds_address": (0, utilities_1.addressFromString)(chain, params.address),
        "chain": chain
    };
}
exports.prepareCreateTrade = prepareCreateTrade;
function prepareCreateBid(params) {
    return __awaiter(this, void 0, void 0, function* () {
        //TODO
        let trade = yield (0, database_1.fetchTrade)(params.trade_id);
        if (trade === undefined) {
            throw "Create Bid - Trade not found";
        }
        return {
            "trade": trade,
            "proceeds_address": (0, utilities_1.addressFromString)(trade.wallet.chain, params.proceeds_address)
        };
    });
}
exports.prepareCreateBid = prepareCreateBid;
function prepareSetRoyalty(params) {
    //TODO
    let chain = params.chain;
    return {
        "asset_id": (0, utilities_1.assetIdFromString)(params.asset_id),
        "proceeds_address": (0, utilities_1.addressFromString)(chain, params.proceeds_address),
        "divisor": parseInt(params.divisor),
        "chain": chain,
        "timestamp": parseInt(params.timestamp),
        "minter_address": (0, utilities_1.addressFromString)(chain, params.minter_address),
        "minter_signature": (0, utilities_1.signatureFromString)(params.minter_signature),
    };
}
exports.prepareSetRoyalty = prepareSetRoyalty;
function prepareReadTrade(params) {
    return __awaiter(this, void 0, void 0, function* () {
        //TODO
        let trade = yield (0, database_1.fetchTrade)(params.trade_id);
        if (trade === undefined) {
            throw "Read Trade - Trade not found";
        }
        return {
            "trade": trade
        };
    });
}
exports.prepareReadTrade = prepareReadTrade;
function prepareReadRoyalty(params) {
    return __awaiter(this, void 0, void 0, function* () {
        //TODO
        return {
            "asset_id": (0, utilities_1.assetIdFromString)(params.asset_id),
            "chain": params.chain
        };
    });
}
exports.prepareReadRoyalty = prepareReadRoyalty;
