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
exports.deleteTrade = exports.putRoyalty = exports.putBid = exports.putTrade = exports.fetchRoyalty = exports.fetchTrade = exports.fetchBids = exports.fetchLiveTrades = void 0;
const constants_1 = require("../shared/constants");
const utilities_1 = require("../shared/utilities");
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const converter_1 = require("./converter");
const DATABASE_NAME = (constants_1.JOB === "TEST") ? constants_1.TEST_DATABASE_NAME : constants_1.LIVE_DATABASE_NAME;
const client = new client_dynamodb_1.DynamoDBClient({ region: "us-east-2" });
function fetchLiveTrades(page) {
    return __awaiter(this, void 0, void 0, function* () {
        let input = {
            "TableName": DATABASE_NAME,
            "KeyConditionExpression": "pk = :trade",
            "ExclusiveStartKey": (page === "FIRST" || page === undefined) ? undefined : page,
            //"FilterExpression": "properties.#S = PENDING or properties.#S = #O", TODO
            "ExpressionAttributeValues": { ":trade": { "S": "TRADE" } },
            //"ExpressionAttributeNames": {"#S": "status", "#O": "OPEN"} TODO
        };
        let command = new client_dynamodb_1.QueryCommand(input);
        let response = yield client.send(command);
        let trades = [];
        if (response.Items !== undefined) {
            for (let item of response.Items) {
                let trade = (0, converter_1.itemAsTrade)(item);
                trades.push(trade);
            }
        }
        let next_page = response.LastEvaluatedKey;
        return [trades, next_page];
    });
}
exports.fetchLiveTrades = fetchLiveTrades;
function fetchBids(trade, page) {
    return __awaiter(this, void 0, void 0, function* () {
        let input = {
            "TableName": DATABASE_NAME,
            "KeyConditionExpression": "pk = :trade_id",
            "ExclusiveStartKey": (page === "FIRST" || page === undefined) ? undefined : page,
            "ExpressionAttributeValues": { ":trade_id": { "S": trade.id } }
        };
        let command = new client_dynamodb_1.QueryCommand(input);
        let response = yield client.send(command);
        let bids = [];
        if (response.Items !== undefined) {
            for (let item of response.Items) {
                let bid = (0, converter_1.itemAsBid)(item);
                bids.push(bid);
            }
        }
        let next_page = response.LastEvaluatedKey;
        return [bids, next_page];
    });
}
exports.fetchBids = fetchBids;
function fetchTrade(trade_id) {
    return __awaiter(this, void 0, void 0, function* () {
        let input = {
            "TableName": DATABASE_NAME,
            "Key": {
                "pk": { "S": "TRADE" },
                "sk": { "S": trade_id }
            }
        };
        let command = new client_dynamodb_1.GetItemCommand(input);
        let response = yield client.send(command);
        let item = response.Item;
        let trade = (item === undefined) ? undefined : (0, converter_1.itemAsTrade)(item);
        return trade;
    });
}
exports.fetchTrade = fetchTrade;
function fetchRoyalty(chain, asset_id) {
    return __awaiter(this, void 0, void 0, function* () {
        let input = {
            "TableName": DATABASE_NAME,
            "Key": {
                "pk": { "S": chain },
                "sk": { "S": (0, utilities_1.stringFromAssetID)(asset_id) }
            }
        };
        let command = new client_dynamodb_1.GetItemCommand(input);
        let response = yield client.send(command);
        let item = response.Item;
        let royalty = (item === undefined) ? undefined : (0, converter_1.itemAsRoyalty)(item);
        return royalty;
    });
}
exports.fetchRoyalty = fetchRoyalty;
function putTrade(trade) {
    return __awaiter(this, void 0, void 0, function* () {
        let input = {
            "TableName": DATABASE_NAME,
            "Item": (0, converter_1.tradeAsItem)(trade)
        };
        let command = new client_dynamodb_1.PutItemCommand(input);
        yield client.send(command);
    });
}
exports.putTrade = putTrade;
function putBid(bid) {
    return __awaiter(this, void 0, void 0, function* () {
        let input = {
            "TableName": DATABASE_NAME,
            "Item": (0, converter_1.bidAsItem)(bid)
        };
        let command = new client_dynamodb_1.PutItemCommand(input);
        yield client.send(command);
    });
}
exports.putBid = putBid;
function putRoyalty(royalty) {
    return __awaiter(this, void 0, void 0, function* () {
        let input = {
            "TableName": DATABASE_NAME,
            "Item": (0, converter_1.royaltyAsItem)(royalty)
        };
        let command = new client_dynamodb_1.PutItemCommand(input);
        yield client.send(command);
    });
}
exports.putRoyalty = putRoyalty;
function deleteTrade(trade_id) {
    return __awaiter(this, void 0, void 0, function* () {
        let input = {
            "TableName": DATABASE_NAME,
            "Key": {
                "pk": { "S": "TRADE" },
                "sk": { "S": trade_id }
            }
        };
        let command = new client_dynamodb_1.DeleteItemCommand(input);
        yield client.send(command);
    });
}
exports.deleteTrade = deleteTrade;
