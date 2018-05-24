/**
 * xxtea64加/解密
 */
import { add64, band64, bnot64, bsl64, bsr64, bxor64, sub64 } from './uint64';

const le2be = (bytes) => {
	const len = bytes.length / 4;
	let i;
	let a;
	let b;
	let c;
	let d;
	let swp;
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

const str2arr = (str) => {
	const len = str.length;
	const arr = [];
	let arr32;
	let i;
	let offset = 0;
	if (len >= 32) {
		for (i = 0; i < 8; i++) {
			arr[i] = ((str.charCodeAt(i * 4) & 0xff) << 24)
				| ((str.charCodeAt(i * 4 + 1) & 0xff) << 16) | ((str.charCodeAt(i * 4 + 2) & 0xff) << 8) | (str.charCodeAt(i * 4 + 3) & 0xff);
		}
	}
	arr32 = new Uint32Array(new ArrayBuffer(32));
	for (i = 0; i < 8; i++) {
		arr32[i] = arr[offset++];
	}

	return new Uint8Array(arr32.buffer, 0, 32);
};

const arrayCopy = (src, start0, dest, start1, len) => {
	let i;
	let j;
	// tslint:disable-next-line:ban-comma-operator
	for (i = start0, j = start1; i < len && j < len; i++ , j++) {
		dest[j] = src[i];
	}

	return;
};

const buf2arr8 = (buf) => {
	return new Uint8Array(buf, 0, buf.byteLength);
};

const get64 = (arr8, bytes, offset) => {
	let i;
	let index = offset * 8;
	for (i = 0; i < arr8.length; i++) {
		arr8[i] = bytes[index++];
	}
};

const set64 = (bytes, offset, val) => {
	let i;
	const len = val.byteLength;
	let index = offset * 8;
	for (i = 0; i < len; i++) {
		bytes[index++] = val[i];
	}
};

const toUint64 = (bytes) => {
	return (bytes[0] << 56) | (bytes[1] << 48) | (bytes[2] << 40)
		| (bytes[3] << 32) | (bytes[4] << 24) | (bytes[5] << 16) | (bytes[6] << 8) | bytes[7];
};

const toArray64 = (n) => {
	const arr8 = new Uint8Array(new ArrayBuffer(8), 0, 8);
	arr8[7] = n & 0xff;
	arr8[6] = (n >>> 8) & 0xff;
	arr8[5] = (n >>> 16) & 0xff;
	arr8[4] = (n >>> 24) & 0xff;
	arr8[3] = (n >>> 32) & 0xff;
	arr8[2] = (n >>> 40) & 0xff;
	arr8[1] = (n >>> 48) & 0xff;
	arr8[0] = (n >>> 56) & 0xff;

	return arr8.buffer;
};

const toUint32 = (bytes) => {
	return (0 << 56) | (0 << 48) | (0 << 40) | (0 << 32)
		| (bytes[4] << 24) | (bytes[5] << 16) | (bytes[6] << 8) | bytes[7];
};

const toArray32 = (n) => {
	const arr8 = new Uint8Array(new ArrayBuffer(8), 0, 8);
	arr8[7] = n & 0xff;
	arr8[6] = (n >>> 8) & 0xff;
	arr8[5] = (n >>> 16) & 0xff;
	arr8[4] = (n >>> 24) & 0xff;
	arr8[3] = 0;
	arr8[2] = 0;
	arr8[1] = 0;
	arr8[0] = 0;

	return arr8.buffer;
};

const BLOCK_LENGTH = 8;
const DELTA = buf2arr8(new ArrayBuffer(8));
DELTA.set([158, 55, 121, 185, 127, 74, 120, 0]);
const ZERO = buf2arr8(new ArrayBuffer(8));
ZERO.set([0, 0, 0, 0, 0, 0, 0, 0]);
const THREE = buf2arr8(new ArrayBuffer(8));
THREE.set([0, 0, 0, 0, 0, 0, 0, 3]);
const A = buf2arr8(new ArrayBuffer(8));
const B = buf2arr8(new ArrayBuffer(8));
const left0 = buf2arr8(new ArrayBuffer(8));
const left1 = buf2arr8(new ArrayBuffer(8));
const key = buf2arr8(new ArrayBuffer(8));
let count = 0;

const mul64 = (n) => {
	const sum = ZERO;
	let i;
	for (i = 0; i < n; i++) {
		add64(sum, sum, DELTA);
	}

	return sum;
};

const isZero = (bytes) => {
	let i;
	for (i = 0; i < 8; i++) {
		if (bytes[i] === 0) {
			continue;
		} else {
			return false;
		}
	}

	return true;
};

const alignData = (data) => {
	const size = data.byteLength;
	let arr8;
	if (size >= BLOCK_LENGTH) {
		arr8 = alignData1(BLOCK_LENGTH - size % BLOCK_LENGTH, size, data);
	} else {
		arr8 = alignData1(BLOCK_LENGTH - size, size, data);
	}

	return arr8;
};

const alignData1 = (size, len, data) => {
	let copy;
	let arr8;
	let fill;
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

const mx = (z, y, sum, key, p, e) => {
	count++;
	let index;
	bsr64(A, z, 6);
	bsl64(B, y, 3);
	bxor64(left0, A, B);
	bsr64(A, y, 4);
	bsl64(B, z, 5);
	bxor64(left1, A, B);
	add64(left0, left0, left1);
	bxor64(A, sum, y);
	index = (p & 3) ^ toUint32(e);
	get64(key, key, index);
	bxor64(B, key, z);
	add64(A, A, B);
	bxor64(B, left0, A);

	return B;
};

const encode = (rounds, key, data) => {
	let t;
	let k;
	let v;
	let n;
	const swap = buf2arr8(new ArrayBuffer(8));
	const y = buf2arr8(new ArrayBuffer(8));
	const z = buf2arr8(new ArrayBuffer(8));
	const sum = buf2arr8(new ArrayBuffer(8));
	let p;
	const e = buf2arr8(new ArrayBuffer(8));
	let arr;
	let arr8;
	let tmp;
	if ((rounds < 1) || (rounds > 32)) {
		throw new Error(('invalid_rounds'));
	}
	if ((typeof key) === 'string') {
		k = str2arr(key);
		le2be(k);
		if (k.length < 8) {
			throw new Error(('invalid_key_length'));
		}
	} else if (key.byteLength >= 32) {
		k = key;
	} else {
		throw new Error(('invalid_key_type'));
	}
	t = alignData(data);
	v = t.arr8;
	n = v.byteLength / BLOCK_LENGTH;
	arrayCopy(ZERO, 0, sum, 0, 8);
	get64(z, v, n - 1);
	do {
		add64(sum, sum, DELTA);
		bsr64(swap, sum, 16);
		band64(e, swap, THREE);
		for (p = 0; p < n - 1; p++) {
			get64(y, v, p + 1);
			get64(swap, v, p);
			add64(z, swap, mx(z, y, sum, k, p, e));
			set64(v, p, z);
		}
		get64(y, v, 0);
		get64(swap, v, n - 1);
		add64(z, swap, mx(z, y, sum, k, p, e));
		set64(v, n - 1, z);
	} while (--rounds);
	arr = new ArrayBuffer(n * BLOCK_LENGTH + 1);
	arr8 = new Uint8Array(arr, 0, arr.byteLength);
	arr8[0] = t.fill;
	tmp = new Uint8Array(v.buffer, 0, v.buffer.byteLength);
	arrayCopy(tmp, 0, arr8, 1, arr8.length);

	return arr8;
};

/**
 * 解密数据
 */
const decode = (rounds, key, data) => {
	let k;
	let v;
	let fill;
	let len;
	let n;
	const swap = buf2arr8(new ArrayBuffer(8));
	const y = buf2arr8(new ArrayBuffer(8));
	const z = buf2arr8(new ArrayBuffer(8));
	let sum;
	let p;
	const e = buf2arr8(new ArrayBuffer(8));
	let arr;
	if ((rounds < 1) || (rounds > 32)) {
		throw new Error(('invalid_rounds'));
	}
	if ((typeof key) === 'string') {
		k = str2arr(key);
		le2be(k);
		if (k.length < 8) {
			throw new Error(('invalid_key_length'));
		}
	} else if (key.byteLength >= 32) {
		k = key;
	} else {
		throw new Error(('invalid_key_type'));
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
		bsr64(swap, sum, 16);
		band64(e, swap, THREE);
		for (p = n - 1; p > 0; p--) {
			get64(z, v, p - 1);
			get64(swap, v, p);
			sub64(y, swap, mx(z, y, sum, k, p, e));
			set64(v, p, y);
		}
		get64(z, v, n - 1);
		get64(swap, v, 0);
		sub64(y, swap, mx(z, y, sum, k, p, e));
		set64(v, 0, y);
		sub64(sum, sum, DELTA);
	} while (!isZero(sum));

	return v.subarray(0, len - fill);
};

export { encode, decode };