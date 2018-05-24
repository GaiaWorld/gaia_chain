/** 
 * uint64数据处理
 */
const INT32_MAX = 0xffffffff;

const endReverse = (result, bytes) => {
	const size = bytes.length;
	let len;
	let i;
	let a;
	let b;
	let c;
	let d;
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

const isInt64 = (n) => {
	if (n === undefined) {
		return false;
	}

	return n.byteLength === 8;
};

const toUint32 = (bytes) => {
	return (bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3];
};

const toArray32 = (bytes, n, index) => {
	bytes[index--] = n & 0xff;
	bytes[index--] = (n >> 8) & 0xff;
	bytes[index--] = (n >> 16) & 0xff;
	bytes[index] = (n >> 24) & 0xff;
};

const checkBsl = (int32, n) => {
	return int32 >>> (32 - n);
};

const checkBsr = (int32, n) => {
	return (int32 << (32 - n)) >>> 0;
};

const add32 = (sum, x32, y32) => {
	const lz = x32[1] + y32[1];
	let hz;
	let ln;
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

const sub32 = (sum, x, y) => {
	bnot64(z, y);
	add64(sum, x, z);

	return add64(sum, sum, ONE);
};

const bnot32 = (result, x32) => {
	toArray32(result, ~x32[1], 7);
	toArray32(result, ~x32[0], 3);
};

const band32 = (result, x32, y32) => {
	toArray32(result, x32[1] & y32[1], 7);
	toArray32(result, x32[0] & y32[0], 3);
};

const bxor32 = (result, x32, y32) => {
	toArray32(result, x32[1] ^ y32[1], 7);
	toArray32(result, x32[0] ^ y32[0], 3);
};

const bsl32 = (result, x32, n) => {
	let hx;
	let lx;
	let c;
	let ln = 0;
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

const bsr32 = (result, x32, n) => {
	let hx;
	let lx;
	let c;
	let hn = 0;
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

const ONE = new Uint8Array(new ArrayBuffer(8), 0, 8);
ONE.set([0, 0, 0, 0, 0, 0, 0, 1]);
const x1 = new Uint8Array(new ArrayBuffer(8), 0, 8);
// tslint:disable-next-line:variable-name
const x1_32 = new Uint32Array(x1.buffer);
const y1 = new Uint8Array(new ArrayBuffer(8), 0, 8);
// tslint:disable-next-line:variable-name
const y1_32 = new Uint32Array(y1.buffer);
const z = new Uint8Array(new ArrayBuffer(8), 0, 8);

/*
 *64位整数加法，参数为3个64位大端字节数组
 */
const add64 = (sum, x, y) => {
	if (isInt64(sum) && isInt64(x) && isInt64(y)) {
		endReverse(x1, x);
		endReverse(y1, y);
		add32(sum, x1_32, y1_32);
	} else {
		throw new Error(('invalid parameter'));
	}
};

/**
 * 64位整数减法，参数为3个64位大端字节数组
 */
const sub64 = (sum, x, y) => {
	if (isInt64(sum) && isInt64(x) && isInt64(y)) {
		sub32(sum, x, y);
	} else {
		throw new Error(('invalid parameter'));
	}
};

/**
 * 64位整数按位求反，参数为2个64位大端字节数组
 */
const bnot64 = (result, x) => {
	if (isInt64(result) && isInt64(x)) {
		endReverse(x1, x);
		bnot32(result, x1_32);
	} else {
		throw new Error(('invalid parameter'));
	}
};

/**
 * 64位整数按位与，参数为3个64位大端字节数组
 */
const band64 = (result, x, y) => {
	if (isInt64(result) && isInt64(x) && isInt64(y)) {
		endReverse(x1, x);
		endReverse(y1, y);
		band32(result, x1_32, y1_32);
	} else {
		throw new Error(('invalid parameter'));
	}
};

/**
 * 64位整数按位异或，参数为3个64位大端字节数组
 */
const bxor64 = (result, x, y) => {
	if (isInt64(x) && isInt64(y)) {
		endReverse(x1, x);
		endReverse(y1, y);
		bxor32(result, x1_32, y1_32);
	} else {
		throw new Error(('invalid parameter'));
	}
};

/**
 * 64位整数左移，参数为2个64位大端字节数组和移动的位数 
 */
const bsl64 = (result, x, n) => {
	if (isInt64(result) && isInt64(x) && (n > 0 && n < 64)) {
		endReverse(x1, x);
		bsl32(result, x1_32, n);
	} else if (n === 0) {
		return;
	} else {
		throw new Error(('invalid parameter'));
	}
};

/**
 * 64位整数右移，参数为2个64位大端字节数组和移动的位数
 */
const bsr64 = (result, x, n) => {
	if (isInt64(result) && isInt64(x) && (n > 0 && n < 64)) {
		endReverse(x1, x);
		bsr32(result, x1_32, n);
	} else if (n === 0) {
		return;
	} else {
		throw new Error(('invalid parameter'));
	}
};

export { bsr64, bsl64, bxor64, band64, bnot64, sub64, add64 };