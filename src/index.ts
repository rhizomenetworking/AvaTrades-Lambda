import { JOB } from "./shared/constants"
import { runMonitor } from "./monitor"
import { serve } from "./service"
import { runBlockchainTestSuite } from "./blockchain/blockchain_test";

exports.handler = async function(event: any) {
    if (JOB === "MONITOR") {
        await runMonitor();
    } else if (JOB === "SERVER") {
        let response = await serve(event);
        return response
    } else if (JOB === "TEST") {
        let response = await runBlockchainTestSuite();
        return {
            "statusCode": 200,
            "body": response
        }
    }
}
