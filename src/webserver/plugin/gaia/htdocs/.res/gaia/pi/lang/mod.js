_$define("pi/lang/mod", function (require, exports, module){
"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
// butil模块
exports.butil = typeof self !== 'undefined' && self._$define ? require('butil') : {};
// depend模块
exports.depend = typeof self !== 'undefined' && self._$define ? require('depend') : {};
// store模块
exports.store = typeof self !== 'undefined' && self._$define ? require('store') : {};
// ajax模块
exports.ajax = typeof self !== 'undefined' && self._$define ? require('ajax') : {};
// load模块
exports.load = typeof self !== 'undefined' && self._$define ? require('load') : {};
// commonjs模块
exports.commonjs = typeof self !== 'undefined' && self._$define ? require('commonjs') : {};
// ============================== 本地
// ============================== 立即执行
})