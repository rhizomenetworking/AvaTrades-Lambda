/*
OUTCOME: Pending Trade
1) Pending Auction whoose wallet is not expired

OUTCOME: Locked Trade
1) Pending Auction only lacking NFT       
2) Pending Auction only lacking service fee
3) Pending Auction lacking both NFT and service fee
4) Pending Auction with service fee and NFT, but too many UTXOs

OUTCOME: Open Trade
1) Pending Auction has service fee + one NFT
2) Pending Auction has service fee + many NFTs
3) Pending Auction has service fee + one FT
4) Pending Auction has service fee + many FT
5) Open Auction has no bids, but has not expired
6) Open Auction has bids above ask, but has not expired
7) Open Fixed has bids below ask, but has not expired

OUTCOME: Expired Trade
1) Open Auction has expired with zero bids
2) Open Auction has expired with many bids below ask

OUTCOME: Closed Trade
1) Open Auction has expired with many locked, open, and closed bids above ask
2) Open Fixed has expired with exactly one bid at ask price, but seller needs change
3) Open Fixed has expired with exactly one bid above ask price and royalty

TRADES
0) Fresh Pending Auction
1) Pending Auction only lacking NFT
2)
3)
4)
5)
6)


FAUCET 
1) At least 10 AVAX

USERS
1-5) 2 AVAX, 5 NFT of group i, 100000 FT 

*/

import { Avalanche, BN, Buffer, BinTools } from "avalanche";
import { runMonitor } from "./monitor"
import { prepareCreateTrade, prepareReadTrade } from "./prepare";
import { createTrade, readTrade } from "./service";
import { deleteTrade } from "./database";
import { TxConstruction, makeTxConstruction, addInput, addOutput, addNFTTransferOp, issue, addInputs } from "./tx_construction";
import { TEST_SUPPLIER_PRIVATE_KEY } from "./secrets";
import { TEST_SINK_ADDRESS, FUJI_NETWORK, TEST_NFT_ID, TEST_FT_ID, SERVICE_FEE } from "./constants";
import { fetchUTXOs, getBalance } from "./blockchain";
import { Trade, TradeStatus} from "./model";
import { addressFromString, getAvaxID, stringFromAddress, stringFromAssetID, assetIdFromString, makeKeyPair } from "./common";
import { BaseNFTOutput } from "avalanche/dist/common";
import { InitialStates, SECPMintOutput, UTXO, UTXOSet, UnsignedTx, Tx, SECPTransferOutput, KeyPair } from "avalanche/dist/apis/avm";


export async function runTestSuite() {
    console.log("Generating Test Suite ...")
    let test_suite = await generateTestSuite();
    console.log("Issuing Transaction ...")
    let tx_id = await issue(test_suite.txc);
    console.log("Sleeping ...")
    await sleep(2000);
    console.log("Running Monitor ...")
    await runMonitor();
    console.log("Sleeping ...")
    await sleep(1000);
    console.log("Running Test Cases ...")
    let report = "Test Suite Report --- " + tx_id + "\n\n";
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
    let trade_id = test_case.trade_id;
    let result = "\nTest Case " + test_case.id + " (" + trade_id + ")\n    ---- ";
    let expected_status = test_case.expected_status;
    let actual_status = await getTradeStatus(trade_id);
    if (actual_status !== expected_status) {
        result += "Invalid Trade Status, expected " + expected_status + " but found " + actual_status;
        return result
    } 
    
    for (let [asset_id, address, amount] of test_case.expected_balances) {
        let utxos = await fetchUTXOs(address, "Fuji-x", [asset_id]);
        if (utxos === undefined) {
            result += "Failed to get UTXOs of asset " + stringFromAssetID(asset_id) + " held by address " + stringFromAddress("Fuji-x", address);
            return result 
        } 
        let actual_amount = getBalance(utxos, asset_id);
        if (actual_amount.lt(amount)) {
            result += "Invalid Balance of address " + stringFromAddress("Fuji-x", address) + ", expected " + amount.toJSON() + " but found " + actual_amount.toJSON(); 
            return result
        }
    }
    await deleteTrade(trade_id);
    result += "PASSED";
    return result
}

async function getTradeStatus(trade_id: string): Promise<TradeStatus> {
    let params = {
        "trade_id": trade_id
    }
    let prep = await prepareReadTrade(params);
    let api_trade = await readTrade(prep);
    return api_trade.status
}

interface TestSuite {
    supplier: KeyPair;
    supplied_avax: BN;
    supplied_ft: BN;
    supplied_nfts: UTXO[];
    test_cases: TestCase[];
    txc: TxConstruction;
}

interface TestCase {
    id: string;
    trade_id: string;
    expected_status: TradeStatus;
    expected_balances: AssetAddressAmount[];
}

type AssetAddressAmount = [Buffer, Buffer, BN]

function makeTestSuite(txc: TxConstruction): TestSuite {
    return {
        "supplier": makeKeyPair("Fuji-x", TEST_SUPPLIER_PRIVATE_KEY),
        "supplied_avax": new BN(0),
        "supplied_ft": new BN(0), 
        "supplied_nfts": [],
        "test_cases": [],
        "txc": txc
    }
}

function makeTestCase(id: string, trade_id: string, expected_status: TradeStatus, expected_balances?: AssetAddressAmount[]): TestCase {
    return {
        "id": id,
        "trade_id": trade_id,
        "expected_status": expected_status,
        "expected_balances": (expected_balances === undefined) ? [] : expected_balances
    }
}

function makeSinkAddressString(): string {
    let key_pair = makeKeyPair("Fuji-x");
    return key_pair.getAddressString()
}

async function generateTestSuite(): Promise<TestSuite> {
    let txc = makeTxConstruction("Fuji-x", "Ava Trades Test Suite");
    let test_suite = makeTestSuite(txc);
    test_suite = await addSupplierResources(test_suite);
    test_suite = await addTestCase_0(test_suite);
    test_suite = await addTestCase_1(test_suite);
    test_suite = await returnUnusedSupplierResources(test_suite);
    return test_suite
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
    test_suite.supplied_ft = test_suite.supplied_ft.sub(amount);
    return test_suite
}

async function sleep(ms: number) {
    await new Promise(resolve => setTimeout(resolve, ms));
}




//--------------------------TEST CASES ----------------------------------//
async function addTestCase_0(test_suite: TestSuite): Promise<TestSuite> {
    let params = {
        "asset_id": TEST_NFT_ID,
        "ask": "10000000000",
        "allows_bidding": "true",
        "address": TEST_SINK_ADDRESS,
        "chain": "Fuji-x"
    }
    let prep = prepareCreateTrade(params);
    let response = await createTrade(prep);
    let trade_id = response.trade_id;
    let test_case = makeTestCase("0", trade_id, "PENDING");
    test_suite.test_cases.push(test_case);
    return test_suite
}

async function addTestCase_1(test_suite: TestSuite): Promise<TestSuite> {
    let params = {
        "asset_id": TEST_NFT_ID,
        "ask": "10000000000",
        "allows_bidding": "true",
        "address": TEST_SINK_ADDRESS,
        "chain": "Fuji-x"
    }
    let prep = prepareCreateTrade(params);
    let response = await createTrade(prep);
    let wallet_address = addressFromString("Fuji-x", response.address);
    test_suite = addNFTTransfer(test_suite, wallet_address);
    let expected_balances: AssetAddressAmount = [assetIdFromString(TEST_NFT_ID), wallet_address, new BN(1)];
    let test_case = makeTestCase("1", response.trade_id, "PENDING", [expected_balances]);
    test_suite.test_cases.push(test_case);
    return test_suite
}
