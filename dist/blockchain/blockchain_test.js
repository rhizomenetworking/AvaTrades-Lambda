"use strict";
/*
BLOCKCHAIN TEST


*/
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
exports.runBlockchainTestSuite = void 0;
const avalanche_1 = require("avalanche");
const blockchain_1 = require("./blockchain");
const model_1 = require("../shared/model");
const utilities_1 = require("../shared/utilities");
const tx_construction_1 = require("./tx_construction");
const secrets_1 = require("../shared/secrets");
const constants_1 = require("../shared/constants");
const NEW_TAB = "\n    ---- ";
const ADD_TEST_CASES = [
    addTestCase_P1
];
function runBlockchainTestSuite() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("Generating Test Suite ...");
        let test_suite = yield generateTestSuite();
        let report = "Test Suite Report --- " + test_suite.tx_id + "\n\n";
        for (let test_case of test_suite.test_cases) {
            console.log("Running Test Case " + test_case.id + " ...");
            let result = yield runTestCase(test_case);
            console.log(result);
            report += result;
        }
        return {
            "statusCode": 200,
            "body": report
        };
    });
}
exports.runBlockchainTestSuite = runBlockchainTestSuite;
function runTestCase(test_case) {
    return __awaiter(this, void 0, void 0, function* () {
        let expected_balances = test_case.expected_balances;
        let expected_output = test_case.expected_output;
        let actual_output = yield generateOutput(test_case.input);
        let result = "";
        result += checkOutputs(actual_output, expected_output);
        result += checkBalances(expected_balances);
        if (result === "") {
            result = NEW_TAB + "PASSED";
        }
        let header = "\nTest Case " + test_case.id + ": " + test_case.title;
        let report = header + result;
        return report;
    });
}
function generateTestSuite() {
    return __awaiter(this, void 0, void 0, function* () {
        let test_suite = makeTestSuite();
        test_suite = yield addSupplierResources(test_suite);
        for (let addTestCase of ADD_TEST_CASES) {
            test_suite = yield addTestCase(test_suite);
        }
        test_suite = yield returnUnusedSupplierResources(test_suite);
        test_suite.tx_id = yield (0, tx_construction_1.issue)(test_suite.txc);
        return test_suite;
    });
}
function generateOutput(input) {
    return __awaiter(this, void 0, void 0, function* () {
        let [input_trade, input_bids, input_royalty] = input;
        let output_bids = [];
        for (let input_bid of input_bids) {
            let output_bid = yield (0, blockchain_1.syncBid)(input_bid);
            output_bids.push(output_bid);
        }
        let output_trade = yield (0, blockchain_1.syncTrade)(input_trade, output_bids, input_royalty);
        return [output_trade, output_bids];
    });
}
function checkBalances(expected) {
    return __awaiter(this, void 0, void 0, function* () {
        let result = "";
        for (let [asset_id, address, amount] of expected) {
            let utxos = yield (0, blockchain_1.fetchUTXOs)(address, "Fuji-x", [asset_id]);
            if (utxos === undefined) {
                result += NEW_TAB + "Failed to get UTXOs of asset " + (0, utilities_1.stringFromAssetID)(asset_id) + " held by address " + (0, utilities_1.stringFromAddress)("Fuji-x", address);
            }
            else {
                let actual_amount = (0, blockchain_1.getBalance)(utxos, asset_id);
                if (actual_amount.lt(amount)) {
                    result += NEW_TAB + "Invalid Balance of address " + (0, utilities_1.stringFromAddress)("Fuji-x", address) + ", expected " + amount.toJSON() + " but found " + actual_amount.toJSON();
                }
            }
        }
        return result;
    });
}
function checkOutputs(actual, expected) {
    let [actual_trade, actual_bids] = actual;
    let [expected_trade, expected_bids] = expected;
    let result = "";
    let trades_do_match = actual_trade.id === expected_trade.id &&
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
        result += NEW_TAB + "Actual Bids is not the same length as expected Bids";
    }
    for (var i = 0; i < expected_bids.length; i++) {
        let actual_bid = actual_bids[i];
        let expected_bid = expected_bids[i];
        let bids_do_match = actual_bid.proceeds_address.equals(expected_bid.proceeds_address) &&
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
    return result;
}
function makeTestSuite() {
    return {
        "supplier": (0, utilities_1.makeKeyPair)("Fuji-x", secrets_1.TEST_SUPPLIER_PRIVATE_KEY),
        "supplied_avax": new avalanche_1.BN(0),
        "supplied_ft": new avalanche_1.BN(0),
        "supplied_nfts": [],
        "test_cases": [],
        "txc": (0, tx_construction_1.makeTxConstruction)("Fuji-x", "Ava Trades Test Suite"),
        "tx_id": "<No Transaction ID>"
    };
}
function makeTestCase(id, title, input, expected_output, expected_balances) {
    return {
        "id": id,
        "title": title,
        "input": input,
        "expected_output": expected_output,
        "expected_balances": (expected_balances === undefined) ? [] : expected_balances
    };
}
function addSupplierResources(test_suite) {
    return __awaiter(this, void 0, void 0, function* () {
        let supplier = test_suite.supplier.getAddress();
        let avax_id = yield (0, utilities_1.getAvaxID)("Fuji-x");
        let ft_id = (0, utilities_1.assetIdFromString)(constants_1.TEST_FT_ID);
        let fungible_utxos = yield (0, blockchain_1.fetchUTXOs)(supplier, "Fuji-x", [avax_id, ft_id]);
        let nft_utxos = yield (0, blockchain_1.fetchUTXOs)(supplier, "Fuji-x", [(0, utilities_1.assetIdFromString)(constants_1.TEST_NFT_ID)]);
        if (fungible_utxos === undefined || nft_utxos === undefined) {
            throw "Add Supplier Resources - Failed te fetch supplier UTXOs";
        }
        test_suite.txc = (0, tx_construction_1.addInputs)(test_suite.txc, fungible_utxos);
        test_suite.supplied_avax = (0, blockchain_1.getBalance)(fungible_utxos, avax_id);
        test_suite.supplied_ft = (0, blockchain_1.getBalance)(fungible_utxos, ft_id);
        test_suite.supplied_nfts = (nft_utxos === undefined) ? [] : nft_utxos;
        return test_suite;
    });
}
function returnUnusedSupplierResources(test_suite) {
    return __awaiter(this, void 0, void 0, function* () {
        let supplier_address = test_suite.supplier.getAddress();
        test_suite = addFTTransfer(test_suite, supplier_address, test_suite.supplied_ft);
        test_suite = yield addAVAXTransfer(test_suite, supplier_address, test_suite.supplied_avax.sub(constants_1.SERVICE_FEE));
        return test_suite;
    });
}
function addNFTTransfer(test_suite, to_address) {
    let utxo = test_suite.supplied_nfts.pop();
    if (utxo === undefined) {
        throw "Add NFT Transfer - Not enough NFTs";
    }
    test_suite.txc = (0, tx_construction_1.addNFTTransferOp)(test_suite.txc, utxo, to_address);
    return test_suite;
}
function addFTTransfer(test_suite, to_address, amount) {
    let ft_id = (0, utilities_1.assetIdFromString)(constants_1.TEST_FT_ID);
    test_suite.txc = (0, tx_construction_1.addOutput)(test_suite.txc, to_address, ft_id, amount);
    test_suite.supplied_ft = test_suite.supplied_ft.sub(amount);
    return test_suite;
}
function addAVAXTransfer(test_suite, to_address, amount) {
    return __awaiter(this, void 0, void 0, function* () {
        let avax_id = yield (0, utilities_1.getAvaxID)("Fuji-x");
        test_suite.txc = (0, tx_construction_1.addOutput)(test_suite.txc, to_address, avax_id, amount);
        test_suite.supplied_avax = test_suite.supplied_avax.sub(amount);
        return test_suite;
    });
}
//--------------------------TEST CASES ----------------------------------//
function addTestCase_P1(test_suite) {
    return __awaiter(this, void 0, void 0, function* () {
        let asset_id = (0, utilities_1.assetIdFromString)(constants_1.TEST_NFT_ID);
        let ask = new avalanche_1.BN("1000000000");
        let proceeds_address = (0, utilities_1.assetIdFromString)(constants_1.TEST_SUPPLIER_ADDRESS);
        let trade = yield (0, model_1.makeTrade)(asset_id, ask, "AUCTION", proceeds_address, "Fuji-x");
        let test_case = makeTestCase("P1", "Pending Trade whoose wallet is not expired", [trade, [], undefined], [trade, []]);
        test_suite.test_cases.push(test_case);
        return test_suite;
    });
}
