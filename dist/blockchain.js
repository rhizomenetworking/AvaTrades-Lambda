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
exports.syncBid = exports.syncTrade = void 0;
const avalanche_1 = require("avalanche");
const constants_1 = require("./constants");
const avm_1 = require("avalanche/dist/apis/avm");
const avalanche = new avalanche_1.Avalanche("TODO", 0);
const avalanche_xchain = avalanche.XChain();
const fuij = new avalanche_1.Avalanche("TODO", 0);
const fuji_xchain = fuij.XChain();
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
            //TODO: Filter out open and locked bids
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
        if (wallet.chain === "Fuji-x") {
            fuji_xchain.keyChain().addKey(wallet.private_key);
        }
        else {
            avalanche_xchain.keyChain().addKey(wallet.private_key);
        }
        if (wallet.status !== "OPEN") {
            return wallet;
        }
        let utxos = yield fetchUTXOs(wallet.address, wallet.chain, wallet.asset_ids);
        if (utxos === undefined) {
            wallet.status = "LOCKED";
            return wallet;
        }
        wallet.utxos = utxos;
        return closeWalletIfPossible(wallet);
    });
}
function closeWalletIfPossible(wallet) {
    let now = new Date().getTime();
    if (wallet.status !== "OPEN" || now <= wallet.expiration) {
        return wallet;
    }
    let avax_id = wallet.chain === "Fuji-x" ? constants_1.FUJI_AVAX : constants_1.MAINNET_AVAX;
    let can_close = true;
    for (let asset_id of wallet.asset_ids) {
        let min_balance = (asset_id === avax_id) ? wallet.avax_requirement : new avalanche_1.BN(1);
        let balance = getBalance(wallet.utxos, asset_id);
        if (balance.lt(min_balance)) {
            can_close = false;
        }
    }
    wallet.status = can_close ? "CLOSED" : "LOCKED";
    return wallet;
}
function fetchUTXOs(address, chain, asset_ids) {
    return __awaiter(this, void 0, void 0, function* () {
        let utxos;
        if (chain === "Fuji-x") {
            let response = yield fuji_xchain.getUTXOs(address);
            utxos = response.utxos.getAllUTXOs();
        }
        else {
            let response = yield avalanche_xchain.getUTXOs(address);
            utxos = response.utxos.getAllUTXOs();
        }
        if (utxos.length >= 1024) {
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
function isAcceptableUTXO(utxo, asset_ids) {
    let is_acceptable_asset = false;
    let no_locktime = false;
    let single_threshold = false;
    let single_owner = false;
    let asset_id = utxo.getAssetID();
    for (let acceptable of asset_ids) {
        if (asset_id.toString() === acceptable) {
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
        let [highest_bidder, losing_bidders] = makeBidders(trade, bids);
        if (trade.status !== "OPEN" || highest_bidder === undefined) {
            return trade;
        }
        let now = new Date().getTime();
        let no_time_remaining = trade.deadline < now;
        let avax_id = trade.wallet.chain === "Fuji-x" ? constants_1.FUJI_AVAX : constants_1.MAINNET_AVAX;
        let can_sell = getBalance(highest_bidder.utxos, avax_id).gte(trade.ask);
        let can_close_auction = trade.mode === "AUCTION" && can_sell && no_time_remaining;
        let can_close_fixed = trade.mode === "FIXED" && can_sell;
        if (can_close_auction || can_close_fixed) {
            let memo = "AvaTrades - https://avatrades.io/" + trade.id;
            let txc = makeTxConstruction(trade.wallet.chain, memo);
            let key_chain = trade.wallet.chain === "Fuji-x" ? fuji_xchain.keyChain() : avalanche_xchain.keyChain();
            txc = exchange(txc, trade, highest_bidder, royalty);
            txc = returnAll(txc, losing_bidders);
            let receipt = yield issue(txc, key_chain);
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
        let [highest_bidder, losing_bidders] = makeBidders(trade, bids);
        let all_bidders;
        let is_expired;
        if (highest_bidder === undefined) {
            all_bidders = losing_bidders;
            is_expired = true;
        }
        else {
            let avax_id = trade.wallet.chain === "Fuji-x" ? constants_1.FUJI_AVAX : constants_1.MAINNET_AVAX;
            all_bidders = losing_bidders.concat([highest_bidder]);
            is_expired = getBalance(highest_bidder.utxos, avax_id).lt(trade.ask);
        }
        if (is_expired) {
            let memo = "AvaTrades (Expired) - https://avatrades.io/" + trade.id;
            let txc = makeTxConstruction(trade.wallet.chain, memo);
            let key_chain = trade.wallet.chain === "Fuji-x" ? fuji_xchain.keyChain() : avalanche_xchain.keyChain();
            txc = returnAll(txc, all_bidders, trade);
            let receipt = yield issue(txc, key_chain);
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
    let chain = trade.wallet.chain;
    let bidders = new Map();
    for (let bid of bids) {
        if (bid.wallet.chain === chain) {
            let key = bid.proceeds_address;
            let value = bidders.get(key);
            if (value === undefined) {
                let bidder = makeBidder(key);
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
    let avax_id = trade.wallet.chain === "Fuji-x" ? constants_1.FUJI_AVAX : constants_1.MAINNET_AVAX;
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
}
function makeTxConstruction(chain, memo) {
    let txc = {
        "outputs": [],
        "inputs": [],
        "ops": [],
        "chain": chain,
        "memo": avalanche_1.Buffer.from(memo)
    };
    return txc;
}
function returnAll(txc, bidders, trade) {
    let avax_id = txc.chain === "Fuji-x" ? constants_1.FUJI_AVAX : constants_1.MAINNET_AVAX;
    for (let bidder of bidders) {
        let avax_balance = getBalance(bidder.utxos, avax_id);
        txc = addOutput(txc, bidder.address, avax_id, avax_balance);
        txc = addInputs(txc, bidder.utxos);
    }
    if (trade !== undefined) {
        txc = exchange(txc, trade);
    }
    return txc;
}
function exchange(txc, trade, bidder, royalty) {
    let avax_id = txc.chain === "Fuji-x" ? constants_1.FUJI_AVAX : constants_1.MAINNET_AVAX;
    let ZERO = new avalanche_1.BN(0);
    let chain_fee = txc.chain === "Fuji-x" ? fuji_xchain.getTxFee() : avalanche_xchain.getTxFee();
    let profit = constants_1.SERVICE_FEE.sub(chain_fee);
    let change = getBalance(trade.wallet.utxos, avax_id).sub(constants_1.SERVICE_FEE);
    txc = addOutput(txc, constants_1.PROFIT_ADDRESS, avax_id, profit);
    if (change.gt(ZERO)) {
        txc = addOutput(txc, trade.proceeds_address, avax_id, change);
    }
    if (bidder !== undefined) {
        let bid_price = getBalance(bidder.utxos, avax_id);
        if (trade.mode === "FIXED" && bid_price.gt(trade.ask)) {
            let change = bid_price.sub(trade.ask);
            txc = addOutput(txc, bidder.address, avax_id, change);
            bid_price = trade.ask;
        }
        if (royalty !== undefined) {
            let cut = bid_price.divRound(royalty.divisor);
            txc = addOutput(txc, royalty.proceeds_address, avax_id, cut);
            bid_price = bid_price.sub(cut);
        }
        txc = addOutput(txc, trade.proceeds_address, avax_id, bid_price);
        txc = addInputs(txc, bidder.utxos);
    }
    let client_address = (bidder === undefined) ? trade.proceeds_address : bidder.address;
    for (let utxo of trade.wallet.utxos) {
        let output = utxo.getOutput();
        if (output instanceof avm_1.SECPTransferOutput) {
            txc = addInput(txc, utxo);
        }
        else if (output instanceof avm_1.NFTTransferOutput) {
            txc = addNFTTransferOp(txc, utxo, client_address);
        }
    }
    return txc;
}
function addOutput(txc, address, asset_id, amount) {
    let address_buf = avalanche_1.Buffer.from(address);
    let asset_id_buf = avalanche_1.Buffer.from(asset_id);
    let output = new avm_1.SECPTransferOutput(amount, [address_buf]);
    let transferable_output = new avm_1.TransferableOutput(asset_id_buf, output);
    txc.outputs.push(transferable_output);
    return txc;
}
function addInputs(txc, utxos) {
    for (let utxo of utxos) {
        txc = addInput(txc, utxo);
    }
    return txc;
}
function addInput(txc, utxo) {
    let tx_id = utxo.getTxID();
    let output_index = utxo.getOutputIdx();
    let asset_id = utxo.getAssetID();
    let output = utxo.getOutput();
    let amount = output.getAmount();
    let transfer_input = new avm_1.SECPTransferInput(amount);
    let transferable_input = new avm_1.TransferableInput(tx_id, output_index, asset_id, transfer_input);
    txc.inputs.push(transferable_input);
    return txc;
}
function addNFTTransferOp(txc, utxo, to_address) {
    let asset_id = utxo.getAssetID();
    let utxo_id = utxo.getUTXOID();
    let old_output = utxo.getOutput();
    let group_id = old_output.getGroupID();
    let payload = old_output.getPayload();
    let to_address_buf = avalanche_1.Buffer.from(to_address);
    let output = new avm_1.NFTTransferOutput(group_id, payload, [to_address_buf]);
    let op = new avm_1.NFTTransferOperation(output);
    let transferable_op = new avm_1.TransferableOperation(asset_id, [utxo_id], op);
    txc.ops.push(transferable_op);
    return txc;
}
function issue(txc, key_chain) {
    let op_tx = new avm_1.OperationTx(undefined, undefined, txc.outputs, txc.inputs, txc.memo, txc.ops);
    let unsigned_tx = new avm_1.UnsignedTx(op_tx);
    let signed_tx = unsigned_tx.sign(key_chain);
    if (txc.chain === "Fuji-x") {
        return fuji_xchain.issueTx(signed_tx);
    }
    return avalanche_xchain.issueTx(signed_tx);
}
function getBalance(utxos, asset_id) {
    let balance = new avalanche_1.BN(0);
    for (let utxo of utxos) {
        let is_asset = utxo.getAssetID().toString() === asset_id;
        if (is_asset) {
            let output = utxo.getOutput();
            if (output instanceof avm_1.SECPTransferOutput) {
                balance.add(output.getAmount());
            }
            else if (output instanceof avm_1.NFTTransferOutput) {
                let one = new avalanche_1.BN(1);
                balance.add(one);
            }
        }
    }
    return balance;
}
