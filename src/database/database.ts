import { LIVE_DATABASE_NAME, TEST_DATABASE_NAME, JOB } from "../shared/constants"
import { Buffer } from "avalanche";
import { Trade, Bid, Royalty } from "../shared/model"
import { Chain, stringFromAssetID } from "../shared/utilities"
import { 
    DynamoDBClient, 
    DeleteItemCommand, DeleteItemCommandInput,
    GetItemCommand, GetItemCommandInput, 
    PutItemCommand, PutItemCommandInput,
    QueryCommand, QueryCommandInput 
} from "@aws-sdk/client-dynamodb"
import { 
    itemAsTrade, tradeAsItem, 
    itemAsBid, bidAsItem, 
    itemAsRoyalty, royaltyAsItem 
} from "./converter";


const DATABASE_NAME = (JOB === "TEST") ? TEST_DATABASE_NAME : LIVE_DATABASE_NAME;
const client = new DynamoDBClient({ region: "us-east-2" });
type Page = "FIRST" | any

async function fetchLiveTrades(page: Page): Promise<[Trade[], Page | undefined]> {
    let input: QueryCommandInput = {
        "TableName": DATABASE_NAME,
        "KeyConditionExpression": "pk = :trade",
        "ExclusiveStartKey": (page === "FIRST" || page === undefined) ? undefined : page,
        //"FilterExpression": "properties.#S = PENDING or properties.#S = #O", TODO
        "ExpressionAttributeValues": {":trade": {"S": "TRADE"}},
        //"ExpressionAttributeNames": {"#S": "status", "#O": "OPEN"} TODO
    }
    let command = new QueryCommand(input);
    let response = await client.send(command);
    let trades: Trade[] = [];
    if (response.Items !== undefined) {
        for (let item of response.Items) {
            let trade = itemAsTrade(item);
            trades.push(trade);
        }
    }
    let next_page: Page = response.LastEvaluatedKey;
    return [trades, next_page]
}

async function fetchBids(trade: Trade, page: Page): Promise<[Bid[], Page | undefined]> {
    let input: QueryCommandInput = {
        "TableName": DATABASE_NAME, 
        "KeyConditionExpression": "pk = :trade_id",
        "ExclusiveStartKey": (page === "FIRST" || page === undefined) ? undefined : page,
        "ExpressionAttributeValues": {":trade_id": {"S": trade.id}}
    }
    let command = new QueryCommand(input);
    let response = await client.send(command);
    let bids: Bid[] = [];
    if (response.Items !== undefined) {
        for (let item of response.Items) {
            let bid = itemAsBid(item);
            bids.push(bid);
        }
    }
    let next_page: Page = response.LastEvaluatedKey;
    return [bids, next_page]
}

async function fetchTrade(trade_id: string): Promise<Trade | undefined> {
    let input: GetItemCommandInput = {
        "TableName": DATABASE_NAME,
        "Key": {
            "pk": {"S": "TRADE"},
            "sk": {"S": trade_id}
        }
    }
    let command = new GetItemCommand(input);
    let response = await client.send(command);
    let item = response.Item;
    let trade = (item === undefined) ? undefined : itemAsTrade(item);
    return trade
}

async function fetchRoyalty(chain: Chain, asset_id: Buffer): Promise<Royalty | undefined> {
    let input: GetItemCommandInput = {
        "TableName": DATABASE_NAME,
        "Key": {
            "pk": {"S": chain},
            "sk": {"S": stringFromAssetID(asset_id)}
        }
    }
    let command = new GetItemCommand(input);
    let response = await client.send(command);
    let item = response.Item;
    let royalty = (item === undefined) ? undefined : itemAsRoyalty(item);
    return royalty
}

async function putTrade(trade: Trade) {
    let input: PutItemCommandInput = {
        "TableName": DATABASE_NAME,
        "Item": tradeAsItem(trade)
    }
    let command = new PutItemCommand(input);
    await client.send(command);
}

async function putBid(bid: Bid) {
    let input: PutItemCommandInput = {
        "TableName": DATABASE_NAME,
        "Item": bidAsItem(bid)
    }
    let command = new PutItemCommand(input);
    await client.send(command);
}

async function putRoyalty(royalty: Royalty) {
    let input: PutItemCommandInput = {
        "TableName": DATABASE_NAME,
        "Item": royaltyAsItem(royalty)
    }
    let command = new PutItemCommand(input);
    await client.send(command);
}

async function deleteTrade(trade_id: string) {
    let input: DeleteItemCommandInput = {
        "TableName": DATABASE_NAME,
        "Key": {
            "pk": {"S": "TRADE"},
            "sk": {"S": trade_id}
        }
    }
    let command = new DeleteItemCommand(input);
    await client.send(command)
}

export { Page }
export { fetchLiveTrades, fetchBids, fetchTrade, fetchRoyalty }
export { putTrade, putBid, putRoyalty }
export { deleteTrade }