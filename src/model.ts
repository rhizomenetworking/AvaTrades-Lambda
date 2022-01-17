import { Avalanche, Buffer, BN } from "avalanche"
import { UTXO, KeyPair} from "avalanche/dist/apis/avm"
import { v4 as uuid} from "uuid"
import { MAINNET_AVAX, FUJI_AVAX, SERVICE_FEE } from "./constants"

type TradeMode = "FIXED" | "AUCTION";
type TradeStatus = "PENDING" | "OPEN" | "CLOSED" | "EXPIRED" | "LOCKED";
type WalletStatus = "OPEN" | "CLOSED" | "LOCKED"
type Chain = "Avalanche-x" | "Fuji-x"

interface Trade {
    id: string;
    ask: BN;
    mode: TradeMode; 
    proceeds_address: string;
    wallet: Wallet;
    deadline: number;
    status: TradeStatus;
    receipt: string[];
}

interface Bid {
    trade_id: string;
    proceeds_address: string;
    wallet: Wallet;
}

interface Royalty {
    asset_id: string;
    proceeds_address: string;
    divisor: number;
    chain: Chain;
    timestamp: number;
    minter_address: string;
    minter_signature: string;
}

interface Wallet {
    chain: Chain;
    asset_ids: string[];
    avax_requirement: BN;
    expiration: number;
    address: string;
    private_key: KeyPair;
    utxos: UTXO[];
    status: WalletStatus;
}

function makeTrade(asset_id: string, ask: BN, mode: TradeMode, proceeds_address: string, chain: Chain): Trade {
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
                "proceeds_address": {"S": trade.proceeds_address},
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
    return {
        "id": properties.id["S"],
        "ask": ask,
        "mode": properties.mode["S"],
        "proceeds_address": properties.proceeds_address["S"],
        "wallet": itemAsWallet(properties.wallet["M"]),
        "deadline": parseInt(properties.deadline["S"]),
        "status": properties.status["S"],
        "receipt": receipt
    }
}

function makeBid(trade: Trade, proceeds_address: string): Bid {
    let avax_requirement = trade.ask.divRound(10);
    return {
        "trade_id": trade.id,
        "proceeds_address": proceeds_address,
        "wallet": makeWallet(trade.wallet.chain, avax_requirement)
    }
}

function bidAsItem(bid: Bid): any {
    return {
        "pk": {"S": bid.trade_id},
        "sk": {"S": bid.wallet.address},
        "properties": {
            "M": {
                "trade_id": {"S": bid.trade_id},
                "proceeds_address": {"S": bid.proceeds_address},
                "wallet": {"M": walletAsItem(bid.wallet)}
            }
        }
    }
}

function itemAsBid(item: any): Bid {
    let properties = item.properties["M"];
    return {
        "trade_id": properties.id["S"], 
        "proceeds_address": properties.proceeds_address["S"],
        "wallet": itemAsWallet(properties.wallet["M"])
    }
}

function makeRoyalty(asset_id: string, proceeds_address: string, divisor: number, chain: Chain, timestamp: number, minter_address: string, minter_signature: string): Royalty {
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
    return {
        "pk": {"S": royalty.chain},
        "sk": {"S": royalty.asset_id},
        "properties": {
            "M": {
                "asset_id": {"S": royalty.asset_id},
                "proceeds_address": {"S": royalty.proceeds_address},
                "divisor": {"S": royalty.divisor.toString()},
                "chain": {"S": royalty.chain},
                "timestamp": {"S": royalty.timestamp.toString()},
                "minter_address": {"S": royalty.minter_address},
                "minter_signature": {"S": royalty.minter_signature}
            }
        }
    }
}

function itemAsRoyalty(item: any): Royalty {
    let properties = item.properties["M"];
    return {
        "asset_id": properties.asset_id["S"],
        "proceeds_address": properties.proceeds_address["S"],
        "divisor": parseInt(properties.divisor["S"]),
        "chain": properties.chain["S"],
        "timestamp": parseInt(properties.timestamp["S"]), 
        "minter_address": properties.minter_address["S"],
        "minter_signature": properties.minter_signature["S"]
    }
}

function makeWallet(chain: Chain, avax_requirement: BN, asset_id?: string): Wallet {
    let now = new Date().getTime();
    let half_hour_from_now = now + 1800;
    let avax_id = chain === "Fuji-x" ? FUJI_AVAX : MAINNET_AVAX;
    let asset_ids = [avax_id];
    if (asset_id !== undefined) {
        asset_ids.push(asset_id);
    }
    let key_pair = generateKeyPair(chain);
    let address = key_pair.getAddressString();
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
        let item = {"S": id};
        asset_ids.push(item);
    }
    return { 
        "chain": {"S": wallet.chain},
        "asset_ids": {"L": asset_ids},
        "avax_requirement": {"S": wallet.avax_requirement.toJSON()},
        "expiration": {"S": wallet.expiration.toString()},
        "address": {"S": wallet.address},
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
    let asset_ids: string[] = [];
    for (let item of obj.asset_ids["L"]) {
        let asset_id = item["S"];
        asset_ids.push(asset_id);
    }
    let avax_requirement = new BN(obj.avax_requirement["S"], 16);
    let chain = obj.chain["S"];
    let key_pair = generateKeyPair(chain);
    key_pair.importKey(Buffer.from(obj.private_key["S"]));
    return {
        "chain": chain,
        "asset_ids": asset_ids,
        "avax_requirement": avax_requirement,
        "expiration": parseInt(obj.expiration["S"]),
        "address": obj.address["S"],
        "private_key": key_pair,
        "utxos": utxos,
        "status": obj.status["S"]
    }
}

function generateKeyPair(chain: Chain): KeyPair {
    let key_pair: KeyPair
    if (chain === "Fuji-x") {
        const fuij = new Avalanche("TODO", 0);
        key_pair = fuij.XChain().keyChain().makeKey();
    } else {
        const mainnet = new Avalanche("TODO", 0);
        key_pair = mainnet.XChain().keyChain().makeKey();
    }
    key_pair.generateKey();
    return key_pair
}


export { Trade, Bid, Royalty, Wallet, Chain, TradeMode, TradeStatus }
export { makeTrade, makeBid, makeRoyalty }
export { tradeAsItem, bidAsItem, royaltyAsItem }
export { itemAsTrade, itemAsBid, itemAsRoyalty }