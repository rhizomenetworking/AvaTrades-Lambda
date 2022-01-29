/*
BLOCKCHAIN TEST


*/

import { BN, Buffer } from "avalanche";
import { UTXO, KeyPair } from "avalanche/dist/apis/avm"
import { syncTrade, syncBid, fetchUTXOs, getBalance } from "./blockchain"
import { Trade, Bid, Royalty, makeTrade } from "../shared/model"
import { stringFromAddress, stringFromAssetID, assetIdFromString, getAvaxID, makeKeyPair } from "../shared/utilities"
import { TxConstruction, makeTxConstruction, issue, addInputs, addNFTTransferOp, addOutput } from "./tx_construction";
import { TEST_SUPPLIER_PRIVATE_KEY } from "../shared/secrets";
import { SERVICE_FEE, TEST_FT_ID, TEST_NFT_ID, TEST_SUPPLIER_ADDRESS } from "../shared/constants";

const NEW_TAB = "\n    ---- ";
const ADD_TEST_CASES = [
    addTestCase_P1
];

export async function runBlockchainTestSuite() {
    console.log("Generating Test Suite ...");
    let test_suite = await generateTestSuite();
    let report = "Test Suite Report --- " + test_suite.tx_id + "\n\n";
    for (let test_case of test_suite.test_cases) {
        console.log("Running Test Case " + test_case.id + " ...")
        let result = await runTestCase(test_case);
        console.log(result)
        report += result;
    }
    return {
        "statusCode": 200,
        "body": report
    }
}

async function runTestCase(test_case: TestCase): Promise<string> {
    let expected_balances = test_case.expected_balances;
    let expected_output = test_case.expected_output;
    let actual_output = await generateOutput(test_case.input);
    let result = "";
    result += checkOutputs(actual_output, expected_output);
    result += checkBalances(expected_balances);
    if (result === "") {
        result = NEW_TAB + "PASSED";
    }
    let header = "\nTest Case " + test_case.id + ": " + test_case.title;
    let report = header + result;
    return report
}

async function generateTestSuite(): Promise<TestSuite> {
    let test_suite = makeTestSuite();
    test_suite = await addSupplierResources(test_suite);
    for (let addTestCase of ADD_TEST_CASES) {
        test_suite = await addTestCase(test_suite);
    }
    test_suite = await returnUnusedSupplierResources(test_suite);
    test_suite.tx_id = await issue(test_suite.txc);
    return test_suite
}

async function generateOutput(input: TestInput): Promise<TestOuptput> {
    let [input_trade, input_bids, input_royalty] = input;
    let output_bids: Bid[] = [];
    for (let input_bid of input_bids) {
        let output_bid = await syncBid(input_bid);
        output_bids.push(output_bid);
    }
    let output_trade = await syncTrade(input_trade, output_bids, input_royalty);
    return [output_trade, output_bids]
}

async function checkBalances(expected: AssetAddressAmount[]): Promise<string> {
    let result = "";
    for (let [asset_id, address, amount] of expected) {
        let utxos = await fetchUTXOs(address, "Fuji-x", [asset_id]);
        if (utxos === undefined) {
            result += NEW_TAB + "Failed to get UTXOs of asset " + stringFromAssetID(asset_id) + " held by address " + stringFromAddress("Fuji-x", address);
        } else {
            let actual_amount = getBalance(utxos, asset_id);
            if (actual_amount.lt(amount)) {
                result += NEW_TAB + "Invalid Balance of address " + stringFromAddress("Fuji-x", address) + ", expected " + amount.toJSON() + " but found " + actual_amount.toJSON(); 
            }
        }
    }
    return result
}

function checkOutputs(actual: TestOuptput, expected: TestOuptput): string {
    let [actual_trade, actual_bids] = actual;
    let [expected_trade, expected_bids] = expected;
    let result = "";

    let trades_do_match: Boolean =
        actual_trade.id === expected_trade.id &&
        actual_trade.deadline === expected_trade.deadline &&
        actual_trade.mode === expected_trade.mode &&
        actual_trade.status === expected_trade.status &&
        actual_trade.proceeds_address.equals(expected_trade.proceeds_address) &&
        actual_trade.ask.eq(expected_trade.ask) &&
        actual_trade.wallet.status === expected_trade.wallet.status &&
        actual_trade.wallet.address.equals(expected_trade.wallet.address) &&
        actual_trade.wallet.avax_requirement.eq(expected_trade.wallet.avax_requirement) &&
        actual_trade.wallet.chain === expected_trade.wallet.chain &&
        actual_trade.wallet.expiration === expected_trade.wallet.expiration &&
        actual_trade.wallet.status === expected_trade.wallet.status &&
        actual_trade.wallet.private_key.getPrivateKeyString() === expected_trade.wallet.private_key.getPrivateKeyString();

    if (!trades_do_match) {
        result += NEW_TAB + "Actual Trade does not equal expected Trade";
        console.log(actual_trade);
        console.log(expected_trade);
    }

    if (actual_bids.length !== expected_bids.length) {
        result += NEW_TAB + "Actual Bids is not the same length as expected Bids"
    }

    for (var i = 0; i < expected_bids.length; i++) {
        let actual_bid = actual_bids[i];
        let expected_bid = expected_bids[i];
        let bids_do_match: Boolean =
            actual_bid.proceeds_address.equals(expected_bid.proceeds_address) &&
            actual_bid.trade_id === expected_bid.trade_id &&
            actual_bid.wallet.status === expected_bid.wallet.status &&
            actual_bid.wallet.address.equals(expected_bid.wallet.address) &&
            actual_bid.wallet.avax_requirement.eq(expected_bid.wallet.avax_requirement) &&
            actual_bid.wallet.chain === expected_bid.wallet.chain &&
            actual_bid.wallet.expiration === expected_bid.wallet.expiration &&
            actual_bid.wallet.status === expected_bid.wallet.status &&
            actual_bid.wallet.private_key.getPrivateKeyString() === expected_bid.wallet.private_key.getPrivateKeyString();

        if (!bids_do_match) {
            result += NEW_TAB + "Actual Bid does not equal expected Bid";
            console.log(actual_bid);
            console.log(expected_bid);
        }
    }

    return result
}

interface TestSuite {
    supplier: KeyPair;
    supplied_avax: BN;
    supplied_ft: BN;
    supplied_nfts: UTXO[];
    txc: TxConstruction;
    tx_id: string;
    test_cases: TestCase[];
}

interface TestCase {
    id: string;
    title: string;
    input: TestInput;
    expected_output: TestOuptput;
    expected_balances: AssetAddressAmount[];
}

type TestInput = [Trade, Bid[], Royalty | undefined];
type TestOuptput = [Trade, Bid[]];
type AssetAddressAmount = [Buffer, Buffer, BN];

function makeTestSuite(): TestSuite {
    return {
        "supplier": makeKeyPair("Fuji-x", TEST_SUPPLIER_PRIVATE_KEY),
        "supplied_avax": new BN(0),
        "supplied_ft": new BN(0), 
        "supplied_nfts": [],
        "test_cases": [],
        "txc":  makeTxConstruction("Fuji-x", "Ava Trades Test Suite"),
        "tx_id": "<No Transaction ID>"
    }
}

function makeTestCase(id: string, title: string, input: TestInput, expected_output: TestOuptput, expected_balances?: AssetAddressAmount[]): TestCase {
    return {
        "id": id,
        "title": title,
        "input": input,
        "expected_output": expected_output,
        "expected_balances": (expected_balances === undefined) ? [] : expected_balances
    }
}

async function addSupplierResources(test_suite: TestSuite): Promise<TestSuite> {
    let supplier = test_suite.supplier.getAddress();
    let avax_id = await getAvaxID("Fuji-x");
    let ft_id = assetIdFromString(TEST_FT_ID);
    let fungible_utxos = await fetchUTXOs(supplier, "Fuji-x", [avax_id, ft_id]);
    let nft_utxos = await fetchUTXOs(supplier, "Fuji-x", [assetIdFromString(TEST_NFT_ID)]);
    if (fungible_utxos === undefined || nft_utxos === undefined) {
        throw "Add Supplier Resources - Failed te fetch supplier UTXOs"
    }
    test_suite.txc = addInputs(test_suite.txc, fungible_utxos);
    test_suite.supplied_avax = getBalance(fungible_utxos, avax_id);
    test_suite.supplied_ft = getBalance(fungible_utxos, ft_id);
    test_suite.supplied_nfts = (nft_utxos === undefined) ? [] : nft_utxos;
    return test_suite
}

async function returnUnusedSupplierResources(test_suite: TestSuite): Promise<TestSuite> {
    let supplier_address = test_suite.supplier.getAddress();
    test_suite = addFTTransfer(test_suite, supplier_address, test_suite.supplied_ft);
    test_suite = await addAVAXTransfer(test_suite, supplier_address, test_suite.supplied_avax.sub(SERVICE_FEE));
    return test_suite
}

function addNFTTransfer(test_suite: TestSuite, to_address: Buffer): TestSuite {
    let utxo = test_suite.supplied_nfts.pop();
    if (utxo === undefined) {
        throw "Add NFT Transfer - Not enough NFTs"
    }
    test_suite.txc = addNFTTransferOp(test_suite.txc, utxo, to_address);
    return test_suite
}

function addFTTransfer(test_suite: TestSuite, to_address: Buffer, amount: BN): TestSuite {
    let ft_id = assetIdFromString(TEST_FT_ID);
    test_suite.txc = addOutput(test_suite.txc, to_address, ft_id, amount);
    test_suite.supplied_ft = test_suite.supplied_ft.sub(amount);
    return test_suite
}

async function addAVAXTransfer(test_suite: TestSuite, to_address: Buffer, amount: BN): Promise<TestSuite> {
    let avax_id = await getAvaxID("Fuji-x");
    test_suite.txc = addOutput(test_suite.txc, to_address, avax_id, amount);
    test_suite.supplied_avax = test_suite.supplied_avax.sub(amount);
    return test_suite
}


//--------------------------TEST CASES ----------------------------------//
async function addTestCase_P1(test_suite: TestSuite): Promise<TestSuite> {
    let asset_id = assetIdFromString(TEST_NFT_ID);
    let ask = new BN("1000000000");
    let proceeds_address = assetIdFromString(TEST_SUPPLIER_ADDRESS);
    let trade = await makeTrade(asset_id, ask, "AUCTION", proceeds_address, "Fuji-x");
    let test_case = makeTestCase(
        "P1", 
        "Pending Trade whoose wallet is not expired",
        [trade, [], undefined],
        [trade, []]
    )
    test_suite.test_cases.push(test_case);
    return test_suite
}


