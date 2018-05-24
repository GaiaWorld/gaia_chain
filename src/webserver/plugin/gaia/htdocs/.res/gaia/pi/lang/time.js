_$define("pi/lang/time", function (require, exports, module){
"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
/**
 *
 */
var getNow = function getNow() {
    if (typeof self !== 'undefined') {
        var p = self.performance;
        if (p) {
            var dNow = Date.now();
            var pNow = p.now();
            return function () {
                return dNow + p.now() - pNow;
            };
        }
    }
    return Date.now;
};
// 注意此处是把getNow的执行结果返回给now
exports.now = getNow();
// ============================== 本地
// ============================== 立即执行
})