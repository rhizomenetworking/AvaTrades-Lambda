import { Avalanche, Buffer, BN } from "avalanche";
import { Trade, Bid, Royalty, Wallet, Chain } from "./model";
import { SERVICE_FEE, PROFIT_ADDRESS, MAINNET_AVAX, FUJI_AVAX} from "./constants";
import { 
    UTXO, 
    KeyChain,
    OperationTx, UnsignedTx, 
    TransferableInput, TransferableOutput, TransferableOperation, 
    SECPTransferInput, SECPTransferOutput, NFTTransferOutput, NFTTransferOperation
} from "avalanche/dist/apis/avm"


const avalanche = new Avalanche("TODO", 0);
const avalanche_xchain = avalanche.XChain();
const fuij = new Avalanche("TODO", 0);
const fuji_xchain = fuij.XChain();

async function syncTrade(trade: Trade, bids: Bid[], royalty: Royalty | undefined): Promise<Trade> {
    if (trade.status === "PENDING") {
        trade.wallet = await syncWallet(trade.wallet);
        if (trade.wallet.status === "CLOSED") {
            trade.status = "OPEN";
        } else if (trade.wallet.status === "LOCKED") {
            trade.status = "LOCKED";
        }
    } else {
        //TODO: Filter out open and locked bids
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
    if (wallet.chain === "Fuji-x") {
        fuji_xchain.keyChain().addKey(wallet.private_key)
    } else {
        avalanche_xchain.keyChain().addKey(wallet.private_key)
    }
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

function closeWalletIfPossible(wallet: Wallet): Wallet {
    let now = new Date().getTime();
    if (wallet.status !== "OPEN" || now <= wallet.expiration) {
        return wallet
    }
    let avax_id = wallet.chain === "Fuji-x" ? FUJI_AVAX : MAINNET_AVAX;
    let can_close: Boolean = true;
    for (let asset_id of wallet.asset_ids) {
        let min_balance = (asset_id === avax_id) ? wallet.avax_requirement : new BN(1);
        let balance = getBalance(wallet.utxos, asset_id);
        if (balance.lt(min_balance)) {
            can_close = false
        }
    }
    wallet.status = can_close ? "CLOSED" : "LOCKED"
    return wallet
}

async function fetchUTXOs(address: string, chain: Chain, asset_ids: string[]): Promise<UTXO[] | undefined> {
    let utxos: UTXO[];
    if (chain === "Fuji-x") {
        let response = await fuji_xchain.getUTXOs(address);
        utxos = response.utxos.getAllUTXOs();
    } else {   
        let response = await avalanche_xchain.getUTXOs(address);
        utxos = response.utxos.getAllUTXOs();
    }
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

function isAcceptableUTXO(utxo: UTXO, asset_ids: string[]): Boolean {
    let is_acceptable_asset: Boolean = false;
    let no_locktime: Boolean = false;
    let single_threshold: Boolean = false;
    let single_owner: Boolean = false;

    let asset_id = utxo.getAssetID();
    for (let acceptable of asset_ids) {
        if (asset_id.toString() === acceptable) {
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
    let [highest_bidder, losing_bidders] = makeBidders(trade, bids);
    if (trade.status !== "OPEN" || highest_bidder === undefined) {
        return trade
    }
    let now = new Date().getTime();
    let no_time_remaining = trade.deadline < now;
    let avax_id = trade.wallet.chain === "Fuji-x" ? FUJI_AVAX : MAINNET_AVAX;
    let can_sell = getBalance(highest_bidder.utxos, avax_id).gte(trade.ask);
    let can_close_auction = trade.mode === "AUCTION" && can_sell && no_time_remaining
    let can_close_fixed = trade.mode === "FIXED" && can_sell

    if (can_close_auction || can_close_fixed) {
        let memo = "AvaTrades - https://avatrades.io/" + trade.id;
        let txc = makeTxConstruction(trade.wallet.chain, memo)
        let key_chain = trade.wallet.chain === "Fuji-x" ? fuji_xchain.keyChain() : avalanche_xchain.keyChain();
        txc = exchange(txc, trade, highest_bidder, royalty);
        txc = returnAll(txc, losing_bidders);
        let receipt = await issue(txc, key_chain);
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

    let [highest_bidder, losing_bidders] = makeBidders(trade, bids);
    let all_bidders: Bidder[];
    let is_expired: Boolean;
    if (highest_bidder === undefined) {
        all_bidders = losing_bidders;
        is_expired = true;
    } else {
        let avax_id = trade.wallet.chain === "Fuji-x" ? FUJI_AVAX : MAINNET_AVAX;
        all_bidders = losing_bidders.concat([highest_bidder]);
        is_expired = getBalance(highest_bidder.utxos, avax_id).lt(trade.ask);
    }

    if (is_expired) {
        let memo = "AvaTrades (Expired) - https://avatrades.io/" + trade.id;
        let txc = makeTxConstruction(trade.wallet.chain, memo);
        let key_chain = trade.wallet.chain === "Fuji-x" ? fuji_xchain.keyChain() : avalanche_xchain.keyChain();
        txc = returnAll(txc, all_bidders, trade);
        let receipt = await issue(txc, key_chain);
        trade.receipt.push(receipt);
        trade.status = "EXPIRED";
    }
    return trade
}

interface Bidder {
    address: string;
    utxos: UTXO[];
}

function makeBidder(address: string): Bidder {
    return {
        "address": address,
        "utxos": []
    }
}

function makeBidders(trade: Trade, bids: Bid[]): [Bidder | undefined, Bidder[]] {
    let chain = trade.wallet.chain;
    let bidders: Map<string, Bidder> = new Map<string, Bidder>();
    for (let bid of bids) {
        if (bid.wallet.chain === chain) {
            let key = bid.proceeds_address;
            let value = bidders.get(key);
            if (value === undefined) {
                let bidder = makeBidder(key);
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
    let avax_id = trade.wallet.chain === "Fuji-x" ? FUJI_AVAX : MAINNET_AVAX;
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

interface TxConstruction {
    outputs: TransferableOutput[];
    inputs: TransferableInput[];
    ops: TransferableOperation[];
    chain: Chain;
    memo: Buffer;
}

function makeTxConstruction(chain: Chain, memo: string): TxConstruction {
    let txc: TxConstruction = {
        "outputs": [],
        "inputs": [],
        "ops": [],
        "chain": chain,
        "memo": Buffer.from(memo)
    }
    return txc
}

function returnAll(txc: TxConstruction, bidders: Bidder[], trade?: Trade | undefined): TxConstruction {
    let avax_id = txc.chain === "Fuji-x" ? FUJI_AVAX : MAINNET_AVAX;
    for (let bidder of bidders) {
        let avax_balance = getBalance(bidder.utxos, avax_id);
        txc = addOutput(txc, bidder.address, avax_id, avax_balance);
        txc = addInputs(txc, bidder.utxos);
    }
    if (trade !== undefined) {
        txc = exchange(txc, trade);
    }
    return txc
}

function exchange(txc: TxConstruction, trade: Trade, bidder?: Bidder, royalty?: Royalty): TxConstruction {
    let avax_id = txc.chain === "Fuji-x" ? FUJI_AVAX : MAINNET_AVAX;
    let ZERO = new BN(0);

    let chain_fee = txc.chain === "Fuji-x" ? fuji_xchain.getTxFee() : avalanche_xchain.getTxFee();
    let profit = SERVICE_FEE.sub(chain_fee);
    let change = getBalance(trade.wallet.utxos, avax_id).sub(SERVICE_FEE);
    txc = addOutput(txc, PROFIT_ADDRESS, avax_id, profit);
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

function addOutput(txc: TxConstruction, address: string, asset_id: string, amount: BN): TxConstruction {
    let address_buf = Buffer.from(address);
    let asset_id_buf = Buffer.from(asset_id);
    let output = new SECPTransferOutput(amount, [address_buf]);
    let transferable_output = new TransferableOutput(asset_id_buf, output);
    txc.outputs.push(transferable_output);
    return txc
}

function addInputs(txc: TxConstruction, utxos: UTXO[]): TxConstruction {
    for (let utxo of utxos) {
        txc = addInput(txc, utxo);
    }
    return txc
}

function addInput(txc: TxConstruction, utxo: UTXO): TxConstruction {
    let tx_id = utxo.getTxID();
    let output_index = utxo.getOutputIdx();
    let asset_id = utxo.getAssetID();
    let output = utxo.getOutput() as SECPTransferOutput;
    let amount = output.getAmount();
    let transfer_input = new SECPTransferInput(amount);
    let transferable_input = new TransferableInput(tx_id, output_index, asset_id, transfer_input);
    txc.inputs.push(transferable_input);
    return txc
}

function addNFTTransferOp(txc: TxConstruction, utxo: UTXO, to_address: string) {
    let asset_id = utxo.getAssetID();
    let utxo_id = utxo.getUTXOID();
    let old_output = utxo.getOutput() as NFTTransferOutput;
    let group_id = old_output.getGroupID();
    let payload = old_output.getPayload();
    let to_address_buf = Buffer.from(to_address);
    let output = new NFTTransferOutput(group_id, payload, [to_address_buf]);
    let op = new NFTTransferOperation(output);
    let transferable_op = new TransferableOperation(asset_id, [utxo_id], op);
    txc.ops.push(transferable_op);
    return txc
}

function issue(txc: TxConstruction, key_chain: KeyChain): Promise<string> {
    let op_tx = new OperationTx(
        undefined, 
        undefined, 
        txc.outputs, 
        txc.inputs, 
        txc.memo, 
        txc.ops)
    
    let unsigned_tx = new UnsignedTx(op_tx);
    let signed_tx = unsigned_tx.sign(key_chain);
    
    if (txc.chain === "Fuji-x") {
        return fuji_xchain.issueTx(signed_tx);
    } 
    return avalanche_xchain.issueTx(signed_tx);
}

function getBalance(utxos: UTXO[], asset_id: string): BN {
    let balance = new BN(0);
    for (let utxo of utxos) {
        let is_asset = utxo.getAssetID().toString() === asset_id;
        if (is_asset) {
            let output = utxo.getOutput();
            if (output instanceof SECPTransferOutput) {
                balance.add(output.getAmount())
            } else if (output instanceof NFTTransferOutput) {
                let one = new BN(1);
                balance.add(one);
            }
        }
    }
    return balance
}

export { syncTrade, syncBid }