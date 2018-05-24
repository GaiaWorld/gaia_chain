_$define("pi/net/websocket/uint64", function (require, exports, module){
"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
/**
 * uint64数据处理
 */
var INT32_MAX = 0xffffffff;
var endReverse = function endReverse(result, bytes) {
    var size = bytes.length;
    var len = void 0;
    var i = void 0;
    var a = void 0;
    var b = void 0;
    var c = void 0;
    var d = void 0;
    len = bytes.length / 4;
    for (i = 0; i < len; i++) {
        a = i << 2;
        b = a + 1;
        c = b + 1;
        d = c + 1;
        result[a] = bytes[d];
        result[b] = bytes[c];
        result[c] = bytes[b];
        result[d] = bytes[a];
    }
    return result.buffer;
};
var isInt64 = function isInt64(n) {
    if (n === undefined) {
        return false;
    }
    return n.byteLength === 8;
};
var toUint32 = function toUint32(bytes) {
    return bytes[0] << 24 | bytes[1] << 16 | bytes[2] << 8 | bytes[3];
};
var toArray32 = function toArray32(bytes, n, index) {
    bytes[index--] = n & 0xff;
    bytes[index--] = n >> 8 & 0xff;
    bytes[index--] = n >> 16 & 0xff;
    bytes[index] = n >> 24 & 0xff;
};
var checkBsl = function checkBsl(int32, n) {
    return int32 >>> 32 - n;
};
var checkBsr = function checkBsr(int32, n) {
    return int32 << 32 - n >>> 0;
};
var add32 = function add32(sum, x32, y32) {
    var lz = x32[1] + y32[1];
    var hz = void 0;
    var ln = void 0;
    ln = lz - INT32_MAX;
    if (ln <= 0) {
        ln = 0;
    } else {
        ln = 1;
    }
    toArray32(sum, lz, 7);
    hz = x32[0] + y32[0] + ln;
    toArray32(sum, hz, 3);
};
var sub32 = function sub32(sum, x, y) {
    bnot64(z, y);
    add64(sum, x, z);
    return add64(sum, sum, ONE);
};
var bnot32 = function bnot32(result, x32) {
    toArray32(result, ~x32[1], 7);
    toArray32(result, ~x32[0], 3);
};
var band32 = function band32(result, x32, y32) {
    toArray32(result, x32[1] & y32[1], 7);
    toArray32(result, x32[0] & y32[0], 3);
};
var bxor32 = function bxor32(result, x32, y32) {
    toArray32(result, x32[1] ^ y32[1], 7);
    toArray32(result, x32[0] ^ y32[0], 3);
};
var bsl32 = function bsl32(result, x32, n) {
    var hx = void 0;
    var lx = void 0;
    var c = void 0;
    var ln = 0;
    lx = x32[1];
    c = n - 32;
    if (c < 0) {
        toArray32(result, lx << n, 7);
        ln = checkBsl(lx, n);
    } else if (c === 0) {
        toArray32(result, 0, 7);
        ln = checkBsl(lx, n);
    } else {
        toArray32(result, 0, 7);
        ln = lx << c;
    }
    hx = x32[0];
    if (c < 0) {
        toArray32(result, (hx << n) + ln, 3);
    } else {
        toArray32(result, ln, 3);
    }
};
var bsr32 = function bsr32(result, x32, n) {
    var hx = void 0;
    var lx = void 0;
    var c = void 0;
    var hn = 0;
    hx = x32[0];
    c = n - 32;
    if (c < 0) {
        toArray32(result, hx >>> n, 3);
        hn = checkBsr(hx, n);
    } else if (c === 0) {
        toArray32(result, 0, 3);
        hn = checkBsr(hx, n);
    } else {
        toArray32(result, 0, 3);
        hn = hx >>> c;
    }
    lx = x32[1];
    if (c < 0) {
        toArray32(result, hn + (lx >>> n), 7);
    } else {
        toArray32(result, hn, 7);
    }
};
var ONE = new Uint8Array(new ArrayBuffer(8), 0, 8);
ONE.set([0, 0, 0, 0, 0, 0, 0, 1]);
var x1 = new Uint8Array(new ArrayBuffer(8), 0, 8);
// tslint:disable-next-line:variable-name
var x1_32 = new Uint32Array(x1.buffer);
var y1 = new Uint8Array(new ArrayBuffer(8), 0, 8);
// tslint:disable-next-line:variable-name
var y1_32 = new Uint32Array(y1.buffer);
var z = new Uint8Array(new ArrayBuffer(8), 0, 8);
/*
 *64位整数加法，参数为3个64位大端字节数组
 */
var add64 = function add64(sum, x, y) {
    if (isInt64(sum) && isInt64(x) && isInt64(y)) {
        endReverse(x1, x);
        endReverse(y1, y);
        add32(sum, x1_32, y1_32);
    } else {
        throw new Error('invalid parameter');
    }
};
exports.add64 = add64;
/**
 * 64位整数减法，参数为3个64位大端字节数组
 */
var sub64 = function sub64(sum, x, y) {
    if (isInt64(sum) && isInt64(x) && isInt64(y)) {
        sub32(sum, x, y);
    } else {
        throw new Error('invalid parameter');
    }
};
exports.sub64 = sub64;
/**
 * 64位整数按位求反，参数为2个64位大端字节数组
 */
var bnot64 = function bnot64(result, x) {
    if (isInt64(result) && isInt64(x)) {
        endReverse(x1, x);
        bnot32(result, x1_32);
    } else {
        throw new Error('invalid parameter');
    }
};
exports.bnot64 = bnot64;
/**
 * 64位整数按位与，参数为3个64位大端字节数组
 */
var band64 = function band64(result, x, y) {
    if (isInt64(result) && isInt64(x) && isInt64(y)) {
        endReverse(x1, x);
        endReverse(y1, y);
        band32(result, x1_32, y1_32);
    } else {
        throw new Error('invalid parameter');
    }
};
exports.band64 = band64;
/**
 * 64位整数按位异或，参数为3个64位大端字节数组
 */
var bxor64 = function bxor64(result, x, y) {
    if (isInt64(x) && isInt64(y)) {
        endReverse(x1, x);
        endReverse(y1, y);
        bxor32(result, x1_32, y1_32);
    } else {
        throw new Error('invalid parameter');
    }
};
exports.bxor64 = bxor64;
/**
 * 64位整数左移，参数为2个64位大端字节数组和移动的位数
 */
var bsl64 = function bsl64(result, x, n) {
    if (isInt64(result) && isInt64(x) && n > 0 && n < 64) {
        endReverse(x1, x);
        bsl32(result, x1_32, n);
    } else if (n === 0) {
        return;
    } else {
        throw new Error('invalid parameter');
    }
};
exports.bsl64 = bsl64;
/**
 * 64位整数右移，参数为2个64位大端字节数组和移动的位数
 */
var bsr64 = function bsr64(result, x, n) {
    if (isInt64(result) && isInt64(x) && n > 0 && n < 64) {
        endReverse(x1, x);
        bsr32(result, x1_32, n);
    } else if (n === 0) {
        return;
    } else {
        throw new Error('invalid parameter');
    }
};
exports.bsr64 = bsr64;
})