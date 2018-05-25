_$define("test/blockchain/main/main", function (require, exports, module){
"use strict";
/**
 * test's entry
 */

Object.defineProperty(exports, "__esModule", { value: true });
var mocha_1 = require("../../framework/mocha");
var number_1 = require("../util/number");
var tests = [number_1.default];
exports.runTest = function () {
    mocha_1.mocha.setup('bdd');
    for (var _iterator = tests, _isArray = Array.isArray(_iterator), _i = 0, _iterator = _isArray ? _iterator : _iterator[Symbol.iterator]();;) {
        var _ref;

        if (_isArray) {
            if (_i >= _iterator.length) break;
            _ref = _iterator[_i++];
        } else {
            _i = _iterator.next();
            if (_i.done) break;
            _ref = _i.value;
        }

        var test = _ref;

        test();
    }
    mocha_1.mocha.run();
};
})