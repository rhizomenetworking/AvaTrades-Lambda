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
exports.makeRoyalty = exports.makeBid = exports.makeTrade = void 0;
const avalanche_1 = require("avalanche");
const uuid_1 = require("uuid");
const constants_1 = require("./constants");
const utilities_1 = require("./utilities");
function makeTrade(asset_id, ask, mode, proceeds_address, chain) {
    return __awaiter(this, void 0, void 0, function* () {
        let now = new Date().getTime();
        let auction_deadline = now + constants_1.AUCTION_DURATION;
        let fixed_deadline = now + constants_1.FIXED_DURATION;
        return {
            "id": (0, uuid_1.v4)(),
            "ask": ask,
            "mode": mode,
            "proceeds_address": proceeds_address,
            "wallet": yield makeWallet(chain, constants_1.SERVICE_FEE, asset_id),
            "deadline": (mode === "AUCTION") ? auction_deadline : fixed_deadline,
            "status": "PENDING",
            "receipt": []
        };
    });
}
exports.makeTrade = makeTrade;
function makeBid(trade, proceeds_address) {
    return __awaiter(this, void 0, void 0, function* () {
        let avax_requirement = trade.ask.divRound(new avalanche_1.BN(10));
        return {
            "trade_id": trade.id,
            "proceeds_address": proceeds_address,
            "wallet": yield makeWallet(trade.wallet.chain, avax_requirement)
        };
    });
}
exports.makeBid = makeBid;
function makeRoyalty(asset_id, proceeds_address, numerator, divisor, chain, timestamp, minter_address, minter_signature) {
    return {
        "asset_id": asset_id,
        "proceeds_address": proceeds_address,
        "numerator": numerator,
        "divisor": divisor,
        "chain": chain,
        "timestamp": timestamp,
        "minter_address": minter_address,
        "minter_signature": minter_signature
    };
}
exports.makeRoyalty = makeRoyalty;
function makeWallet(chain, avax_requirement, asset_id) {
    return __awaiter(this, void 0, void 0, function* () {
        let now = new Date().getTime();
        let expiration = now + constants_1.WALLET_DURATION;
        let avax_id = yield (0, utilities_1.getAvaxID)(chain);
        let asset_ids = [avax_id];
        if (asset_id !== undefined) {
            asset_ids.push(asset_id);
        }
        let key_pair = (0, utilities_1.makeKeyPair)(chain);
        let address = key_pair.getAddress();
        return {
            "chain": chain,
            "asset_ids": asset_ids,
            "avax_requirement": avax_requirement,
            "expiration": expiration,
            "address": address,
            "private_key": key_pair,
            "utxos": [],
            "status": "OPEN"
        };
    });
}
