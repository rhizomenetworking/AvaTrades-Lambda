"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeAPIMessage = exports.makeAPIRoyalty = exports.makeAPIWallet = exports.makeAPITrade = void 0;
function makeAPIWallet(trade, bid) {
    let wallet = (bid === undefined) ? trade.wallet : bid.wallet;
    return {
        "trade_id": trade.id,
        "address": wallet.address,
        "asset_ids": wallet.asset_ids,
        "expiration": wallet.expiration.toString(),
        "chain": wallet.chain,
        "owner": trade.proceeds_address
    };
}
exports.makeAPIWallet = makeAPIWallet;
function makeAPIRoyalty(royalty) {
    return {
        "chain": royalty.chain,
        "asset_id": royalty.asset_id,
        "divisor": royalty.divisor.toString(),
        "owner": royalty.proceeds_address
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