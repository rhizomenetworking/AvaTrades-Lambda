"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.issue = exports.addNFTTransferOp = exports.addOutput = exports.addInputs = exports.addInput = exports.makeTxConstruction = void 0;
const avalanche_1 = require("avalanche");
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
    let network = (txc.chain === "Fuji-x") ? constants_1.FUJI_NETWORK : constants_1.AVALANCHE_NETWORK;
    let xchain = network.XChain();
    let blockchain_id = xchain.getBlockchainID();
    let op_tx = new avm_1.OperationTx(network.getNetworkID(), bintools.cb58Decode(blockchain_id), txc.outputs, txc.inputs, txc.memo, txc.ops);
    let unsigned_tx = new avm_1.UnsignedTx(op_tx);
    let key_chain = xchain.keyChain();
    let signed_tx = unsigned_tx.sign(key_chain);
    return xchain.issueTx(signed_tx);
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