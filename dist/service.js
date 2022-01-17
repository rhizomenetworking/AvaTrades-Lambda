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
exports.readRoyalty = exports.readTrade = exports.setRoyalty = exports.createBid = exports.createTrade = exports.serve = void 0;
const database_1 = require("./database");
const model_1 = require("./model");
const prepare_1 = require("./prepare");
const api_contract_1 = require("./api_contract");
function serve(event) {
    return __awaiter(this, void 0, void 0, function* () {
        let params = event.queryStringParameters;
        let resource = event.resource;
        let method = event.httpMethod;
        let status_code = 200;
        let response;
        if (resource === "/avatrades/trades" && method === "GET") {
            response = readTrade(params);
        }
        else if (resource === "/avatrades/trades" && method === "POST") {
            let prep = (0, prepare_1.prepareCreateTrade)(params);
            response = createTrade(prep);
        }
        else if (resource === "/avatrades/bids" && method === "POST") {
            let prep = yield (0, prepare_1.prepareCreateBid)(params);
            response = createBid(prep);
        }
        else if (resource === "/avatrades/royalties" && method === "GET") {
            let prep = yield (0, prepare_1.prepareReadRoyalty)(params);
            response = readRoyalty(prep);
        }
        else if (resource === "/avatrades/royalties" && method === "PUT") {
            let prep = (0, prepare_1.prepareSetRoyalty)(params);
            response = setRoyalty(prep);
        }
        else {
            status_code = 404;
            response = (0, api_contract_1.makeAPIMessage)("Resource not found");
        }
        return {
            'statusCode': status_code,
            'body': response
        };
    });
}
exports.serve = serve;
function createTrade(prep) {
    return __awaiter(this, void 0, void 0, function* () {
        let new_trade = (0, model_1.makeTrade)(prep.asset_id, prep.ask, prep.mode, prep.proceeds_address, prep.chain);
        yield (0, database_1.putTrade)(new_trade);
        return (0, api_contract_1.makeAPIWallet)(new_trade);
    });
}
exports.createTrade = createTrade;
function createBid(prep) {
    return __awaiter(this, void 0, void 0, function* () {
        let trade = prep.trade;
        let new_bid = (0, model_1.makeBid)(trade, prep.proceeds_address);
        yield (0, database_1.putBid)(new_bid);
        return (0, api_contract_1.makeAPIWallet)(trade, new_bid);
    });
}
exports.createBid = createBid;
function setRoyalty(prep) {
    return __awaiter(this, void 0, void 0, function* () {
        let new_royalty = (0, model_1.makeRoyalty)(prep.asset_id, prep.proceeds_address, prep.divisor, prep.chain, prep.timestamp, prep.minter_address, prep.minter_signature);
        yield (0, database_1.putRoyalty)(new_royalty);
        return (0, api_contract_1.makeAPIRoyalty)(new_royalty);
    });
}
exports.setRoyalty = setRoyalty;
function readTrade(prep) {
    return __awaiter(this, void 0, void 0, function* () {
        let trade = prep.trade;
        let bids = yield (0, database_1.fetchBids)(trade, "FIRST");
        let royalty = yield (0, database_1.fetchRoyalty)(trade.wallet.chain, trade.wallet.asset_ids[1]); //TODO: find better way to get asset_id
        return (0, api_contract_1.makeAPITrade)(trade, bids, royalty);
    });
}
exports.readTrade = readTrade;
function readRoyalty(prep) {
    return __awaiter(this, void 0, void 0, function* () {
        let royalty = yield (0, database_1.fetchRoyalty)(prep.chain, prep.asset_id);
        if (royalty === undefined) {
            return (0, api_contract_1.makeAPIMessage)("Royalty does not yet exist for this asset.");
        }
        return (0, api_contract_1.makeAPIRoyalty)(royalty);
    });
}
exports.readRoyalty = readRoyalty;
