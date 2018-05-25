_$define("blockchain/util/number", function (require, exports, module){
"use strict";
/**
 * number type
 */

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

Object.defineProperty(exports, "__esModule", { value: true });

var U64 = function U64() {
    _classCallCheck(this, U64);

    this.buf = new Uint8Array(U64.SIZE);
};

U64.SIZE = 8;
exports.U64 = U64;

var U160 = function U160() {
    _classCallCheck(this, U160);

    this.buf = new Uint8Array(U160.SIZE);
};

U160.SIZE = 20;
exports.U160 = U160;

var U256 = function U256() {
    _classCallCheck(this, U256);

    this.buf = new Uint8Array(U256.SIZE);
};

U256.SIZE = 32;
exports.U256 = U256;

var U520 = function U520() {
    _classCallCheck(this, U520);

    this.buf = new Uint8Array(U520.SIZE);
};

U520.SIZE = 65;
exports.U520 = U520;
})