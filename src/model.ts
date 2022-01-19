import { BN, BinTools, Buffer } from "avalanche"
import { UTXO, KeyPair} from "avalanche/dist/apis/avm"
import { v4 as uuid} from "uuid"
import { FUJI_NETWORK, AVALANCHE_NETWORK, AVALANCHE_AVAX_ID, FUJI_AVAX_ID, SERVICE_FEE, FUJI_PROFIT_ADDRESS, AVALANCHE_PROFIT_ADDRESS } from "./constants"

const bintools = BinTools.getInstance();


type TradeMode = "FIXED" | "AUCTION";
type TradeStatus = "PENDING" | "OPEN" | "CLOSED" | "EXPIRED" | "LOCKED";
type WalletStatus = "OPEN" | "CLOSED" | "LOCKED"
type Chain = "Avalanche-x" | "Fuji-x"

interface Trade {
    id: string;
    ask: BN;
    mode: TradeMode; 
    proceeds_address: Buffer;
    wallet: Wallet;
    deadline: number;
    status: TradeStatus;
    receipt: string[];
}

interface Bid {
    trade_id: string;
    proceeds_address: Buffer;
    wallet: Wallet;
}

interface Royalty {
    asset_id: Buffer;
    proceeds_address: Buffer;
    divisor: number;
    chain: Chain;
    timestamp: number;
    minter_address: Buffer;
    minter_signature: Buffer;
}

interface Wallet {
    chain: Chain;
    asset_ids: Buffer[];
    avax_requirement: BN;
    expiration: number;
    address: Buffer;
    private_key: KeyPair;
    utxos: UTXO[];
    status: WalletStatus;
}

function makeTrade(asset_id: Buffer, ask: BN, mode: TradeMode, proceeds_address: Buffer, chain: Chain): Trade {
    let now = new Date().getTime();
    let two_days_from_now = now + 172800;
    let week_from_now = now + 604800;
    return {
        "id": uuid(),
        "ask": ask,
        "mode": mode,
        "proceeds_address": proceeds_address,
        "wallet": makeWallet(chain, SERVICE_FEE, asset_id),
        "deadline": (mode === "AUCTION") ? two_days_from_now : week_from_now,
        "status": "PENDING",
        "receipt": []
    }
}

function tradeAsItem(trade: Trade): any {
    let receipt = [];
    for (let r in trade.receipt) {
        let item = {"S": r};
        receipt.push(item);
    }
    return { 
        "pk": {"S": "TRADE"},
        "sk": {"S": trade.id},
        "properties": {
            "M": {
                "id": {"S": trade.id},
                "ask": {"S": trade.ask.toJSON()},
                "mode": {"S": trade.mode},
                "proceeds_address": {"S": stringFromAddress(trade.wallet.chain, trade.proceeds_address)},
                "wallet": {"M": walletAsItem(trade.wallet)},
                "deadline": {"S": trade.deadline.toString()},
                "status": {"S": trade.status},
                "receipt": {"L": receipt}
            }
        } 
    }
}

function itemAsTrade(item: any): Trade {
    let properties = item.properties["M"];
    let ask = new BN(properties.ask["S"], 16);
    let receipt = [];
    for (let receipt_item of properties.receipt["L"]) {
        receipt.push(receipt_item["S"]);
    }
    let wallet = itemAsWallet(properties.wallet["M"]);
    let proceeds_address = addressFromString(wallet.chain, properties.proceeds_address["S"]);
    return {
        "id": properties.id["S"],
        "ask": ask,
        "mode": properties.mode["S"],
        "proceeds_address": proceeds_address,
        "wallet": wallet,
        "deadline": parseInt(properties.deadline["S"]),
        "status": properties.status["S"],
        "receipt": receipt
    }
}

function makeBid(trade: Trade, proceeds_address: Buffer): Bid {
    let avax_requirement = trade.ask.divRound(10);
    return {
        "trade_id": trade.id,
        "proceeds_address": proceeds_address,
        "wallet": makeWallet(trade.wallet.chain, avax_requirement)
    }
}

function bidAsItem(bid: Bid): any {
    let sk = stringFromAddress(bid.wallet.chain, bid.wallet.address);
    let proceeds_address = stringFromAddress(bid.wallet.chain, bid.proceeds_address);
    return {
        "pk": {"S": bid.trade_id},
        "sk": {"S": sk},
        "properties": {
            "M": {
                "trade_id": {"S": bid.trade_id},
                "proceeds_address": {"S": proceeds_address},
                "wallet": {"M": walletAsItem(bid.wallet)}
            }
        }
    }
}

function itemAsBid(item: any): Bid {
    let properties = item.properties["M"];
    let wallet = itemAsWallet(properties.wallet["M"]);
    let proceeds_address = addressFromString(wallet.chain, properties.proceeds_address["S"]);
    return {
        "trade_id": properties.id["S"], 
        "proceeds_address": proceeds_address,
        "wallet": wallet
    }
}

function makeRoyalty(asset_id: Buffer, proceeds_address: Buffer, divisor: number, chain: Chain, timestamp: number, minter_address: Buffer, minter_signature: Buffer): Royalty {
    return {
        "asset_id": asset_id,
        "proceeds_address": proceeds_address,
        "divisor": divisor,
        "chain": chain,
        "timestamp": timestamp, 
        "minter_address": minter_address,
        "minter_signature": minter_signature
    }
}

function royaltyAsItem(royalty: Royalty): any {
    let asset_id_string = stringFromAssetID(royalty.asset_id);
    let minter_signature_string = stringFromSignature(royalty.minter_signature);
    return {
        "pk": {"S": royalty.chain},
        "sk": {"S": asset_id_string},
        "properties": {
            "M": {
                "asset_id": {"S": asset_id_string},
                "proceeds_address": {"S": stringFromAddress(royalty.chain, royalty.proceeds_address)},
                "divisor": {"S": royalty.divisor.toString()},
                "chain": {"S": royalty.chain},
                "timestamp": {"S": royalty.timestamp.toString()},
                "minter_address": {"S": stringFromAddress(royalty.chain, royalty.minter_address)},
                "minter_signature": {"S": minter_signature_string}
            }
        }
    }
}

function itemAsRoyalty(item: any): Royalty {
    let properties = item.properties["M"];
    let asset_id = assetIdFromString(properties.asset_id["S"]);
    let chain: Chain = properties.chain["S"];
    let proceeds_address = addressFromString(chain, properties.proceeds_address["S"]);
    let minter_address = addressFromString(chain, properties.minter_address["S"]);
    let minter_signature = signatureFromString(properties.minter_signature["S"]);
    return {
        "asset_id": asset_id,
        "proceeds_address": proceeds_address,
        "divisor": parseInt(properties.divisor["S"]),
        "chain": chain,
        "timestamp": parseInt(properties.timestamp["S"]), 
        "minter_address": minter_address,
        "minter_signature": minter_signature
    }
}

function makeWallet(chain: Chain, avax_requirement: BN, asset_id?: Buffer): Wallet {
    let now = new Date().getTime();
    let half_hour_from_now = now + 1800;
    let avax_id = getAvaxID(chain);
    let asset_ids = [avax_id];
    if (asset_id !== undefined) {
        asset_ids.push(asset_id);
    }
    let key_pair = getKeyPair(chain);
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
    }
}

function walletAsItem(wallet: Wallet): any {
    let utxos = [];
    for (let utxo of wallet.utxos) {
        let item = {"S": utxo.toString()};
        utxos.push(item);
    }
    let asset_ids = [];
    for (let id of wallet.asset_ids) {
        let item = {"S": stringFromAssetID(id)};
        asset_ids.push(item);
    }
    return { 
        "chain": {"S": wallet.chain},
        "asset_ids": {"L": asset_ids},
        "avax_requirement": {"S": wallet.avax_requirement.toJSON()},
        "expiration": {"S": wallet.expiration.toString()},
        "address": {"S": stringFromAddress(wallet.chain, wallet.address)},
        "private_key": {"S": wallet.private_key.getPrivateKeyString()},
        "utxos": {"L": utxos},
        "status": {"S": wallet.status}
    }
}

function itemAsWallet(obj: any): Wallet {
    let utxos: UTXO[] = [];
    for (let item of obj.utxos["L"]) {
        let utxo = new UTXO();
        utxo.fromString(item["S"]);
        utxos.push(utxo);
    }
    let asset_ids: Buffer[] = [];
    for (let item of obj.asset_ids["L"]) {
        let asset_id = assetIdFromString(item["S"]);
        asset_ids.push(asset_id);
    }
    let avax_requirement = new BN(obj.avax_requirement["S"], 16);
    let chain: Chain = obj.chain["S"];
    let key_pair = getKeyPair(chain, obj.private_key["S"]);
    return {
        "chain": chain,
        "asset_ids": asset_ids,
        "avax_requirement": avax_requirement,
        "expiration": parseInt(obj.expiration["S"]),
        "address": addressFromString(chain, obj.address["S"]),
        "private_key": key_pair,
        "utxos": utxos,
        "status": obj.status["S"]
    }
}

function getKeyPair(chain: Chain, private_key?: string): KeyPair {
    let xchain = (chain === "Fuji-x") ? FUJI_NETWORK.XChain() : AVALANCHE_NETWORK.XChain();
    let key_pair = xchain.keyChain().makeKey();
    if (private_key !== undefined) {
        let key_string = private_key.split("-")[1];
        let key_buf = bintools.cb58Decode(key_string);
        key_pair.importKey(key_buf);
        xchain.keyChain().addKey(key_pair);
    }
    return key_pair
}

function getAvaxID(chain: Chain): Buffer {
    let avax_id = (chain === "Fuji-x") ? FUJI_AVAX_ID : AVALANCHE_AVAX_ID;
    return assetIdFromString(avax_id)
}

function getProfitAddress(chain: Chain): Buffer {
    let address = (chain === "Fuji-x") ? FUJI_PROFIT_ADDRESS : AVALANCHE_PROFIT_ADDRESS;
    return addressFromString(chain, address)
}

function stringFromAddress(chain: Chain, address: Buffer): string {
    let network = (chain === "Fuji-x") ? FUJI_NETWORK : AVALANCHE_NETWORK;
    return network.XChain().addressFromBuffer(address)
}

function addressFromString(chain: Chain, address: string): Buffer {
    let network = (chain === "Fuji-x") ? FUJI_NETWORK : AVALANCHE_NETWORK;
    return network.XChain().parseAddress(address)
}

function stringFromSignature(asset_id: Buffer): string {
    return bintools.cb58Encode(asset_id)
}

function signatureFromString(asset_id: string): Buffer {
    return bintools.cb58Decode(asset_id)
}

function stringFromAssetID(asset_id: Buffer): string {
    return bintools.cb58Encode(asset_id)
}

function assetIdFromString(asset_id: string): Buffer {
    return bintools.cb58Decode(asset_id)
}




export { Trade, Bid, Royalty, Wallet, Chain, TradeMode, TradeStatus }
export { makeTrade, makeBid, makeRoyalty }
export { tradeAsItem, bidAsItem, royaltyAsItem }
export { itemAsTrade, itemAsBid, itemAsRoyalty }
export { stringFromAddress, stringFromAssetID, addressFromString, assetIdFromString, signatureFromString, stringFromSignature }
export { getProfitAddress, getAvaxID }