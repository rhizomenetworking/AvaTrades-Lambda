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
exports.signatureFromString = exports.stringFromSignature = exports.assetIdFromString = exports.stringFromAssetID = exports.addressFromString = exports.stringFromAddress = exports.getNetwork = exports.getProfitAddress = exports.getAvaxID = exports.makeKeyPair = void 0;
const avalanche_1 = require("avalanche");
const constants_1 = require("./constants");
const bintools = avalanche_1.BinTools.getInstance();
function makeKeyPair(chain, private_key) {
    let xchain = getNetwork(chain).XChain();
    let key_pair = xchain.keyChain().makeKey();
    if (private_key !== undefined) {
        let key_string = private_key.split("-")[1];
        let key_buf = bintools.cb58Decode(key_string);
        key_pair.importKey(key_buf);
    }
    xchain.keyChain().addKey(key_pair);
    return key_pair;
}
exports.makeKeyPair = makeKeyPair;
function getAvaxID(chain) {
    return __awaiter(this, void 0, void 0, function* () {
        let network = getNetwork(chain);
        let avax_id = yield network.XChain().getAVAXAssetID();
        return avax_id;
    });
}
exports.getAvaxID = getAvaxID;
function getProfitAddress(chain) {
    let address = (chain === "Fuji-x") ? constants_1.FUJI_PROFIT_ADDRESS : constants_1.AVALANCHE_PROFIT_ADDRESS;
    return addressFromString(chain, address);
}
exports.getProfitAddress = getProfitAddress;
function getNetwork(chain) {
    let network = (chain === "Fuji-x") ? constants_1.FUJI_NETWORK : constants_1.AVALANCHE_NETWORK;
    return network;
}
exports.getNetwork = getNetwork;
function stringFromAddress(chain, address) {
    let network = getNetwork(chain);
    return network.XChain().addressFromBuffer(address);
}
exports.stringFromAddress = stringFromAddress;
function addressFromString(chain, address) {
    let network = getNetwork(chain);
    return network.XChain().parseAddress(address);
}
exports.addressFromString = addressFromString;
function stringFromAssetID(asset_id) {
    return bintools.cb58Encode(asset_id);
}
exports.stringFromAssetID = stringFromAssetID;
function assetIdFromString(asset_id) {
    return bintools.cb58Decode(asset_id);
}
exports.assetIdFromString = assetIdFromString;
function stringFromSignature(asset_id) {
    return bintools.cb58Encode(asset_id);
}
exports.stringFromSignature = stringFromSignature;
function signatureFromString(asset_id) {
    return bintools.cb58Decode(asset_id);
}
exports.signatureFromString = signatureFromString;
