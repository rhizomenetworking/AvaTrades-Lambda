import { BN } from "avalanche";

export const JOB: Job = "TEST"
export const SERVICE_FEE: BN = new BN(2000000);
export const PROFIT_ADDRESS: string = "TODO";
export const MAINNET_AVAX = "FvwEAhmxKfeiG8SnEvq42hc6whRyY3EFYAvebMqDNDGCgxN5Z";
export const FUJI_AVAX = "U8iRqJoiJm8xZHAacmvYyZVwqQx6uDNtQeP3CQ6fcgQk3JqnK";
export const LIVE_DATABASE_NAME = "AvaTrades-DynamoDB";
export const TEST_DATABASE_NAME = "AvaTrades-DynamoDB-Test";
export const FUJI_SOURCE_WALLET = "TODO";

type Job = "SERVER" | "MONITOR" | "TEST"