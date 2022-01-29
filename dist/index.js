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
const constants_1 = require("./shared/constants");
const monitor_1 = require("./monitor");
const service_1 = require("./service");
const blockchain_test_1 = require("./blockchain/blockchain_test");
exports.handler = function (event) {
    return __awaiter(this, void 0, void 0, function* () {
        if (constants_1.JOB === "MONITOR") {
            yield (0, monitor_1.runMonitor)();
        }
        else if (constants_1.JOB === "SERVER") {
            let response = yield (0, service_1.serve)(event);
            return response;
        }
        else if (constants_1.JOB === "TEST") {
            let response = yield (0, blockchain_test_1.runBlockchainTestSuite)();
            return response;
        }
    });
};
