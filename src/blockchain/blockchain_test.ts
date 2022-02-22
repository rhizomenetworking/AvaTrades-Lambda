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

import { BN, Buffer } from "avalanche";
import { UTXO, KeyPair } from "avalanche/dist/apis/avm"
import { syncTrade, syncBid, fetchUTXOs, getBalance } from "./blockchain"
import { Trade, Bid, Royalty, makeTrade, makeBid, TradeStatus, WalletStatus, makeRoyalty } from "../shared/model"
import { stringFromAddress, stringFromAssetID, assetIdFromString, getAvaxID, makeKeyPair, addressFromString, getNetwork, getProfitAddress } from "../shared/utilities"
import { TxConstruction, makeTxConstruction, issue, addInputs, addNFTTransferOp, addOutput, addInput } from "./tx_construction";
import { TEST_SUPPLIER_PRIVATE_KEY } from "../shared/secrets";
import { SERVICE_FEE, TEST_FT_ID, TEST_NFT_ID, TEST_SUPPLIER_ADDRESS } from "../shared/constants";

const NEW_TAB = "\n    ---- ";
const ZERO: BN = new BN(0);
const ONE: BN = new BN(1);
const ONEAVAX: BN = new BN(1000000000);
const CENTIAVAX: BN = ONEAVAX.div(new BN(100));
const DEFAULT_SINK_ADDRESS = addressFromString("Fuji-x", TEST_SUPPLIER_ADDRESS);
const NFT_ID = assetIdFromString(TEST_NFT_ID);
const FT_ID = assetIdFromString(TEST_FT_ID);

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

export async function runBlockchainTestSuite(): Promise<string> {
    console.log("Generating Test Suite ...");
    let test_suite = await generateTestSuite();
    let report = "Blockchain Test Suite Report" + NEW_TAB + test_suite.tx_id + "\n\n";
    for (let test_case of test_suite.test_cases) {
        console.log("Running Test Case " + test_case.id + " ...")
        let result = await runTestCase(test_case);
        console.log(result)
        report += result;
    }
    return report
}

async function runTestCase(test_case: TestCase): Promise<string> {
    let avax_id = await getAvaxID("Fuji-x");
    let profit_utxos = await fetchUTXOs(getProfitAddress("Fuji-x"), "Fuji-x", [avax_id])
    if (profit_utxos === undefined) {
        throw "Run Test Case - Unable to fetch profit utxos";
    }
    let preexisting_profit = getBalance(profit_utxos, avax_id);

    let expected_balances = test_case.expected_balances;
    let expected_output = test_case.expected_output;
    let actual_output = await generateOutput(test_case.input);
    if (expected_output === "CLOSED" || expected_output === "EXPIRED") {
        await sleep(3000);
    }
    let result = "";
    result += checkOutputs(actual_output, expected_output);
    result += await checkBalances(expected_balances, preexisting_profit);
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
    console.log("Transaction ID: " + test_suite.tx_id)
    await sleep(3000);
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
    output_trade = await syncTrade(input_trade, output_bids, input_royalty);
    return output_trade.status
}

async function checkBalances(expected: AssetAddressAmount[], preexisting_profit: BN): Promise<string> {
    let result = "";
    for (let [asset_id, address, amount] of expected) {
        let utxos = await fetchUTXOs(address, "Fuji-x", [asset_id]);
        if (utxos === undefined) {
            result += NEW_TAB + "Failed to get UTXOs of asset " + stringFromAssetID(asset_id) + " held by address " + stringFromAddress("Fuji-x", address);
        } else {
            let actual_amount = getBalance(utxos, asset_id);
            if (address.equals(getProfitAddress("Fuji-x"))) {
                actual_amount.isub(preexisting_profit);
            }
            if (!actual_amount.eq(amount)) {
                result += NEW_TAB + "Invalid Balance of address " + stringFromAddress("Fuji-x", address) + ", expected " + amount.toString() + " but found " + actual_amount.toString(); 
            }
        }
    }
    return result
}

function checkOutputs(actual: TestOuptput, expected: TestOuptput): string {
    let result = "";
    if (actual !== expected) {
        result += NEW_TAB + "Actual Trade has status of " + actual + ", but " + expected + " was expected";
    }
    return result
}

async function sleep(ms: number) {
    await new Promise(resolve => setTimeout(resolve, ms));
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
type TestOuptput = TradeStatus;
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
    let chain_fee = getNetwork("Fuji-x").XChain().getTxFee();
    test_suite = await addAVAXTransfer(test_suite, supplier_address, test_suite.supplied_avax.sub(chain_fee));
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
    let trade = await makeTrade(FT_ID, ONEAVAX, "AUCTION", DEFAULT_SINK_ADDRESS, "Fuji-x");
    let test_case = makeTestCase(
        "P1", 
        "Pending Trade whoose wallet is not expired",
        [trade, [], undefined],
        "PENDING"
    );
    test_suite.test_cases.push(test_case);
    return test_suite
}

async function addTestCase_L1(test_suite: TestSuite): Promise<TestSuite> {
    let trade = await makeTrade(FT_ID, ONEAVAX, "AUCTION", DEFAULT_SINK_ADDRESS, "Fuji-x");
    let wallet_address = trade.wallet.address;
    let avax_id = await getAvaxID("Fuji-x");

    test_suite = addFTTransfer(test_suite, wallet_address, ONE);
    test_suite = await addAVAXTransfer(test_suite, wallet_address, SERVICE_FEE);
    test_suite = addNFTTransfer(test_suite, wallet_address);
    let expected_balances: AssetAddressAmount[] = [
        [FT_ID, wallet_address, ONE],
        [avax_id, wallet_address, SERVICE_FEE],
        [NFT_ID, wallet_address, ONE]
    ];

    let test_case = makeTestCase(
        "L1", 
        "Pending Trade whoose wallet is not expired, but has recieved too many UTXOs",
        [trade, [], undefined],
        "LOCKED",
        expected_balances);
    
    test_suite.test_cases.push(test_case);
    return test_suite
}

async function addTestCase_L2(test_suite: TestSuite): Promise<TestSuite> {
    let trade = await makeTrade(FT_ID, ONEAVAX, "AUCTION", DEFAULT_SINK_ADDRESS, "Fuji-x");
    trade.wallet.expiration = 0;
    let wallet_address = trade.wallet.address;
    let avax_id = await getAvaxID("Fuji-x");

    test_suite = await addAVAXTransfer(test_suite, wallet_address, SERVICE_FEE);
    let expected_balances: AssetAddressAmount[] = [
        [avax_id, wallet_address, SERVICE_FEE]
    ];

    let test_case = makeTestCase(
        "L2", 
        "Pending Trade whoose wallet is expired, but only lacking asset",
        [trade, [], undefined],
        "LOCKED",
        expected_balances);
        
    test_suite.test_cases.push(test_case);
    return test_suite
}

async function addTestCase_L3(test_suite: TestSuite): Promise<TestSuite> {
    let trade = await makeTrade(NFT_ID, ONEAVAX, "AUCTION", DEFAULT_SINK_ADDRESS, "Fuji-x");
    trade.wallet.expiration = 0;
    let wallet_address = trade.wallet.address;

    test_suite = addNFTTransfer(test_suite, wallet_address);
    let expected_balances: AssetAddressAmount[] = [
        [NFT_ID, wallet_address, ONE]
    ];

    let test_case = makeTestCase(
        "L3", 
        "Pending Trade whoose wallet is expired, but only lacking service fee",
        [trade, [], undefined],
        "LOCKED",
        expected_balances);
        
    test_suite.test_cases.push(test_case);
    return test_suite

}

async function addTestCase_L4(test_suite: TestSuite): Promise<TestSuite> {
    let trade = await makeTrade(NFT_ID, ONEAVAX, "AUCTION", DEFAULT_SINK_ADDRESS, "Fuji-x");
    trade.wallet.expiration = 0;

    let test_case = makeTestCase(
        "L4", 
        "Pending Trade whoose wallet is expired, but lacking both NFT and service fee",
        [trade, [], undefined],
        "LOCKED");
        
    test_suite.test_cases.push(test_case);
    return test_suite
}

async function addTestCase_O1(test_suite: TestSuite): Promise<TestSuite> {
    let trade = await makeTrade(FT_ID, ONEAVAX, "AUCTION", DEFAULT_SINK_ADDRESS, "Fuji-x");
    trade.wallet.expiration = 0;
    let wallet_address = trade.wallet.address;
    let avax_id = await getAvaxID("Fuji-x");

    test_suite = addFTTransfer(test_suite, wallet_address, ONE);
    test_suite = await addAVAXTransfer(test_suite, wallet_address, SERVICE_FEE);
    let expected_balances: AssetAddressAmount[] = [
        [FT_ID, wallet_address, ONE],
        [avax_id, wallet_address, SERVICE_FEE],
    ];

    let test_case = makeTestCase(
        "O1", 
        "Pending Trade whoose wallet is expired, and has recieved both service fee and asset",
        [trade, [], undefined],
        "OPEN",
        expected_balances);
    
    test_suite.test_cases.push(test_case);
    return test_suite
}

async function addTestCase_O2(test_suite: TestSuite): Promise<TestSuite> {
    let trade = await makeTrade(FT_ID, ONEAVAX, "AUCTION", DEFAULT_SINK_ADDRESS, "Fuji-x");
    trade.wallet.status = "CLOSED";
    trade.status = "OPEN";

    let test_case = makeTestCase(
        "O2", 
        "Open Trade that has no bids, and has yet to expire",
        [trade, [], undefined],
        "OPEN");

    test_suite.test_cases.push(test_case);
    return test_suite
}

async function addTestCase_O3(test_suite: TestSuite): Promise<TestSuite> {
    let trade = await makeTrade(FT_ID, CENTIAVAX, "AUCTION", DEFAULT_SINK_ADDRESS, "Fuji-x");
    trade.wallet.status = "CLOSED";
    trade.status = "OPEN";

    let bid = await makeBid(trade, DEFAULT_SINK_ADDRESS);
    let wallet_address = bid.wallet.address;
    let avax_id = await getAvaxID("Fuji-x");

    test_suite = await addAVAXTransfer(test_suite, wallet_address, CENTIAVAX);
    let expected_balances: AssetAddressAmount[] = [
        [avax_id, wallet_address, CENTIAVAX]
    ];

    let test_case = makeTestCase(
        "O3", 
        "Open Auction has a closed bid of ask, but has yet to expire",
        [trade, [bid], undefined],
        "OPEN",
        expected_balances);

    test_suite.test_cases.push(test_case);
    return test_suite
}

async function addTestCase_O4(test_suite: TestSuite): Promise<TestSuite> {
    let trade = await makeTrade(FT_ID, CENTIAVAX, "FIXED", DEFAULT_SINK_ADDRESS, "Fuji-x");
    trade.wallet.status = "CLOSED";
    trade.status = "OPEN";

    let bid = await makeBid(trade, DEFAULT_SINK_ADDRESS);
    let wallet_address = bid.wallet.address;
    let avax_id = await getAvaxID("Fuji-x");

    test_suite = await addAVAXTransfer(test_suite, wallet_address, CENTIAVAX.sub(ONE));
    let expected_balances: AssetAddressAmount[] = [
        [avax_id, wallet_address, CENTIAVAX.sub(ONE)]
    ];

    let test_case = makeTestCase(
        "O4", 
        "Open Fixed has a closed bid below ask, but has yet to expired",
        [trade, [bid], undefined],
        "OPEN",
        expected_balances);

    test_suite.test_cases.push(test_case);
    return test_suite
}

async function addTestCase_E1(test_suite: TestSuite): Promise<TestSuite> {
    let seller_address = makeKeyPair("Fuji-x").getAddress();
    let trade = await makeTrade(FT_ID, CENTIAVAX.add(ONE), "FIXED", seller_address, "Fuji-x");
    let trade_address = trade.wallet.address;
    trade.deadline = 0;
    trade.wallet.expiration = 0;

    let buyer_address = makeKeyPair("Fuji-x").getAddress();
    let bid = await makeBid(trade, buyer_address);
    bid.wallet.expiration = 0;
    let bid_address = bid.wallet.address;

    let profit_addresss = getProfitAddress("Fuji-x");
    let chain_fee = getNetwork("Fuji-x").XChain().getTxFee();
    let avax_id = await getAvaxID("Fuji-x");

    test_suite = await addAVAXTransfer(test_suite, trade_address, SERVICE_FEE);
    test_suite = addFTTransfer(test_suite, trade_address, ONE);
    test_suite = await addAVAXTransfer(test_suite, bid_address, CENTIAVAX);
    let expected_balances: AssetAddressAmount[] = [
        [avax_id, profit_addresss, SERVICE_FEE.sub(chain_fee)],
        [avax_id, buyer_address, CENTIAVAX],
        [FT_ID, seller_address, ONE]
    ];

    let test_case = makeTestCase(
        "E1", 
        "Open Trade has expired with no bids above ask.",
        [trade, [bid], undefined],
        "EXPIRED",
        expected_balances);

    test_suite.test_cases.push(test_case);
    return test_suite
}

async function addTestCase_E2(test_suite: TestSuite): Promise<TestSuite> {
    let seller_address = makeKeyPair("Fuji-x").getAddress();
    let trade = await makeTrade(FT_ID, CENTIAVAX, "AUCTION", seller_address, "Fuji-x");
    let trade_address = trade.wallet.address;
    trade.deadline = 0;
    trade.wallet.expiration = 0;

    let profit_addresss = getProfitAddress("Fuji-x");
    let chain_fee = getNetwork("Fuji-x").XChain().getTxFee();
    let avax_id = await getAvaxID("Fuji-x");

    test_suite = await addAVAXTransfer(test_suite, trade_address, SERVICE_FEE);
    test_suite = addFTTransfer(test_suite, trade_address, ONE);
    let expected_balances: AssetAddressAmount[] = [
        [avax_id, profit_addresss, SERVICE_FEE.sub(chain_fee)],
        [FT_ID, seller_address, ONE]
    ];

    let test_case = makeTestCase(
        "E2", 
        "Open Trade has expired with no bids.",
        [trade, [], undefined],
        "EXPIRED",
        expected_balances);

    test_suite.test_cases.push(test_case);
    return test_suite
}

async function addTestCase_C1(test_suite: TestSuite): Promise<TestSuite> {
    let seller_address = makeKeyPair("Fuji-x").getAddress();
    let trade = await makeTrade(FT_ID, CENTIAVAX, "AUCTION", seller_address, "Fuji-x");
    let trade_address = trade.wallet.address;
    trade.deadline = 0;
    trade.wallet.expiration = 0;

    let buyer1_address = makeKeyPair("Fuji-x").getAddress();
    let bid1 = await makeBid(trade, buyer1_address);
    bid1.wallet.expiration = 0;
    let bid1_address = bid1.wallet.address;

    let buyer2_address = makeKeyPair("Fuji-x").getAddress();
    let bid2 = await makeBid(trade, buyer2_address);
    bid2.wallet.expiration = 0;
    let bid2_address = bid2.wallet.address;

    let profit_addresss = getProfitAddress("Fuji-x");
    let chain_fee = getNetwork("Fuji-x").XChain().getTxFee();
    let avax_id = await getAvaxID("Fuji-x");

    test_suite = await addAVAXTransfer(test_suite, trade_address, SERVICE_FEE);
    test_suite = addFTTransfer(test_suite, trade_address, ONE);
    test_suite = await addAVAXTransfer(test_suite, bid1_address, CENTIAVAX);
    test_suite = await addAVAXTransfer(test_suite, bid2_address, CENTIAVAX.add(CENTIAVAX));
    let expected_balances: AssetAddressAmount[] = [
        [avax_id, profit_addresss, SERVICE_FEE.sub(chain_fee)],
        [avax_id, buyer1_address, CENTIAVAX],
        [avax_id, seller_address, CENTIAVAX.add(CENTIAVAX)],
        [FT_ID, buyer2_address, ONE]
    ];

    let test_case = makeTestCase(
        "C1", 
        "Open Auction has expired with closed bids above ask",
        [trade, [bid1, bid2], undefined],
        "CLOSED",
        expected_balances);

    test_suite.test_cases.push(test_case);
    return test_suite
}

async function addTestCase_C2(test_suite: TestSuite): Promise<TestSuite> {
    let seller_address = makeKeyPair("Fuji-x").getAddress();
    let trade = await makeTrade(NFT_ID, CENTIAVAX, "FIXED", seller_address, "Fuji-x");
    let trade_address = trade.wallet.address;
    trade.deadline = 0;
    trade.wallet.expiration = 0;

    //Closed bid above ask price
    let buyer1_address = makeKeyPair("Fuji-x").getAddress();
    let bid1a = await makeBid(trade, buyer1_address);
    bid1a.wallet.expiration = 0;
    let bid1a_address = bid1a.wallet.address;
    test_suite = await addAVAXTransfer(test_suite, bid1a_address, CENTIAVAX);

    let bid1b = await makeBid(trade, buyer1_address);
    bid1b.wallet.expiration = 0;
    let bid1b_address = bid1b.wallet.address;
    test_suite = await addAVAXTransfer(test_suite, bid1b_address, CENTIAVAX);

    //Closed bid below ask price
    let buyer2_address = makeKeyPair("Fuji-x").getAddress();
    let bid2 = await makeBid(trade, buyer2_address);
    bid2.wallet.expiration = 0;
    let bid2_address = bid2.wallet.address;
    test_suite = await addAVAXTransfer(test_suite, bid2_address, CENTIAVAX.sub(ONE));

    //Locked bid above ask price
    let buyer3_address = makeKeyPair("Fuji-x").getAddress();
    let bid3 = await makeBid(trade, buyer3_address);
    bid3.wallet.expiration = 0;
    let bid3_address = bid3.wallet.address;
    test_suite = await addAVAXTransfer(test_suite, bid3_address, CENTIAVAX.add(ONE));
    test_suite = addNFTTransfer(test_suite, bid3_address);

    //Royalty
    let artist_address = makeKeyPair("Fuji-x").getAddress();
    let now = new Date().getTime();
    let signature: Buffer = new Buffer(""); 
    let royalty = makeRoyalty(NFT_ID, artist_address, new BN(21), new BN(10000), "Fuji-x", now, artist_address, signature); 
    let cut = CENTIAVAX.mul(royalty.numerator).divRound(royalty.divisor)

    let profit_addresss = getProfitAddress("Fuji-x");
    let chain_fee = getNetwork("Fuji-x").XChain().getTxFee();
    let avax_id = await getAvaxID("Fuji-x");

    test_suite = await addAVAXTransfer(test_suite, trade_address, SERVICE_FEE.add(ONE));
    test_suite = addNFTTransfer(test_suite, trade_address);
    let expected_balances: AssetAddressAmount[] = [
        [avax_id, profit_addresss, SERVICE_FEE.sub(chain_fee)],
        [avax_id, buyer1_address, CENTIAVAX],
        [NFT_ID, buyer1_address, ONE],
        [avax_id, buyer2_address, CENTIAVAX.sub(ONE)],
        [avax_id, buyer3_address, ZERO],
        [avax_id, bid3_address, CENTIAVAX.add(ONE)],
        [NFT_ID, bid3_address, ONE],
        [avax_id, artist_address, cut],
        [avax_id, seller_address, CENTIAVAX.sub(cut).add(ONE)],
    ];

    let test_case = makeTestCase(
        "C2", 
        "Open Fixed has closed bids at and above ask price, seller needs change, royalty exists",
        [trade, [bid1a, bid1b, bid2, bid3], royalty],
        "CLOSED",
        expected_balances);

    test_suite.test_cases.push(test_case);
    return test_suite
}

// async function tmp() {
//     let res = await runBlockchainTestSuite();
//     console.log(res);
// }
// tmp()