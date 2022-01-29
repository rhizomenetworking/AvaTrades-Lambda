import { createTrade, createBid, setRoyalty, readTrade, readRoyalty } from "./server/server"


//TODO: Add Helpful error messages
export async function serve(event: any): Promise<any> {
    let params = event.queryStringParameters;
    let resource = event.resource;
    let method = event.httpMethod;

    let status_code: number = 200;
    let response: any;
    if (resource === "/avatrades/trades" && method === "GET") {
        response = readTrade(params);

    } else if (resource === "/avatrades/trades" && method === "POST") {
        response = createTrade(params);

    } else if (resource === "/avatrades/bids" && method === "POST") {
        response = createBid(params);

    } else if (resource === "/avatrades/royalties" && method === "GET") {
        response = readRoyalty(params);

    } else if (resource === "/avatrades/royalties" && method === "PUT") {
        response = setRoyalty(params);

    } else {
        status_code = 404;
        response = "Resource not found";
    }

    return {
        'statusCode': status_code,
        'body': response
    }
}