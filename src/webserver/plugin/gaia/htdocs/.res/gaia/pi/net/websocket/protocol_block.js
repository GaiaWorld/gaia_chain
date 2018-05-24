_$define("pi/net/websocket/protocol_block", function (require, exports, module){
"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
/**
 * 协议块处理
 */
var erl_term_1 = require("./erl_term");
var util_1 = require("./util");
var xxtea64_1 = require("./xxtea64");
var zlib_1 = require("./zlib");
var random = function random(seed) {
    var r = seed ^ 123459876;
    var temp = r / 127773;
    var s = r * 16807 - parseInt(temp, 10) * 2147483647;
    if (s < 0) {
        s += 2147483647;
    }
    return s;
};
// 根据挑战码获得密钥数据
var getEncryption = function getEncryption(h) {
    var h1 = void 0;
    var h2 = void 0;
    var h3 = void 0;
    var h4 = void 0;
    var h5 = void 0;
    var h6 = void 0;
    var h7 = void 0;
    var h8 = void 0;
    h1 = random(h + 11);
    h2 = random(h1 + 13);
    h3 = random(h2 + 17);
    h4 = random(h3 + 19);
    h5 = random(h4 + 23);
    h6 = random(h5 + 29);
    h7 = random(h6 + 31);
    h8 = random(h7 + 37);
    return [h1, h2, h3, h4, h5, h6, h7, h8];
};
exports.getEncryption = getEncryption;
// 根据本次密钥数据获得下次密钥数据
var nextEncryption = function nextEncryption(l) {
    var h = [];
    var i = void 0;
    for (i = 0; i < l.length; i++) {
        h.push(random(l[i]));
    }
    return h;
};
exports.nextEncryption = nextEncryption;
// 数组拷贝
var arrayCopy = function arrayCopy(src, start0, dest, start1, len) {
    var i = void 0;
    var j = void 0;
    // tslint:disable-next-line:ban-comma-operator
    for (i = start0, j = start1; i < len; i++, j++) {
        dest[j] = src[i];
    }
    return;
};
// 写16位整数到arraybuff
var writeInt16 = function writeInt16(jbuf, msg) {
    var b = void 0;
    var len = 2;
    b = util_1.createU8ArrayView(jbuf.buf, jbuf.offset, len);
    b[0] = msg >> 8 & 0xff;
    b[1] = msg & 0xff;
    jbuf.offset += len;
    return len;
};
// 写16位整数到arraybuff
var readInt16 = function readInt16(jbuf) {
    var b = void 0;
    var len = 2;
    b = util_1.createU8ArrayView(jbuf.buf, jbuf.offset, len);
    jbuf.offset += len;
    return b[0] << 8 | b[1];
};
// 写8位整数到arraybuff
var writeInt8 = function writeInt8(jbuf, msg) {
    var b = void 0;
    var len = 1;
    b = util_1.createU8ArrayView(jbuf.buf, jbuf.offset, len);
    b[0] = msg;
    jbuf.offset += len;
    return len;
};
// 写32位整数到arraybuff
var writeInt32 = function writeInt32(jbuf, msg) {
    var b = void 0;
    var len = 4;
    b = util_1.createU8ArrayView(jbuf.buf, jbuf.offset, len);
    b[0] = msg >> 24 & 0xff;
    b[1] = msg >> 16 & 0xff;
    b[2] = msg >> 8 & 0xff;
    b[3] = msg & 0xff;
    jbuf.offset += len;
    return len;
};
// 写64位整数到arraybuff---实际上在js上，最大能够保持精度的长整数是+-2^53--需采用小端方式发送--js移位操作只能移32位以下的数字，则需要对高低位进行分别处理--符号位以由外部存放
var writeInt64 = function writeInt64(jbuf, msg) {
    var b = void 0;
    var len = 7;
    var h = void 0;
    b = util_1.createU8ArrayView(jbuf.buf, jbuf.offset, len);
    var temp = Math.abs(msg) / Math.pow(2, 32);
    h = parseInt(temp, 10);
    b[6] = h >>> 16 & 0xff;
    b[5] = h >>> 8 & 0xff;
    b[4] = h & 0xff;
    b[3] = msg >>> 24 & 0xff;
    b[2] = msg >>> 16 & 0xff;
    b[1] = msg >>> 8 & 0xff;
    b[0] = msg & 0xff;
    jbuf.offset += len;
    return len;
};
// 写32位整数到arraybuff
var writeUint32 = function writeUint32(jbuf, msg) {
    var b = void 0;
    var len = 4;
    b = util_1.createU8ArrayView(jbuf.buf, jbuf.offset, len);
    b[0] = msg >>> 24 & 0xff;
    b[1] = msg >>> 16 & 0xff;
    b[2] = msg >>> 8 & 0xff;
    b[3] = msg & 0xff;
    jbuf.offset += len;
    return len;
};
// 写32位浮点数到arraybuff
var writeFloat64 = function writeFloat64(jbuf, msg) {
    var b = void 0;
    var b1 = void 0;
    var b2 = void 0;
    var len = 8;
    var tbuff = void 0;
    b = util_1.createU8ArrayView(jbuf.buf, jbuf.offset, len);
    tbuff = util_1.createArrayBuffer(len);
    b1 = new Float64Array(tbuff);
    b1[0] = msg;
    b2 = util_1.createU8ArrayView(tbuff);
    b[0] = b2[7];
    b[1] = b2[6];
    b[2] = b2[5];
    b[3] = b2[4];
    b[4] = b2[3];
    b[5] = b2[2];
    b[6] = b2[1];
    b[7] = b2[0];
    jbuf.offset += len;
    return len;
};
// 写utf8字符串到arraybuff
var writeAsUTF8 = function writeAsUTF8(jbuf, msg, ilen) {
    var i = 0;
    var j = 0;
    var len = 0;
    var eUtf8 = [];
    for (i = 0; i < msg.length; i++) {
        eUtf8 = util_1.charToUtf8(msg.charCodeAt(i));
        for (j = 0; j < eUtf8.length; j++) {
            len += writeInt8(jbuf, eUtf8[j]);
        }
    }
    return len;
};
// 写arraybuffer到arraybuff
var writeArrayBuffer = function writeArrayBuffer(jbuf, msg) {
    var b1 = void 0;
    var b2 = void 0;
    var len = void 0;
    b1 = util_1.createU8ArrayView(msg);
    len = b1.length;
    b2 = util_1.createU8ArrayView(jbuf.buf, jbuf.offset, len);
    arrayCopy(b1, 0, b2, 0, len);
    jbuf.offset += len;
    return len;
};
// 修改指定位
var setByte = function setByte(jbuf, ei, msg) {
    var b = void 0;
    var len = 1;
    b = util_1.createU8ArrayView(jbuf.buf, ei, len);
    b[0] = msg;
};
// 从arraybuffer中读取U8Array
var readU8Array = function readU8Array(jbuf, len) {
    var b = void 0;
    b = util_1.createU8ArrayView(jbuf.buf, jbuf.offset, len);
    jbuf.offset += len;
    return { buf: b };
};
var swapBigLittle16 = function swapBigLittle16(i) {
    // 注意，i必须为无符号数
    return (i & 0xff00) >> 8 | (i & 0xff) << 8;
};
var swapBigLittle32 = function swapBigLittle32(i) {
    return (i & 0xff000000) >>> 24 | (i & 0xff0000) >> 8 | (i & 0xff00) << 8 | (i & 0xff) << 24;
};
var writeString = function writeString(jbuf, str) {
    var len = util_1.utf8Length(str);
    writeInt8(jbuf, len);
    writeAsUTF8(jbuf, str, len);
    return len;
};
var mDecode = function mDecode(msg, jbuf, offset, length) {
    var k = void 0;
    var t = void 0;
    var len = erl_term_1.readInt8(readU8Array(jbuf, 1));
    var param = {};
    var dbuf = void 0;
    var tempArray = void 0;
    msg.type = erl_term_1.readString(readU8Array(jbuf, len));
    msg.param = param;
    while (jbuf.offset < length) {
        len = erl_term_1.readInt8(readU8Array(jbuf, 1));
        k = erl_term_1.readString(readU8Array(jbuf, len));
        len = readInt16(jbuf);
        t = erl_term_1.readInt8(readU8Array(jbuf, 1));
        if (t === erl_term_1.TAG.SMALL_INT_TAG) {
            param[k] = erl_term_1.readInt8(readU8Array(jbuf, 1));
        } else if (t === erl_term_1.TAG.INT_TAG) {
            tempArray = readU8Array(jbuf, 4);
            tempArray.offset = 0;
            param[k] = erl_term_1.readInt32(tempArray);
        } else if (t === erl_term_1.TAG.STRING_TAG) {
            param[k] = erl_term_1.readString({ buf: util_1.utf8ToChar(readU8Array(jbuf, len - 1).buf) });
        } else if (t === erl_term_1.TAG.BIN_TAG) {
            param[k] = readU8Array(jbuf, len - 1).buf;
        } else if (t === erl_term_1.TAG.VERSION_TAG) {
            // 传u8数组
            dbuf = readU8Array(jbuf, len - 1);
            dbuf.offset = 0;
            param[k] = erl_term_1.decode(dbuf);
        }
    }
    return msg;
};
// adler32校验和
// tslint:disable-next-line:variable-name
var _adler32 = function _adler32(data, adler1) {
    var MOD_ADLER = 65521;
    var a = adler1 & 0xffff;
    var b = adler1 >>> 16 & 0xffff;
    var index = void 0;
    var adler = void 0;
    // Process each byte of the data in order
    for (index = 0; index < data.length; ++index) {
        a = (a + data[index]) % MOD_ADLER;
        b = (b + a) % MOD_ADLER;
    }
    // adler checksum as integer;
    adler = a | b << 16;
    // adler checksum as byte array
    return adler;
};
var adler32 = function adler32(data) {
    var adler = 1;
    var count = 32 * 1024 - 1;
    var offset = 0;
    if (data.length > count) {
        while (offset < data.length) {
            if (offset + count > data.length) {
                adler = _adler32(data.slice(offset, data.length), adler);
            } else {
                adler = _adler32(data.slice(offset, offset + count), adler);
            }
            offset += count;
        }
    } else {
        adler = _adler32(data, adler);
    }
    return adler;
};
exports.adler32 = adler32;
var mEncode = function mEncode(jbuf, k, v) {
    var i = void 0;
    var len = void 0;
    var offset = void 0;
    if (k !== undefined) {
        writeString(jbuf, k);
    }
    if (util_1.isNumber(v)) {
        if (!util_1.isInt(v)) {
            writeInt16(jbuf, 10);
            writeInt8(jbuf, erl_term_1.TAG.VERSION_TAG);
            writeInt8(jbuf, erl_term_1.TAG.NEW_FLOAT_TAG);
            writeFloat64(jbuf, v);
        } else if (v >= 0 && v < 256) {
            writeInt16(jbuf, 2);
            writeInt8(jbuf, erl_term_1.TAG.SMALL_INT_TAG);
            writeInt8(jbuf, v);
        } else if (v >= -2147483648 && v < 0 || v >= 256 && v < 2147483648) {
            writeInt16(jbuf, 5);
            writeInt8(jbuf, erl_term_1.TAG.INT_TAG);
            writeInt32(jbuf, v);
        } else {
            writeInt16(jbuf, 11);
            writeInt8(jbuf, erl_term_1.TAG.VERSION_TAG);
            writeInt8(jbuf, erl_term_1.TAG.SMALL_BIG_TAG);
            writeInt8(jbuf, 7);
            writeInt8(jbuf, v > 0 ? 0 : 1);
            writeInt64(jbuf, v);
        }
    } else if (util_1.isString(v)) {
        len = util_1.utf8Length(v);
        writeInt16(jbuf, len + 1);
        writeInt8(jbuf, erl_term_1.TAG.STRING_TAG);
        writeAsUTF8(jbuf, v, len);
    } else if (util_1.isArray(v)) {
        offset = jbuf.offset;
        writeInt16(jbuf, 0);
        if (v.erl_type === erl_term_1.TAG.SMALL_TUPLE_TAG) {
            if (v.length > 255) {
                writeInt8(jbuf, erl_term_1.TAG.LARGE_TUPLE_TAG);
                writeInt16(jbuf, v.length);
            } else {
                writeInt8(jbuf, erl_term_1.TAG.SMALL_TUPLE_TAG);
                writeInt8(jbuf, v.length);
            }
        } else {
            writeInt8(jbuf, erl_term_1.TAG.LIST_TAG);
            writeInt16(jbuf, v.length);
        }
        for (i = v.length - 1; i >= 0; --i) {
            mEncode(jbuf, undefined, v[i]);
        }
        len = jbuf.offset - offset - 2;
        setByte(jbuf, offset, len >> 8 & 0xFF);
        setByte(jbuf, offset + 1, len & 0xFF);
        //            } else {
        //                // TODO 如果是数字或字符串数组，则用ERL_TERM组织和发送
    } else if (util_1.isArrayBuffer(v)) {
        offset = jbuf.offset;
        writeInt16(jbuf, 0);
        writeInt8(jbuf, erl_term_1.TAG.BIN_TAG);
        writeArrayBuffer(jbuf, v);
        len = jbuf.offset - offset - 2;
        setByte(jbuf, offset, len >> 8 & 0xFF);
        setByte(jbuf, offset + 1, len & 0xFF);
    }
};
var doSlice = function doSlice(buf, start, len) {
    var r = void 0;
    var tView = void 0;
    var newBuf = void 0;
    var newView = void 0;
    if (start === undefined) {
        start = 0;
    }
    if (buf.slice) {
        if (len !== undefined) {
            r = buf.slice(start, len);
        } else {
            r = buf.slice(start);
        }
    } else {
        tView = util_1.createU8ArrayView(buf);
        if (len === undefined) {
            len = tView.length;
        }
        newBuf = util_1.createArrayBuffer(len - start);
        newView = util_1.createU8ArrayView(newBuf);
        arrayCopy(tView, start, newView, 0, len - start);
        r = newBuf;
    }
    return r;
};
exports.doSlice = doSlice;
/***
 * 编码消息
 * @param {msg} 需编码的消息对象
 * @return 编码后的arraybuffer
 * 长整数：头+类型+长度+符号+数据
 * 报文结构：
 * |----------报文长度--------||----------版本号--------||-----校验码-----||-----cmd-----||-----数据-----|
 * |----------占用2字节-------||--------占用1字节-------||---占用4字节----||----String---||-----数据-----|
 *                                                                      |--------压缩的作用范围---------|
 *                                                     |-----------------加密的作用范围-----------------|
 * 版本号bit标示：
 *    第0位：默认1
 *    第1位：是否使用zlib压缩
 *    第2位：是否使用ADLER32校验数据完整性
 *    第3位：是否使用xor加密
 *    第4位：是否使用xxtea64加密
 */
var encode = function encode(msg, encryption, cfg) {
    var isText = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : false;

    var i = void 0;
    var k = void 0;
    var len = void 0;
    var cmd = msg.type;
    var obj = msg.param;
    var jbuf = void 0;
    var adler = void 0;
    var tJbuf = void 0;
    var tValidBuf = void 0;
    var eTValidBuf = void 0;
    var validBuf = void 0;
    var jbuf1 = void 0;
    var adlerBuf = void 0;
    var version = void 0;
    var index = 0;
    if (!util_1.isString(cmd)) {
        return 0;
    }
    jbuf = {};
    jbuf.buf = util_1.createArrayBuffer(128 * 1024);
    jbuf.offset = 0;
    // 长度
    if (!isText) {
        writeInt16(jbuf, 0);
        index = 2;
    }
    // 版本号
    writeInt8(jbuf, 0);
    // 效验码
    writeInt32(jbuf, 0);
    // cmd
    writeString(jbuf, cmd);
    for (k in obj) {
        if (obj.hasOwnProperty(k)) {
            mEncode(jbuf, k, obj[k]);
        }
    }
    len = jbuf.offset - index;
    adlerBuf = doSlice(jbuf.buf, 0, len + index);
    // 版本号(xxtea加密+alder32校验和+1)
    version = 1;
    // 压缩与校验
    if (cfg.deflate && len >= 32) {
        // 压缩--目前支持zlib压缩
        version += 2;
        // TODO zlib压缩
        tValidBuf = util_1.createU8ArrayView(adlerBuf, index + 5);
        eTValidBuf = zlib_1.deflateSync(tValidBuf);
        validBuf = util_1.createU8ArrayView(jbuf.buf, index + 1);
        arrayCopy(eTValidBuf, 0, validBuf, 0, eTValidBuf.length);
        len += eTValidBuf.length - tValidBuf.length - 4;
    } else if (cfg.verify) {
        // 校验--目前支持alder32校验
        version += 4;
        adler = adler32(util_1.createU8ArrayView(adlerBuf, index + 5));
        setByte(jbuf, index + 1, adler >> 24 & 0xff);
        setByte(jbuf, index + 2, adler >> 16 & 0xff);
        setByte(jbuf, index + 3, adler >> 8 & 0xff);
        setByte(jbuf, index + 4, adler & 0xff);
    } else {
        eTValidBuf = util_1.createU8ArrayView(adlerBuf, index + 5);
        validBuf = util_1.createU8ArrayView(jbuf.buf, index + 1);
        arrayCopy(eTValidBuf, 0, validBuf, 0, eTValidBuf.length);
        len -= 4;
    }
    // 加密
    if (cfg.encode) {
        if (cfg.encode === 'xor') {
            version += 8;
        } else {
            version += 16;
            tJbuf = doSlice(jbuf.buf, 0, len + index);
            tValidBuf = util_1.createU8ArrayView(tJbuf, index + 1);
            jbuf1 = {};
            jbuf1.buf = util_1.createArrayBuffer(4 * 8);
            jbuf1.offset = 0;
            for (i = 0; i < encryption.length; i++) {
                writeUint32(jbuf1, encryption[i]);
            }
            eTValidBuf = xxtea64_1.encode(cfg.encodeNum, util_1.createU8ArrayView(jbuf1.buf), tValidBuf);
            validBuf = util_1.createU8ArrayView(jbuf.buf, index + 1);
            arrayCopy(eTValidBuf, 0, validBuf, 0, eTValidBuf.length);
            len += eTValidBuf.length - tValidBuf.length;
        }
    }
    // 写入版本号
    setByte(jbuf, index, version);
    jbuf.buf = doSlice(jbuf.buf, 0, len + index);
    // 将实际长度写入到开始预留的位置上
    if (!isText) {
        setByte(jbuf, 0, len >> 8 & 0xff);
        setByte(jbuf, 1, len & 0xff);
    }
    // 		console.log(createU8ArrayView(jbuf.buf))
    return jbuf.buf;
};
exports.encode = encode;
/***
 * 解码数据
 * @param {Object} cbuf 待解码数据buf
 * @return {json}返回消息，如果数据不够，则返回false
 * @example
 * 能解析的最大长整数(-9007199254740992,9007199254740992)
 */
var decode = function decode(buf, encryption, num) {
    var isText = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : false;

    var i = void 0;
    var msg = void 0;
    var size = void 0;
    var len = buf.byteLength;
    var i32array = void 0;
    var alder = void 0;
    var tAlder = void 0;
    var version = void 0;
    var jbuf1 = void 0;
    var tValidBuf = void 0;
    var eTValidBuf = void 0;
    var validBuf = void 0;
    var tempOffset = void 0;
    var cfg = {};
    var jbuf = void 0;
    var tbuf = void 0;
    var index = 0;
    if (len < 4) {
        return false;
    }
    jbuf = {};
    jbuf.buf = buf;
    jbuf.offset = 0;
    size = readInt16(jbuf) + 2;
    if (size !== len) {
        return false;
    }
    // 读取版本信息
    version = erl_term_1.readInt8(readU8Array(jbuf, 1));
    if (version >> 4 & 1) {
        // 需解密--目前支持xxtea解密
        tempOffset = jbuf.offset;
        tValidBuf = util_1.createU8ArrayView(jbuf.buf, tempOffset);
        jbuf1 = {};
        jbuf1.buf = util_1.createArrayBuffer(4 * 8);
        jbuf1.offset = 0;
        for (i = 0; i < encryption.length; i++) {
            writeUint32(jbuf1, encryption[i]);
        }
        eTValidBuf = xxtea64_1.decode(num, util_1.createU8ArrayView(jbuf1.buf), tValidBuf);
        validBuf = util_1.createU8ArrayView(jbuf.buf, 3);
        arrayCopy(eTValidBuf, 0, validBuf, 0, eTValidBuf.length);
        jbuf.buf = doSlice(jbuf.buf, 0, tempOffset + eTValidBuf.length);
        jbuf.offset = tempOffset;
        size += eTValidBuf.length - tValidBuf.length;
    }
    if (version >> 3 & 1) {
        // 需解密
        // TODO 进行xor解密校验
        console.log('xor');
    }
    if (version >> 2 & 1) {
        // 需校验--目前支持alder32校验
        i32array = readU8Array(jbuf, 4);
        i32array.offset = 0;
        alder = erl_term_1.readInt32(i32array);
        tAlder = adler32(util_1.createU8ArrayView(jbuf.buf, 7));
        if (alder !== tAlder) {
            return {};
        }
    }
    if (version >> 1 & 1) {
        // 需解压--目前支持zlib解压
        // TODO zlib解压
        tValidBuf = util_1.createU8ArrayView(jbuf.buf, jbuf.offset);
        eTValidBuf = zlib_1.inflateSync(tValidBuf);
        size = eTValidBuf.length + jbuf.offset;
        tbuf = util_1.createArrayBuffer(size);
        validBuf = util_1.createU8ArrayView(tbuf);
        // 拷入jbuf的前几位
        tValidBuf = util_1.createU8ArrayView(jbuf.buf, 0, jbuf.offset);
        arrayCopy(tValidBuf, 0, validBuf, 0, jbuf.offset);
        // 拷入新数据
        arrayCopy(eTValidBuf, 0, validBuf, jbuf.offset, eTValidBuf.length);
        jbuf.buf = tbuf;
    }
    msg = {};
    mDecode(msg, jbuf, 3, size);
    return msg;
};
exports.decode = decode;
})