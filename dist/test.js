"use strict";
/*
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

OUTCOME: Closed Trade
) Open Auction has expired with closed bids above ask
) Open Fixed has closed bids at and above ask price, seller needs change, royalty exists

*/
// import { Avalanche, BN, Buffer, BinTools } from "avalanche";
// import { runMonitor } from "./monitor"
// import { prepareCreateBid, prepareCreateTrade, prepareReadTrade } from "./server/prepare";
// import { createBid, createTrade, readTrade } from "./service";
// import { deleteTrade, fetchBids, fetchTrade, putBid, putTrade } from "./database/database";
// import { TxConstruction, makeTxConstruction, addInput, addOutput, addNFTTransferOp, issue, addInputs } from "./blockchain/tx_construction";
// import { TEST_SUPPLIER_PRIVATE_KEY } from "./shared/secrets";
// import { FUJI_NETWORK, TEST_NFT_ID, TEST_FT_ID, SERVICE_FEE, TEST_SUPPLIER_ADDRESS } from "./shared/constants";
// import { fetchUTXOs, getBalance } from "./blockchain/blockchain";
// import { makeTrade, Trade, TradeStatus} from "./shared/model";
// import { addressFromString, getAvaxID, stringFromAddress, stringFromAssetID, assetIdFromString, makeKeyPair } from "./shared/utilities";
// import { BaseNFTOutput } from "avalanche/dist/common";
// import { InitialStates, SECPMintOutput, UTXO, UTXOSet, UnsignedTx, Tx, SECPTransferOutput, KeyPair } from "avalanche/dist/apis/avm";
// export async function runTestSuite() {
//     let test_suite = await generateTestSuite();
//     let report = "Test Suite Report --- " + test_suite.tx_id + "\n\n";
//     for (let test_case of test_suite.test_cases) {
//         console.log("Running Test Case " + test_case.id + " ...")
//         let result = await runTestCase(test_case);
//         console.log(result)
//         report += result;
//     }
//     return {
//         "statusCode": 200,
//         "body": report
//     }
// }
// async function generateTestSuite(): Promise<TestSuite> {
//     console.log("Generating Test Suite ...");
//     let test_suite = makeTestSuite();
//     console.log("Adding Supplier Resources ...");
//     test_suite = await addSupplierResources(test_suite);
//     for (let addTestCase of ADD_TEST_CASES) {
//         test_suite = await addTestCase(test_suite);
//     }
//     test_suite = await returnUnusedSupplierResources(test_suite);
//     console.log("Issuing Transaction ...");
//     test_suite.tx_id = await issue(test_suite.txc);
//     console.log("Running Monitor ...");
//     await sleep(3000);
//     await runMonitor();
//     await sleep(1000);
//     return test_suite
// }
// async function runTestCase(test_case: TestCase): Promise<string> {
//     let trade_id = test_case.trade_id;
//     let result = "\nTest Case " + test_case.id + " (" + trade_id + ")\n    ---- ";
//     let expected_status = test_case.expected_status;
//     let actual_status = await getTradeStatus(trade_id);
//     if (actual_status !== expected_status) {
//         result += "Invalid Trade Status, expected " + expected_status + " but found " + actual_status;
//         return result
//     } 
//     for (let [asset_id, address, amount] of test_case.expected_balances) {
//         let utxos = await fetchUTXOs(address, "Fuji-x", [asset_id]);
//         if (utxos === undefined) {
//             result += "Failed to get UTXOs of asset " + stringFromAssetID(asset_id) + " held by address " + stringFromAddress("Fuji-x", address);
//             return result 
//         } 
//         let actual_amount = getBalance(utxos, asset_id);
//         if (actual_amount.lt(amount)) {
//             result += "Invalid Balance of address " + stringFromAddress("Fuji-x", address) + ", expected " + amount.toJSON() + " but found " + actual_amount.toJSON(); 
//             return result
//         }
//     }
//     await deleteTrade(trade_id);
//     result += "PASSED";
//     return result
// }
// async function getTradeStatus(trade_id: string): Promise<TradeStatus> {
//     let params = {
//         "trade_id": trade_id
//     }
//     let prep = await prepareReadTrade(params);
//     let api_trade = await readTrade(prep);
//     return api_trade.status
// }
// async function expireTradeWallet(trade_id: string) {
//     let trade = await fetchTrade(trade_id);
//     if (trade === undefined) {
//         throw "Expire Trade Wallet - Trade Not Found"
//     }
//     trade.wallet.expiration = 0;
//     await putTrade(trade);
// }
// async function expireTrade(trade_id: string) {
//     let trade = await fetchTrade(trade_id);
//     if (trade === undefined) {
//         throw "Expire Trade - Trade Not Found"
//     }
//     trade.deadline = 0;
//     await putTrade(trade);
// }
// async function expireBids(trade: Trade) {
//     let [bids, _] = await fetchBids(trade, "FIRST");
//     for (let bid of bids) {
//         bid.wallet.expiration = 0;
//         await putBid(bid)
//     }
// }
// async function sleep(ms: number) {
//     await new Promise(resolve => setTimeout(resolve, ms));
// }
// interface TestSuite {
// supplier: KeyPair;
// supplied_avax: BN;
// supplied_ft: BN;
// supplied_nfts: UTXO[];
//     test_cases: TestCase[];
//     txc: TxConstruction;
//     tx_id: string;
// }
// interface TestCase {
//     id: string;
//     trade_id: string;
//     expected_status: TradeStatus;
//     expected_balances: AssetAddressAmount[];
// }
// type AssetAddressAmount = [Buffer, Buffer, BN]
// function makeTestSuite(): TestSuite {
//     return {
//         "supplier": makeKeyPair("Fuji-x", TEST_SUPPLIER_PRIVATE_KEY),
//         "supplied_avax": new BN(0),
//         "supplied_ft": new BN(0), 
//         "supplied_nfts": [],
//         "test_cases": [],
//         "txc":  makeTxConstruction("Fuji-x", "Ava Trades Test Suite"),
//         "tx_id": "<No Transaction ID>"
//     }
// }
// function makeTestCase(id: string, trade_id: string, expected_status: TradeStatus, expected_balances?: AssetAddressAmount[]): TestCase {
//     return {
//         "id": id,
//         "trade_id": trade_id,
//         "expected_status": expected_status,
//         "expected_balances": (expected_balances === undefined) ? [] : expected_balances
//     }
// }
// async function addSupplierResources(test_suite: TestSuite): Promise<TestSuite> {
//     let supplier = test_suite.supplier.getAddress();
//     let avax_id = await getAvaxID("Fuji-x");
//     let ft_id = assetIdFromString(TEST_FT_ID);
//     let fungible_utxos = await fetchUTXOs(supplier, "Fuji-x", [avax_id, ft_id]);
//     let nft_utxos = await fetchUTXOs(supplier, "Fuji-x", [assetIdFromString(TEST_NFT_ID)]);
//     if (fungible_utxos === undefined || nft_utxos === undefined) {
//         throw "Add Supplier Resources - Failed te fetch supplier UTXOs"
//     }
//     test_suite.txc = addInputs(test_suite.txc, fungible_utxos);
//     test_suite.supplied_avax = getBalance(fungible_utxos, avax_id);
//     test_suite.supplied_ft = getBalance(fungible_utxos, ft_id);
//     test_suite.supplied_nfts = (nft_utxos === undefined) ? [] : nft_utxos;
//     return test_suite
// }
// async function returnUnusedSupplierResources(test_suite: TestSuite): Promise<TestSuite> {
//     let supplier_address = test_suite.supplier.getAddress();
//     test_suite = addFTTransfer(test_suite, supplier_address, test_suite.supplied_ft);
//     test_suite = await addAVAXTransfer(test_suite, supplier_address, test_suite.supplied_avax.sub(SERVICE_FEE));
//     return test_suite
// }
// function addNFTTransfer(test_suite: TestSuite, to_address: Buffer): TestSuite {
//     let utxo = test_suite.supplied_nfts.pop();
//     if (utxo === undefined) {
//         throw "Add NFT Transfer - Not enough NFTs"
//     }
//     test_suite.txc = addNFTTransferOp(test_suite.txc, utxo, to_address);
//     return test_suite
// }
// function addFTTransfer(test_suite: TestSuite, to_address: Buffer, amount: BN): TestSuite {
//     let ft_id = assetIdFromString(TEST_FT_ID);
//     test_suite.txc = addOutput(test_suite.txc, to_address, ft_id, amount);
//     test_suite.supplied_ft = test_suite.supplied_ft.sub(amount);
//     return test_suite
// }
// async function addAVAXTransfer(test_suite: TestSuite, to_address: Buffer, amount: BN): Promise<TestSuite> {
//     let avax_id = await getAvaxID("Fuji-x");
//     test_suite.txc = addOutput(test_suite.txc, to_address, avax_id, amount);
//     test_suite.supplied_avax = test_suite.supplied_avax.sub(amount);
//     return test_suite
// }
// const ADD_TEST_CASES = [
//     addTestCase_P1,
//     addTestCase_L1,
//     addTestCase_L2,
//     addTestCase_L3,
//     addTestCase_L4,
//     addTestCase_O1,
//     addTestCase_O2,
//     addTestCase_O3,
//     addTestCase_O4
// ]
// //--------------------------TEST CASES ----------------------------------//
// async function addTestCase_P1(test_suite: TestSuite): Promise<TestSuite> {
//     let params = {
//         "asset_id": TEST_NFT_ID,
//         "ask": "10000000000",
//         "allows_bidding": "true",
//         "address": TEST_SUPPLIER_ADDRESS,
//         "chain": "Fuji-x"
//     }
//     let prep = prepareCreateTrade(params);
//     let response = await createTrade(prep);
//     let trade_id = response.trade_id;
//     let test_case = makeTestCase("P1", trade_id, "PENDING");
//     test_suite.test_cases.push(test_case);
//     return test_suite
// }
// async function addTestCase_L1(test_suite: TestSuite): Promise<TestSuite> {
//     let params = {
//         "asset_id": TEST_FT_ID,
//         "ask": "10000000000",
//         "allows_bidding": "true",
//         "address": TEST_SUPPLIER_ADDRESS,
//         "chain": "Fuji-x"
//     }
//     let prep = prepareCreateTrade(params);
//     let response = await createTrade(prep);
//     let wallet_address = addressFromString("Fuji-x", response.address);
//     let avax_id = await getAvaxID("Fuji-x");
//     test_suite = addFTTransfer(test_suite, wallet_address, new BN(1));
//     test_suite = await addAVAXTransfer(test_suite, wallet_address, SERVICE_FEE);
//     test_suite = addNFTTransfer(test_suite, wallet_address);
//     let expected_balances: AssetAddressAmount[] = [
//         [assetIdFromString(TEST_FT_ID), wallet_address, new BN(1)],
//         [avax_id, wallet_address, SERVICE_FEE],
//         [assetIdFromString(TEST_NFT_ID), wallet_address, new BN(1)]
//     ];
//     let test_case = makeTestCase("L1", response.trade_id, "LOCKED", expected_balances);
//     test_suite.test_cases.push(test_case);
//     return test_suite
// }
// async function addTestCase_L2(test_suite: TestSuite): Promise<TestSuite> {
//     let params = {
//         "asset_id": TEST_FT_ID,
//         "ask": "10000000000",
//         "allows_bidding": "true",
//         "address": TEST_SUPPLIER_ADDRESS,
//         "chain": "Fuji-x"
//     }
//     let prep = prepareCreateTrade(params);
//     let response = await createTrade(prep);
//     let wallet_address = addressFromString("Fuji-x", response.address);
//     let avax_id = await getAvaxID("Fuji-x");
//     test_suite = await addAVAXTransfer(test_suite, wallet_address, SERVICE_FEE);
//     let expected_balances: AssetAddressAmount[] = [
//         [avax_id, wallet_address, SERVICE_FEE]
//     ];
//     await expireTradeWallet(response.trade_id);
//     let test_case = makeTestCase("L2", response.trade_id, "LOCKED", expected_balances);
//     test_suite.test_cases.push(test_case);
//     return test_suite 
// }
// async function addTestCase_L3(test_suite: TestSuite): Promise<TestSuite> {
//     let params = {
//         "asset_id": TEST_FT_ID,
//         "ask": "10000000000",
//         "allows_bidding": "true",
//         "address": TEST_SUPPLIER_ADDRESS,
//         "chain": "Fuji-x"
//     }
//     let prep = prepareCreateTrade(params);
//     let response = await createTrade(prep);
//     let wallet_address = addressFromString("Fuji-x", response.address);
//     test_suite = addFTTransfer(test_suite, wallet_address, new BN(1));
//     let expected_balances: AssetAddressAmount[] = [
//         [assetIdFromString(TEST_FT_ID), wallet_address, new BN(1)]
//     ];
//     await expireTradeWallet(response.trade_id);
//     let test_case = makeTestCase("L3", response.trade_id, "LOCKED", expected_balances);
//     test_suite.test_cases.push(test_case);
//     return test_suite 
// }
// async function addTestCase_L4(test_suite: TestSuite): Promise<TestSuite> {
//     let params = {
//         "asset_id": TEST_FT_ID,
//         "ask": "10000000000",
//         "allows_bidding": "true",
//         "address": TEST_SUPPLIER_ADDRESS,
//         "chain": "Fuji-x"
//     }
//     let prep = prepareCreateTrade(params);
//     let response = await createTrade(prep);
//     await expireTradeWallet(response.trade_id);
//     let test_case = makeTestCase("L4", response.trade_id, "LOCKED");
//     test_suite.test_cases.push(test_case);
//     return test_suite 
// }
// async function addTestCase_O1(test_suite: TestSuite): Promise<TestSuite> {
//     let params = {
//         "asset_id": TEST_NFT_ID,
//         "ask": "10000000000",
//         "allows_bidding": "true",
//         "address": TEST_SUPPLIER_ADDRESS,
//         "chain": "Fuji-x"
//     }
//     let prep = prepareCreateTrade(params);
//     let response = await createTrade(prep);
//     let wallet_address = addressFromString("Fuji-x", response.address);
//     let avax_id = await getAvaxID("Fuji-x");
//     test_suite = await addAVAXTransfer(test_suite, wallet_address, SERVICE_FEE);
//     test_suite = addNFTTransfer(test_suite, wallet_address);
//     let expected_balances: AssetAddressAmount[] = [
//         [avax_id, wallet_address, SERVICE_FEE],
//         [assetIdFromString(TEST_NFT_ID), wallet_address, new BN(1)]
//     ];
//     await expireTradeWallet(response.trade_id);
//     let test_case = makeTestCase("O1", response.trade_id, "OPEN", expected_balances);
//     test_suite.test_cases.push(test_case);
//     return test_suite
// }
// async function addTestCase_O2(test_suite: TestSuite): Promise<TestSuite> {
//     let asset_id = assetIdFromString(TEST_FT_ID);
//     let proceeds_address = addressFromString("Fuji-x", TEST_SUPPLIER_ADDRESS);
//     let trade = await makeTrade(asset_id, new BN(1000000000), "AUCTION", proceeds_address, "Fuji-x");
//     trade.status = "OPEN";
//     await putTrade(trade);
//     let test_case = makeTestCase("O2", trade.id, "OPEN");
//     test_suite.test_cases.push(test_case);
//     return test_suite
// }
// async function addTestCase_O3(test_suite: TestSuite): Promise<TestSuite> {
//     let ask = new BN(10000000);
//     let asset_id = assetIdFromString(TEST_FT_ID);
//     let proceeds_address = addressFromString("Fuji-x", TEST_SUPPLIER_ADDRESS);
//     let trade = await makeTrade(asset_id, ask, "AUCTION", proceeds_address, "Fuji-x");
//     trade.status = "OPEN";
//     await putTrade(trade);
//     let bid_prep = await prepareCreateBid({
//         "trade_id": trade.id,
//         "proceeds_address": TEST_SUPPLIER_ADDRESS
//     })
//     let bid = await createBid(bid_prep);
//     await expireBids(trade);
//     let bid_address = addressFromString("Fuji-x", bid.address);
//     let avax_id = await getAvaxID("Fuji-x");
//     test_suite = await addAVAXTransfer(test_suite, bid_address, ask);
//     let expected_balances: AssetAddressAmount[] = [
//         [avax_id, bid_address, ask],
//     ];
//     let test_case = makeTestCase("O3", trade.id, "OPEN", expected_balances);
//     test_suite.test_cases.push(test_case);
//     return test_suite
// }
// async function addTestCase_O4(test_suite: TestSuite): Promise<TestSuite> {
//     let ask = new BN(10000000);
//     let asset_id = assetIdFromString(TEST_FT_ID);
//     let proceeds_address = addressFromString("Fuji-x", TEST_SUPPLIER_ADDRESS);
//     let trade = await makeTrade(asset_id, ask, "FIXED", proceeds_address, "Fuji-x");
//     trade.status = "OPEN";
//     await putTrade(trade);
//     let bid_prep = await prepareCreateBid({
//         "trade_id": trade.id,
//         "proceeds_address": TEST_SUPPLIER_ADDRESS
//     })
//     let bid = await createBid(bid_prep);
//     await expireBids(trade);
//     let bid_address = addressFromString("Fuji-x", bid.address);
//     let avax_id = await getAvaxID("Fuji-x");
//     let bid_amount = ask.sub(new BN(1));
//     test_suite = await addAVAXTransfer(test_suite, bid_address, bid_amount);
//     let expected_balances: AssetAddressAmount[] = [
//         [avax_id, bid_address, bid_amount],
//     ];
//     let test_case = makeTestCase("O4", trade.id, "OPEN", expected_balances);
//     test_suite.test_cases.push(test_case);
//     return test_suite
// }
//TODO:
//Add delete bid
//remaining Test cases
