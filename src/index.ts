import { JOB } from "./constants"
import { runMonitor } from "./monitor"
import { serve } from "./service"
import { runTest } from "./test"

exports.handler = async function(event: any, context: any, callback: any) {
    if (JOB === "MONITOR") {
        await runMonitor();
    } else if (JOB === "SERVER") {
        try {
            let response = await serve(event);
            callback(null, response);
        } catch (err) {
            //TODO: hide error from user
            callback(err, null)
        }
    } else if (JOB === "TEST") {
        try {
            let response = await runTest();
            callback(null, response);
        } catch (err) {
            console.log(err)
            let response = {
                "statusCode": 400,
                "body": "Failed to complete test"
            }
            callback(null, response)
        }
    }
}