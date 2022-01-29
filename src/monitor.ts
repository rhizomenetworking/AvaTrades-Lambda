import { syncTrade, syncBid } from "./blockchain/blockchain";
import { Trade, Bid } from "./shared/model";
import { 
    Page, 
    fetchLiveTrades, fetchBids, fetchRoyalty, 
    putTrade, putBid 
} from "./database/database";


async function updateBids(trade: Trade): Promise<Bid[]> {
    let bids: Bid[] = [];
    let page: Page | undefined = "FIRST";
    while (page !== undefined) {
        let [batch, nxt_page] = await fetchBids(trade, page);
        for (let bid of batch) {
            let synced = await syncBid(bid);
            await putBid(synced);
            bids.push(synced);
        }
        page = nxt_page;
    }
    return bids
}

async function updateTrades() {
    let page: Page | undefined = "FIRST";
    while (page !== undefined) {
        let [batch, nxt_page] = await fetchLiveTrades(page);
        for (let trade of batch) {
            let bids = await updateBids(trade);
            let royalty = await fetchRoyalty(trade.wallet.chain, trade.wallet.asset_ids[1]); //TODO: find better way to get asset_id
            let synced = await syncTrade(trade, bids, royalty);
            await putTrade(synced);
        }
        page = nxt_page;
    }
}

export async function runMonitor() {
    await updateTrades();
}