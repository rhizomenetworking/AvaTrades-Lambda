import { JOB } from "./shared/constants"
import { runMonitor } from "./monitor"
import { serve } from "./service"
import { runTestSuite } from "./test"

exports.handler = async function(event: any) {
    if (JOB === "MONITOR") {
        await runMonitor();
    } else if (JOB === "SERVER") {
        let response = await serve(event);
        return response
    } else if (JOB === "TEST") {
        let response = await runTestSuite();
        return response
    }
}
