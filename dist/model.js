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
exports.itemAsRoyalty = exports.itemAsBid = exports.itemAsTrade = exports.royaltyAsItem = exports.bidAsItem = exports.tradeAsItem = exports.makeRoyalty = exports.makeBid = exports.makeTrade = void 0;
const avalanche_1 = require("avalanche");
const avm_1 = require("avalanche/dist/apis/avm");
const uuid_1 = require("uuid");
const constants_1 = require("./constants");
const common_1 = require("./common");
function makeTrade(asset_id, ask, mode, proceeds_address, chain) {
    return __awaiter(this, void 0, void 0, function* () {
        let now = new Date().getTime();
        let two_days_from_now = now + 172800;
        let week_from_now = now + 604800;
        return {
            "id": (0, uuid_1.v4)(),
            "ask": ask,
            "mode": mode,
            "proceeds_address": proceeds_address,
            "wallet": yield makeWallet(chain, constants_1.SERVICE_FEE, asset_id),
            "deadline": (mode === "AUCTION") ? two_days_from_now : week_from_now,
            "status": "PENDING",
            "receipt": []
        };
    });
}
exports.makeTrade = makeTrade;
function tradeAsItem(trade) {
    let receipt = [];
    for (let r in trade.receipt) {
        let item = { "S": r };
        receipt.push(item);
    }
    return {
        "pk": { "S": "TRADE" },
        "sk": { "S": trade.id },
        "properties": {
            "M": {
                "id": { "S": trade.id },
                "ask": { "S": trade.ask.toJSON() },
                "mode": { "S": trade.mode },
                "proceeds_address": { "S": (0, common_1.stringFromAddress)(trade.wallet.chain, trade.proceeds_address) },
                "wallet": { "M": walletAsItem(trade.wallet) },
                "deadline": { "S": trade.deadline.toString() },
                "status": { "S": trade.status },
                "receipt": { "L": receipt }
            }
        }
    };
}
exports.tradeAsItem = tradeAsItem;
function itemAsTrade(item) {
    let properties = item.properties["M"];
    let ask = new avalanche_1.BN(properties.ask["S"], 16);
    let receipt = [];
    for (let receipt_item of properties.receipt["L"]) {
        receipt.push(receipt_item["S"]);
    }
    let wallet = itemAsWallet(properties.wallet["M"]);
    let proceeds_address = (0, common_1.addressFromString)(wallet.chain, properties.proceeds_address["S"]);
    return {
        "id": properties.id["S"],
        "ask": ask,
        "mode": properties.mode["S"],
        "proceeds_address": proceeds_address,
        "wallet": wallet,
        "deadline": parseInt(properties.deadline["S"]),
        "status": properties.status["S"],
        "receipt": receipt
    };
}
exports.itemAsTrade = itemAsTrade;
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
function bidAsItem(bid) {
    let sk = (0, common_1.stringFromAddress)(bid.wallet.chain, bid.wallet.address);
    let proceeds_address = (0, common_1.stringFromAddress)(bid.wallet.chain, bid.proceeds_address);
    return {
        "pk": { "S": bid.trade_id },
        "sk": { "S": sk },
        "properties": {
            "M": {
                "trade_id": { "S": bid.trade_id },
                "proceeds_address": { "S": proceeds_address },
                "wallet": { "M": walletAsItem(bid.wallet) }
            }
        }
    };
}
exports.bidAsItem = bidAsItem;
function itemAsBid(item) {
    let properties = item.properties["M"];
    let wallet = itemAsWallet(properties.wallet["M"]);
    let proceeds_address = (0, common_1.addressFromString)(wallet.chain, properties.proceeds_address["S"]);
    return {
        "trade_id": properties.trade_id["S"],
        "proceeds_address": proceeds_address,
        "wallet": wallet
    };
}
exports.itemAsBid = itemAsBid;
function makeRoyalty(asset_id, proceeds_address, divisor, chain, timestamp, minter_address, minter_signature) {
    return {
        "asset_id": asset_id,
        "proceeds_address": proceeds_address,
        "divisor": divisor,
        "chain": chain,
        "timestamp": timestamp,
        "minter_address": minter_address,
        "minter_signature": minter_signature
    };
}
exports.makeRoyalty = makeRoyalty;
function royaltyAsItem(royalty) {
    let asset_id_string = (0, common_1.stringFromAssetID)(royalty.asset_id);
    let minter_signature_string = (0, common_1.stringFromSignature)(royalty.minter_signature);
    return {
        "pk": { "S": royalty.chain },
        "sk": { "S": asset_id_string },
        "properties": {
            "M": {
                "asset_id": { "S": asset_id_string },
                "proceeds_address": { "S": (0, common_1.stringFromAddress)(royalty.chain, royalty.proceeds_address) },
                "divisor": { "S": royalty.divisor.toString() },
                "chain": { "S": royalty.chain },
                "timestamp": { "S": royalty.timestamp.toString() },
                "minter_address": { "S": (0, common_1.stringFromAddress)(royalty.chain, royalty.minter_address) },
                "minter_signature": { "S": minter_signature_string }
            }
        }
    };
}
exports.royaltyAsItem = royaltyAsItem;
function itemAsRoyalty(item) {
    let properties = item.properties["M"];
    let asset_id = (0, common_1.assetIdFromString)(properties.asset_id["S"]);
    let chain = properties.chain["S"];
    let proceeds_address = (0, common_1.addressFromString)(chain, properties.proceeds_address["S"]);
    let minter_address = (0, common_1.addressFromString)(chain, properties.minter_address["S"]);
    let minter_signature = (0, common_1.signatureFromString)(properties.minter_signature["S"]);
    return {
        "asset_id": asset_id,
        "proceeds_address": proceeds_address,
        "divisor": parseInt(properties.divisor["S"]),
        "chain": chain,
        "timestamp": parseInt(properties.timestamp["S"]),
        "minter_address": minter_address,
        "minter_signature": minter_signature
    };
}
exports.itemAsRoyalty = itemAsRoyalty;
function makeWallet(chain, avax_requirement, asset_id) {
    return __awaiter(this, void 0, void 0, function* () {
        let now = new Date().getTime();
        let half_hour_from_now = now + 1800000;
        let avax_id = yield (0, common_1.getAvaxID)(chain);
        let asset_ids = [avax_id];
        if (asset_id !== undefined) {
            asset_ids.push(asset_id);
        }
        let key_pair = (0, common_1.makeKeyPair)(chain);
        let address = key_pair.getAddress();
        return {
            "chain": chain,
            "asset_ids": asset_ids,
            "avax_requirement": avax_requirement,
            "expiration": half_hour_from_now,
            "address": address,
            "private_key": key_pair,
            "utxos": [],
            "status": "OPEN"
        };
    });
}
function walletAsItem(wallet) {
    let utxos = [];
    for (let utxo of wallet.utxos) {
        let item = { "S": utxo.toString() };
        utxos.push(item);
    }
    let asset_ids = [];
    for (let id of wallet.asset_ids) {
        let item = { "S": (0, common_1.stringFromAssetID)(id) };
        asset_ids.push(item);
    }
    return {
        "chain": { "S": wallet.chain },
        "asset_ids": { "L": asset_ids },
        "avax_requirement": { "S": wallet.avax_requirement.toJSON() },
        "expiration": { "S": wallet.expiration.toString() },
        "address": { "S": (0, common_1.stringFromAddress)(wallet.chain, wallet.address) },
        "private_key": { "S": wallet.private_key.getPrivateKeyString() },
        "utxos": { "L": utxos },
        "status": { "S": wallet.status }
    };
}
function itemAsWallet(obj) {
    let utxos = [];
    for (let item of obj.utxos["L"]) {
        let utxo = new avm_1.UTXO();
        utxo.fromString(item["S"]);
        utxos.push(utxo);
    }
    let asset_ids = [];
    for (let item of obj.asset_ids["L"]) {
        let asset_id = (0, common_1.assetIdFromString)(item["S"]);
        asset_ids.push(asset_id);
    }
    let avax_requirement = new avalanche_1.BN(obj.avax_requirement["S"], 16);
    let chain = obj.chain["S"];
    let key_pair = (0, common_1.makeKeyPair)(chain, obj.private_key["S"]);
    return {
        "chain": chain,
        "asset_ids": asset_ids,
        "avax_requirement": avax_requirement,
        "expiration": parseInt(obj.expiration["S"]),
        "address": (0, common_1.addressFromString)(chain, obj.address["S"]),
        "private_key": key_pair,
        "utxos": utxos,
        "status": obj.status["S"]
    };
}
