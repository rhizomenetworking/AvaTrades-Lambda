import { BN, Buffer } from "avalanche"
import { UTXO, KeyPair} from "avalanche/dist/apis/avm"
import { v4 as uuid} from "uuid"
import { SERVICE_FEE } from "./constants"
import { Chain, getAvaxID, makeKeyPair } from "./utilities"

type TradeMode = "FIXED" | "AUCTION";
type TradeStatus = "PENDING" | "OPEN" | "CLOSED" | "EXPIRED" | "LOCKED";
type WalletStatus = "OPEN" | "CLOSED" | "LOCKED"

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

async function makeTrade(asset_id: Buffer, ask: BN, mode: TradeMode, proceeds_address: Buffer, chain: Chain): Promise<Trade> {
    let now = new Date().getTime();
    let two_days_from_now = now + 172800;
    let week_from_now = now + 604800;
    return {
        "id": uuid(),
        "ask": ask,
        "mode": mode,
        "proceeds_address": proceeds_address,
        "wallet": await makeWallet(chain, SERVICE_FEE, asset_id),
        "deadline": (mode === "AUCTION") ? two_days_from_now : week_from_now,
        "status": "PENDING",
        "receipt": []
    }
}

async function makeBid(trade: Trade, proceeds_address: Buffer): Promise<Bid> {
    let avax_requirement = trade.ask.divRound(new BN(10));
    return {
        "trade_id": trade.id,
        "proceeds_address": proceeds_address,
        "wallet": await makeWallet(trade.wallet.chain, avax_requirement)
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

async function makeWallet(chain: Chain, avax_requirement: BN, asset_id?: Buffer): Promise<Wallet> {
    let now = new Date().getTime();
    let half_hour_from_now = now + 1800000;
    let avax_id = await getAvaxID(chain);
    let asset_ids = [avax_id];
    if (asset_id !== undefined) {
        asset_ids.push(asset_id);
    }
    let key_pair = makeKeyPair(chain);
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

export { Trade, Bid, Royalty, Wallet, TradeMode, TradeStatus, WalletStatus }
export { makeTrade, makeBid, makeRoyalty }