"use strict";
/*
BLOCKCHAIN TEST

OUTCOME: Pending Trade
1) Pending Trade whoose wallet is not expired

OUTCOME: Locked Trade
1) Pending Trade whoose wallet is not expired, but has recieved too many UTXOs
2) Pending Trade whoose wallet is expired, but only lacking asset
3) Pending Trade whoose wallet is expired, but only lacking service fee
4) Pending Trade whoose wallet is expired, but lacking both NFT and service fee

OUTCOME: Open Trade
1) Pending Trade whoose wallet is expired, and has recieved both service fee and asset
2) Open Trade that has no bids, and has yet to expire
3) Open Auction has a closed bid of ask, but has yet to expire
4) Open Fixed has a closed bid below ask, but has yet to expired

OUTCOME: Expired Trade
1) Open Trade has expired with no bids above ask.
2) Open Trade has expired with no bids.

OUTCOME: Closed Trade
1) Open Auction has expired with closed bids above ask
2) Open Fixed has closed bids at and above ask price, seller needs change, royalty exists

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
const ZERO = new avalanche_1.BN(0);
const ONE = new avalanche_1.BN(1);
const ONEAVAX = new avalanche_1.BN(1000000000);
const CENTIAVAX = ONEAVAX.div(new avalanche_1.BN(100));
const DEFAULT_SINK_ADDRESS = (0, utilities_1.addressFromString)("Fuji-x", constants_1.TEST_SUPPLIER_ADDRESS);
const NFT_ID = (0, utilities_1.assetIdFromString)(constants_1.TEST_NFT_ID);
const FT_ID = (0, utilities_1.assetIdFromString)(constants_1.TEST_FT_ID);
const ADD_TEST_CASES = [
    addTestCase_P1,
    addTestCase_L1,
    addTestCase_L2,
    addTestCase_L3,
    addTestCase_L4,
    addTestCase_O1,
    addTestCase_O2,
    addTestCase_O3,
    addTestCase_O4,
    addTestCase_E1,
    addTestCase_E2,
    addTestCase_C1,
    addTestCase_C2
];
function runBlockchainTestSuite() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("Generating Test Suite ...");
        let test_suite = yield generateTestSuite();
        let report = "Blockchain Test Suite Report" + NEW_TAB + test_suite.tx_id + "\n\n";
        for (let test_case of test_suite.test_cases) {
            console.log("Running Test Case " + test_case.id + " ...");
            let result = yield runTestCase(test_case);
            console.log(result);
            report += result;
        }
        return report;
    });
}
exports.runBlockchainTestSuite = runBlockchainTestSuite;
function runTestCase(test_case) {
    return __awaiter(this, void 0, void 0, function* () {
        let avax_id = yield (0, utilities_1.getAvaxID)("Fuji-x");
        let profit_utxos = yield (0, blockchain_1.fetchUTXOs)((0, utilities_1.getProfitAddress)("Fuji-x"), "Fuji-x", [avax_id]);
        if (profit_utxos === undefined) {
            throw "Run Test Case - Unable to fetch profit utxos";
        }
        let preexisting_profit = (0, blockchain_1.getBalance)(profit_utxos, avax_id);
        let expected_balances = test_case.expected_balances;
        let expected_output = test_case.expected_output;
        let actual_output = yield generateOutput(test_case.input);
        if (expected_output === "CLOSED" || expected_output === "EXPIRED") {
            yield sleep(3000);
        }
        let result = "";
        result += checkOutputs(actual_output, expected_output);
        result += yield checkBalances(expected_balances, preexisting_profit);
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
        console.log("Transaction ID: " + test_suite.tx_id);
        yield sleep(3000);
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
        output_trade = yield (0, blockchain_1.syncTrade)(input_trade, output_bids, input_royalty);
        return output_trade.status;
    });
}
function checkBalances(expected, preexisting_profit) {
    return __awaiter(this, void 0, void 0, function* () {
        let result = "";
        for (let [asset_id, address, amount] of expected) {
            let utxos = yield (0, blockchain_1.fetchUTXOs)(address, "Fuji-x", [asset_id]);
            if (utxos === undefined) {
                result += NEW_TAB + "Failed to get UTXOs of asset " + (0, utilities_1.stringFromAssetID)(asset_id) + " held by address " + (0, utilities_1.stringFromAddress)("Fuji-x", address);
            }
            else {
                let actual_amount = (0, blockchain_1.getBalance)(utxos, asset_id);
                if (address.equals((0, utilities_1.getProfitAddress)("Fuji-x"))) {
                    actual_amount.isub(preexisting_profit);
                }
                if (!actual_amount.eq(amount)) {
                    result += NEW_TAB + "Invalid Balance of address " + (0, utilities_1.stringFromAddress)("Fuji-x", address) + ", expected " + amount.toString() + " but found " + actual_amount.toString();
                }
            }
        }
        return result;
    });
}
function checkOutputs(actual, expected) {
    let result = "";
    if (actual !== expected) {
        result += NEW_TAB + "Actual Trade has status of " + actual + ", but " + expected + " was expected";
    }
    return result;
}
function sleep(ms) {
    return __awaiter(this, void 0, void 0, function* () {
        yield new Promise(resolve => setTimeout(resolve, ms));
    });
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
        let chain_fee = (0, utilities_1.getNetwork)("Fuji-x").XChain().getTxFee();
        test_suite = yield addAVAXTransfer(test_suite, supplier_address, test_suite.supplied_avax.sub(chain_fee));
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
        let trade = yield (0, model_1.makeTrade)(FT_ID, ONEAVAX, "AUCTION", DEFAULT_SINK_ADDRESS, "Fuji-x");
        let test_case = makeTestCase("P1", "Pending Trade whoose wallet is not expired", [trade, [], undefined], "PENDING");
        test_suite.test_cases.push(test_case);
        return test_suite;
    });
}
function addTestCase_L1(test_suite) {
    return __awaiter(this, void 0, void 0, function* () {
        let trade = yield (0, model_1.makeTrade)(FT_ID, ONEAVAX, "AUCTION", DEFAULT_SINK_ADDRESS, "Fuji-x");
        let wallet_address = trade.wallet.address;
        let avax_id = yield (0, utilities_1.getAvaxID)("Fuji-x");
        test_suite = addFTTransfer(test_suite, wallet_address, ONE);
        test_suite = yield addAVAXTransfer(test_suite, wallet_address, constants_1.SERVICE_FEE);
        test_suite = addNFTTransfer(test_suite, wallet_address);
        let expected_balances = [
            [FT_ID, wallet_address, ONE],
            [avax_id, wallet_address, constants_1.SERVICE_FEE],
            [NFT_ID, wallet_address, ONE]
        ];
        let test_case = makeTestCase("L1", "Pending Trade whoose wallet is not expired, but has recieved too many UTXOs", [trade, [], undefined], "LOCKED", expected_balances);
        test_suite.test_cases.push(test_case);
        return test_suite;
    });
}
function addTestCase_L2(test_suite) {
    return __awaiter(this, void 0, void 0, function* () {
        let trade = yield (0, model_1.makeTrade)(FT_ID, ONEAVAX, "AUCTION", DEFAULT_SINK_ADDRESS, "Fuji-x");
        trade.wallet.expiration = 0;
        let wallet_address = trade.wallet.address;
        let avax_id = yield (0, utilities_1.getAvaxID)("Fuji-x");
        test_suite = yield addAVAXTransfer(test_suite, wallet_address, constants_1.SERVICE_FEE);
        let expected_balances = [
            [avax_id, wallet_address, constants_1.SERVICE_FEE]
        ];
        let test_case = makeTestCase("L2", "Pending Trade whoose wallet is expired, but only lacking asset", [trade, [], undefined], "LOCKED", expected_balances);
        test_suite.test_cases.push(test_case);
        return test_suite;
    });
}
function addTestCase_L3(test_suite) {
    return __awaiter(this, void 0, void 0, function* () {
        let trade = yield (0, model_1.makeTrade)(NFT_ID, ONEAVAX, "AUCTION", DEFAULT_SINK_ADDRESS, "Fuji-x");
        trade.wallet.expiration = 0;
        let wallet_address = trade.wallet.address;
        test_suite = addNFTTransfer(test_suite, wallet_address);
        let expected_balances = [
            [NFT_ID, wallet_address, ONE]
        ];
        let test_case = makeTestCase("L3", "Pending Trade whoose wallet is expired, but only lacking service fee", [trade, [], undefined], "LOCKED", expected_balances);
        test_suite.test_cases.push(test_case);
        return test_suite;
    });
}
function addTestCase_L4(test_suite) {
    return __awaiter(this, void 0, void 0, function* () {
        let trade = yield (0, model_1.makeTrade)(NFT_ID, ONEAVAX, "AUCTION", DEFAULT_SINK_ADDRESS, "Fuji-x");
        trade.wallet.expiration = 0;
        let test_case = makeTestCase("L4", "Pending Trade whoose wallet is expired, but lacking both NFT and service fee", [trade, [], undefined], "LOCKED");
        test_suite.test_cases.push(test_case);
        return test_suite;
    });
}
function addTestCase_O1(test_suite) {
    return __awaiter(this, void 0, void 0, function* () {
        let trade = yield (0, model_1.makeTrade)(FT_ID, ONEAVAX, "AUCTION", DEFAULT_SINK_ADDRESS, "Fuji-x");
        trade.wallet.expiration = 0;
        let wallet_address = trade.wallet.address;
        let avax_id = yield (0, utilities_1.getAvaxID)("Fuji-x");
        test_suite = addFTTransfer(test_suite, wallet_address, ONE);
        test_suite = yield addAVAXTransfer(test_suite, wallet_address, constants_1.SERVICE_FEE);
        let expected_balances = [
            [FT_ID, wallet_address, ONE],
            [avax_id, wallet_address, constants_1.SERVICE_FEE],
        ];
        let test_case = makeTestCase("O1", "Pending Trade whoose wallet is expired, and has recieved both service fee and asset", [trade, [], undefined], "OPEN", expected_balances);
        test_suite.test_cases.push(test_case);
        return test_suite;
    });
}
function addTestCase_O2(test_suite) {
    return __awaiter(this, void 0, void 0, function* () {
        let trade = yield (0, model_1.makeTrade)(FT_ID, ONEAVAX, "AUCTION", DEFAULT_SINK_ADDRESS, "Fuji-x");
        trade.wallet.status = "CLOSED";
        trade.status = "OPEN";
        let test_case = makeTestCase("O2", "Open Trade that has no bids, and has yet to expire", [trade, [], undefined], "OPEN");
        test_suite.test_cases.push(test_case);
        return test_suite;
    });
}
function addTestCase_O3(test_suite) {
    return __awaiter(this, void 0, void 0, function* () {
        let trade = yield (0, model_1.makeTrade)(FT_ID, CENTIAVAX, "AUCTION", DEFAULT_SINK_ADDRESS, "Fuji-x");
        trade.wallet.status = "CLOSED";
        trade.status = "OPEN";
        let bid = yield (0, model_1.makeBid)(trade, DEFAULT_SINK_ADDRESS);
        let wallet_address = bid.wallet.address;
        let avax_id = yield (0, utilities_1.getAvaxID)("Fuji-x");
        test_suite = yield addAVAXTransfer(test_suite, wallet_address, CENTIAVAX);
        let expected_balances = [
            [avax_id, wallet_address, CENTIAVAX]
        ];
        let test_case = makeTestCase("O3", "Open Auction has a closed bid of ask, but has yet to expire", [trade, [bid], undefined], "OPEN", expected_balances);
        test_suite.test_cases.push(test_case);
        return test_suite;
    });
}
function addTestCase_O4(test_suite) {
    return __awaiter(this, void 0, void 0, function* () {
        let trade = yield (0, model_1.makeTrade)(FT_ID, CENTIAVAX, "FIXED", DEFAULT_SINK_ADDRESS, "Fuji-x");
        trade.wallet.status = "CLOSED";
        trade.status = "OPEN";
        let bid = yield (0, model_1.makeBid)(trade, DEFAULT_SINK_ADDRESS);
        let wallet_address = bid.wallet.address;
        let avax_id = yield (0, utilities_1.getAvaxID)("Fuji-x");
        test_suite = yield addAVAXTransfer(test_suite, wallet_address, CENTIAVAX.sub(ONE));
        let expected_balances = [
            [avax_id, wallet_address, CENTIAVAX.sub(ONE)]
        ];
        let test_case = makeTestCase("O4", "Open Fixed has a closed bid below ask, but has yet to expired", [trade, [bid], undefined], "OPEN", expected_balances);
        test_suite.test_cases.push(test_case);
        return test_suite;
    });
}
function addTestCase_E1(test_suite) {
    return __awaiter(this, void 0, void 0, function* () {
        let seller_address = (0, utilities_1.makeKeyPair)("Fuji-x").getAddress();
        let trade = yield (0, model_1.makeTrade)(FT_ID, CENTIAVAX.add(ONE), "FIXED", seller_address, "Fuji-x");
        let trade_address = trade.wallet.address;
        trade.deadline = 0;
        trade.wallet.expiration = 0;
        let buyer_address = (0, utilities_1.makeKeyPair)("Fuji-x").getAddress();
        let bid = yield (0, model_1.makeBid)(trade, buyer_address);
        bid.wallet.expiration = 0;
        let bid_address = bid.wallet.address;
        let profit_addresss = (0, utilities_1.getProfitAddress)("Fuji-x");
        let chain_fee = (0, utilities_1.getNetwork)("Fuji-x").XChain().getTxFee();
        let avax_id = yield (0, utilities_1.getAvaxID)("Fuji-x");
        test_suite = yield addAVAXTransfer(test_suite, trade_address, constants_1.SERVICE_FEE);
        test_suite = addFTTransfer(test_suite, trade_address, ONE);
        test_suite = yield addAVAXTransfer(test_suite, bid_address, CENTIAVAX);
        let expected_balances = [
            [avax_id, profit_addresss, constants_1.SERVICE_FEE.sub(chain_fee)],
            [avax_id, buyer_address, CENTIAVAX],
            [FT_ID, seller_address, ONE]
        ];
        let test_case = makeTestCase("E1", "Open Trade has expired with no bids above ask.", [trade, [bid], undefined], "EXPIRED", expected_balances);
        test_suite.test_cases.push(test_case);
        return test_suite;
    });
}
function addTestCase_E2(test_suite) {
    return __awaiter(this, void 0, void 0, function* () {
        let seller_address = (0, utilities_1.makeKeyPair)("Fuji-x").getAddress();
        let trade = yield (0, model_1.makeTrade)(FT_ID, CENTIAVAX, "AUCTION", seller_address, "Fuji-x");
        let trade_address = trade.wallet.address;
        trade.deadline = 0;
        trade.wallet.expiration = 0;
        let profit_addresss = (0, utilities_1.getProfitAddress)("Fuji-x");
        let chain_fee = (0, utilities_1.getNetwork)("Fuji-x").XChain().getTxFee();
        let avax_id = yield (0, utilities_1.getAvaxID)("Fuji-x");
        test_suite = yield addAVAXTransfer(test_suite, trade_address, constants_1.SERVICE_FEE);
        test_suite = addFTTransfer(test_suite, trade_address, ONE);
        let expected_balances = [
            [avax_id, profit_addresss, constants_1.SERVICE_FEE.sub(chain_fee)],
            [FT_ID, seller_address, ONE]
        ];
        let test_case = makeTestCase("E2", "Open Trade has expired with no bids.", [trade, [], undefined], "EXPIRED", expected_balances);
        test_suite.test_cases.push(test_case);
        return test_suite;
    });
}
function addTestCase_C1(test_suite) {
    return __awaiter(this, void 0, void 0, function* () {
        let seller_address = (0, utilities_1.makeKeyPair)("Fuji-x").getAddress();
        let trade = yield (0, model_1.makeTrade)(FT_ID, CENTIAVAX, "AUCTION", seller_address, "Fuji-x");
        let trade_address = trade.wallet.address;
        trade.deadline = 0;
        trade.wallet.expiration = 0;
        let buyer1_address = (0, utilities_1.makeKeyPair)("Fuji-x").getAddress();
        let bid1 = yield (0, model_1.makeBid)(trade, buyer1_address);
        bid1.wallet.expiration = 0;
        let bid1_address = bid1.wallet.address;
        let buyer2_address = (0, utilities_1.makeKeyPair)("Fuji-x").getAddress();
        let bid2 = yield (0, model_1.makeBid)(trade, buyer2_address);
        bid2.wallet.expiration = 0;
        let bid2_address = bid2.wallet.address;
        let profit_addresss = (0, utilities_1.getProfitAddress)("Fuji-x");
        let chain_fee = (0, utilities_1.getNetwork)("Fuji-x").XChain().getTxFee();
        let avax_id = yield (0, utilities_1.getAvaxID)("Fuji-x");
        test_suite = yield addAVAXTransfer(test_suite, trade_address, constants_1.SERVICE_FEE);
        test_suite = addFTTransfer(test_suite, trade_address, ONE);
        test_suite = yield addAVAXTransfer(test_suite, bid1_address, CENTIAVAX);
        test_suite = yield addAVAXTransfer(test_suite, bid2_address, CENTIAVAX.add(CENTIAVAX));
        let expected_balances = [
            [avax_id, profit_addresss, constants_1.SERVICE_FEE.sub(chain_fee)],
            [avax_id, buyer1_address, CENTIAVAX],
            [avax_id, seller_address, CENTIAVAX.add(CENTIAVAX)],
            [FT_ID, buyer2_address, ONE]
        ];
        let test_case = makeTestCase("C1", "Open Auction has expired with closed bids above ask", [trade, [bid1, bid2], undefined], "CLOSED", expected_balances);
        test_suite.test_cases.push(test_case);
        return test_suite;
    });
}
function addTestCase_C2(test_suite) {
    return __awaiter(this, void 0, void 0, function* () {
        let seller_address = (0, utilities_1.makeKeyPair)("Fuji-x").getAddress();
        let trade = yield (0, model_1.makeTrade)(NFT_ID, CENTIAVAX, "FIXED", seller_address, "Fuji-x");
        let trade_address = trade.wallet.address;
        trade.deadline = 0;
        trade.wallet.expiration = 0;
        //Closed bid above ask price
        let buyer1_address = (0, utilities_1.makeKeyPair)("Fuji-x").getAddress();
        let bid1a = yield (0, model_1.makeBid)(trade, buyer1_address);
        bid1a.wallet.expiration = 0;
        let bid1a_address = bid1a.wallet.address;
        test_suite = yield addAVAXTransfer(test_suite, bid1a_address, CENTIAVAX);
        let bid1b = yield (0, model_1.makeBid)(trade, buyer1_address);
        bid1b.wallet.expiration = 0;
        let bid1b_address = bid1b.wallet.address;
        test_suite = yield addAVAXTransfer(test_suite, bid1b_address, CENTIAVAX);
        //Closed bid below ask price
        let buyer2_address = (0, utilities_1.makeKeyPair)("Fuji-x").getAddress();
        let bid2 = yield (0, model_1.makeBid)(trade, buyer2_address);
        bid2.wallet.expiration = 0;
        let bid2_address = bid2.wallet.address;
        test_suite = yield addAVAXTransfer(test_suite, bid2_address, CENTIAVAX.sub(ONE));
        //Locked bid above ask price
        let buyer3_address = (0, utilities_1.makeKeyPair)("Fuji-x").getAddress();
        let bid3 = yield (0, model_1.makeBid)(trade, buyer3_address);
        bid3.wallet.expiration = 0;
        let bid3_address = bid3.wallet.address;
        test_suite = yield addAVAXTransfer(test_suite, bid3_address, CENTIAVAX.add(ONE));
        test_suite = addNFTTransfer(test_suite, bid3_address);
        //Royalty
        let artist_address = (0, utilities_1.makeKeyPair)("Fuji-x").getAddress();
        let now = new Date().getTime();
        let signature = new avalanche_1.Buffer("");
        let royalty = (0, model_1.makeRoyalty)(NFT_ID, artist_address, new avalanche_1.BN(21), new avalanche_1.BN(10000), "Fuji-x", now, artist_address, signature);
        let cut = CENTIAVAX.mul(royalty.numerator).divRound(royalty.divisor);
        let profit_addresss = (0, utilities_1.getProfitAddress)("Fuji-x");
        let chain_fee = (0, utilities_1.getNetwork)("Fuji-x").XChain().getTxFee();
        let avax_id = yield (0, utilities_1.getAvaxID)("Fuji-x");
        test_suite = yield addAVAXTransfer(test_suite, trade_address, constants_1.SERVICE_FEE.add(ONE));
        test_suite = addNFTTransfer(test_suite, trade_address);
        let expected_balances = [
            [avax_id, profit_addresss, constants_1.SERVICE_FEE.sub(chain_fee)],
            [avax_id, buyer1_address, CENTIAVAX],
            [NFT_ID, buyer1_address, ONE],
            [avax_id, buyer2_address, CENTIAVAX.sub(ONE)],
            [avax_id, buyer3_address, ZERO],
            [avax_id, bid3_address, CENTIAVAX.add(ONE)],
            [NFT_ID, bid3_address, ONE],
            [avax_id, artist_address, cut],
            [avax_id, seller_address, CENTIAVAX.sub(cut).add(ONE)],
        ];
        let test_case = makeTestCase("C2", "Open Fixed has closed bids at and above ask price, seller needs change, royalty exists", [trade, [bid1a, bid1b, bid2, bid3], royalty], "CLOSED", expected_balances);
        test_suite.test_cases.push(test_case);
        return test_suite;
    });
}
// async function tmp() {
//     let res = await runBlockchainTestSuite();
//     console.log(res);
// }
// tmp()
