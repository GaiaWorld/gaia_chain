_$define("pi/compile/reader", function (require, exports, module){
"use strict";
/**
 * 返回字符的读取器， 流式读取
 */

Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @description 创建
 */
exports.createByStr = function (s, i) {
  i = i || 0;
  return function () {
    return s[i++];
  };
};
// ============================== 本地
// ============================== 立即执行
})