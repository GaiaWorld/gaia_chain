_$define("pi/worker/server", function (require, exports, module){
"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
// ============================== 导入
// ============================== 导出
/**
 * 组名 线程编号
 */
exports.name = '';
/**
 * 消息接收函数，接受任务事件
 * @example
 */
exports.onmessage = function (e) {
    var data = e.data;
    var r = exec(data.mod, data.func, data.args, data.sendResult);
    if (r.ok !== undefined && r.ok instanceof ArrayBuffer) {
        postMessage(r, [r.ok]);
    } else {
        postMessage(r);
    }
};
/**
 * @description 函数调用
 * @example
 */
exports.call = function (func, args) {
    if (Array.isArray(args)) {
        switch (args.length) {
            case 0:
                return func();
            case 1:
                return func(args[0]);
            case 2:
                return func(args[0], args[1]);
            case 3:
                return func(args[0], args[1], args[2]);
            case 4:
                return func(args[0], args[1], args[2], args[3]);
            case 5:
                return func(args[0], args[1], args[2], args[3], args[4]);
            case 6:
                return func(args[0], args[1], args[2], args[3], args[4], args[5]);
            case 7:
                return func(args[0], args[1], args[2], args[3], args[4], args[5], args[6]);
            case 8:
                return func(args[0], args[1], args[2], args[3], args[4], args[5], args[6], args[7]);
            default:
                func.apply(undefined, args);
        }
    } else {
        return func(args);
    }
};
// ============================== 本地
// 任务执行
var exec = function exec(modName, funcName, args, sendResult) {
    var mod = void 0;
    try {
        // tslint:disable:non-literal-require
        mod = require(modName);
    } catch (ex) {
        return {
            error: 'ERR_ARGS',
            // tslint:disable:prefer-template
            reason: 'server worker, mod not found, name: ' + modName + '.' + funcName
        };
    }
    var func = mod[funcName];
    if (!func) {
        return {
            error: 'ERR_ARGS',
            reason: 'server worker, func not found, name: ' + modName + '.' + funcName
        };
    }
    try {
        var r = exports.call(func, args);
        return sendResult ? { ok: r } : 0;
    } catch (ex) {
        return {
            error: 'ERR_NORMAL',
            stack: ex.stack,
            reason: 'server worker, func error! name: ' + modName + '.' + funcName + ', ' + ex.msg
        };
    }
};
})