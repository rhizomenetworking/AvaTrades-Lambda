import { Avalanche, Buffer, BinTools } from "avalanche"
import { KeyPair } from "avalanche/dist/apis/avm"
import { FUJI_NETWORK, AVALANCHE_NETWORK, FUJI_PROFIT_ADDRESS, AVALANCHE_PROFIT_ADDRESS } from "./constants"

const bintools = BinTools.getInstance();

export type Chain = "Avalanche-x" | "Fuji-x"

export function makeKeyPair(chain: Chain, private_key?: string): KeyPair {
    let xchain = getNetwork(chain).XChain();
    let key_pair = xchain.keyChain().makeKey();
    if (private_key !== undefined) {
        let key_string = private_key.split("-")[1];
        let key_buf = bintools.cb58Decode(key_string);
        key_pair.importKey(key_buf);
    }
    xchain.keyChain().addKey(key_pair);
    return key_pair
}

export async function getAvaxID(chain: Chain): Promise<Buffer> {
    let network = getNetwork(chain);
    let avax_id = await network.XChain().getAVAXAssetID();
    return avax_id
}

export function getProfitAddress(chain: Chain): Buffer {
    let address = (chain === "Fuji-x") ? FUJI_PROFIT_ADDRESS : AVALANCHE_PROFIT_ADDRESS;
    return addressFromString(chain, address)
}

export function getNetwork(chain: Chain): Avalanche {
    let network = (chain === "Fuji-x") ? FUJI_NETWORK : AVALANCHE_NETWORK;
    return network
}

export function stringFromAddress(chain: Chain, address: Buffer): string {
    let network = getNetwork(chain);
    return network.XChain().addressFromBuffer(address)
}

export function addressFromString(chain: Chain, address: string): Buffer {
    let network = getNetwork(chain);
    return network.XChain().parseAddress(address)
}

export function stringFromAssetID(asset_id: Buffer): string {
    return bintools.cb58Encode(asset_id)
}

export function assetIdFromString(asset_id: string): Buffer {
    return bintools.cb58Decode(asset_id)
}

export function stringFromSignature(asset_id: Buffer): string {
    return bintools.cb58Encode(asset_id)
}

export function signatureFromString(asset_id: string): Buffer {
    return bintools.cb58Decode(asset_id)
}