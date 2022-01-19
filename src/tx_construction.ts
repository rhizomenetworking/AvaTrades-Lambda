import { BinTools, BN, Buffer } from "avalanche";
import { Chain } from "./model";
import { AVALANCHE_NETWORK, FUJI_NETWORK } from "./constants";
import { 
    UTXO, 
    OperationTx, UnsignedTx, 
    TransferableInput, TransferableOutput, TransferableOperation, 
    SECPTransferInput, SECPTransferOutput, NFTTransferOutput, NFTTransferOperation
} from "avalanche/dist/apis/avm"

const bintools = BinTools.getInstance();

interface TxConstruction {
    outputs: TransferableOutput[];
    inputs: TransferableInput[];
    ops: TransferableOperation[];
    chain: Chain;
    memo: Buffer;
    signers: Buffer[];
}

function makeTxConstruction(chain: Chain, memo: string): TxConstruction {
    let txc: TxConstruction = {
        "outputs": [],
        "inputs": [],
        "ops": [],
        "chain": chain,
        "memo": bintools.stringToBuffer(memo),
        "signers": []
    }
    return txc
}

function addOutput(txc: TxConstruction, address: Buffer, asset_id: Buffer, amount: BN): TxConstruction {
    let output = new SECPTransferOutput(amount, [address]);
    let transferable_output = new TransferableOutput(asset_id, output);
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
    let spender = output.getAddress(0);
    let idx = addSigner(txc.signers, spender);
    transfer_input.addSignatureIdx(idx, spender); 
    let transferable_input = new TransferableInput(tx_id, output_index, asset_id, transfer_input);
    txc.inputs.push(transferable_input);
    return txc
}

function addNFTTransferOp(txc: TxConstruction, utxo: UTXO, to_address: Buffer) {
    let asset_id = utxo.getAssetID();
    let utxo_id = utxo.getUTXOID();
    let old_output = utxo.getOutput() as NFTTransferOutput;
    let group_id = old_output.getGroupID();
    let payload = old_output.getPayload();
    let output = new NFTTransferOutput(group_id, payload, [to_address]);
    let op = new NFTTransferOperation(output);
    let spender = old_output.getAddress(0);
    let idx = addSigner(txc.signers, spender);
    op.addSignatureIdx(idx, spender); 
    let transferable_op = new TransferableOperation(asset_id, [utxo_id], op);
    txc.ops.push(transferable_op);
    return txc
}

function issue(txc: TxConstruction): Promise<string> {
    let network = (txc.chain === "Fuji-x") ? FUJI_NETWORK : AVALANCHE_NETWORK;
    let xchain = network.XChain();
    let blockchain_id = xchain.getBlockchainID();
    let op_tx = new OperationTx(
        network.getNetworkID(), 
        bintools.cb58Decode(blockchain_id), 
        txc.outputs, 
        txc.inputs, 
        txc.memo, 
        txc.ops)

    let unsigned_tx = new UnsignedTx(op_tx);
    let key_chain = xchain.keyChain();
    let signed_tx = unsigned_tx.sign(key_chain);
    return xchain.issueTx(signed_tx)
}

function addSigner(signers: Buffer[], address: Buffer): number {
    for (let [idx, signer] of signers.entries()) {
        if (signer.equals(address)) {
            return idx
        }
    }
    let length = signers.push(address);
    return length - 1
}

export { TxConstruction, makeTxConstruction, addInput, addInputs, addOutput, addNFTTransferOp, issue }