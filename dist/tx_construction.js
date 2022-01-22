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
exports.issue = exports.addNFTTransferOp = exports.addOutput = exports.addInputs = exports.addInput = exports.makeTxConstruction = void 0;
const avalanche_1 = require("avalanche");
const common_1 = require("./common");
const constants_1 = require("./constants");
const avm_1 = require("avalanche/dist/apis/avm");
const bintools = avalanche_1.BinTools.getInstance();
function makeTxConstruction(chain, memo) {
    let txc = {
        "outputs": [],
        "inputs": [],
        "ops": [],
        "chain": chain,
        "memo": bintools.stringToBuffer(memo),
        "signers": []
    };
    return txc;
}
exports.makeTxConstruction = makeTxConstruction;
function addOutput(txc, address, asset_id, amount) {
    let output = new avm_1.SECPTransferOutput(amount, [address]);
    let transferable_output = new avm_1.TransferableOutput(asset_id, output);
    txc.outputs.push(transferable_output);
    return txc;
}
exports.addOutput = addOutput;
function addInputs(txc, utxos) {
    for (let utxo of utxos) {
        txc = addInput(txc, utxo);
    }
    return txc;
}
exports.addInputs = addInputs;
function addInput(txc, utxo) {
    let tx_id = utxo.getTxID();
    let output_index = utxo.getOutputIdx();
    let asset_id = utxo.getAssetID();
    let output = utxo.getOutput();
    let amount = output.getAmount();
    let transfer_input = new avm_1.SECPTransferInput(amount);
    let spender = output.getAddress(0);
    let idx = addSigner(txc.signers, spender);
    transfer_input.addSignatureIdx(idx, spender);
    let transferable_input = new avm_1.TransferableInput(tx_id, output_index, asset_id, transfer_input);
    txc.inputs.push(transferable_input);
    return txc;
}
exports.addInput = addInput;
function addNFTTransferOp(txc, utxo, to_address) {
    let asset_id = utxo.getAssetID();
    let utxo_id = utxo.getUTXOID();
    let old_output = utxo.getOutput();
    let group_id = old_output.getGroupID();
    let payload = old_output.getPayload();
    let output = new avm_1.NFTTransferOutput(group_id, payload, [to_address]);
    let op = new avm_1.NFTTransferOperation(output);
    let spender = old_output.getAddress(0);
    let idx = addSigner(txc.signers, spender);
    op.addSignatureIdx(idx, spender);
    let transferable_op = new avm_1.TransferableOperation(asset_id, [utxo_id], op);
    txc.ops.push(transferable_op);
    return txc;
}
exports.addNFTTransferOp = addNFTTransferOp;
function issue(txc) {
    return __awaiter(this, void 0, void 0, function* () {
        let network = (0, common_1.getNetwork)(txc.chain);
        let xchain = network.XChain();
        let blockchain_id = xchain.getBlockchainID();
        let op_tx = new avm_1.OperationTx(network.getNetworkID(), bintools.cb58Decode(blockchain_id), txc.outputs, txc.inputs, txc.memo, txc.ops);
        let unsigned_tx = new avm_1.UnsignedTx(op_tx);
        let avax_id = yield (0, common_1.getAvaxID)(txc.chain);
        let burn = unsigned_tx.getBurn(avax_id);
        if (burn.gt(constants_1.SERVICE_FEE)) {
            throw "TxConstruction - Burn of " + burn.toNumber().toString() + " nAVAX exceeds service fee";
        }
        //TODO: Check if transaction is too large
        let key_chain = xchain.keyChain();
        let signed_tx = unsigned_tx.sign(key_chain);
        let tx_id = yield xchain.issueTx(signed_tx);
        return tx_id;
    });
}
exports.issue = issue;
function addSigner(signers, address) {
    for (let [idx, signer] of signers.entries()) {
        if (signer.equals(address)) {
            return idx;
        }
    }
    let length = signers.push(address);
    return length - 1;
}
