import { Avalanche, BN } from "avalanche";

export const JOB: Job = "TEST"
export const SERVICE_FEE: BN = new BN(2000000);

export const AVALANCHE_NETWORK = new Avalanche("api.avax.network", 443, "https", 1);
export const FUJI_NETWORK = new Avalanche("api.avax-test.network", 443, "https", 5);

export const LIVE_DATABASE_NAME = "AvaTrades-DynamoDB";
export const TEST_DATABASE_NAME = "AvaTrades-DynamoDB-Test";

export const AVALANCHE_PROFIT_ADDRESS = "TODO";
export const FUJI_PROFIT_ADDRESS = "TODO";

export const AVALANCHE_AVAX_ID = "FvwEAhmxKfeiG8SnEvq42hc6whRyY3EFYAvebMqDNDGCgxN5Z";
export const FUJI_AVAX_ID = "U8iRqJoiJm8xZHAacmvYyZVwqQx6uDNtQeP3CQ6fcgQk3JqnK";

export const TEST_NFT_ID = "GsEZLRzeFEGGv5RVZb1cKJPqixn5WY2VB9m3oZkT2R6kMZuAE";
export const TEST_FT_ID = "TODO";
export const TEST_SUPPLIER_ADDRESS = "X-fuji1tukttg52tjdqr8cavl6hvt507sgg60ehh8zuzm";
export const TEST_SINK_ADDRESSES = [
    "X-fuji16wm7k643ga9r8vmkauyxcjr54av299kjzq7j5j", 
    "X-fuji1q7rt5x4fj0tccwhc6uw5e6cf9970gq7atfd8gg", 
    "X-fuji19wefgf2klsdu4kuynyj2rvq749q70gfkvtl9mk", 
    "X-fuji1v4khp0hdvmxt2wtv79tkf56fuczxfm74kjnxpq",
    "X-fuji1lrtp2pnljs85hupul9xaa42x2u2faxc5qa9mvd"
]

type Job = "SERVER" | "MONITOR" | "TEST"
