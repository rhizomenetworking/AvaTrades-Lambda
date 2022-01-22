"use strict";
/*
OUTCOME: Pending Trade
1) Pending Auction whoose wallet is not expired

OUTCOME: Locked Trade
1) Pending Auction whoose wallet is not expired, but has recieved too many UTXOs
2) Pending Auction whoose wallet is expired, but only lacking asset
3) Pending Auction whoose wallet is expired, but only lacking service fee
4) Pending Auction whoose wallet is expired, but lacking both NFT and service fee

OUTCOME: Open Trade
) Pending Auction has service fee + one NFT
) Pending Auction has service fee + many NFTs
) Pending Auction has service fee + one FT
) Pending Auction has service fee + many FT
) Open Auction has no bids, but has not expired
) Open Auction has bids above ask, but has not expired
) Open Fixed has bids below ask, but has not expired

OUTCOME: Expired Trade
) Open Auction has expired with zero bids
) Open Auction has expired with many bids below ask

OUTCOME: Closed Trade
) Open Auction has expired with many locked, open, and closed bids above ask
) Open Fixed has expired with exactly one bid at ask price, but seller needs change
) Open Fixed has expired with exactly one bid above ask price and royalty

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
exports.runTestSuite = void 0;
const avalanche_1 = require("avalanche");
const monitor_1 = require("./monitor");
const prepare_1 = require("./prepare");
const service_1 = require("./service");
const database_1 = require("./database");
const tx_construction_1 = require("./tx_construction");
const secrets_1 = require("./secrets");
const constants_1 = require("./constants");
const blockchain_1 = require("./blockchain");
const common_1 = require("./common");
function runTestSuite() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("Generating Test Suite ...");
        let test_suite = yield generateTestSuite();
        console.log("Issuing Transaction ...");
        let tx_id = yield (0, tx_construction_1.issue)(test_suite.txc);
        console.log("Sleeping ...");
        yield sleep(3000);
        console.log("Running Monitor ...");
        yield (0, monitor_1.runMonitor)();
        console.log("Sleeping ...");
        yield sleep(1000);
        console.log("Running Test Cases ...");
        let report = "Test Suite Report --- " + tx_id + "\n\n";
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
exports.runTestSuite = runTestSuite;
function runTestCase(test_case) {
    return __awaiter(this, void 0, void 0, function* () {
        let trade_id = test_case.trade_id;
        let result = "\nTest Case " + test_case.id + " (" + trade_id + ")\n    ---- ";
        let expected_status = test_case.expected_status;
        let actual_status = yield getTradeStatus(trade_id);
        if (actual_status !== expected_status) {
            result += "Invalid Trade Status, expected " + expected_status + " but found " + actual_status;
            return result;
        }
        for (let [asset_id, address, amount] of test_case.expected_balances) {
            let utxos = yield (0, blockchain_1.fetchUTXOs)(address, "Fuji-x", [asset_id]);
            if (utxos === undefined) {
                result += "Failed to get UTXOs of asset " + (0, common_1.stringFromAssetID)(asset_id) + " held by address " + (0, common_1.stringFromAddress)("Fuji-x", address);
                return result;
            }
            let actual_amount = (0, blockchain_1.getBalance)(utxos, asset_id);
            if (actual_amount.lt(amount)) {
                result += "Invalid Balance of address " + (0, common_1.stringFromAddress)("Fuji-x", address) + ", expected " + amount.toJSON() + " but found " + actual_amount.toJSON();
                return result;
            }
        }
        yield (0, database_1.deleteTrade)(trade_id);
        result += "PASSED";
        return result;
    });
}
function getTradeStatus(trade_id) {
    return __awaiter(this, void 0, void 0, function* () {
        let params = {
            "trade_id": trade_id
        };
        let prep = yield (0, prepare_1.prepareReadTrade)(params);
        let api_trade = yield (0, service_1.readTrade)(prep);
        return api_trade.status;
    });
}
function expireTradeWallet(trade_id) {
    return __awaiter(this, void 0, void 0, function* () {
        let trade = yield (0, database_1.fetchTrade)(trade_id);
        if (trade === undefined) {
            throw "Expire Trade Wallet - Trade Not Found";
        }
        trade.wallet.expiration = 0;
        yield (0, database_1.putTrade)(trade);
    });
}
function makeTestSuite(txc) {
    return {
        "supplier": (0, common_1.makeKeyPair)("Fuji-x", secrets_1.TEST_SUPPLIER_PRIVATE_KEY),
        "supplied_avax": new avalanche_1.BN(0),
        "supplied_ft": new avalanche_1.BN(0),
        "supplied_nfts": [],
        "test_cases": [],
        "txc": txc
    };
}
function makeTestCase(id, trade_id, expected_status, expected_balances) {
    return {
        "id": id,
        "trade_id": trade_id,
        "expected_status": expected_status,
        "expected_balances": (expected_balances === undefined) ? [] : expected_balances
    };
}
function makeSinkAddressString() {
    let key_pair = (0, common_1.makeKeyPair)("Fuji-x");
    return key_pair.getAddressString();
}
function generateTestSuite() {
    return __awaiter(this, void 0, void 0, function* () {
        let txc = (0, tx_construction_1.makeTxConstruction)("Fuji-x", "Ava Trades Test Suite");
        let test_suite = makeTestSuite(txc);
        test_suite = yield addSupplierResources(test_suite);
        for (let addTestCase of ADD_TEST_CASES) {
            test_suite = yield addTestCase(test_suite);
        }
        test_suite = yield returnUnusedSupplierResources(test_suite);
        return test_suite;
    });
}
function addSupplierResources(test_suite) {
    return __awaiter(this, void 0, void 0, function* () {
        let supplier = test_suite.supplier.getAddress();
        let avax_id = yield (0, common_1.getAvaxID)("Fuji-x");
        let ft_id = (0, common_1.assetIdFromString)(constants_1.TEST_FT_ID);
        let fungible_utxos = yield (0, blockchain_1.fetchUTXOs)(supplier, "Fuji-x", [avax_id, ft_id]);
        let nft_utxos = yield (0, blockchain_1.fetchUTXOs)(supplier, "Fuji-x", [(0, common_1.assetIdFromString)(constants_1.TEST_NFT_ID)]);
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
    let ft_id = (0, common_1.assetIdFromString)(constants_1.TEST_FT_ID);
    test_suite.txc = (0, tx_construction_1.addOutput)(test_suite.txc, to_address, ft_id, amount);
    test_suite.supplied_ft = test_suite.supplied_ft.sub(amount);
    return test_suite;
}
function addAVAXTransfer(test_suite, to_address, amount) {
    return __awaiter(this, void 0, void 0, function* () {
        let avax_id = yield (0, common_1.getAvaxID)("Fuji-x");
        test_suite.txc = (0, tx_construction_1.addOutput)(test_suite.txc, to_address, avax_id, amount);
        test_suite.supplied_avax = test_suite.supplied_avax.sub(amount);
        return test_suite;
    });
}
function sleep(ms) {
    return __awaiter(this, void 0, void 0, function* () {
        yield new Promise(resolve => setTimeout(resolve, ms));
    });
}
const ADD_TEST_CASES = [
    addTestCase_P1,
    addTestCase_L1,
    addTestCase_L2,
    addTestCase_L3,
    addTestCase_L4
];
//--------------------------TEST CASES ----------------------------------//
function addTestCase_P1(test_suite) {
    return __awaiter(this, void 0, void 0, function* () {
        let params = {
            "asset_id": constants_1.TEST_NFT_ID,
            "ask": "10000000000",
            "allows_bidding": "true",
            "address": constants_1.TEST_SUPPLIER_ADDRESS,
            "chain": "Fuji-x"
        };
        let prep = (0, prepare_1.prepareCreateTrade)(params);
        let response = yield (0, service_1.createTrade)(prep);
        let trade_id = response.trade_id;
        let test_case = makeTestCase("P1", trade_id, "PENDING");
        test_suite.test_cases.push(test_case);
        return test_suite;
    });
}
function addTestCase_L1(test_suite) {
    return __awaiter(this, void 0, void 0, function* () {
        let params = {
            "asset_id": constants_1.TEST_FT_ID,
            "ask": "10000000000",
            "allows_bidding": "true",
            "address": constants_1.TEST_SUPPLIER_ADDRESS,
            "chain": "Fuji-x"
        };
        let prep = (0, prepare_1.prepareCreateTrade)(params);
        let response = yield (0, service_1.createTrade)(prep);
        let wallet_address = (0, common_1.addressFromString)("Fuji-x", response.address);
        let avax_id = yield (0, common_1.getAvaxID)("Fuji-x");
        test_suite = addFTTransfer(test_suite, wallet_address, new avalanche_1.BN(1));
        test_suite = yield addAVAXTransfer(test_suite, wallet_address, constants_1.SERVICE_FEE);
        test_suite = addNFTTransfer(test_suite, wallet_address);
        let expected_balances = [
            [(0, common_1.assetIdFromString)(constants_1.TEST_FT_ID), wallet_address, new avalanche_1.BN(1)],
            [avax_id, wallet_address, constants_1.SERVICE_FEE],
            [(0, common_1.assetIdFromString)(constants_1.TEST_NFT_ID), wallet_address, new avalanche_1.BN(1)]
        ];
        let test_case = makeTestCase("L1", response.trade_id, "LOCKED", expected_balances);
        test_suite.test_cases.push(test_case);
        return test_suite;
    });
}
function addTestCase_L2(test_suite) {
    return __awaiter(this, void 0, void 0, function* () {
        let params = {
            "asset_id": constants_1.TEST_FT_ID,
            "ask": "10000000000",
            "allows_bidding": "true",
            "address": constants_1.TEST_SUPPLIER_ADDRESS,
            "chain": "Fuji-x"
        };
        let prep = (0, prepare_1.prepareCreateTrade)(params);
        let response = yield (0, service_1.createTrade)(prep);
        let wallet_address = (0, common_1.addressFromString)("Fuji-x", response.address);
        let avax_id = yield (0, common_1.getAvaxID)("Fuji-x");
        test_suite = yield addAVAXTransfer(test_suite, wallet_address, constants_1.SERVICE_FEE);
        let expected_balances = [
            [avax_id, wallet_address, constants_1.SERVICE_FEE]
        ];
        yield expireTradeWallet(response.trade_id);
        let test_case = makeTestCase("L2", response.trade_id, "LOCKED", expected_balances);
        test_suite.test_cases.push(test_case);
        return test_suite;
    });
}
function addTestCase_L3(test_suite) {
    return __awaiter(this, void 0, void 0, function* () {
        let params = {
            "asset_id": constants_1.TEST_FT_ID,
            "ask": "10000000000",
            "allows_bidding": "true",
            "address": constants_1.TEST_SUPPLIER_ADDRESS,
            "chain": "Fuji-x"
        };
        let prep = (0, prepare_1.prepareCreateTrade)(params);
        let response = yield (0, service_1.createTrade)(prep);
        let wallet_address = (0, common_1.addressFromString)("Fuji-x", response.address);
        test_suite = addFTTransfer(test_suite, wallet_address, new avalanche_1.BN(1));
        let expected_balances = [
            [(0, common_1.assetIdFromString)(constants_1.TEST_FT_ID), wallet_address, new avalanche_1.BN(1)]
        ];
        yield expireTradeWallet(response.trade_id);
        let test_case = makeTestCase("L3", response.trade_id, "LOCKED", expected_balances);
        test_suite.test_cases.push(test_case);
        return test_suite;
    });
}
function addTestCase_L4(test_suite) {
    return __awaiter(this, void 0, void 0, function* () {
        let params = {
            "asset_id": constants_1.TEST_FT_ID,
            "ask": "10000000000",
            "allows_bidding": "true",
            "address": constants_1.TEST_SUPPLIER_ADDRESS,
            "chain": "Fuji-x"
        };
        let prep = (0, prepare_1.prepareCreateTrade)(params);
        let response = yield (0, service_1.createTrade)(prep);
        yield expireTradeWallet(response.trade_id);
        let test_case = makeTestCase("L4", response.trade_id, "LOCKED");
        test_suite.test_cases.push(test_case);
        return test_suite;
    });
}
