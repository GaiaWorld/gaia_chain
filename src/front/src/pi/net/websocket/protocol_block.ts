/**
 * 协议块处理
 */
import { decode as erlTermDecode, readInt32, readInt8, readString, TAG } from './erl_term';
import {
	charToUtf8, createArrayBuffer, createU8ArrayView, isArray, isArrayBuffer,
	isInt, isNumber, isString, utf8Length, utf8ToChar
} from './util';
import { decode as xxtea64Decode, encode as xxtea64Encode } from './xxtea64';
import { deflateSync, inflateSync } from './zlib';

const random = (seed) => {
	const r = seed ^ 123459876;
	const temp: any = r / 127773;
	let s = r * 16807 - parseInt(temp, 10) * 2147483647;
	if (s < 0) {
		s += 2147483647;
	}

	return s;
};

// 根据挑战码获得密钥数据
const getEncryption = (h) => {
	let h1;
	let h2;
	let h3;
	let h4;
	let h5;
	let h6;
	let h7;
	let h8;
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

// 根据本次密钥数据获得下次密钥数据
const nextEncryption = (l) => {
	const h = [];
	let i;
	for (i = 0; i < l.length; i++) {
		h.push(random(l[i]));
	}

	return h;
};

// 数组拷贝
const arrayCopy = (src, start0, dest, start1, len) => {
	let i;
	let j;
	// tslint:disable-next-line:ban-comma-operator
	for (i = start0, j = start1; i < len; i++ , j++) {
		dest[j] = src[i];
	}

	return;
};

// 写16位整数到arraybuff
const writeInt16 = (jbuf, msg) => {
	let b;
	const len = 2;
	b = createU8ArrayView(jbuf.buf, jbuf.offset, len);
	b[0] = (msg >> 8) & 0xff;
	b[1] = msg & 0xff;
	jbuf.offset += len;

	return len;
};

// 写16位整数到arraybuff
const readInt16 = (jbuf) => {
	let b;
	const len = 2;
	b = createU8ArrayView(jbuf.buf, jbuf.offset, len);
	jbuf.offset += len;

	return (b[0] << 8) | b[1];
};

// 写8位整数到arraybuff
const writeInt8 = (jbuf, msg) => {
	let b;
	const len = 1;
	b = createU8ArrayView(jbuf.buf, jbuf.offset, len);
	b[0] = msg;
	jbuf.offset += len;

	return len;
};

// 写32位整数到arraybuff
const writeInt32 = (jbuf, msg) => {
	let b;
	const len = 4;
	b = createU8ArrayView(jbuf.buf, jbuf.offset, len);
	b[0] = (msg >> 24) & 0xff;
	b[1] = (msg >> 16) & 0xff;
	b[2] = (msg >> 8) & 0xff;
	b[3] = msg & 0xff;
	jbuf.offset += len;

	return len;
};

// 写64位整数到arraybuff---实际上在js上，最大能够保持精度的长整数是+-2^53--需采用小端方式发送--js移位操作只能移32位以下的数字，则需要对高低位进行分别处理--符号位以由外部存放
const writeInt64 = (jbuf, msg) => {
	let b;
	const len = 7;
	let h;
	b = createU8ArrayView(jbuf.buf, jbuf.offset, len);
	const temp: any = Math.abs(msg) / Math.pow(2, 32);
	h = parseInt(temp, 10);
	b[6] = (h >>> 16) & 0xff;
	b[5] = (h >>> 8) & 0xff;
	b[4] = h & 0xff;
	b[3] = (msg >>> 24) & 0xff;
	b[2] = (msg >>> 16) & 0xff;
	b[1] = (msg >>> 8) & 0xff;
	b[0] = msg & 0xff;
	jbuf.offset += len;

	return len;
};

// 写32位整数到arraybuff
const writeUint32 = (jbuf, msg) => {
	let b;
	const len = 4;
	b = createU8ArrayView(jbuf.buf, jbuf.offset, len);
	b[0] = (msg >>> 24) & 0xff;
	b[1] = (msg >>> 16) & 0xff;
	b[2] = (msg >>> 8) & 0xff;
	b[3] = msg & 0xff;
	jbuf.offset += len;

	return len;
};

// 写32位浮点数到arraybuff
const writeFloat64 = (jbuf, msg) => {
	let b;
	let b1;
	let b2;
	const len = 8;
	let tbuff;
	b = createU8ArrayView(jbuf.buf, jbuf.offset, len);
	tbuff = createArrayBuffer(len);
	b1 = new Float64Array(tbuff);
	b1[0] = msg;
	b2 = createU8ArrayView(tbuff);
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
const writeAsUTF8 = (jbuf, msg, ilen) => {
	let i = 0;
	let j = 0;
	let len = 0;
	let eUtf8 = [];
	for (i = 0; i < msg.length; i++) {
		eUtf8 = charToUtf8(msg.charCodeAt(i));
		for (j = 0; j < eUtf8.length; j++) {
			len += writeInt8(jbuf, eUtf8[j]);
		}
	}

	return len;
};

// 写arraybuffer到arraybuff
const writeArrayBuffer = (jbuf, msg) => {
	let b1;
	let b2;
	let len;
	b1 = createU8ArrayView(msg);
	len = b1.length;
	b2 = createU8ArrayView(jbuf.buf, jbuf.offset, len);
	arrayCopy(b1, 0, b2, 0, len);
	jbuf.offset += len;

	return len;
};

// 修改指定位
const setByte = (jbuf, ei, msg) => {
	let b;
	const len = 1;
	b = createU8ArrayView(jbuf.buf, ei, len);
	b[0] = msg;
};

// 从arraybuffer中读取U8Array
const readU8Array = (jbuf, len) => {
	let b;
	b = createU8ArrayView(jbuf.buf, jbuf.offset, len);
	jbuf.offset += len;

	return { buf: b };
};

const swapBigLittle16 = (i) => {
	// 注意，i必须为无符号数
	return ((i & 0xff00) >> 8) | ((i & 0xff) << 8);
};

const swapBigLittle32 = (i) => {
	return ((i & 0xff000000) >>> 24) | ((i & 0xff0000) >> 8) | ((i & 0xff00) << 8) | ((i & 0xff) << 24);
};
const writeString = (jbuf, str) => {
	const len = utf8Length(str);
	writeInt8(jbuf, len);
	writeAsUTF8(jbuf, str, len);

	return len;
};

const mDecode = (msg, jbuf, offset, length) => {
	let k;
	let t;
	let len = readInt8(readU8Array(jbuf, 1));
	const param = {};
	let dbuf: any;
	let tempArray: any;
	msg.type = readString(readU8Array(jbuf, len));
	msg.param = param;
	while (jbuf.offset < length) {
		len = readInt8(readU8Array(jbuf, 1));
		k = readString(readU8Array(jbuf, len));
		len = readInt16(jbuf);
		t = readInt8(readU8Array(jbuf, 1));
		if (t === TAG.SMALL_INT_TAG) {
			param[k] = readInt8(readU8Array(jbuf, 1));
		} else if (t === TAG.INT_TAG) {
			tempArray = readU8Array(jbuf, 4);
			tempArray.offset = 0;
			param[k] = readInt32(tempArray);
		} else if (t === TAG.STRING_TAG) {
			param[k] = readString({ buf: utf8ToChar(readU8Array(jbuf, len - 1).buf) });
		} else if (t === TAG.BIN_TAG) {
			param[k] = readU8Array(jbuf, len - 1).buf;
		} else if (t === TAG.VERSION_TAG) {
			// 传u8数组
			dbuf = readU8Array(jbuf, len - 1);
			dbuf.offset = 0;
			param[k] = erlTermDecode(dbuf);
		}
	}

	return msg;
};

// adler32校验和
// tslint:disable-next-line:variable-name
const _adler32 = (data, adler1) => {
	const MOD_ADLER = 65521;
	let a = adler1 & 0xffff;
	let b = (adler1 >>> 16) & 0xffff;
	let index;
	let adler;
	// Process each byte of the data in order
	for (index = 0; index < data.length; ++index) {
		a = (a + data[index]) % MOD_ADLER;
		b = (b + a) % MOD_ADLER;
	}
	// adler checksum as integer;
	adler = a | (b << 16);

	// adler checksum as byte array
	return adler;
};

const adler32 = (data) => {
	let adler = 1;
	const count = 32 * 1024 - 1;
	let offset = 0;
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
const mEncode = (jbuf, k, v) => {
	let i;
	let len;
	let offset;
	if (k !== undefined) {
		writeString(jbuf, k);
	}
	if (isNumber(v)) {
		if (!isInt(v)) {
			writeInt16(jbuf, 10);
			writeInt8(jbuf, TAG.VERSION_TAG);
			writeInt8(jbuf, TAG.NEW_FLOAT_TAG);
			writeFloat64(jbuf, v);
		} else if (v >= 0 && v < 256) {
			writeInt16(jbuf, 2);
			writeInt8(jbuf, TAG.SMALL_INT_TAG);
			writeInt8(jbuf, v);
		} else if ((v >= -2147483648 && v < 0) || (v >= 256 && v < 2147483648)) {
			writeInt16(jbuf, 5);
			writeInt8(jbuf, TAG.INT_TAG);
			writeInt32(jbuf, v);
		} else {
			writeInt16(jbuf, 11);
			writeInt8(jbuf, TAG.VERSION_TAG);
			writeInt8(jbuf, TAG.SMALL_BIG_TAG);
			writeInt8(jbuf, 7);
			writeInt8(jbuf, v > 0 ? 0 : 1);
			writeInt64(jbuf, v);
		}
	} else if (isString(v)) {
		len = utf8Length(v);
		writeInt16(jbuf, len + 1);
		writeInt8(jbuf, TAG.STRING_TAG);
		writeAsUTF8(jbuf, v, len);
	} else if (isArray(v)) {
		offset = jbuf.offset;
		writeInt16(jbuf, 0);
		if (v.erl_type === TAG.SMALL_TUPLE_TAG) {
			if (v.length > 255) {
				writeInt8(jbuf, TAG.LARGE_TUPLE_TAG);
				writeInt16(jbuf, v.length);
			} else {
				writeInt8(jbuf, TAG.SMALL_TUPLE_TAG);
				writeInt8(jbuf, v.length);
			}
		} else {
			writeInt8(jbuf, TAG.LIST_TAG);
			writeInt16(jbuf, v.length);
		}
		for (i = v.length - 1; i >= 0; --i) {
			mEncode(jbuf, undefined, v[i]);
		}
		len = jbuf.offset - offset - 2;
		setByte(jbuf, offset, ((len >> 8) & 0xFF));
		setByte(jbuf, offset + 1, (len & 0xFF));
		//            } else {
		//                // TODO 如果是数字或字符串数组，则用ERL_TERM组织和发送
	} else if (isArrayBuffer(v)) {
		offset = jbuf.offset;
		writeInt16(jbuf, 0);
		writeInt8(jbuf, TAG.BIN_TAG);
		writeArrayBuffer(jbuf, v);
		len = jbuf.offset - offset - 2;
		setByte(jbuf, offset, ((len >> 8) & 0xFF));
		setByte(jbuf, offset + 1, (len & 0xFF));
	}
};

const doSlice = (buf, start, len) => {
	let r;
	let tView;
	let newBuf;
	let newView;
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
		tView = createU8ArrayView(buf);
		if (len === undefined) {
			len = tView.length;
		}
		newBuf = createArrayBuffer(len - start);
		newView = createU8ArrayView(newBuf);
		arrayCopy(tView, start, newView, 0, len - start);
		r = newBuf;
	}

	return r;
};
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
const encode = (msg, encryption, cfg, isText = false) => {
	let i;
	let k;
	let len;
	const cmd = msg.type;
	const obj = msg.param;
	let jbuf: any;
	let adler;
	let tJbuf;
	let tValidBuf;
	let eTValidBuf;
	let validBuf;
	let jbuf1: any;
	let adlerBuf;
	let version;
	let index = 0;
	if (!isString(cmd)) {
		return 0;
	}
	jbuf = {};
	jbuf.buf = createArrayBuffer(128 * 1024);
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
	if (cfg.deflate && (len >= 32)) {
		// 压缩--目前支持zlib压缩
		version += 2;
		// TODO zlib压缩
		tValidBuf = createU8ArrayView(adlerBuf, index + 5);
		eTValidBuf = deflateSync(tValidBuf);
		validBuf = createU8ArrayView(jbuf.buf, index + 1);
		arrayCopy(eTValidBuf, 0, validBuf, 0, eTValidBuf.length);
		len += (eTValidBuf.length - tValidBuf.length - 4);
	} else if (cfg.verify) {
		// 校验--目前支持alder32校验
		version += 4;
		adler = adler32(createU8ArrayView(adlerBuf, index + 5));
		setByte(jbuf, index + 1, ((adler >> 24) & 0xff));
		setByte(jbuf, index + 2, ((adler >> 16) & 0xff));
		setByte(jbuf, index + 3, ((adler >> 8) & 0xff));
		setByte(jbuf, index + 4, (adler & 0xff));
	} else {
		eTValidBuf = createU8ArrayView(adlerBuf, index + 5);
		validBuf = createU8ArrayView(jbuf.buf, index + 1);
		arrayCopy(eTValidBuf, 0, validBuf, 0, eTValidBuf.length);
		len -= 4;
	}
	// 加密
	if (cfg.encode) {// 支持xor
		if (cfg.encode === 'xor') {
			version += 8;
		} else {// xxtea
			version += 16;
			tJbuf = doSlice(jbuf.buf, 0, len + index);
			tValidBuf = createU8ArrayView(tJbuf, index + 1);
			jbuf1 = {};
			jbuf1.buf = createArrayBuffer(4 * 8);
			jbuf1.offset = 0;
			for (i = 0; i < encryption.length; i++) {
				writeUint32(jbuf1, encryption[i]);
			}
			eTValidBuf = xxtea64Encode(cfg.encodeNum, createU8ArrayView(jbuf1.buf), tValidBuf);
			validBuf = createU8ArrayView(jbuf.buf, index + 1);
			arrayCopy(eTValidBuf, 0, validBuf, 0, eTValidBuf.length);
			len += (eTValidBuf.length - tValidBuf.length);
		}
	}
	// 写入版本号
	setByte(jbuf, index, version);

	jbuf.buf = doSlice(jbuf.buf, 0, len + index);
	// 将实际长度写入到开始预留的位置上
	if (!isText) {
		setByte(jbuf, 0, ((len >> 8) & 0xff));
		setByte(jbuf, 1, (len & 0xff));
	}

	// 		console.log(createU8ArrayView(jbuf.buf))
	return jbuf.buf;
};
/***
 * 解码数据
 * @param {Object} cbuf 待解码数据buf
 * @return {json}返回消息，如果数据不够，则返回false
 * @example
 * 能解析的最大长整数(-9007199254740992,9007199254740992)
 */
const decode = (buf, encryption, num, isText = false) => {
	let i;
	let msg;
	let size;
	const len = buf.byteLength;
	let i32array: any;
	let alder;
	let tAlder;
	let version;
	let jbuf1: any;
	let tValidBuf;
	let eTValidBuf;
	let validBuf;
	let tempOffset;
	const cfg = {};
	let jbuf: any;
	let tbuf;
	const index = 0;
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
	version = readInt8(readU8Array(jbuf, 1));
	if (version >> 4 & 1) {
		// 需解密--目前支持xxtea解密
		tempOffset = jbuf.offset;
		tValidBuf = createU8ArrayView(jbuf.buf, tempOffset);
		jbuf1 = {};
		jbuf1.buf = createArrayBuffer(4 * 8);
		jbuf1.offset = 0;
		for (i = 0; i < encryption.length; i++) {
			writeUint32(jbuf1, encryption[i]);
		}
		eTValidBuf = xxtea64Decode(num, createU8ArrayView(jbuf1.buf), tValidBuf);
		validBuf = createU8ArrayView(jbuf.buf, 3);
		arrayCopy(eTValidBuf, 0, validBuf, 0, eTValidBuf.length);
		jbuf.buf = doSlice(jbuf.buf, 0, tempOffset + eTValidBuf.length);
		jbuf.offset = tempOffset;
		size += (eTValidBuf.length - tValidBuf.length);
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
		alder = readInt32(i32array);
		tAlder = adler32(createU8ArrayView(jbuf.buf, 7));
		if (alder !== tAlder) {
			return {};
		}
	}
	if (version >> 1 & 1) {
		// 需解压--目前支持zlib解压
		// TODO zlib解压
		tValidBuf = createU8ArrayView(jbuf.buf, jbuf.offset);
		eTValidBuf = inflateSync(tValidBuf);
		size = eTValidBuf.length + jbuf.offset;
		tbuf = createArrayBuffer(size);
		validBuf = createU8ArrayView(tbuf);
		// 拷入jbuf的前几位
		tValidBuf = createU8ArrayView(jbuf.buf, 0, jbuf.offset);
		arrayCopy(tValidBuf, 0, validBuf, 0, jbuf.offset);
		// 拷入新数据
		arrayCopy(eTValidBuf, 0, validBuf, jbuf.offset, eTValidBuf.length);
		jbuf.buf = tbuf;
	}
	msg = {};
	mDecode(msg, jbuf, 3, size);

	return msg;
};

export { adler32, getEncryption, nextEncryption, doSlice, encode, decode };