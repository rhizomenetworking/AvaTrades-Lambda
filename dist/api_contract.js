"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeAPIMessage = exports.makeAPIRoyalty = exports.makeAPIWallet = exports.makeAPITrade = void 0;
const model_1 = require("./model");
function makeAPIWallet(trade, bid) {
    let wallet = (bid === undefined) ? trade.wallet : bid.wallet;
    let asset_ids = wallet.asset_ids.map(id => (0, model_1.stringFromAssetID)(id));
    return {
        "trade_id": trade.id,
        "address": (0, model_1.stringFromAddress)(wallet.chain, wallet.address),
        "asset_ids": asset_ids,
        "expiration": wallet.expiration.toString(),
        "chain": wallet.chain,
        "owner": (0, model_1.stringFromAddress)(wallet.chain, trade.proceeds_address)
    };
}
exports.makeAPIWallet = makeAPIWallet;
function makeAPIRoyalty(royalty) {
    return {
        "chain": royalty.chain,
        "asset_id": (0, model_1.stringFromAssetID)(royalty.asset_id),
        "divisor": royalty.divisor.toString(),
        "owner": (0, model_1.stringFromAddress)(royalty.chain, royalty.proceeds_address)
    };
}
exports.makeAPIRoyalty = makeAPIRoyalty;
function makeAPITrade(trade, bids, royalty) {
    return {
        "trade_id": trade.id,
        "url": "https://avatrades.io/" + trade.id,
        "status": trade.status
    };
}
exports.makeAPITrade = makeAPITrade;
function makeAPIMessage(message) {
    return {
        "message": message
    };
}
exports.makeAPIMessage = makeAPIMessage;
