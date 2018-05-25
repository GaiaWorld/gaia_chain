_$define("test/blockchain/util/number", function (require, exports, module){
"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
var chai_1 = require("../../framework/chai");
exports.default = function () {
    describe('util/number', function () {
        describe('U32()', function () {
            it('test', function () {
                chai_1.chai.assert.equal([1, 2, 3].indexOf(4), -1);
            });
        });
    });
};
})