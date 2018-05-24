_$define("pi/net/websocket/util", function (require, exports, module){
"use strict";
/**
 * 工具处理
 */

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

Object.defineProperty(exports, "__esModule", { value: true });
var parseUrl = function parseUrl(url) {
    var i = void 0;
    var domain = void 0;
    if (!url) {
        return ['', '', ''];
    }
    if (url.indexOf('file:///') === 0) {
        return ['file:///', url.slice(8), ''];
    }
    if (url.indexOf(':') === 1) {
        return ['file:///', url, ''];
    }
    i = url.indexOf('://');
    if (i > 0) {
        i = url.indexOf('/', i + 3);
    } else {
        domain = '';
        i = 0;
    }
    if (i > 0) {
        domain = url.slice(0, i);
        url = url.slice(i);
    } else if (i < 0) {
        domain = url;
        url = '/';
    }
    i = url.indexOf('?');
    if (i > 0) {
        return [domain, url.slice(0, i), url.slice(i + 1)];
    }
    return [domain, url, ''];
};
exports.parseUrl = parseUrl;
var createU8ArrayView = function createU8ArrayView(arr, index, length) {
    var r = null;
    if (index === undefined || index === null) {
        r = new Uint8Array(arr);
    } else if (length === undefined || length === null) {
        r = new Uint8Array(arr, index);
    } else {
        r = new Uint8Array(arr, index, length);
    }
    return r;
};
exports.createU8ArrayView = createU8ArrayView;
var createArrayBuffer = function createArrayBuffer(size) {
    return new ArrayBuffer(size);
};
exports.createArrayBuffer = createArrayBuffer;
var charToUtf8 = function charToUtf8(c) {
    var r = [];
    if (c < 0) {
        r = [];
    } else if (c < 128) {
        r = [c];
    } else if (c < 2048) {
        // tslint:disable:binary-expression-operand-order
        r = [192 + (c >> 6), 128 + (c & 63)];
    } else if (c < 65536) {
        r = [224 + (c >> 12), 128 + (c >> 6 & 63), 128 + (c & 63)];
    } else if (c < 2097152) {
        r = [240 + (c >> 18), 128 + (c >> 12 & 63), 128 + (c >> 6 & 63), 128 + (c & 63)];
    } else if (c < 67108864) {
        r = [248 + (c >> 24), 128 + (c >> 18 & 63), 128 + (c >> 12 & 63), 128 + (c >> 6 & 63), 128 + (c & 63)];
    } else if (c < 2147483648) {
        r = [252 + (c >> 30), 128 + (c >> 24 & 63), 128 + (c >> 18 & 63), 128 + (c >> 12 & 63), 128 + (c >> 6 & 63), 128 + (c & 63)];
    } else {
        r = [];
    }
    return r;
};
exports.charToUtf8 = charToUtf8;
var utf8Length = function utf8Length(str) {
    var i = void 0;
    var c = void 0;
    var n = str.length;
    var j = 0;
    for (i = 0; i < n; i++) {
        c = str.charCodeAt(i);
        if (c < 128) {
            j++;
        } else if (c > 0x07ff) {
            j += 3;
        } else {
            j += 2;
        }
    }
    return j;
};
exports.utf8Length = utf8Length;
var createU8Array = function createU8Array(len) {
    var r = void 0;
    var arr = void 0;
    len = len || 0;
    arr = new ArrayBuffer(len);
    r = new Uint8Array(arr);
    return r;
};
exports.createU8Array = createU8Array;
var createArray = function createArray(length) {
    var arr = void 0;
    if (length >= 0) {
        arr = [];
        arr.length = length;
    }
    return arr;
};
exports.createArray = createArray;
// tslint:disable-next-line:cyclomatic-complexity
var utf8ToChar = function utf8ToChar(a) {
    var r = [];
    var offset = 0;
    while (offset < a.length) {
        if (a.length >= offset + 1 && a[offset] < 128) {
            r.push(a[offset]);
            offset += 1;
        } else if (a.length >= offset + 2 && a[offset] < 224 && a[offset + 1] < 192) {
            r.push(((a[offset] & 31) << 6) + (a[offset + 1] & 63));
            offset += 2;
            // tslint:disable:max-line-length
        } else if (a.length >= offset + 3 && a[offset] < 240 && a[offset + 1] < 192 && a[offset + 2] < 192) {
            r.push(((a[offset] & 15) << 12) + ((a[offset + 1] & 63) << 6) + (a[offset + 2] & 63));
            offset += 3;
        } else if (a.length >= offset + 4 && a[offset] < 248 && a[offset + 1] < 192 && a[offset + 2] < 192 && a[offset + 3] < 192) {
            r.push(((a[offset] & 7) << 18) + ((a[offset + 1] & 63) << 12) + ((a[offset + 2] & 63) << 6) + (a[offset + 3] & 63));
            offset += 4;
        } else if (a.length >= offset + 5 && a[offset] < 252 && a[offset + 1] < 192 && a[offset + 2] < 192 && a[offset + 3] < 192 && a[offset + 4] < 192) {
            r.push(((a[offset] & 3) << 24) + ((a[offset + 1] & 63) << 18) + ((a[offset + 2] & 63) << 12) + ((a[offset + 3] & 63) << 6) + (a[offset + 4] & 63));
            offset += 5;
        } else if (a.length >= offset + 6 && a[offset] < 254 && a[offset + 1] < 192 && a[offset + 2] < 192 && a[offset + 3] < 192 && a[offset + 4] < 192 && a[offset + 5] < 192) {
            r.push(((a[offset] & 1) << 32) + ((a[offset + 1] & 63) << 24) + ((a[offset + 2] & 63) << 18) + ((a[offset + 3] & 63) << 12) + ((a[offset + 4] & 63) << 6) + (a[offset + 5] & 63));
            offset += 6;
        } else {
            offset += 1;
        }
    }
    return r;
};
exports.utf8ToChar = utf8ToChar;
var isArray = function isArray(value) {
    return Object.prototype.toString.apply(value) === '[object Array]';
};
exports.isArray = isArray;
/**
 * 判断value是否为字符串
 * @param   value 合法的js值
 * @return  value是否为字符串
 */
var isString = function isString(value) {
    return (typeof value === "undefined" ? "undefined" : _typeof(value)) === _typeof('');
};
exports.isString = isString;
/**
 * 判断value是否为数字
 * @param   value 合法的js值
 * @return  value是否为数字
 */
var isNumber = function isNumber(value) {
    return (typeof value === "undefined" ? "undefined" : _typeof(value)) === _typeof(0);
};
exports.isNumber = isNumber;
/**
 * 判断value是否为整数
 * @param  value 合法的js值
 * @return value是否为数字
 */
var isInt = function isInt(value) {
    var mValue = value;
    return typeof value === 'number' && parseFloat(mValue) === parseInt(mValue, 10) && !isNaN(value);
};
exports.isInt = isInt;
var isArrayBuffer = function isArrayBuffer(value) {
    return Object.prototype.toString.apply(value) === '[object ArrayBuffer]';
};
exports.isArrayBuffer = isArrayBuffer;
})