"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TEST_SINK_ADDRESSES = exports.TEST_SUPPLIER_ADDRESS = exports.TEST_FT_ID = exports.TEST_NFT_ID = exports.FUJI_AVAX_ID = exports.AVALANCHE_AVAX_ID = exports.FUJI_PROFIT_ADDRESS = exports.AVALANCHE_PROFIT_ADDRESS = exports.TEST_DATABASE_NAME = exports.LIVE_DATABASE_NAME = exports.FUJI_NETWORK = exports.AVALANCHE_NETWORK = exports.SERVICE_FEE = exports.JOB = void 0;
const avalanche_1 = require("avalanche");
exports.JOB = "TEST";
exports.SERVICE_FEE = new avalanche_1.BN(2000000);
exports.AVALANCHE_NETWORK = new avalanche_1.Avalanche("api.avax.network", 443, "https", 1);
exports.FUJI_NETWORK = new avalanche_1.Avalanche("api.avax-test.network", 443, "https", 5);
exports.LIVE_DATABASE_NAME = "AvaTrades-DynamoDB";
exports.TEST_DATABASE_NAME = "AvaTrades-DynamoDB-Test";
exports.AVALANCHE_PROFIT_ADDRESS = "TODO";
exports.FUJI_PROFIT_ADDRESS = "TODO";
exports.AVALANCHE_AVAX_ID = "FvwEAhmxKfeiG8SnEvq42hc6whRyY3EFYAvebMqDNDGCgxN5Z";
exports.FUJI_AVAX_ID = "U8iRqJoiJm8xZHAacmvYyZVwqQx6uDNtQeP3CQ6fcgQk3JqnK";
exports.TEST_NFT_ID = "GsEZLRzeFEGGv5RVZb1cKJPqixn5WY2VB9m3oZkT2R6kMZuAE";
exports.TEST_FT_ID = "TODO";
exports.TEST_SUPPLIER_ADDRESS = "X-fuji1tukttg52tjdqr8cavl6hvt507sgg60ehh8zuzm";
exports.TEST_SINK_ADDRESSES = [
    "X-fuji16wm7k643ga9r8vmkauyxcjr54av299kjzq7j5j",
    "X-fuji1q7rt5x4fj0tccwhc6uw5e6cf9970gq7atfd8gg",
    "X-fuji19wefgf2klsdu4kuynyj2rvq749q70gfkvtl9mk",
    "X-fuji1v4khp0hdvmxt2wtv79tkf56fuczxfm74kjnxpq",
    "X-fuji1lrtp2pnljs85hupul9xaa42x2u2faxc5qa9mvd"
];
