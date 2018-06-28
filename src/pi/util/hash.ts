/*
 * hash库
 */

// ============================== 导入
import { now } from '../lang/time';
import { match } from './match';
import { imul } from './math';

// ============================== 导出
/**
 * @description 计算指定时间左右计算的hash的值和次数
 * @example
 */
export const calcHashTime = (s: string, limitTime: number): any => {
	let t = now();
	const end = t + limitTime;
	let n = 0;
	while (t < end) {
		s = calcHashCount(s, 10000);
		n += 10000;
		t = now();
	}

	return { r: s, count: n, time: t - end + limitTime };
};
/**
 * @description 计算指定次数的hash
 * @example
 */
export const calcHashCount = (s: string, n: number): string => {
	while ((n--) > 0) {
		// tslint:disable:prefer-template
		s = '' + murmurhash3_32s(s, 31);
	}

	return s;
};

/**
 * @description 获得新哈希，参数为当前哈希和指定对象的哈希值
 * @example
 */
export type GetHash = (curHash: number, el: any) => number;

/**
 * @description 根据当前哈希和指定对象的哈希值，计算下一步的哈希
 * @example
 */
export const nextHash = (hash: number, i: number): number => {
	return murmurhash3_32i(i, hash);
	// h = ((h << 5) - h + c) | 0;
};
/**
 * @description 获得字符的新哈希
 * @example
 */
export const charHash = (hash: number, char: string): number => {
	return nextHash(hash, char.charCodeAt(0));
};
/**
 * @description 获得字符的新哈希
 * @example
 */
export const charHashIgnoreCase = (hash: number, char: string): number => {
	const c = char.charCodeAt(0);

	return (c >= 65 && c <= 90) ? nextHash(hash, c + 32) : nextHash(hash, c);
};
/**
 * @description 获得字符的新哈希
 * @example
 */
export const charHashIgnoreWhiteSpace = (hash: number, char: string): number => {
	const c = char.charCodeAt(0);

	return (c <= 32) ? hash : nextHash(hash, c);
};
/**
 * @description 获得字符的新哈希
 * @example
 */
export const charHashIgnoreCaseIgnoreWhiteSpace = (hash: number, char: string): number => {
	const c = char.charCodeAt(0);

	return (c <= 32) ? hash : (c >= 65 && c <= 90) ? nextHash(hash, c + 32) : nextHash(hash, c);
};
/**
 * @description 获得字符串或数组及可迭代对象的hashCode
 * @example
 */
export const iterHashCode = (arr: any, h: number, fun: GetHash): number => { //
	h = h || 0;
	// h 可以改为 5381 （001 010 100 000 101） 这个数字集素数、奇数和缺数于一身。据说hash分布更好一些。
	if (!arr) return h;
	for (const el of arr) {
		h = fun(h, el);
	}

	return h;
};
/**
 * @description 获得字符串的hashCode
 * @example
 */
export const strHashCode = (str: string, h: number): number => { //
	return murmurhash3_32s(str, h);
};

/**
 * @description 获得对象的hashCode，需要处理循环引用的问题
 * @example
 */
export const allHash = (obj: any, h: number): number => { //
	return anyHash(obj, h, new Set());
};
/**
 * @description 获得对象的hashCode，需要处理循环引用的问题
 * @example
 */
export const objHashCode = (obj: any, h: number, cycleObjSet: Set<any>): number => { //
	for (const k in obj) {
		if (k.charCodeAt(0) === 95 && k.charCodeAt(0) === 36) {
			continue;
		}
		h = anyHash(obj[k], strHashCode(k, h), cycleObjSet);
	}

	return h;
};
/**
 * @description 获得数组的hashCode，需要处理循环引用的问题
 * @example
 */
export const arrHashCode = (arr: any[], h: number, cycleObjSet: Set<any>): number => { //
	for (const v of arr) {
		h = anyHash(v, h, cycleObjSet);
	}

	return h;
};
/**
 * @description 获得任意对象的hashCode，需要处理循环引用的问题
 * @example
 */
// tslint:disable-next-line:cyclomatic-complexity
export const anyHash = (obj: any, h?: number, cycleObjSet?: Set<any>): number => { //
	if (obj === undefined) {
		return nextHash(h || 0, 1);
	}
	if (obj === null) {
		return nextHash(h || 0, 2);
	}
	const t = typeof obj;
	if (t === 'boolean') {
		return nextHash(h || 0, obj ? 4 : 3);
	}
	if (t === 'number') {
		if (Number.isInteger(obj)) {
			return nextHash(nextHash(h, 5), obj);
		}
		h = nextHash(h || 0, 6);
		const v1 = Math.floor(obj);

		return nextHash(nextHash(h, v1), Math.floor((obj - v1) * 0xffffffff));
	}
	if (t === 'string') {
		return strHashCode(obj, nextHash(h || 0, 8));
	}
	if (obj instanceof ArrayBuffer) {
		return nextHash(nextHash(h || 0, 20), getCrc32(new Uint8Array(obj)));
	}
	if (ArrayBuffer.isView(obj) && (<any>obj).BYTES_PER_ELEMENT > 0) {
		// tslint:disable-next-line:binary-expression-operand-order
		return nextHash(nextHash(h || 0, 20 + (<any>obj).BYTES_PER_ELEMENT),
			getCrc32(new Uint8Array(obj.buffer, obj.byteOffset, obj.byteLength), 0, obj.byteLength));
	}
	if (t === 'function') {
		return nextHash(nextHash(h || 0, 12), strHashCode(obj.name, h));
	}
	if (t === 'object') {
		if (cycleObjSet.has(obj)) {
			return h;
		}
		cycleObjSet.add(obj);
		if (Array.isArray(obj)) {
			h = arrHashCode(obj, nextHash(h || 0, 10), cycleObjSet);
		} else {
			h = objHashCode(obj, nextHash(h || 0, 11), cycleObjSet);
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
export const deepCopyHash = (obj: any, result: any, key: string | number, h?: number): number => {
	if (obj === undefined) {
		result[key] = obj;

		return nextHash(h || 0, 1);
	}
	if (obj === null) {
		result[key] = obj;

		return nextHash(h || 0, 2);
	}
	const t = typeof obj;
	if (t === 'boolean') {
		result[key] = obj;

		return nextHash(h || 0, obj ? 4 : 3);
	}
	if (t === 'number') {
		if (Number.isInteger(obj)) {
			result[key] = obj;

			return nextHash(nextHash(h || 0, 5), obj);
		}
		h = nextHash(h || 0, 6);
		const v1 = Math.floor(obj);
		result[key] = obj;

		return nextHash(nextHash(h, v1), Math.floor((obj - v1) * 0xffffffff));
	}
	if (t === 'string') {
		result[key] = obj;

		return strHashCode(obj, nextHash(h || 0, 8));
	}
	if (obj instanceof ArrayBuffer) {
		result[key] = obj.slice(0);

		return nextHash(nextHash(h || 0, 20), getCrc32(new Uint8Array(obj)));
	}
	if (ArrayBuffer.isView(obj) && (<any>obj).BYTES_PER_ELEMENT > 0) {
		const r = (<any>obj).slice(0);
		result[key] = r;

		// tslint:disable-next-line:binary-expression-operand-order
		return nextHash(nextHash(h || 0, 20 + (<any>r).BYTES_PER_ELEMENT), getCrc32(new Uint8Array(r.buffer)));
	}
	const s = JSON.stringify(obj);
	if (t === 'object') {
		result[key] = JSON.parse(s);

		return strHashCode(s, nextHash(h || 0, Array.isArray(obj) ? 10 : 11));
	}
};

/**
 * @description 计算数组的crc32的值
 * @param  data 字节数组
 * @param  start 数组的起始位置
 * @param  end 计算的结束位置
 * @example
 */
export const getCrc32 = (data: Uint8Array | Uint8ClampedArray, start?: number, end?: number): number => {
	return crc32(data, start || 0, end || data.length, 0xffffffff) ^ 0xffffffff;
};

/**
 * @description 计算数组的crc32的值
 * @param data 字节数组
 * @param start 数组的起始位置
 * @param end 计算的结束位置
 * @param crc 计算用的crc初始值
 * @example
 */
export const crc32 = (data: Uint8Array | Uint8ClampedArray, start: number, end: number, crc: number): number => {
	while (start < end) {
		crc = crc32Table[(crc & 0xff) ^ data[start++]] ^ (crc >>> 8);
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
export const adler32 = (data: Uint8Array | Uint8ClampedArray, start: number, end: number, adler: number) => {
	const BASE = 65521;
	const NMAX = 5552;
	let s1 = adler & 0xffff;
	let s2 = (adler >> 16) & 0xffff;
	while (start < end) {
		let k = end - start < NMAX ? end - start : NMAX;
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

	return (s2 << 16) | s1;
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
export const murmurhash3_32 = (key: Uint8Array, seed: number): number => {
	let k;
	const remainder = key.length & 3; // key.length % 4
	let h = seed || 31;
	const c1 = 0xcc9e2d51;
	const c2 = 0x1b873593;
	let i = 0;
	for (const len = key.length - remainder; i < len; i += 4) {
		k =
			((key[i])) |
			((key[i + 1]) << 8) |
			((key[i + 2]) << 16) |
			((key[i + 3]) << 24);
		k = imul(k, c1);
		k = (k << 15) | (k >>> 17);
		k = imul(k, c2);
		h ^= k;

		h = (h << 13) | (h >>> 19);
		h = imul(h, 5) + 0xe6546b64;
	}

	k = 0;

	switch (remainder) {
		case 3: k ^= (key[i + 2]) << 16;
		case 2: k ^= (key[i + 1]) << 8;
		case 1: k ^= (key[i]);
			k = imul(k, c1);
			k = (k << 15) | (k >>> 17);
			k = imul(k, c2);
			h ^= k;
		default:
	}

	h ^= key.length;

	h ^= h >>> 16;
	h = imul(h, 0x85ebca6b);
	h ^= h >>> 13;
	h = imul(h, 0xc2b2ae35);
	h ^= h >>> 16;

	return h >>> 0;
};
/**
 * 将字符串算成32位hash值，字符串采用unicode编码，所以一个字符为2个字节进行编码
 */
// tslint:disable-next-line:variable-name
export const murmurhash3_32s = (key: string, seed: number): number => {
	let c;
	let cc;
	let k;
	const remainder = key.length & 3; // key.length % 4
	let h = seed || 31;
	const c1 = 0xcc9e2d51;
	const c2 = 0x1b873593;
	let i = 0;
	for (const len = key.length - remainder; i < len; i += 4) {
		c = key.charCodeAt(i);
		cc = key.charCodeAt(i + 1);
		k =
			((c & 0xff)) |
			(((c >>> 8) & 0xff) << 8) |
			((cc & 0xff) << 16) |
			(((cc >>> 8) & 0xff) << 24);
		k = imul(k, c1);
		k = (k << 15) | (k >>> 17);
		k = imul(k, c2);
		h ^= k;

		h = (h << 13) | (h >>> 19);
		h = imul(h, 5) + 0xe6546b64;

		c = key.charCodeAt(i + 2);
		cc = key.charCodeAt(i + 3);
		k =
			((c & 0xff)) |
			(((c >>> 8) & 0xff) << 8) |
			((cc & 0xff) << 16) |
			(((cc >>> 8) & 0xff) << 24);
		k = imul(k, c1);
		k = (k << 15) | (k >>> 17);
		k = imul(k, c2);
		h ^= k;

		h = (h << 13) | (h >>> 19);
		h = imul(h, 5) + 0xe6546b64;

	}

	k = 0;

	switch (remainder) {
		case 3: k ^= (key.charCodeAt(i + 2) & 0xff) << 16;
		case 2: k ^= (key.charCodeAt(i + 1) & 0xff) << 8;
		case 1: k ^= (key.charCodeAt(i) & 0xff);
			k = imul(k, c1);
			k = (k << 15) | (k >>> 17);
			k = imul(k, c2);
			h ^= k;
		default:
	}

	h ^= key.length;

	h ^= h >>> 16;
	h = imul(h, 0x85ebca6b);
	h ^= h >>> 13;
	h = imul(h, 0xc2b2ae35);
	h ^= h >>> 16;

	return h >>> 0;
};
/**
 * 将32位数字算成32位hash值
 */
// tslint:disable-next-line:variable-name
export const murmurhash3_32i = (k: number, seed: number): number => {
	const c1 = 0xcc9e2d51;
	const c2 = 0x1b873593;
	let h = seed & 0xffffffff || 31;
	k = imul(k, c1);
	k = (k << 15) | (k >>> 17);
	k = imul(k, c2);
	h ^= k;
	h = (h << 13) | (h >>> 19);
	h = imul(h, 5) + 0xe6546b64;

	h ^= 4;
	h ^= h >>> 16;
	h = imul(h, 0x85ebca6b);
	h ^= h >>> 13;
	h = imul(h, 0xc2b2ae35);
	h ^= h >>> 16;

	return h >>> 0;
};

export const weak32 = (data, prev?, start?, end?) => {
	let a = 0;
	let b = 0;
	const sum = 0;
	const M = 1 << 16;

	if (!prev) {
		const len = start >= 0 && end >= 0 ? end - start : data.length;
		for (let i = 0; i < len; i++) {
			a += data[i];
			b += a;
		}
		a %= M;
		b %= M;
	} else {
		const k = start;
		const l = end - 1;
		// tslint:disable:variable-name
		const prev_k = k - 1;
		const prev_l = l - 1;
		const prev_first = data[prev_k];
		const prev_last = data[prev_l];
		const curr_first = data[k];
		const curr_last = data[l];

		a = (prev.a - prev_first + curr_last) % M;
		b = (prev.b - (prev_l - prev_k + 1) * prev_first + a) % M;
	}

	return { a: a, b: b, sum: a + b * M };
};

export const weak16 = (data) => {
	// tslint:disable-next-line:binary-expression-operand-order
	return 0xffff & (data >> 16 ^ data * 1009);
};
// ============================== 本地
// crc32 表
const crc32Table = [];

// ============================== 立即执行
crc32Table.length = 256;
for (let i = 0; i < 256; i++) {
	let c = i;
	for (let j = 0; j < 8; j++) {
		// tslint:disable-next-line:binary-expression-operand-order
		c = ((c & 1) === 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
	}
	crc32Table[i] = c;
}
