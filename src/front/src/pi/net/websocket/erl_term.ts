/**
 * erlang数据转换
 */
import { createArray, createArrayBuffer, createU8Array, createU8ArrayView } from './util';

const TAG = {
	// 序列化版本号
	VERSION_TAG: 131,
	// 原子标记
	ATOM_TAG: 100,
	// 原子标记
	SMALL_ATOM_TAG: 115,
	// 短整数标记
	SMALL_INT_TAG: 97,
	// 整数标记
	INT_TAG: 98,
	// 长整数标记
	SMALL_BIG_TAG: 110,
	// 新浮点数标记
	NEW_FLOAT_TAG: 70,
	// 浮点数标记
	FLOAT_TAG: 99,
	// 小元组标记
	SMALL_TUPLE_TAG: 104,
	// 大元组标记
	LARGE_TUPLE_TAG: 105,
	// 空列表标记
	NIL_TAG: 106,
	// ASCII字符串标记
	STRING_TAG: 107,
	// 非空列表标记
	LIST_TAG: 108,
	// 二进制标记
	BIN_TAG: 109,
	// Port标记
	PORT_TAG: 102,
	// Pid标记
	PID_TAG: 103,
	// 原子最大值
	MAX_ATOM_LENGTH: 255
};

const skipTag = (jbuf, real) => {
	const tag = jbuf.buf[jbuf.offset++];
	if (tag !== real) {
		throw new Error((`invalid tag, tag:${tag}, real:${real}`));
	}

	return;
};

const vaildCode = (code) => {
	return (code >>> 16) <= 0x10 && (code & ~0x7ff) !== 0xd800 && (code & ~1) !== 0xfffe;
};

const read1 = (jbuf) => {
	return jbuf.buf[jbuf.offset++];
};

const read2BE = (jbuf) => {
	const n = (jbuf.buf[jbuf.offset] << 8 & 0xff00) | (jbuf.buf[jbuf.offset + 1] & 0xff);
	jbuf.offset += 2;

	return n;
};

const read4BE = (jbuf) => {
	const n = (jbuf.buf[jbuf.offset] << 24 & 0xff000000)
		| (jbuf.buf[jbuf.offset + 1] << 16 & 0xff0000) | (jbuf.buf[jbuf.offset + 2] << 8 & 0xff00) | (jbuf.buf[jbuf.offset + 3] & 0xff);
	jbuf.offset += 4;

	return n;
};

const read8BE = (jbuf) => {
	let i;
	const len = jbuf.buf.byteLength;
	let n = 0;
	for (i = 0; i < len; i++) {
		n = (n << 8) | (jbuf.buf[i] & 0xff);
	}
	jbuf.offset += 8;

	return n;
};

const readNBE = (jbuf, size) => {
	let i;
	let j;
	const len = jbuf.offset + size - 1;
	let array;
	array = createU8Array(len);
	// tslint:disable-next-line:ban-comma-operator
	for (i = 0, j = len; j >= jbuf.offset; i++ , j--) {
		array[i] = jbuf.buf[j];
	}
	jbuf.offset += size;

	return array;
};

const readN = (jbuf, len) => {
	let i;
	let array;
	array = createU8Array(len);
	for (i = 0; i < len; i++) {
		array[i] = jbuf.buf[jbuf.offset++];
	}

	return array;
};

const arrayCopy = (src, start0, dest, start1, len) => {
	let i;
	let j;
	// tslint:disable:ban-comma-operator
	for (i = start0, j = start1; i < len && j < len; i++ , j++) {
		dest[j] = src[i];
	}

	return;
};

const readSAtom = (jbuf) => {
	let str;
	let len;
	skipTag(jbuf, TAG.SMALL_ATOM_TAG);
	len = read1(jbuf);
	str = String.fromCharCode.apply(undefined, readN(jbuf, len));

	return str;
};

const readAtom = (jbuf) => {
	let str;
	let len;
	skipTag(jbuf, TAG.ATOM_TAG);
	len = read2BE(jbuf);
	str = String.fromCharCode.apply(undefined, readN(jbuf, len));

	return str;
};

const readShort = (jbuf) => {
	let n;
	skipTag(jbuf, TAG.SMALL_INT_TAG);
	n = (0 << 8 & 0xff) | (jbuf.buf[jbuf.offset++] & 0xff);

	return n;
};

const readInt = (jbuf) => {
	let n;
	skipTag(jbuf, TAG.INT_TAG);
	n = read4BE(jbuf);

	return n;
};

const readLong = (jbuf) => {
	let arity;
	let sign;
	let bytes;
	let swp;
	let len;
	let i;
	let j;
	let n;
	skipTag(jbuf, TAG.SMALL_BIG_TAG);
	arity = read1(jbuf);
	sign = read1(jbuf);
	swp = readN(jbuf, arity);
	bytes = createU8Array(arity + 1);
	arrayCopy(swp, 0, bytes, 0, arity);
	len = bytes.byteLength;
	for (i = 0, j = len; i < --j; i++) {
		bytes[i] ^= bytes[j];
		bytes[j] ^= bytes[i];
		bytes[i] ^= bytes[j];
	}
	i = 0;
	for (n = 0; i < len; i++) {
		if (i < 4) {
			n = n << 8 | (bytes[i] & 0xff);
		} else {
			n = n * 256 + (bytes[i] & 0xff);
		}
	}
	if (sign !== 0) {
		n = -n;
	}

	return n;
};

const readfloat = (jbuf) => {
	const arr = createArrayBuffer(8);
	let b;
	let arr8;
	let i;
	skipTag(jbuf, TAG.NEW_FLOAT_TAG);
	arr8 = createU8ArrayView(arr, 0, arr.byteLength);
	b = readNBE(jbuf, 8);
	for (i = 0; i < 8; i++) {
		arr8[i] = b[i];
	}

	return (new Float64Array(arr))[0];
};

const readfloatStr = (jbuf) => {
	let strbuf;
	let str;
	let epos;
	skipTag(jbuf, TAG.FLOAT_TAG);
	strbuf = readN(jbuf, 31);
	str = String.fromCharCode.apply(undefined, createU8ArrayView(strbuf, 0, strbuf.byteLength));
	epos = str.indexOf('e');
	if (epos < 0) {
		throw new Error((`invalid float format, ${str}`));
	}

	return parseFloat(str);
};

const readSTuple = (jbuf) => {
	let arity;
	let i;
	let arr: any;
	skipTag(jbuf, TAG.SMALL_TUPLE_TAG);
	arity = read1(jbuf);
	arr = createArray(arity);
	arr.erl_type = TAG.SMALL_TUPLE_TAG;
	for (i = 0; i < arity; i++) {
		arr[i] = decode(jbuf);
	}

	return arr;
};

const readTuple = (jbuf) => {
	let arity;
	let i;
	let arr: any;
	skipTag(jbuf, TAG.LARGE_TUPLE_TAG);
	arity = read4BE(jbuf);
	arr = createArray(arity);
	arr.erl_type = TAG.LARGE_TUPLE_TAG;
	for (i = 0; i < arity; i++) {
		arr[i] = decode(jbuf);
	}

	return arr;
};

const readNullStr = (jbuf) => {
	skipTag(jbuf, TAG.NIL_TAG);

	return '';
};

const readAscII = (jbuf) => {
	let str;
	let len;
	let size;
	let i;
	skipTag(jbuf, TAG.STRING_TAG);
	len = read2BE(jbuf);
	if (read1(jbuf)) {
		jbuf.offset--;
		str = String.fromCharCode.apply(undefined, readN(jbuf, len));
	} else {
		str = [];
		size = len - 1;
		for (i = 0; i < size; i++) {
			str[i] = jbuf.buf[jbuf.offset++];
		}
	}

	return str;
};

const readList = (jbuf) => {
	let arity;
	let arr: any;
	let i;
	skipTag(jbuf, TAG.LIST_TAG);
	arity = read4BE(jbuf);
	arr = createArray(arity);
	arr.erl_type = TAG.LIST_TAG;
	for (i = 0; i < arity; i++) {
		arr[i] = decode(jbuf);
	}
	skipTag(jbuf, TAG.NIL_TAG);

	return arr;
};

const readBinary = (jbuf) => {
	let len;
	skipTag(jbuf, TAG.BIN_TAG);
	len = read4BE(jbuf);

	return readN(jbuf, len);
};

/** 
 * 读一个Port数据
 */
const readPort = (jbuf) => {
	let node;
	let id;
	skipTag(jbuf, TAG.PID_TAG);
	node = readAtom(jbuf);
	id = read4BE(jbuf);
	read1(jbuf);

	// tslint:disable-next-line:prefer-template
	return ['$port', node, '#Port<0.' + id + '>'];
};

/** 读一个Pid数据
 *  
 */
const readPid = (jbuf) => {
	let node;
	let id;
	let serial;
	skipTag(jbuf, TAG.PID_TAG);
	node = readAtom(jbuf);
	id = read4BE(jbuf);
	serial = read4BE(jbuf);
	read1(jbuf);

	// tslint:disable-next-line:prefer-template
	return ['$pid', node, '<0.' + id + '.' + serial + '>'];
};

const readInt8 = (jbuf) => {
	return ((0 & 0xff) << 8) | (jbuf.buf[0] & 0xff);
};

/** 
 * 读一个整数 
 */
const readInt32 = (jbuf) => {
	return read4BE(jbuf);
};

/** 读Unicode字符串 
 * 
 */
const readString = (jbuf) => {
	return String.fromCharCode.apply(undefined, jbuf.buf);
};

/** 解码原始数据 
 * 
 */
const decode = (jbuf) => {
	let r;
	switch (jbuf.buf[jbuf.offset]) {
		case TAG.ATOM_TAG:
			r = readAtom(jbuf);
			break;
		case TAG.SMALL_ATOM_TAG:
			r = readSAtom(jbuf);
			break;
		case TAG.SMALL_INT_TAG:
			r = readShort(jbuf);
			break;
		case TAG.INT_TAG:
			r = readInt(jbuf);
			break;
		case TAG.SMALL_BIG_TAG:
			r = readLong(jbuf);
			break;
		case TAG.NEW_FLOAT_TAG:
			r = readfloat(jbuf);
			break;
		case TAG.FLOAT_TAG:
			r = readfloatStr(jbuf);
			break;
		case TAG.SMALL_TUPLE_TAG:
			r = readSTuple(jbuf);
			break;
		case TAG.LARGE_TUPLE_TAG:
			r = readTuple(jbuf);
			break;
		case TAG.NIL_TAG:
			r = readNullStr(jbuf);
			break;
		case TAG.STRING_TAG:
			r = readAscII(jbuf);
			break;
		case TAG.LIST_TAG:
			r = readList(jbuf);
			break;
		case TAG.BIN_TAG:
			r = readBinary(jbuf);
			break;
		case TAG.PORT_TAG:
			r = readPort(jbuf);
			break;
		case TAG.PID_TAG:
			r = readPid(jbuf);
			break;
		default:
	}

	return r;
};

export { TAG, readInt8, readInt32, readString, decode };