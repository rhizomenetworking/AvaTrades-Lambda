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
const constants_1 = require("./constants");
const monitor_1 = require("./monitor");
const service_1 = require("./service");
const test_1 = require("./test");
exports.handler = function (event, context, callback) {
    return __awaiter(this, void 0, void 0, function* () {
        if (constants_1.JOB === "MONITOR") {
            yield (0, monitor_1.runMonitor)();
        }
        else if (constants_1.JOB === "SERVER") {
            try {
                let response = yield (0, service_1.serve)(event);
                callback(null, response);
            }
            catch (err) {
                //TODO: hide error from user
                callback(err, null);
            }
        }
        else if (constants_1.JOB === "TEST") {
            try {
                let response = yield (0, test_1.runTest)();
                callback(null, response);
            }
            catch (err) {
                console.log(err);
                let response = {
                    "statusCode": 400,
                    "body": "Failed to complete test"
                };
                callback(null, response);
            }
        }
    });
};
