import { Avalanche, BN } from "avalanche";

export const JOB: Job = "TEST"
export const WALLET_DURATION: number = 900000;
export const AUCTION_DURATION: number = 172800000; 
export const FIXED_DURATION: number = 604800000; 
export const SERVICE_FEE: BN = new BN(2000000);

export const AVALANCHE_NETWORK = new Avalanche("api.avax.network", 443, "https", 1);
export const FUJI_NETWORK = new Avalanche("api.avax-test.network", 443, "https", 5);

export const LIVE_DATABASE_NAME = "AvaTrades-DynamoDB";
export const TEST_DATABASE_NAME = "AvaTrades-DynamoDB-Test";

export const AVALANCHE_PROFIT_ADDRESS = "X-avax1n9qay4mchh9lq8p5e874qqj4g7ydrz3lg6x8fd"; //TODO - Use Ledger address
export const FUJI_PROFIT_ADDRESS = "X-fuji1pqz2umzdf7wcudxdxqu6kkx2esy4z8m593xzun"; 

export const TEST_NFT_ID = "GsEZLRzeFEGGv5RVZb1cKJPqixn5WY2VB9m3oZkT2R6kMZuAE";
export const TEST_FT_ID = "2cDzgmQEYS6ZrfJzkuJd2FTFpkz8AhZrw1NtrqEnWMCVHMiZCx";
export const TEST_SUPPLIER_ADDRESS = "X-fuji1tukttg52tjdqr8cavl6hvt507sgg60ehh8zuzm";

type Job = "SERVER" | "MONITOR" | "TEST"
