"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TEST_SUPPLIER_ADDRESS = exports.TEST_FT_ID = exports.TEST_NFT_ID = exports.FUJI_PROFIT_ADDRESS = exports.AVALANCHE_PROFIT_ADDRESS = exports.TEST_DATABASE_NAME = exports.LIVE_DATABASE_NAME = exports.FUJI_NETWORK = exports.AVALANCHE_NETWORK = exports.SERVICE_FEE = exports.FIXED_DURATION = exports.AUCTION_DURATION = exports.WALLET_DURATION = exports.JOB = void 0;
const avalanche_1 = require("avalanche");
exports.JOB = "TEST";
exports.WALLET_DURATION = 900000;
exports.AUCTION_DURATION = 172800000;
exports.FIXED_DURATION = 604800000;
exports.SERVICE_FEE = new avalanche_1.BN(2000000);
exports.AVALANCHE_NETWORK = new avalanche_1.Avalanche("api.avax.network", 443, "https", 1);
exports.FUJI_NETWORK = new avalanche_1.Avalanche("api.avax-test.network", 443, "https", 5);
exports.LIVE_DATABASE_NAME = "AvaTrades-DynamoDB";
exports.TEST_DATABASE_NAME = "AvaTrades-DynamoDB-Test";
exports.AVALANCHE_PROFIT_ADDRESS = "X-avax1n9qay4mchh9lq8p5e874qqj4g7ydrz3lg6x8fd"; //TODO - Use Ledger address
exports.FUJI_PROFIT_ADDRESS = "X-fuji1pqz2umzdf7wcudxdxqu6kkx2esy4z8m593xzun";
exports.TEST_NFT_ID = "GsEZLRzeFEGGv5RVZb1cKJPqixn5WY2VB9m3oZkT2R6kMZuAE";
exports.TEST_FT_ID = "2cDzgmQEYS6ZrfJzkuJd2FTFpkz8AhZrw1NtrqEnWMCVHMiZCx";
exports.TEST_SUPPLIER_ADDRESS = "X-fuji1tukttg52tjdqr8cavl6hvt507sgg60ehh8zuzm";
