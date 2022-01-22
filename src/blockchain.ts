import { BN, Buffer } from "avalanche";
import { Chain, getNetwork, stringFromAddress, getAvaxID, getProfitAddress } from "./common"
import { Trade, Bid, Royalty, Wallet } from "./model";
import { SERVICE_FEE } from "./constants";
import { TxConstruction, makeTxConstruction, addInput, addInputs, addOutput, addNFTTransferOp, issue } from "./tx_construction";
import { UTXO, SECPTransferOutput, NFTTransferOutput } from "avalanche/dist/apis/avm"


async function syncTrade(trade: Trade, bids: Bid[], royalty: Royalty | undefined): Promise<Trade> {
    if (trade.status === "PENDING") {
        trade.wallet = await syncWallet(trade.wallet);
        if (trade.wallet.status === "CLOSED") {
            trade.status = "OPEN";
        } else if (trade.wallet.status === "LOCKED") {
            trade.status = "LOCKED";
        }
    } else {
        trade = await closeTradeIfPossible(trade, bids, royalty);
        trade = await expireTradeIfPossible(trade, bids);
    }
    return trade
}

async function syncBid(bid: Bid): Promise<Bid>{
    bid.wallet = await syncWallet(bid.wallet);
    return bid
}

async function syncWallet(wallet: Wallet): Promise<Wallet> {
    if (wallet.status !== "OPEN") {
        return wallet
    }
    let utxos = await fetchUTXOs(wallet.address, wallet.chain, wallet.asset_ids);
    if (utxos === undefined) {
        wallet.status = "LOCKED";
        return wallet
    } 
    wallet.utxos = utxos;
    return closeWalletIfPossible(wallet)
}

async function closeWalletIfPossible(wallet: Wallet): Promise<Wallet> {
    let now = new Date().getTime();
    if (wallet.status !== "OPEN" || now <= wallet.expiration) {
        return wallet
    }
    let avax_id = await getAvaxID(wallet.chain);
    let can_close: Boolean = true;
    for (let asset_id of wallet.asset_ids) {
        let min_balance = (asset_id.equals(avax_id)) ? wallet.avax_requirement : new BN(1);
        let balance = getBalance(wallet.utxos, asset_id);
        if (balance.lt(min_balance)) {
            can_close = false
        }
    }
    wallet.status = can_close ? "CLOSED" : "LOCKED"
    return wallet
}

async function fetchUTXOs(address: Buffer, chain: Chain, asset_ids: Buffer[]): Promise<UTXO[] | undefined> {
    let xchain = getNetwork(chain).XChain();
    let address_string = stringFromAddress(chain, address);
    let response = await xchain.getUTXOs(address_string);
    let utxos = response.utxos.getAllUTXOs();
    if (utxos.length >= 1024) {
        return undefined
    }
    let result: UTXO[] = [];
    for (let utxo of utxos) {
        if (isAcceptableUTXO(utxo, asset_ids)) {
            result.push(utxo);
        }
    }
    return result
}

function isAcceptableUTXO(utxo: UTXO, asset_ids: Buffer[]): Boolean {
    let is_acceptable_asset: Boolean = false;
    let no_locktime: Boolean = false;
    let single_threshold: Boolean = false;
    let single_owner: Boolean = false;

    let asset_id = utxo.getAssetID();
    for (let acceptable of asset_ids) {
        if (asset_id.equals(acceptable)) {
            is_acceptable_asset = true;
        }
    }

    let output = utxo.getOutput();
    if (output instanceof SECPTransferOutput) {
        single_owner = output.getAddresses().length === 1;
    } else if (output instanceof NFTTransferOutput) {
        single_owner = output.getAddresses().length === 1;
    } 
    
    no_locktime = output.getLocktime().isZero();
    single_threshold = output.getThreshold() === 1;
    return is_acceptable_asset && no_locktime && single_threshold && single_owner
}

async function closeTradeIfPossible(trade: Trade, bids: Bid[], royalty: Royalty | undefined): Promise<Trade> {
    let [highest_bidder, losing_bidders] = await makeBidders(trade, bids);
    if (trade.status !== "OPEN" || highest_bidder === undefined) {
        return trade
    }
    let now = new Date().getTime();
    let no_time_remaining = trade.deadline < now;
    let avax_id = await getAvaxID(trade.wallet.chain);
    let can_sell = getBalance(highest_bidder.utxos, avax_id).gte(trade.ask);
    let can_close_auction = trade.mode === "AUCTION" && can_sell && no_time_remaining
    let can_close_fixed = trade.mode === "FIXED" && can_sell

    if (can_close_auction || can_close_fixed) {
        let memo = "AvaTrades - https://avatrades.io/" + trade.id;
        let txc = makeTxConstruction(trade.wallet.chain, memo);
        txc = await exchange(txc, trade, highest_bidder, royalty);
        txc = await returnAll(txc, losing_bidders);
        let receipt = await issue(txc);
        trade.receipt.push(receipt)        
        trade.status = "CLOSED"
    }
    return trade
}

async function expireTradeIfPossible(trade: Trade, bids: Bid[]): Promise<Trade> {
    let now = new Date().getTime();
    let time_remaining = now <= trade.deadline;
    if (trade.status !== "OPEN" || time_remaining) {
        return trade
    }

    let [highest_bidder, losing_bidders] = await makeBidders(trade, bids);
    let all_bidders: Bidder[];
    let is_expired: Boolean;
    if (highest_bidder === undefined) {
        all_bidders = losing_bidders;
        is_expired = true;
    } else {
        let avax_id = await getAvaxID(trade.wallet.chain);
        all_bidders = losing_bidders.concat([highest_bidder]);
        is_expired = getBalance(highest_bidder.utxos, avax_id).lt(trade.ask);
    }

    if (is_expired) {
        let memo = "AvaTrades (Expired) - https://avatrades.io/" + trade.id;
        let txc = makeTxConstruction(trade.wallet.chain, memo);
        txc = await returnAll(txc, all_bidders, trade);
        let receipt = await issue(txc);
        trade.receipt.push(receipt);
        trade.status = "EXPIRED";
    }
    return trade
}

interface Bidder {
    address: Buffer;
    utxos: UTXO[];
}

function makeBidder(address: Buffer): Bidder {
    return {
        "address": address,
        "utxos": []
    }
}

async function makeBidders(trade: Trade, bids: Bid[]): Promise<[Bidder | undefined, Bidder[]]> {
    let chain = trade.wallet.chain;
    let closed_bids = bids.filter(bid => bid.wallet.status === "CLOSED");
    let bidders: Map<string, Bidder> = new Map<string, Bidder>();
    for (let bid of closed_bids) {
        if (bid.wallet.chain === chain) {
            let key = stringFromAddress(chain, bid.proceeds_address);
            let value = bidders.get(key);
            if (value === undefined) {
                let bidder = makeBidder(bid.proceeds_address);
                bidder.utxos = bid.wallet.utxos;
                bidders.set(key, bidder);
            } else {
                value.utxos = value.utxos.concat(bid.wallet.utxos);
                bidders.set(key, value);
            }
        }
    }

    let highest_bidder: Bidder | undefined = undefined;
    let losing_bidders: Bidder[] = [];
    let avax_id = await getAvaxID(trade.wallet.chain);
    for (let [_, bidder] of bidders) {
        if (highest_bidder === undefined) {
            highest_bidder = bidder;
        } else {
            let bid_price = getBalance(bidder.utxos, avax_id);
            let high_price = getBalance(highest_bidder.utxos, avax_id);
            if (bid_price.gt(high_price)) {
                losing_bidders.push(highest_bidder);
                highest_bidder = bidder;
            }
        }
    }
    return [highest_bidder, losing_bidders]
}

async function returnAll(txc: TxConstruction, bidders: Bidder[], trade?: Trade | undefined): Promise<TxConstruction> {
    let avax_id = await getAvaxID(txc.chain);
    for (let bidder of bidders) {
        let avax_balance = getBalance(bidder.utxos, avax_id);
        txc = addOutput(txc, bidder.address, avax_id, avax_balance);
        txc = addInputs(txc, bidder.utxos);
    }
    if (trade !== undefined) {
        txc = await exchange(txc, trade);
    }
    return txc
}

async function exchange(txc: TxConstruction, trade: Trade, bidder?: Bidder, royalty?: Royalty): Promise<TxConstruction> {
    let avax_id = await getAvaxID(txc.chain);
    let ZERO = new BN(0);

    let xchain = getNetwork(txc.chain).XChain();
    let chain_fee = xchain.getTxFee();
    let profit = SERVICE_FEE.sub(chain_fee);
    let change = getBalance(trade.wallet.utxos, avax_id).sub(SERVICE_FEE);
    let profit_addresss = getProfitAddress(txc.chain);
    txc = addOutput(txc, profit_addresss, avax_id, profit);
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
        if (output instanceof SECPTransferOutput) {
            txc = addInput(txc, utxo);
        } else if (output instanceof NFTTransferOutput) {
            txc = addNFTTransferOp(txc, utxo, client_address);
        }
    }
    return txc
}

function getBalance(utxos: UTXO[], asset_id: Buffer): BN {
    let balance = new BN(0);
    for (let utxo of utxos) {
        let is_asset = utxo.getAssetID().equals(asset_id);
        if (is_asset) {
            let output = utxo.getOutput();
            if (output instanceof SECPTransferOutput) {
                balance.iadd(output.getAmount())
            } else if (output instanceof NFTTransferOutput) {
                let one = new BN(1);
                balance.iadd(one);
            }
        }
    }
    return balance
}

export { syncTrade, syncBid, getBalance, fetchUTXOs }