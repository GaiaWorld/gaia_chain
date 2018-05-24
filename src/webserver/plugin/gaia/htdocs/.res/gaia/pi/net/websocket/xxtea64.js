_$define("pi/net/websocket/xxtea64", function (require, exports, module){
"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
/**
 * xxtea64加/解密
 */
var uint64_1 = require("./uint64");
var le2be = function le2be(bytes) {
    var len = bytes.length / 4;
    var i = void 0;
    var a = void 0;
    var b = void 0;
    var c = void 0;
    var d = void 0;
    var swp = void 0;
    for (i = 0; i < len; i++) {
        a = i * 4;
        b = a + 1;
        c = b + 1;
        d = c + 1;
        swp = bytes[a];
        bytes[a] = bytes[d];
        bytes[d] = swp;
        swp = bytes[b];
        bytes[b] = bytes[c];
        bytes[c] = swp;
    }
};
var str2arr = function str2arr(str) {
    var len = str.length;
    var arr = [];
    var arr32 = void 0;
    var i = void 0;
    var offset = 0;
    if (len >= 32) {
        for (i = 0; i < 8; i++) {
            arr[i] = (str.charCodeAt(i * 4) & 0xff) << 24 | (str.charCodeAt(i * 4 + 1) & 0xff) << 16 | (str.charCodeAt(i * 4 + 2) & 0xff) << 8 | str.charCodeAt(i * 4 + 3) & 0xff;
        }
    }
    arr32 = new Uint32Array(new ArrayBuffer(32));
    for (i = 0; i < 8; i++) {
        arr32[i] = arr[offset++];
    }
    return new Uint8Array(arr32.buffer, 0, 32);
};
var arrayCopy = function arrayCopy(src, start0, dest, start1, len) {
    var i = void 0;
    var j = void 0;
    // tslint:disable-next-line:ban-comma-operator
    for (i = start0, j = start1; i < len && j < len; i++, j++) {
        dest[j] = src[i];
    }
    return;
};
var buf2arr8 = function buf2arr8(buf) {
    return new Uint8Array(buf, 0, buf.byteLength);
};
var get64 = function get64(arr8, bytes, offset) {
    var i = void 0;
    var index = offset * 8;
    for (i = 0; i < arr8.length; i++) {
        arr8[i] = bytes[index++];
    }
};
var set64 = function set64(bytes, offset, val) {
    var i = void 0;
    var len = val.byteLength;
    var index = offset * 8;
    for (i = 0; i < len; i++) {
        bytes[index++] = val[i];
    }
};
var toUint64 = function toUint64(bytes) {
    return bytes[0] << 56 | bytes[1] << 48 | bytes[2] << 40 | bytes[3] << 32 | bytes[4] << 24 | bytes[5] << 16 | bytes[6] << 8 | bytes[7];
};
var toArray64 = function toArray64(n) {
    var arr8 = new Uint8Array(new ArrayBuffer(8), 0, 8);
    arr8[7] = n & 0xff;
    arr8[6] = n >>> 8 & 0xff;
    arr8[5] = n >>> 16 & 0xff;
    arr8[4] = n >>> 24 & 0xff;
    arr8[3] = n >>> 32 & 0xff;
    arr8[2] = n >>> 40 & 0xff;
    arr8[1] = n >>> 48 & 0xff;
    arr8[0] = n >>> 56 & 0xff;
    return arr8.buffer;
};
var toUint32 = function toUint32(bytes) {
    return 0 << 56 | 0 << 48 | 0 << 40 | 0 << 32 | bytes[4] << 24 | bytes[5] << 16 | bytes[6] << 8 | bytes[7];
};
var toArray32 = function toArray32(n) {
    var arr8 = new Uint8Array(new ArrayBuffer(8), 0, 8);
    arr8[7] = n & 0xff;
    arr8[6] = n >>> 8 & 0xff;
    arr8[5] = n >>> 16 & 0xff;
    arr8[4] = n >>> 24 & 0xff;
    arr8[3] = 0;
    arr8[2] = 0;
    arr8[1] = 0;
    arr8[0] = 0;
    return arr8.buffer;
};
var BLOCK_LENGTH = 8;
var DELTA = buf2arr8(new ArrayBuffer(8));
DELTA.set([158, 55, 121, 185, 127, 74, 120, 0]);
var ZERO = buf2arr8(new ArrayBuffer(8));
ZERO.set([0, 0, 0, 0, 0, 0, 0, 0]);
var THREE = buf2arr8(new ArrayBuffer(8));
THREE.set([0, 0, 0, 0, 0, 0, 0, 3]);
var A = buf2arr8(new ArrayBuffer(8));
var B = buf2arr8(new ArrayBuffer(8));
var left0 = buf2arr8(new ArrayBuffer(8));
var left1 = buf2arr8(new ArrayBuffer(8));
var key = buf2arr8(new ArrayBuffer(8));
var count = 0;
var mul64 = function mul64(n) {
    var sum = ZERO;
    var i = void 0;
    for (i = 0; i < n; i++) {
        uint64_1.add64(sum, sum, DELTA);
    }
    return sum;
};
var isZero = function isZero(bytes) {
    var i = void 0;
    for (i = 0; i < 8; i++) {
        if (bytes[i] === 0) {
            continue;
        } else {
            return false;
        }
    }
    return true;
};
var alignData = function alignData(data) {
    var size = data.byteLength;
    var arr8 = void 0;
    if (size >= BLOCK_LENGTH) {
        arr8 = alignData1(BLOCK_LENGTH - size % BLOCK_LENGTH, size, data);
    } else {
        arr8 = alignData1(BLOCK_LENGTH - size, size, data);
    }
    return arr8;
};
var alignData1 = function alignData1(size, len, data) {
    var copy = void 0;
    var arr8 = void 0;
    var fill = void 0;
    switch (size) {
        case 1:
            copy = new ArrayBuffer(len + 1);
            arr8 = new Uint8Array(copy, 0, copy.byteLength);
            arrayCopy(data, 0, arr8, 0, len);
            arr8[len] = 0xff;
            fill = size;
            break;
        case 2:
            copy = new ArrayBuffer(len + 2);
            arr8 = new Uint8Array(copy, 0, copy.byteLength);
            arrayCopy(data, 0, arr8, 0, len);
            arr8[len++] = 0xff;
            arr8[len] = 0xff;
            fill = size;
            break;
        case 3:
            copy = new ArrayBuffer(len + 3);
            arr8 = new Uint8Array(copy, 0, copy.byteLength);
            arrayCopy(data, 0, arr8, 0, len);
            arr8[len++] = 0xff;
            arr8[len++] = 0xff;
            arr8[len] = 0xff;
            fill = size;
            break;
        case 4:
            copy = new ArrayBuffer(len + 4);
            arr8 = new Uint8Array(copy, 0, copy.byteLength);
            arrayCopy(data, 0, arr8, 0, len);
            arr8[len++] = 0xff;
            arr8[len++] = 0xff;
            arr8[len++] = 0xff;
            arr8[len] = 0xff;
            fill = size;
            break;
        case 5:
            copy = new ArrayBuffer(len + 5);
            arr8 = new Uint8Array(copy, 0, copy.byteLength);
            arrayCopy(data, 0, arr8, 0, len);
            arr8[len++] = 0xff;
            arr8[len++] = 0xff;
            arr8[len++] = 0xff;
            arr8[len++] = 0xff;
            arr8[len] = 0xff;
            fill = size;
            break;
        case 6:
            copy = new ArrayBuffer(len + 6);
            arr8 = new Uint8Array(copy, 0, copy.byteLength);
            arrayCopy(data, 0, arr8, 0, len);
            arr8[len++] = 0xff;
            arr8[len++] = 0xff;
            arr8[len++] = 0xff;
            arr8[len++] = 0xff;
            arr8[len++] = 0xff;
            arr8[len] = 0xff;
            fill = size;
            break;
        case 7:
            copy = new ArrayBuffer(len + 7);
            arr8 = new Uint8Array(copy, 0, copy.byteLength);
            arrayCopy(data, 0, arr8, 0, len);
            arr8[len++] = 0xff;
            arr8[len++] = 0xff;
            arr8[len++] = 0xff;
            arr8[len++] = 0xff;
            arr8[len++] = 0xff;
            arr8[len++] = 0xff;
            arr8[len] = 0xff;
            fill = size;
            break;
        case 8:
            copy = new ArrayBuffer(len);
            arr8 = new Uint8Array(copy, 0, copy.byteLength);
            arrayCopy(data, 0, arr8, 0, len);
            fill = 0;
            break;
        default:
    }
    return {
        arr8: arr8,
        fill: fill
    };
};
var mx = function mx(z, y, sum, key, p, e) {
    count++;
    var index = void 0;
    uint64_1.bsr64(A, z, 6);
    uint64_1.bsl64(B, y, 3);
    uint64_1.bxor64(left0, A, B);
    uint64_1.bsr64(A, y, 4);
    uint64_1.bsl64(B, z, 5);
    uint64_1.bxor64(left1, A, B);
    uint64_1.add64(left0, left0, left1);
    uint64_1.bxor64(A, sum, y);
    index = p & 3 ^ toUint32(e);
    get64(key, key, index);
    uint64_1.bxor64(B, key, z);
    uint64_1.add64(A, A, B);
    uint64_1.bxor64(B, left0, A);
    return B;
};
var encode = function encode(rounds, key, data) {
    var t = void 0;
    var k = void 0;
    var v = void 0;
    var n = void 0;
    var swap = buf2arr8(new ArrayBuffer(8));
    var y = buf2arr8(new ArrayBuffer(8));
    var z = buf2arr8(new ArrayBuffer(8));
    var sum = buf2arr8(new ArrayBuffer(8));
    var p = void 0;
    var e = buf2arr8(new ArrayBuffer(8));
    var arr = void 0;
    var arr8 = void 0;
    var tmp = void 0;
    if (rounds < 1 || rounds > 32) {
        throw new Error('invalid_rounds');
    }
    if (typeof key === 'string') {
        k = str2arr(key);
        le2be(k);
        if (k.length < 8) {
            throw new Error('invalid_key_length');
        }
    } else if (key.byteLength >= 32) {
        k = key;
    } else {
        throw new Error('invalid_key_type');
    }
    t = alignData(data);
    v = t.arr8;
    n = v.byteLength / BLOCK_LENGTH;
    arrayCopy(ZERO, 0, sum, 0, 8);
    get64(z, v, n - 1);
    do {
        uint64_1.add64(sum, sum, DELTA);
        uint64_1.bsr64(swap, sum, 16);
        uint64_1.band64(e, swap, THREE);
        for (p = 0; p < n - 1; p++) {
            get64(y, v, p + 1);
            get64(swap, v, p);
            uint64_1.add64(z, swap, mx(z, y, sum, k, p, e));
            set64(v, p, z);
        }
        get64(y, v, 0);
        get64(swap, v, n - 1);
        uint64_1.add64(z, swap, mx(z, y, sum, k, p, e));
        set64(v, n - 1, z);
    } while (--rounds);
    arr = new ArrayBuffer(n * BLOCK_LENGTH + 1);
    arr8 = new Uint8Array(arr, 0, arr.byteLength);
    arr8[0] = t.fill;
    tmp = new Uint8Array(v.buffer, 0, v.buffer.byteLength);
    arrayCopy(tmp, 0, arr8, 1, arr8.length);
    return arr8;
};
exports.encode = encode;
/**
 * 解密数据
 */
var decode = function decode(rounds, key, data) {
    var k = void 0;
    var v = void 0;
    var fill = void 0;
    var len = void 0;
    var n = void 0;
    var swap = buf2arr8(new ArrayBuffer(8));
    var y = buf2arr8(new ArrayBuffer(8));
    var z = buf2arr8(new ArrayBuffer(8));
    var sum = void 0;
    var p = void 0;
    var e = buf2arr8(new ArrayBuffer(8));
    var arr = void 0;
    if (rounds < 1 || rounds > 32) {
        throw new Error('invalid_rounds');
    }
    if (typeof key === 'string') {
        k = str2arr(key);
        le2be(k);
        if (k.length < 8) {
            throw new Error('invalid_key_length');
        }
    } else if (key.byteLength >= 32) {
        k = key;
    } else {
        throw new Error('invalid_key_type');
    }
    fill = data[0];
    len = data.byteLength - 1;
    n = len / BLOCK_LENGTH;
    sum = mul64(rounds);
    arr = new ArrayBuffer(len);
    v = new Uint8Array(arr, 0, len);
    arrayCopy(data, 1, v, 0, data.byteLength);
    get64(y, v, 0);
    do {
        uint64_1.bsr64(swap, sum, 16);
        uint64_1.band64(e, swap, THREE);
        for (p = n - 1; p > 0; p--) {
            get64(z, v, p - 1);
            get64(swap, v, p);
            uint64_1.sub64(y, swap, mx(z, y, sum, k, p, e));
            set64(v, p, y);
        }
        get64(z, v, n - 1);
        get64(swap, v, 0);
        uint64_1.sub64(y, swap, mx(z, y, sum, k, p, e));
        set64(v, 0, y);
        uint64_1.sub64(sum, sum, DELTA);
    } while (!isZero(sum));
    return v.subarray(0, len - fill);
};
exports.decode = decode;
})