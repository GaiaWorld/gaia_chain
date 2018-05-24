_$define("pi/util/log", function (require, exports, module){
"use strict";
/**
 * 日志模块
 */

Object.defineProperty(exports, "__esModule", { value: true });
// ============================== 导出
var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["debug"] = 0] = "debug";
    LogLevel[LogLevel["info"] = 1] = "info";
    LogLevel[LogLevel["warn"] = 2] = "warn";
    LogLevel[LogLevel["err"] = 3] = "err";
    LogLevel[LogLevel["none"] = 4] = "none";
})(LogLevel = exports.LogLevel || (exports.LogLevel = {}));
exports.logLevel = LogLevel.debug;
exports.setBroadcast = function (b) {
    broadcast = b;
};
exports.debug = function (level, msg, args1, args2, args3, args4, args5, args6, args7, args8, args9) {
    log(level, msg, args1, args2, args3, args4, args5, args6, args7, args8, args9);
};
exports.info = function (level, msg, args1, args2, args3, args4, args5, args6, args7, args8, args9) {
    if (level <= LogLevel.info) {
        log(level, msg, args1, args2, args3, args4, args5, args6, args7, args8, args9);
    }
};
exports.warn = function (level, msg, args1, args2, args3, args4, args5, args6, args7, args8, args9) {
    if (level <= LogLevel.warn) {
        log(level, msg, args1, args2, args3, args4, args5, args6, args7, args8, args9);
    }
};
exports.err = function (level, msg, args1, args2, args3, args4, args5, args6, args7, args8, args9) {
    if (level <= LogLevel.err) {
        log(level, msg, args1, args2, args3, args4, args5, args6, args7, args8, args9);
    }
};
// ============================== 本地
var broadcast = void 0;
var log = function log(level, msg, args1, args2, args3, args4, args5, args6, args7, args8, args9) {
    if (broadcast) {
        broadcast(level, msg, args1, args2, args3, args4, args5, args6, args7, args8, args9);
    }
    if (!console) {
        return;
    }
    var now = Date.now();
    if (args9 !== undefined) {
        // tslint:disable:prefer-template
        console.log(now / 1000 + ' ' + msg, args1, args2, args3, args4, args5, args6, args7, args8, args9);
    } else if (args8 !== undefined) {
        console.log(now / 1000 + ' ' + msg, args1, args2, args3, args4, args5, args6, args7, args8);
    } else if (args7 !== undefined) {
        console.log(now / 1000 + ' ' + msg, args1, args2, args3, args4, args5, args6, args7);
    } else if (args6 !== undefined) {
        console.log(now / 1000 + ' ' + msg, args1, args2, args3, args4, args5, args6);
    } else if (args5 !== undefined) {
        console.log(now / 1000 + ' ' + msg, args1, args2, args3, args4, args5);
    } else if (args4 !== undefined) {
        console.log(now / 1000 + ' ' + msg, args1, args2, args3, args4);
    } else if (args3 !== undefined) {
        console.log(now / 1000 + ' ' + msg, args1, args2, args3);
    } else if (args2 !== undefined) {
        console.log(now / 1000 + ' ' + msg, args1, args2);
    } else if (args1 !== undefined) {
        console.log(now / 1000 + ' ' + msg, args1);
    } else {
        console.log(now / 1000 + ' ' + msg);
    }
};
})