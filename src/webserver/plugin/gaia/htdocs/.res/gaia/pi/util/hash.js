_$define("pi/util/hash", function (require, exports, module){
"use strict";
/*
 * hash库
 */

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

Object.defineProperty(exports, "__esModule", { value: true });
// ============================== 导入
var time_1 = require("../lang/time");
var math_1 = require("./math");
// ============================== 导出
/**
 * @description 计算指定时间左右计算的hash的值和次数
 * @example
 */
exports.calcHashTime = function (s, limitTime) {
    var t = time_1.now();
    var end = t + limitTime;
    var n = 0;
    while (t < end) {
        s = exports.calcHashCount(s, 10000);
        n += 10000;
        t = time_1.now();
    }
    return { r: s, count: n, time: t - end + limitTime };
};
/**
 * @description 计算指定次数的hash
 * @example
 */
exports.calcHashCount = function (s, n) {
    while (n-- > 0) {
        // tslint:disable:prefer-template
        s = '' + exports.murmurhash3_32s(s, 31);
    }
    return s;
};
/**
 * @description 根据当前哈希和指定对象的哈希值，计算下一步的哈希
 * @example
 */
exports.nextHash = function (hash, i) {
    return exports.murmurhash3_32i(i, hash);
    // h = ((h << 5) - h + c) | 0;
};
/**
 * @description 获得字符的新哈希
 * @example
 */
exports.charHash = function (hash, char) {
    return exports.nextHash(hash, char.charCodeAt(0));
};
/**
 * @description 获得字符的新哈希
 * @example
 */
exports.charHashIgnoreCase = function (hash, char) {
    var c = char.charCodeAt(0);
    return c >= 65 && c <= 90 ? exports.nextHash(hash, c + 32) : exports.nextHash(hash, c);
};
/**
 * @description 获得字符的新哈希
 * @example
 */
exports.charHashIgnoreWhiteSpace = function (hash, char) {
    var c = char.charCodeAt(0);
    return c <= 32 ? hash : exports.nextHash(hash, c);
};
/**
 * @description 获得字符的新哈希
 * @example
 */
exports.charHashIgnoreCaseIgnoreWhiteSpace = function (hash, char) {
    var c = char.charCodeAt(0);
    return c <= 32 ? hash : c >= 65 && c <= 90 ? exports.nextHash(hash, c + 32) : exports.nextHash(hash, c);
};
/**
 * @description 获得字符串或数组及可迭代对象的hashCode
 * @example
 */
exports.iterHashCode = function (arr, h, fun) {
    h = h || 0;
    // h 可以改为 5381 （001 010 100 000 101） 这个数字集素数、奇数和缺数于一身。据说hash分布更好一些。
    if (!arr) return h;
    for (var _iterator = arr, _isArray = Array.isArray(_iterator), _i = 0, _iterator = _isArray ? _iterator : _iterator[Symbol.iterator]();;) {
        var _ref;

        if (_isArray) {
            if (_i >= _iterator.length) break;
            _ref = _iterator[_i++];
        } else {
            _i = _iterator.next();
            if (_i.done) break;
            _ref = _i.value;
        }

        var el = _ref;

        h = fun(h, el);
    }
    return h;
};
/**
 * @description 获得字符串的hashCode
 * @example
 */
exports.strHashCode = function (str, h) {
    return exports.murmurhash3_32s(str, h);
};
/**
 * @description 获得对象的hashCode，需要处理循环引用的问题
 * @example
 */
exports.allHash = function (obj, h) {
    return exports.anyHash(obj, h, new Set());
};
/**
 * @description 获得对象的hashCode，需要处理循环引用的问题
 * @example
 */
exports.objHashCode = function (obj, h, cycleObjSet) {
    for (var k in obj) {
        if (k.charCodeAt(0) === 95 && k.charCodeAt(0) === 36) {
            continue;
        }
        h = exports.anyHash(obj[k], exports.strHashCode(k, h), cycleObjSet);
    }
    return h;
};
/**
 * @description 获得数组的hashCode，需要处理循环引用的问题
 * @example
 */
exports.arrHashCode = function (arr, h, cycleObjSet) {
    for (var _iterator2 = arr, _isArray2 = Array.isArray(_iterator2), _i2 = 0, _iterator2 = _isArray2 ? _iterator2 : _iterator2[Symbol.iterator]();;) {
        var _ref2;

        if (_isArray2) {
            if (_i2 >= _iterator2.length) break;
            _ref2 = _iterator2[_i2++];
        } else {
            _i2 = _iterator2.next();
            if (_i2.done) break;
            _ref2 = _i2.value;
        }

        var v = _ref2;

        h = exports.anyHash(v, h, cycleObjSet);
    }
    return h;
};
/**
 * @description 获得任意对象的hashCode，需要处理循环引用的问题
 * @example
 */
// tslint:disable-next-line:cyclomatic-complexity
exports.anyHash = function (obj, h, cycleObjSet) {
    if (obj === undefined) {
        return exports.nextHash(h || 0, 1);
    }
    if (obj === null) {
        return exports.nextHash(h || 0, 2);
    }
    var t = typeof obj === "undefined" ? "undefined" : _typeof(obj);
    if (t === 'boolean') {
        return exports.nextHash(h || 0, obj ? 4 : 3);
    }
    if (t === 'number') {
        if (Number.isInteger(obj)) {
            return exports.nextHash(exports.nextHash(h, 5), obj);
        }
        h = exports.nextHash(h || 0, 6);
        var v1 = Math.floor(obj);
        return exports.nextHash(exports.nextHash(h, v1), Math.floor((obj - v1) * 0xffffffff));
    }
    if (t === 'string') {
        return exports.strHashCode(obj, exports.nextHash(h || 0, 8));
    }
    if (obj instanceof ArrayBuffer) {
        return exports.nextHash(exports.nextHash(h || 0, 20), exports.getCrc32(new Uint8Array(obj)));
    }
    if (ArrayBuffer.isView(obj) && obj.BYTES_PER_ELEMENT > 0) {
        // tslint:disable-next-line:binary-expression-operand-order
        return exports.nextHash(exports.nextHash(h || 0, 20 + obj.BYTES_PER_ELEMENT), exports.getCrc32(new Uint8Array(obj.buffer, obj.byteOffset, obj.byteLength), 0, obj.byteLength));
    }
    if (t === 'function') {
        return exports.nextHash(exports.nextHash(h || 0, 12), exports.strHashCode(obj.name, h));
    }
    if (t === 'object') {
        if (cycleObjSet.has(obj)) {
            return h;
        }
        cycleObjSet.add(obj);
        if (Array.isArray(obj)) {
            h = exports.arrHashCode(obj, exports.nextHash(h || 0, 10), cycleObjSet);
        } else {
            h = exports.objHashCode(obj, exports.nextHash(h || 0, 11), cycleObjSet);
        }
        cycleObjSet.delete(obj);
    }
    return h;
};
/**
 * @description 获得任意对象的深度Copy和hash值, 不支持循环引用
 * @example
 */
// tslint:disable-next-line:cyclomatic-complexity
exports.deepCopyHash = function (obj, result, key, h) {
    if (obj === undefined) {
        result[key] = obj;
        return exports.nextHash(h || 0, 1);
    }
    if (obj === null) {
        result[key] = obj;
        return exports.nextHash(h || 0, 2);
    }
    var t = typeof obj === "undefined" ? "undefined" : _typeof(obj);
    if (t === 'boolean') {
        result[key] = obj;
        return exports.nextHash(h || 0, obj ? 4 : 3);
    }
    if (t === 'number') {
        if (Number.isInteger(obj)) {
            result[key] = obj;
            return exports.nextHash(exports.nextHash(h || 0, 5), obj);
        }
        h = exports.nextHash(h || 0, 6);
        var v1 = Math.floor(obj);
        result[key] = obj;
        return exports.nextHash(exports.nextHash(h, v1), Math.floor((obj - v1) * 0xffffffff));
    }
    if (t === 'string') {
        result[key] = obj;
        return exports.strHashCode(obj, exports.nextHash(h || 0, 8));
    }
    if (obj instanceof ArrayBuffer) {
        result[key] = obj.slice(0);
        return exports.nextHash(exports.nextHash(h || 0, 20), exports.getCrc32(new Uint8Array(obj)));
    }
    if (ArrayBuffer.isView(obj) && obj.BYTES_PER_ELEMENT > 0) {
        var r = obj.slice(0);
        result[key] = r;
        // tslint:disable-next-line:binary-expression-operand-order
        return exports.nextHash(exports.nextHash(h || 0, 20 + r.BYTES_PER_ELEMENT), exports.getCrc32(new Uint8Array(r.buffer)));
    }
    var s = JSON.stringify(obj);
    if (t === 'object') {
        result[key] = JSON.parse(s);
        return exports.strHashCode(s, exports.nextHash(h || 0, Array.isArray(obj) ? 10 : 11));
    }
};
/**
 * @description 计算数组的crc32的值
 * @param  data 字节数组
 * @param  start 数组的起始位置
 * @param  end 计算的结束位置
 * @example
 */
exports.getCrc32 = function (data, start, end) {
    return exports.crc32(data, start || 0, end || data.length, 0xffffffff) ^ 0xffffffff;
};
/**
 * @description 计算数组的crc32的值
 * @param data 字节数组
 * @param start 数组的起始位置
 * @param end 计算的结束位置
 * @param crc 计算用的crc初始值
 * @example
 */
exports.crc32 = function (data, start, end, crc) {
    while (start < end) {
        crc = crc32Table[crc & 0xff ^ data[start++]] ^ crc >>> 8;
    }
    return crc;
};
/**
 * @description 计算数组的adler32的值
 * @param   data 字节数组
 * @param   start 数组的起始位置
 * @param   end 计算的结束位置
 * @param   adler 计算用的adler初始值
 * @example
 */
exports.adler32 = function (data, start, end, adler) {
    var BASE = 65521;
    var NMAX = 5552;
    var s1 = adler & 0xffff;
    var s2 = adler >> 16 & 0xffff;
    while (start < end) {
        var k = end - start < NMAX ? end - start : NMAX;
        while (k >= 16) {
            s1 += data[start++];
            s2 += s1;
            s1 += data[start++];
            s2 += s1;
            s1 += data[start++];
            s2 += s1;
            s1 += data[start++];
            s2 += s1;
            s1 += data[start++];
            s2 += s1;
            s1 += data[start++];
            s2 += s1;
            s1 += data[start++];
            s2 += s1;
            s1 += data[start++];
            s2 += s1;
            s1 += data[start++];
            s2 += s1;
            s1 += data[start++];
            s2 += s1;
            s1 += data[start++];
            s2 += s1;
            s1 += data[start++];
            s2 += s1;
            s1 += data[start++];
            s2 += s1;
            s1 += data[start++];
            s2 += s1;
            s1 += data[start++];
            s2 += s1;
            s1 += data[start++];
            s2 += s1;
            k -= 16;
        }
        while (k > 0) {
            s1 += data[start++];
            s2 += s1;
            k--;
        }
        s1 %= BASE;
        s2 %= BASE;
    }
    return s2 << 16 | s1;
};
/**
 * JS Implementation of MurmurHash3 (r136) (as of May 20, 2011)
 * 对于规律性较强的key，MurmurHash的随机分布特征表现更良好. 能够产生出32-bit、64-bit或128-bit哈希值
 * CityHash 是后来Google受了Murmurhash3的启发，改进主要是由于更大的指令级并行性，
 *  Google内部的hash_map<string, int> 都是用这个算法了。CityHash这个有32位 64位 128 258输出等版本，还有使用SSE4.2的CRC32指令的版本。
 * https://github.com/google/cityhash
 *
 * @author <a href="mailto:gary.court@gmail.com">Gary Court</a>
 * @see http://github.com/garycourt/murmurhash-js
 * @author <a href="mailto:aappleby@gmail.com">Austin Appleby</a>
 * @see http://sites.google.com/site/murmurhash/
 * @see https://github.com/PeterScott/murmur3
 *
 * @param key ASCII only
 * @param seed Positive integer only
 * @return 32-bit positive integer hash
 */
// tslint:disable-next-line:variable-name
exports.murmurhash3_32 = function (key, seed) {
    var k = void 0;
    var remainder = key.length & 3; // key.length % 4
    var h = seed || 31;
    var c1 = 0xcc9e2d51;
    var c2 = 0x1b873593;
    var i = 0;
    for (var len = key.length - remainder; i < len; i += 4) {
        k = key[i] | key[i + 1] << 8 | key[i + 2] << 16 | key[i + 3] << 24;
        k = math_1.imul(k, c1);
        k = k << 15 | k >>> 17;
        k = math_1.imul(k, c2);
        h ^= k;
        h = h << 13 | h >>> 19;
        h = math_1.imul(h, 5) + 0xe6546b64;
    }
    k = 0;
    switch (remainder) {
        case 3:
            k ^= key[i + 2] << 16;
        case 2:
            k ^= key[i + 1] << 8;
        case 1:
            k ^= key[i];
            k = math_1.imul(k, c1);
            k = k << 15 | k >>> 17;
            k = math_1.imul(k, c2);
            h ^= k;
        default:
    }
    h ^= key.length;
    h ^= h >>> 16;
    h = math_1.imul(h, 0x85ebca6b);
    h ^= h >>> 13;
    h = math_1.imul(h, 0xc2b2ae35);
    h ^= h >>> 16;
    return h >>> 0;
};
/**
 * 将字符串算成32位hash值，字符串采用unicode编码，所以一个字符为2个字节进行编码
 */
// tslint:disable-next-line:variable-name
exports.murmurhash3_32s = function (key, seed) {
    var c = void 0;
    var cc = void 0;
    var k = void 0;
    var remainder = key.length & 3; // key.length % 4
    var h = seed || 31;
    var c1 = 0xcc9e2d51;
    var c2 = 0x1b873593;
    var i = 0;
    for (var len = key.length - remainder; i < len; i += 4) {
        c = key.charCodeAt(i);
        cc = key.charCodeAt(i + 1);
        k = c & 0xff | (c >>> 8 & 0xff) << 8 | (cc & 0xff) << 16 | (cc >>> 8 & 0xff) << 24;
        k = math_1.imul(k, c1);
        k = k << 15 | k >>> 17;
        k = math_1.imul(k, c2);
        h ^= k;
        h = h << 13 | h >>> 19;
        h = math_1.imul(h, 5) + 0xe6546b64;
        c = key.charCodeAt(i + 2);
        cc = key.charCodeAt(i + 3);
        k = c & 0xff | (c >>> 8 & 0xff) << 8 | (cc & 0xff) << 16 | (cc >>> 8 & 0xff) << 24;
        k = math_1.imul(k, c1);
        k = k << 15 | k >>> 17;
        k = math_1.imul(k, c2);
        h ^= k;
        h = h << 13 | h >>> 19;
        h = math_1.imul(h, 5) + 0xe6546b64;
    }
    k = 0;
    switch (remainder) {
        case 3:
            k ^= (key.charCodeAt(i + 2) & 0xff) << 16;
        case 2:
            k ^= (key.charCodeAt(i + 1) & 0xff) << 8;
        case 1:
            k ^= key.charCodeAt(i) & 0xff;
            k = math_1.imul(k, c1);
            k = k << 15 | k >>> 17;
            k = math_1.imul(k, c2);
            h ^= k;
        default:
    }
    h ^= key.length;
    h ^= h >>> 16;
    h = math_1.imul(h, 0x85ebca6b);
    h ^= h >>> 13;
    h = math_1.imul(h, 0xc2b2ae35);
    h ^= h >>> 16;
    return h >>> 0;
};
/**
 * 将32位数字算成32位hash值
 */
// tslint:disable-next-line:variable-name
exports.murmurhash3_32i = function (k, seed) {
    var c1 = 0xcc9e2d51;
    var c2 = 0x1b873593;
    var h = seed & 0xffffffff || 31;
    k = math_1.imul(k, c1);
    k = k << 15 | k >>> 17;
    k = math_1.imul(k, c2);
    h ^= k;
    h = h << 13 | h >>> 19;
    h = math_1.imul(h, 5) + 0xe6546b64;
    h ^= 4;
    h ^= h >>> 16;
    h = math_1.imul(h, 0x85ebca6b);
    h ^= h >>> 13;
    h = math_1.imul(h, 0xc2b2ae35);
    h ^= h >>> 16;
    return h >>> 0;
};
exports.weak32 = function (data, prev, start, end) {
    var a = 0;
    var b = 0;
    var sum = 0;
    var M = 1 << 16;
    if (!prev) {
        var len = start >= 0 && end >= 0 ? end - start : data.length;
        for (var i = 0; i < len; i++) {
            a += data[i];
            b += a;
        }
        a %= M;
        b %= M;
    } else {
        var k = start;
        var l = end - 1;
        // tslint:disable:variable-name
        var prev_k = k - 1;
        var prev_l = l - 1;
        var prev_first = data[prev_k];
        var prev_last = data[prev_l];
        var curr_first = data[k];
        var curr_last = data[l];
        a = (prev.a - prev_first + curr_last) % M;
        b = (prev.b - (prev_l - prev_k + 1) * prev_first + a) % M;
    }
    return { a: a, b: b, sum: a + b * M };
};
exports.weak16 = function (data) {
    // tslint:disable-next-line:binary-expression-operand-order
    return 0xffff & (data >> 16 ^ data * 1009);
};
// ============================== 本地
// crc32 表
var crc32Table = [];
// ============================== 立即执行
crc32Table.length = 256;
for (var i = 0; i < 256; i++) {
    var c = i;
    for (var j = 0; j < 8; j++) {
        // tslint:disable-next-line:binary-expression-operand-order
        c = (c & 1) === 1 ? 0xedb88320 ^ c >>> 1 : c >>> 1;
    }
    crc32Table[i] = c;
}
})