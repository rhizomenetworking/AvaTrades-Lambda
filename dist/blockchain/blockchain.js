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
exports.fetchUTXOs = exports.getBalance = exports.syncBid = exports.syncTrade = void 0;
const avalanche_1 = require("avalanche");
const utilities_1 = require("../shared/utilities");
const constants_1 = require("../shared/constants");
const tx_construction_1 = require("./tx_construction");
const avm_1 = require("avalanche/dist/apis/avm");
function syncTrade(trade, bids, royalty) {
    return __awaiter(this, void 0, void 0, function* () {
        if (trade.status === "PENDING") {
            trade.wallet = yield syncWallet(trade.wallet);
            if (trade.wallet.status === "CLOSED") {
                trade.status = "OPEN";
            }
            else if (trade.wallet.status === "LOCKED") {
                trade.status = "LOCKED";
            }
        }
        else {
            trade = yield closeTradeIfPossible(trade, bids, royalty);
            trade = yield expireTradeIfPossible(trade, bids);
        }
        return trade;
    });
}
exports.syncTrade = syncTrade;
function syncBid(bid) {
    return __awaiter(this, void 0, void 0, function* () {
        bid.wallet = yield syncWallet(bid.wallet);
        return bid;
    });
}
exports.syncBid = syncBid;
function syncWallet(wallet) {
    return __awaiter(this, void 0, void 0, function* () {
        if (wallet.status !== "OPEN") {
            return wallet;
        }
        let utxos = yield fetchUTXOs(wallet.address, wallet.chain, wallet.asset_ids, wallet.asset_ids.length);
        if (utxos === undefined) {
            wallet.status = "LOCKED";
            return wallet;
        }
        wallet.utxos = utxos;
        return closeWalletIfPossible(wallet);
    });
}
function closeWalletIfPossible(wallet) {
    return __awaiter(this, void 0, void 0, function* () {
        let now = new Date().getTime();
        if (wallet.status !== "OPEN" || now <= wallet.expiration) {
            return wallet;
        }
        let avax_id = yield (0, utilities_1.getAvaxID)(wallet.chain);
        let can_close = true;
        for (let asset_id of wallet.asset_ids) {
            let min_balance = (asset_id.equals(avax_id)) ? wallet.avax_requirement : new avalanche_1.BN(1);
            let balance = getBalance(wallet.utxos, asset_id);
            if (balance.lt(min_balance)) {
                can_close = false;
            }
        }
        wallet.status = can_close ? "CLOSED" : "LOCKED";
        return wallet;
    });
}
function fetchUTXOs(address, chain, asset_ids, limit = 1024) {
    return __awaiter(this, void 0, void 0, function* () {
        let xchain = (0, utilities_1.getNetwork)(chain).XChain();
        let address_string = (0, utilities_1.stringFromAddress)(chain, address);
        let response = yield xchain.getUTXOs(address_string);
        let utxos = response.utxos.getAllUTXOs();
        if (utxos.length > limit) {
            return undefined;
        }
        let result = [];
        for (let utxo of utxos) {
            if (isAcceptableUTXO(utxo, asset_ids)) {
                result.push(utxo);
            }
        }
        return result;
    });
}
exports.fetchUTXOs = fetchUTXOs;
function isAcceptableUTXO(utxo, asset_ids) {
    let is_acceptable_asset = false;
    let no_locktime = false;
    let single_threshold = false;
    let single_owner = false;
    let asset_id = utxo.getAssetID();
    for (let acceptable of asset_ids) {
        if (asset_id.equals(acceptable)) {
            is_acceptable_asset = true;
        }
    }
    let output = utxo.getOutput();
    if (output instanceof avm_1.SECPTransferOutput) {
        single_owner = output.getAddresses().length === 1;
    }
    else if (output instanceof avm_1.NFTTransferOutput) {
        single_owner = output.getAddresses().length === 1;
    }
    no_locktime = output.getLocktime().isZero();
    single_threshold = output.getThreshold() === 1;
    return is_acceptable_asset && no_locktime && single_threshold && single_owner;
}
function closeTradeIfPossible(trade, bids, royalty) {
    return __awaiter(this, void 0, void 0, function* () {
        let [highest_bidder, losing_bidders] = yield makeBidders(trade, bids);
        if (trade.status !== "OPEN" || highest_bidder === undefined) {
            return trade;
        }
        let now = new Date().getTime();
        let no_time_remaining = trade.deadline < now;
        let avax_id = yield (0, utilities_1.getAvaxID)(trade.wallet.chain);
        let can_sell = getBalance(highest_bidder.utxos, avax_id).gte(trade.ask);
        let can_close_auction = trade.mode === "AUCTION" && can_sell && no_time_remaining;
        let can_close_fixed = trade.mode === "FIXED" && can_sell;
        if (can_close_auction || can_close_fixed) {
            let memo = "AvaTrades - https://avatrades.io/" + trade.id;
            let txc = (0, tx_construction_1.makeTxConstruction)(trade.wallet.chain, memo);
            txc = yield exchange(txc, trade, highest_bidder, royalty);
            txc = yield returnAll(txc, losing_bidders);
            let receipt = yield (0, tx_construction_1.issue)(txc);
            trade.receipt.push(receipt);
            trade.status = "CLOSED";
        }
        return trade;
    });
}
function expireTradeIfPossible(trade, bids) {
    return __awaiter(this, void 0, void 0, function* () {
        let now = new Date().getTime();
        let time_remaining = now <= trade.deadline;
        if (trade.status !== "OPEN" || time_remaining) {
            return trade;
        }
        let [highest_bidder, losing_bidders] = yield makeBidders(trade, bids);
        let all_bidders;
        let is_expired;
        if (highest_bidder === undefined) {
            all_bidders = losing_bidders;
            is_expired = true;
        }
        else {
            let avax_id = yield (0, utilities_1.getAvaxID)(trade.wallet.chain);
            all_bidders = losing_bidders.concat([highest_bidder]);
            is_expired = getBalance(highest_bidder.utxos, avax_id).lt(trade.ask);
        }
        if (is_expired) {
            let memo = "AvaTrades (Expired) - https://avatrades.io/" + trade.id;
            let txc = (0, tx_construction_1.makeTxConstruction)(trade.wallet.chain, memo);
            txc = yield returnAll(txc, all_bidders, trade);
            let receipt = yield (0, tx_construction_1.issue)(txc);
            trade.receipt.push(receipt);
            trade.status = "EXPIRED";
        }
        return trade;
    });
}
function makeBidder(address) {
    return {
        "address": address,
        "utxos": []
    };
}
function makeBidders(trade, bids) {
    return __awaiter(this, void 0, void 0, function* () {
        let chain = trade.wallet.chain;
        let closed_bids = bids.filter(bid => bid.wallet.status === "CLOSED");
        let bidders = new Map();
        for (let bid of closed_bids) {
            if (bid.wallet.chain === chain) {
                let key = (0, utilities_1.stringFromAddress)(chain, bid.proceeds_address);
                let value = bidders.get(key);
                if (value === undefined) {
                    let bidder = makeBidder(bid.proceeds_address);
                    bidder.utxos = bid.wallet.utxos;
                    bidders.set(key, bidder);
                }
                else {
                    value.utxos = value.utxos.concat(bid.wallet.utxos);
                    bidders.set(key, value);
                }
            }
        }
        let highest_bidder = undefined;
        let losing_bidders = [];
        let avax_id = yield (0, utilities_1.getAvaxID)(trade.wallet.chain);
        for (let [_, bidder] of bidders) {
            if (highest_bidder === undefined) {
                highest_bidder = bidder;
            }
            else {
                let bid_price = getBalance(bidder.utxos, avax_id);
                let high_price = getBalance(highest_bidder.utxos, avax_id);
                if (bid_price.gt(high_price)) {
                    losing_bidders.push(highest_bidder);
                    highest_bidder = bidder;
                }
            }
        }
        return [highest_bidder, losing_bidders];
    });
}
function returnAll(txc, bidders, trade) {
    return __awaiter(this, void 0, void 0, function* () {
        let avax_id = yield (0, utilities_1.getAvaxID)(txc.chain);
        for (let bidder of bidders) {
            let avax_balance = getBalance(bidder.utxos, avax_id);
            txc = (0, tx_construction_1.addOutput)(txc, bidder.address, avax_id, avax_balance);
            txc = (0, tx_construction_1.addInputs)(txc, bidder.utxos);
        }
        if (trade !== undefined) {
            txc = yield exchange(txc, trade);
        }
        return txc;
    });
}
function exchange(txc, trade, bidder, royalty) {
    return __awaiter(this, void 0, void 0, function* () {
        let avax_id = yield (0, utilities_1.getAvaxID)(txc.chain);
        let ZERO = new avalanche_1.BN(0);
        let xchain = (0, utilities_1.getNetwork)(txc.chain).XChain();
        let chain_fee = xchain.getTxFee();
        let profit = constants_1.SERVICE_FEE.sub(chain_fee);
        let change = getBalance(trade.wallet.utxos, avax_id).sub(constants_1.SERVICE_FEE);
        let profit_addresss = (0, utilities_1.getProfitAddress)(txc.chain);
        txc = (0, tx_construction_1.addOutput)(txc, profit_addresss, avax_id, profit);
        if (change.gt(ZERO)) {
            txc = (0, tx_construction_1.addOutput)(txc, trade.proceeds_address, avax_id, change);
        }
        if (bidder !== undefined) {
            let bid_price = getBalance(bidder.utxos, avax_id);
            if (trade.mode === "FIXED" && bid_price.gt(trade.ask)) {
                let change = bid_price.sub(trade.ask);
                txc = (0, tx_construction_1.addOutput)(txc, bidder.address, avax_id, change);
                bid_price = trade.ask;
            }
            if (royalty !== undefined) {
                let cut = bid_price.divRound(royalty.divisor);
                txc = (0, tx_construction_1.addOutput)(txc, royalty.proceeds_address, avax_id, cut);
                bid_price = bid_price.sub(cut);
            }
            txc = (0, tx_construction_1.addOutput)(txc, trade.proceeds_address, avax_id, bid_price);
            txc = (0, tx_construction_1.addInputs)(txc, bidder.utxos);
        }
        let client_address = (bidder === undefined) ? trade.proceeds_address : bidder.address;
        for (let utxo of trade.wallet.utxos) {
            let output = utxo.getOutput();
            if (output instanceof avm_1.SECPTransferOutput) {
                txc = (0, tx_construction_1.addInput)(txc, utxo);
            }
            else if (output instanceof avm_1.NFTTransferOutput) {
                txc = (0, tx_construction_1.addNFTTransferOp)(txc, utxo, client_address);
            }
        }
        return txc;
    });
}
function getBalance(utxos, asset_id) {
    let balance = new avalanche_1.BN(0);
    for (let utxo of utxos) {
        let is_asset = utxo.getAssetID().equals(asset_id);
        if (is_asset) {
            let output = utxo.getOutput();
            if (output instanceof avm_1.SECPTransferOutput) {
                balance.iadd(output.getAmount());
            }
            else if (output instanceof avm_1.NFTTransferOutput) {
                let one = new avalanche_1.BN(1);
                balance.iadd(one);
            }
        }
    }
    return balance;
}
exports.getBalance = getBalance;
