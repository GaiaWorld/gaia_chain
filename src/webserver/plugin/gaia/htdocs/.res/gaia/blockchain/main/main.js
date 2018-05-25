_$define("blockchain/main/main", function (require, exports, module){
"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
var chai_1 = require("../../test/framework/chai");
var mocha_1 = require("../../test/framework/mocha");
exports.main = function () {
    mocha_1.mocha.setup('bdd');
    describe('Array', function () {
        describe('#indexOf()', function () {
            it('should return -1 when the value is not present', function () {
                chai_1.chai.assert.equal([1, 2, 3].indexOf(4), -1);
            });
        });
    });
    mocha_1.mocha.run();
};
})