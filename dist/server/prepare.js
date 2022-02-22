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
const constants_1 = require("../shared/constants");
const utilities_1 = require("../shared/utilities");
function prepareCreateTrade(params) {
    return __awaiter(this, void 0, void 0, function* () {
        let ask = paramAsBN(params.ask);
        let MIN = new avalanche_1.BN(1000);
        if (ask === undefined || ask.lt(MIN)) {
            return "Invalid ask";
        }
        let chain = paramAsChain(params.chain);
        if (chain === undefined) {
            return "Invalid chain";
        }
        let asset_id = yield paramAsAssetID(params.listed_asset, chain);
        if (asset_id === undefined) {
            return "Invalid listed_asset";
        }
        let mode = paramAsTradeMode(params.mode);
        if (mode === undefined) {
            return "Invalid mode";
        }
        let proceeds_address = paramAsAddress(params.seller_address, chain);
        if (proceeds_address === undefined) {
            return "Invalid seller_address";
        }
        return {
            "asset_id": asset_id,
            "ask": ask,
            "mode": mode,
            "proceeds_address": proceeds_address,
            "chain": chain
        };
    });
}
exports.prepareCreateTrade = prepareCreateTrade;
function prepareCreateBid(params) {
    return __awaiter(this, void 0, void 0, function* () {
        let trade = yield paramAsTrade(params.trade_id);
        if (trade === undefined) {
            return "Invalid trade_id";
        }
        let proceeds_address = paramAsAddress(params.bidder_address, trade.wallet.chain);
        if (proceeds_address === undefined) {
            return "Invalid bidder_address";
        }
        let now = new Date().getTime();
        let buffer = 60000;
        let time_needed = constants_1.WALLET_DURATION + buffer;
        if (trade.deadline < (now + time_needed)) {
            return "This trade is no longer accepting new bids";
        }
        return {
            "trade": trade,
            "proceeds_address": proceeds_address
        };
    });
}
exports.prepareCreateBid = prepareCreateBid;
function prepareReadTrade(params) {
    return __awaiter(this, void 0, void 0, function* () {
        let trade = yield paramAsTrade(params.trade_id);
        if (trade === undefined) {
            return "Invalid trade_id";
        }
        return {
            "trade": trade
        };
    });
}
exports.prepareReadTrade = prepareReadTrade;
function prepareReadRoyalty(params) {
    return __awaiter(this, void 0, void 0, function* () {
        let chain = paramAsChain(params.chain);
        if (chain === undefined) {
            return "Invalid chain";
        }
        let asset_id = yield paramAsAssetID(params.asset_id, chain);
        if (asset_id === undefined) {
            return "Invalid asset_id";
        }
        return {
            "asset_id": asset_id,
            "chain": chain
        };
    });
}
exports.prepareReadRoyalty = prepareReadRoyalty;
function prepareSetRoyalty(params) {
    return __awaiter(this, void 0, void 0, function* () {
        let chain = paramAsChain(params.chain);
        if (chain === undefined) {
            return "Invalid chain";
        }
        let asset_id = yield paramAsAssetID(params.asset_id, chain);
        if (asset_id === undefined) {
            return "Invalid asset_id";
        }
        let MIN = new avalanche_1.BN(0);
        let MAX = new avalanche_1.BN(10000);
        let size = paramAsBN(params.royalty);
        if (MIN.gte(size) || MAX.lte(size)) {
            return "Invalid royalty";
        }
        let timestamp = paramAsNumber(params.timestamp);
        if (timestamp === undefined) {
            return "Invalid timestamp";
        }
        let now = new Date().getTime();
        let diff = Math.abs(now - timestamp);
        if (diff > 180000) {
            return "Provided timestamp is too distant from current time";
        }
        let minter_address = yield paramAsMinterAddress(params.proceeds_address, chain, asset_id);
        if (minter_address === undefined) {
            return "Invalid proceeds_address";
        }
        let minter_signature = paramAsSignature(params.signed_timestamp);
        if (minter_signature === undefined) {
            return "Invalid signed_timestamp";
        }
        let message = avalanche_1.Buffer.from(timestamp.toString());
        let actual_signer = (0, utilities_1.makeKeyPair)(chain).recover(message, minter_signature);
        if (!actual_signer.equals(minter_address)) {
            "signed_timestamp is not signed by proceeds_address";
        }
        return {
            "asset_id": asset_id,
            "proceeds_address": minter_address,
            "numerator": size,
            "divisor": MAX,
            "chain": chain,
            "timestamp": timestamp,
            "minter_address": minter_address,
            "minter_signature": minter_signature,
        };
    });
}
exports.prepareSetRoyalty = prepareSetRoyalty;
function paramAsChain(param) {
    if (param === "Fuji-X") {
        return "Fuji-x";
    }
    else if (param === "Avalanche-x") {
        return "Avalanche-x";
    }
    return undefined;
}
//TODO
function paramAsAssetID(param, chain) {
    return __awaiter(this, void 0, void 0, function* () { return {}; });
} //TODO verify asset exists on chain
function paramAsAddress(param, chain) { return {}; } //TODO: ensure that it is not one of the profit addresses
function paramAsBN(param) { return {}; } //TODO: first convert to a number
function paramAsTrade(param) {
    return __awaiter(this, void 0, void 0, function* () { return {}; });
}
function paramAsTradeMode(param) { return {}; }
function paramAsNumber(param) { return {}; }
function paramAsSignature(param) { return {}; }
function paramAsMinterAddress(param, chain, asset_id) {
    return __awaiter(this, void 0, void 0, function* () { return {}; });
}
