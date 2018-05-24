/**
 * 工具处理
 */

const parseUrl = (url) => {
	let i;
	let domain;
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

const createU8ArrayView = (arr, index?: number, length?: number) => {
	let r = null;
	if (index === undefined || index === null) {
		r = new Uint8Array(arr);
	} else if (length === undefined || length === null) {
		r = new Uint8Array(arr, index);
	} else {
		r = new Uint8Array(arr, index, length);
	}

	return r;
};

const createArrayBuffer = (size) => {
	return new ArrayBuffer(size);
};

const charToUtf8 = (c) => {
	let r = [];
	if (c < 0) { // 0
		r = [];
	} else if (c < 128) { // 128---0xxxxxxx
		r = [c];
	} else if (c < 2048) { // 16#800---110xxxxx 10xxxxxx
		// tslint:disable:binary-expression-operand-order
		r = [192 + (c >> 6), 128 + (c & 63)];
	} else if (c < 65536) { // 16#10000---1110xxxx 10xxxxxx 10xxxxxx
		r = [224 + (c >> 12), 128 + ((c >> 6) & 63), 128 + (c & 63)];
	} else if (c < 2097152) { // 16#200000---11110xxx 10xxxxxx 10xxxxxx 10xxxxxx
		r = [240 + (c >> 18), 128 + ((c >> 12) & 63), 128 + ((c >> 6) & 63), 128 + (c & 63)];
	} else if (c < 67108864) { // 16#400 0000---111110xx 10xxxxxx 10xxxxxx 10xxxxxx 10xxxxxx
		r = [248 + (c >> 24), 128 + ((c >> 18) & 63), 128 + ((c >> 12) & 63), 128 + ((c >> 6) & 63), 128 + (c & 63)];
	} else if (c < 2147483648) { // 16#8000 0000---1111110x 10xxxxxx 10xxxxxx 10xxxxxx 10xxxxxx 10xxxxxx
		r = [252 + (c >> 30), 128 + ((c >> 24) & 63), 128 + ((c >> 18) & 63), 128 + ((c >> 12) & 63), 128 + ((c >> 6) & 63), 128 + (c & 63)];
	} else {
		r = [];
	}

	return r;
};

const utf8Length = (str) => {
	let i;
	let c;
	const n = str.length;
	let j = 0;
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

const createU8Array = (len) => {
	let r;
	let arr;
	len = len || 0;
	arr = new ArrayBuffer(len);
	r = new Uint8Array(arr);

	return r;
};

const createArray = (length) => {
	let arr;
	if (length >= 0) {
		arr = [];
		arr.length = length;
	}

	return arr;
};

// tslint:disable-next-line:cyclomatic-complexity
const utf8ToChar = (a) => {
	const r = [];
	let offset = 0;
	while (offset < a.length) {
		if (a.length >= offset + 1 && a[offset] < 128) { // 128:128---0xxxxxxx
			r.push(a[offset]);
			offset += 1;
		} else if (a.length >= offset + 2 && a[offset] < 224 && a[offset + 1] < 192) { // 2048:16#800---110xxxxx 10xxxxxx
			r.push(((a[offset] & 31) << 6) + (a[offset + 1] & 63));
			offset += 2;
			// tslint:disable:max-line-length
		} else if (a.length >= offset + 3 && a[offset] < 240 && a[offset + 1] < 192 && a[offset + 2] < 192) { // 65536:16#10000---1110xxxx 10xxxxxx 10xxxxxx
			r.push(((a[offset] & 15) << 12) + ((a[offset + 1] & 63) << 6) + (a[offset + 2] & 63));
			offset += 3;
		} else if (a.length >= offset + 4 && a[offset] < 248 && a[offset + 1] < 192 && a[offset + 2] < 192 && a[offset + 3] < 192) { // 2097152:16#200000---11110xxx 10xxxxxx 10xxxxxx 10xxxxxx
			r.push(((a[offset] & 7) << 18) + ((a[offset + 1] & 63) << 12) + ((a[offset + 2] & 63) << 6) + (a[offset + 3] & 63));
			offset += 4;
		} else if (a.length >= offset + 5 && a[offset] < 252 && a[offset + 1] < 192 && a[offset + 2] < 192 && a[offset + 3] < 192 && a[offset + 4] < 192) { // 67108864:16#400 0000---111110xx 10xxxxxx 10xxxxxx 10xxxxxx 10xxxxxx
			r.push(((a[offset] & 3) << 24) + ((a[offset + 1] & 63) << 18) + ((a[offset + 2] & 63) << 12) + ((a[offset + 3] & 63) << 6) + (a[offset + 4] & 63));
			offset += 5;
		} else if (a.length >= offset + 6 && a[offset] < 254 && a[offset + 1] < 192 && a[offset + 2] < 192 && a[offset + 3] < 192 && a[offset + 4] < 192 && a[offset + 5] < 192) { // 2147483648:16#8000 0000---1111110x 10xxxxxx 10xxxxxx 10xxxxxx 10xxxxxx 10xxxxxx
			r.push(((a[offset] & 1) << 32) + ((a[offset + 1] & 63) << 24) + ((a[offset + 2] & 63) << 18) + ((a[offset + 3] & 63) << 12) + ((a[offset + 4] & 63) << 6) + (a[offset + 5] & 63));
			offset += 6;
		} else { // 0、其他
			offset += 1;
		}
	}

	return r;
};

const isArray = (value) => {
	return Object.prototype.toString.apply(value) === '[object Array]';
};

/**
 * 判断value是否为字符串
 * @param   value 合法的js值
 * @return  value是否为字符串
 */
const isString = (value) => {
	return typeof value === typeof '';
};

/**
 * 判断value是否为数字
 * @param   value 合法的js值
 * @return  value是否为数字
 */
const isNumber = (value) => {
	return typeof value === typeof 0;
};

/**
 * 判断value是否为整数
 * @param  value 合法的js值
 * @return value是否为数字
 */
const isInt = (value: any) => {
	const mValue: any = value;

	return typeof value === 'number' && parseFloat(mValue) === parseInt(mValue, 10) && !isNaN(value);
};

const isArrayBuffer = (value) => {
	return Object.prototype.toString.apply(value) === '[object ArrayBuffer]';
};

export {
	parseUrl, createU8ArrayView, createArrayBuffer, charToUtf8, utf8Length, createU8Array, createArray, utf8ToChar,
	isArray, isString, isNumber, isInt, isArrayBuffer
};