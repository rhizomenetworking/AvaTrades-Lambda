"use strict";
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
exports.serve = void 0;
const server_1 = require("./server/server");
//TODO: Add Helpful error messages
function serve(event) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            return _serve(event);
        }
        catch (err) {
            console.error(err);
            return {
                'statusCode': 500,
                'body': "Internal Server Error"
            };
        }
    });
}
exports.serve = serve;
function _serve(event) {
    return __awaiter(this, void 0, void 0, function* () {
        let params = event.queryStringParameters;
        let resource = event.resource;
        let method = event.httpMethod;
        let status_code = 200;
        let response;
        if (resource === "/avatrades/trades" && method === "GET") {
            response = (0, server_1.readTrade)(params);
        }
        else if (resource === "/avatrades/trades" && method === "POST") {
            response = (0, server_1.createTrade)(params);
        }
        else if (resource === "/avatrades/bids" && method === "POST") {
            response = (0, server_1.createBid)(params);
        }
        else if (resource === "/avatrades/royalties" && method === "GET") {
            response = (0, server_1.readRoyalty)(params);
        }
        else if (resource === "/avatrades/royalties" && method === "PUT") {
            response = (0, server_1.setRoyalty)(params);
        }
        else {
            status_code = 404;
            response = "Resource not found";
        }
        return {
            'statusCode': status_code,
            'body': response
        };
    });
}
