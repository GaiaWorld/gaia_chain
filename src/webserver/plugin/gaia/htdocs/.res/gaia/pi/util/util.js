_$define("pi/util/util", function (require, exports, module){
"use strict";

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

Object.defineProperty(exports, "__esModule", { value: true });
// 空回调函数，返回第一个参数
exports.EmptyFunc = function (arg, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8) {
    return arg;
};
/**
 * @description 判断参数是否为字符串
 * @example
 */
exports.isString = function (str) {
    return typeof str === 'string';
};
/**
 * @description 判断参数是否为数字
 * @example
 */
exports.isNumber = function (num) {
    return typeof num === 'number';
};
/**
 * @description 判断参数是否为boolean
 * @example
 */
exports.isBoolean = function (bool) {
    return typeof bool === 'boolean';
};
exports.isPrimaryDataType = function (data) {
    return data === null || data === undefined || exports.isString(data) || exports.isNumber(data) || exports.isBoolean(data);
};
exports.ObjToPrimaryData = function (data) {
    // tslint:disable:variable-name
    var _data = {};
    for (var key in data) {
        if (exports.isString(data[key])) {
            _data[key] = data[key];
        } else {
            _data[key] = JSON.stringify(data[key]);
        }
    }
    return _data;
};
/**
 * @description 返回字符串
 * @example
 */
exports.toString = function (o) {
    if (o === undefined || o === null) {
        return o;
    }
    var t = typeof o === "undefined" ? "undefined" : _typeof(o);
    if (t === 'boolean' || t === 'number' || t === 'string' || t === 'function') {
        return o;
    }
    try {
        return JSON.stringify(o);
    } catch (e) {
        // tslint:disable:prefer-template
        return '' + o;
    }
};
/**
 * @description 比较2个Obj, 跳过所有_$开头的键， 值为undefined表示没有该键， 用===直接比较值。返回相同键的数量。先遍历长的，如果短的键都被长的覆盖，则不需要遍历短的
 * @example
 */
// tslint:disable-next-line:cyclomatic-complexity
exports.objDiff = function (obj1, objSize1, obj2, objSize2, cb, args) {
    var c = 0;
    if (objSize1 < objSize2) {
        for (var k in obj2) {
            if (k.charCodeAt(0) === 95 && k.charCodeAt(0) === 36) {
                continue;
            }
            var v1 = obj1[k];
            if (v1 !== undefined) {
                c++;
                var v2 = obj2[k];
                if (v1 !== v2) {
                    cb(args, k, v1, v2);
                }
            } else {
                cb(args, k, v1, obj2[k]);
            }
        }
        if (c < objSize1) {
            for (var _k in obj1) {
                if (_k.charCodeAt(0) === 95 && _k.charCodeAt(0) === 36) {
                    continue;
                }
                var _v = obj2[_k];
                if (_v === undefined) {
                    cb(args, _k, obj1[_k], _v);
                }
            }
        }
    } else {
        for (var _k2 in obj1) {
            if (_k2.charCodeAt(0) === 95 && _k2.charCodeAt(0) === 36) {
                continue;
            }
            var _v2 = obj2[_k2];
            if (_v2 !== undefined) {
                c++;
                var _v3 = obj1[_k2];
                if (_v3 !== _v2) {
                    cb(args, _k2, _v3, _v2);
                }
            } else {
                cb(args, _k2, obj1[_k2], _v2);
            }
        }
        if (c < objSize2) {
            for (var _k3 in obj2) {
                if (_k3.charCodeAt(0) === 95 && _k3.charCodeAt(0) === 36) {
                    continue;
                }
                var _v4 = obj1[_k3];
                if (_v4 === undefined) {
                    cb(args, _k3, _v4, obj2[_k3]);
                }
            }
        }
    }
    return c;
};
/**
 * @description 比较2个Map， 值为undefined表示没有该键， 用===直接比较值。返回相同键的数量。先遍历长的，如果短的键都被长的覆盖，则不需要遍历短的
 * @example
 */
exports.mapDiff = function (map1, map2, cb, args) {
    var c = 0;
    if (map1.size < map2.size) {
        for (var _iterator = map2, _isArray = Array.isArray(_iterator), _i = 0, _iterator = _isArray ? _iterator : _iterator[Symbol.iterator]();;) {
            var _ref;

            if (_isArray) {
                if (_i >= _iterator.length) break;
                _ref = _iterator[_i++];
            } else {
                _i = _iterator.next();
                if (_i.done) break;
                _ref = _i.value;
            }

            var _ref5 = _ref,
                _ref6 = _slicedToArray(_ref5, 2),
                k = _ref6[0],
                _v5 = _ref6[1];

            var v1 = map1.get(k);
            if (v1 !== undefined) {
                c++;
                if (v1 !== _v5) {
                    cb(args, k, v1, _v5);
                }
            } else {
                cb(args, k, v1, _v5);
            }
        }
        if (c < map1.size) {
            for (var _iterator2 = map1, _isArray2 = Array.isArray(_iterator2), _i2 = 0, _iterator2 = _isArray2 ? _iterator2 : _iterator2[Symbol.iterator]();;) {
                var _ref2;

                if (_isArray2) {
                    if (_i2 >= _iterator2.length) break;
                    _ref2 = _iterator2[_i2++];
                } else {
                    _i2 = _iterator2.next();
                    if (_i2.done) break;
                    _ref2 = _i2.value;
                }

                var _ref3 = _ref2,
                    _ref4 = _slicedToArray(_ref3, 2),
                    k = _ref4[0],
                    v1 = _ref4[1];

                var v2 = map2.get(k);
                if (v2 === undefined) {
                    cb(args, k, v1, v2);
                }
            }
        }
    } else {
        for (var _iterator3 = map1, _isArray3 = Array.isArray(_iterator3), _i3 = 0, _iterator3 = _isArray3 ? _iterator3 : _iterator3[Symbol.iterator]();;) {
            var _ref7;

            if (_isArray3) {
                if (_i3 >= _iterator3.length) break;
                _ref7 = _iterator3[_i3++];
            } else {
                _i3 = _iterator3.next();
                if (_i3.done) break;
                _ref7 = _i3.value;
            }

            var _ref11 = _ref7,
                _ref12 = _slicedToArray(_ref11, 2),
                k = _ref12[0],
                _v8 = _ref12[1];

            var _v9 = map2.get(k);
            if (_v9 !== undefined) {
                c++;
                if (_v8 !== _v9) {
                    cb(args, k, _v8, _v9);
                }
            } else {
                cb(args, k, _v8, _v9);
            }
        }
        if (c < map2.size) {
            for (var _iterator4 = map2, _isArray4 = Array.isArray(_iterator4), _i4 = 0, _iterator4 = _isArray4 ? _iterator4 : _iterator4[Symbol.iterator]();;) {
                var _ref8;

                if (_isArray4) {
                    if (_i4 >= _iterator4.length) break;
                    _ref8 = _iterator4[_i4++];
                } else {
                    _i4 = _iterator4.next();
                    if (_i4.done) break;
                    _ref8 = _i4.value;
                }

                var _ref9 = _ref8,
                    _ref10 = _slicedToArray(_ref9, 2),
                    k = _ref10[0],
                    _v6 = _ref10[1];

                var _v7 = map1.get(k);
                if (_v7 === undefined) {
                    cb(args, k, _v7, _v6);
                }
            }
        }
    }
    return c;
};
/**
 * @description 函数调用
 * @example
 */
exports.call = function (func, args) {
    if (Array.isArray(args)) {
        switch (args.length) {
            case 0:
                return func();
            case 1:
                return func(args[0]);
            case 2:
                return func(args[0], args[1]);
            case 3:
                return func(args[0], args[1], args[2]);
            case 4:
                return func(args[0], args[1], args[2], args[3]);
            case 5:
                return func(args[0], args[1], args[2], args[3], args[4]);
            case 6:
                return func(args[0], args[1], args[2], args[3], args[4], args[5]);
            case 7:
                return func(args[0], args[1], args[2], args[3], args[4], args[5], args[6]);
            case 8:
                return func(args[0], args[1], args[2], args[3], args[4], args[5], args[6], args[7]);
            default:
                func.apply(undefined, args);
        }
    } else {
        return func(args);
    }
};
/**
 * @description 对象方法调用
 * @example
 */
exports.objCall = function (obj, func, args) {
    if (Array.isArray(args)) {
        switch (args.length) {
            case 0:
                return obj[func]();
            case 1:
                return obj[func](args[0]);
            case 2:
                return obj[func](args[0], args[1]);
            case 3:
                return obj[func](args[0], args[1], args[2]);
            case 4:
                return obj[func](args[0], args[1], args[2], args[3]);
            case 5:
                return obj[func](args[0], args[1], args[2], args[3], args[4]);
            case 6:
                return obj[func](args[0], args[1], args[2], args[3], args[4], args[5]);
            case 7:
                return obj[func](args[0], args[1], args[2], args[3], args[4], args[5], args[6]);
            case 8:
                return obj[func](args[0], args[1], args[2], args[3], args[4], args[5], args[6], args[7]);
            default:
                obj[func].apply(obj, args);
        }
    } else {
        return obj[func](args);
    }
};
/**
 * @description 获得任意对象的深度Copy, 不支持循环引用
 * @example
 */
exports.deepCopy = function (v) {
    if (v === undefined || v === null) {
        return v;
    }
    var t = typeof v === "undefined" ? "undefined" : _typeof(v);
    if (t === 'boolean' || t === 'number' || t === 'string' || t === 'function') {
        return v;
    }
    if (v instanceof ArrayBuffer) {
        return v.slice(0);
    }
    if (ArrayBuffer.isView(v) && v.BYTES_PER_ELEMENT > 0) {
        return v.slice(0);
    }
    return JSON.parse(JSON.stringify(v));
};
/**
 * @description 复制Map
 * @example
 */
exports.mapCopy = function (src, dst) {
    for (var _iterator5 = src, _isArray5 = Array.isArray(_iterator5), _i5 = 0, _iterator5 = _isArray5 ? _iterator5 : _iterator5[Symbol.iterator]();;) {
        var _ref13;

        if (_isArray5) {
            if (_i5 >= _iterator5.length) break;
            _ref13 = _iterator5[_i5++];
        } else {
            _i5 = _iterator5.next();
            if (_i5.done) break;
            _ref13 = _i5.value;
        }

        var _ref14 = _ref13,
            _ref15 = _slicedToArray(_ref14, 2),
            k = _ref15[0],
            v = _ref15[1];

        dst.set(k, v);
    }
    return dst;
};
/**
 * @description 根据指定的键路径，获得对象的值。键可以多层，数组或字符串，字符串默认用"."分隔
 * @example
 */
exports.getValue = function (obj, path, split) {
    if (typeof path === 'string') {
        split = split || '.';
        var i = path.indexOf(split);
        var j = 0;
        while (i > j) {
            var k = path.slice(j, i);
            var v = obj[k];
            if (v === undefined) {
                return undefined;
            }
            if (v === null) {
                return null;
            }
            obj = v;
            j = i + 1;
            i = path.indexOf(split, j);
        }
        if (j > 0) {
            path = path.slice(j);
        }
        return obj[path];
    }
    for (var _iterator6 = path, _isArray6 = Array.isArray(_iterator6), _i6 = 0, _iterator6 = _isArray6 ? _iterator6 : _iterator6[Symbol.iterator]();;) {
        var _ref16;

        if (_isArray6) {
            if (_i6 >= _iterator6.length) break;
            _ref16 = _iterator6[_i6++];
        } else {
            _i6 = _iterator6.next();
            if (_i6.done) break;
            _ref16 = _i6.value;
        }

        var _k4 = _ref16;

        var _v10 = obj[_k4];
        if (_v10 === undefined) {
            return undefined;
        }
        if (_v10 === null) {
            return null;
        }
        obj = _v10;
    }
    return obj;
};
/**
 * @description 根据指定的键路径，设置对象的值，层次更新值。键可以多层，数组或字符串，字符串默认用"."分隔。如果键是数字1-9开头，则认为是数组。 返回旧值
 * @example
 */
exports.setValue = function (obj, path, value, split) {
    var old = void 0;
    if (typeof path === 'string') {
        split = split || '.';
        var _i7 = path.indexOf(split);
        var j = 0;
        while (_i7 > j) {
            var _k5 = path.slice(j, _i7);
            old = obj[_k5];
            if (!old) {
                // 如果键是数字1-9开头，则认为应该生成数组
                var c = path.charCodeAt(_i7 + 1);
                obj[_k5] = old = c > 57 || c < 49 ? {} : [];
            }
            obj = old;
            j = _i7 + 1;
            _i7 = path.indexOf(split, j);
        }
        if (j > 0) {
            path = path.slice(j);
        }
        old = obj[path];
        obj[path] = value;
        return old;
    }
    var i = 0;
    for (var len = path.length - 1; i < len; i++) {
        var _k6 = path[i];
        old = obj[_k6];
        if (!old) {
            // 如果键是数字
            obj[_k6] = old = Number.isInteger(_k6) ? [] : {};
        }
        obj = old;
    }
    var k = path[i];
    old = obj[k];
    obj[k] = value;
    return old;
};
/**
 * @description utf8的Uint8Array解码成字符串
 * @example
 */
exports.utf8Decode = self !== undefined && self.TextDecoder ? function () {
    var decoder = new TextDecoder('utf-8');
    return function (arr) {
        if (!arr || arr.byteLength === 0) {
            return '';
        }
        if (arr instanceof ArrayBuffer) {
            arr = new Uint8Array(arr);
        }
        return decoder.decode(arr);
    };
}() : function (arr) {
    if (!arr || arr.byteLength === 0) {
        return '';
    }
    if (arr instanceof ArrayBuffer) {
        arr = new Uint8Array(arr);
    }
    var c = void 0;
    var out = '';
    var i = 0;
    var len = arr.length;
    while (i < len) {
        c = arr[i++];
        if (c < 128) {
            out += String.fromCharCode(c);
        } else if (c < 0xE0 && i < len) {
            out += String.fromCharCode((c & 0x1F) << 6 | arr[i++] & 0x3F);
        } else if (c < 0xF0 && i + 1 < len) {
            out += String.fromCharCode((c & 0x0F) << 12 | (arr[i++] & 0x3F) << 6 | arr[i++] & 0x3F);
        } else if (c < 0xF8 && i + 2 < len) {
            out += String.fromCharCode((c & 0x07) << 18 | (arr[i++] & 0x3F) << 12 | (arr[i++] & 0x3F) << 6 | arr[i++] & 0x3F);
        } else if (c < 0xFC && i + 3 < len) {
            // tslint:disable:max-line-length
            out += String.fromCharCode((c & 0x03) << 24 | (arr[i++] & 0x3F) << 18 | (arr[i++] & 0x3F) << 12 | (arr[i++] & 0x3F) << 6 | arr[i++] & 0x3F);
        } else if (c < 0xFE && i + 4 < len) {
            out += String.fromCharCode((c & 0x01) << 30 | (arr[i++] & 0x3F) << 24 | (arr[i++] & 0x3F) << 18 | (arr[i++] & 0x3F) << 12 | (arr[i++] & 0x3F) << 6 | arr[i++] & 0x3F);
        } else {
            throw new Error('invalid utf8');
        }
    }
    return out;
};
/**
 * @description 字符串编码成utf8的Uint8Array
 * @example
 */
exports.utf8Encode = self !== undefined && self.TextDecoder ? function () {
    var encoder = new TextEncoder('utf-8');
    return function (s) {
        return s && s.length > 0 ? encoder.encode(s) : null;
    };
}() : function (s) {
    if (!s || s.length === 0) {
        return null;
    }
    return null;
};
/**
 * @description 将字符串解析成json，可以执行运算，可以加注释，obj的键可以不用引号引起来。必须使用缓冲，因为该函数对象v8中不会释放。
 * @note return的两边加上圆括号，是为了让s有空行（因为js引擎的自动加分号机制）和开头的注释时候也能生效
 * @example
 */
exports.toJson = function (s) {
    // tslint:disable:no-function-constructor-with-string-args
    return new Function('return (' + s + ')')();
};
/**
 * @description 获得指定模块的导出变量上，指定类型（包括父类型）的函数
 * @example
 */
exports.getExport = function (mod, func, funcArgs) {
    var k = void 0;
    var v = void 0;
    var exports = mod.exports;
    for (k in exports) {
        if (exports.hasOwnProperty(k)) {
            v = exports[k];
            if (func(v, funcArgs)) {
                return v;
            }
        }
    }
};
/**
 * @description 获得指定模块的导出变量上，指定类型（包括父类型）的函数
 * @example
 */
exports.getExportFunc = function (mod, func, funcArgs) {
    var k = void 0;
    var v = void 0;
    var exports = mod.exports;
    for (k in exports) {
        if (exports.hasOwnProperty(k)) {
            v = exports[k];
            if (func(v, funcArgs)) {
                return function () {
                    return exports[k];
                };
            }
        }
    }
};
/**
 * @description 检查对象是否为指定类型或其子类型
 * @example
 */
exports.checkType = function (obj, typeClass) {
    return obj.prototype && typeClass.isPrototypeOf(obj);
};
/**
 * @description 检查对象是否为指定类型或其子类型的实例
 * @example
 */
exports.checkInstance = function (obj, typeClass) {
    return obj instanceof typeClass;
};
/**
 * @description 数组去重
 * @example
 */
exports.unique = function (arr) {
    return Array.from(new Set(arr));
};
/**
 * @description 判断两个数组是否相等
 * @example
 */
exports.arrayEqual = function (oldArr, newArr) {
    if (oldArr === newArr) {
        return true;
    }
    if (oldArr.length !== newArr.length) {
        return false;
    }
    for (var i = oldArr.length - 1; i >= 0; i--) {
        if (oldArr[i] !== newArr[i]) {
            return false;
        }
    }
    return true;
};
/**
 * @description 数组删除子元素，将最后一个元素放到删除的位置上
 * @example
 */
exports.arrDrop = function (arr, el) {
    var i = arr.indexOf(el);
    if (i < 0) {
        return -1;
    }
    var len = arr.length - 1;
    if (i < len) {
        arr[i] = arr[len];
    }
    arr.length = len;
    return i;
};
/**
 * 设置数组指定位置的元素，不改变原数组，返回拷贝后的数组
 */
exports.arrSet = function (arr, el, i) {
    if (i < 0) {
        return arr;
    }
    if (i < arr.length) {
        var a = arr.slice();
        a[i] = el;
        return a;
    }
    return arr;
};
/**
 * 设置数组指定位置的元素，不改变原数组，返回拷贝后的数组，
 * 如果没有位置i或超过数组长度，则添加在尾部，i为负数或0表示添加在头部
 */
exports.arrInsert = function (arr, el, i) {
    var a = arr.slice();
    if (i === undefined) {
        a.push(el);
    } else if (i <= 0) {
        a.unshift(el);
    } else if (i < a.length) {
        a.splice(i, 0, el);
    } else {
        a.push(el);
    }
    return a;
};
/**
 * 删除数组指定位置的元素，不改变原数组，返回拷贝后的数组
 */
exports.arrDelete = function (arr, i) {
    if (i < 0) {
        return arr;
    }
    if (i === 0) {
        return arr.slice(1, arr.length);
    }
    if (i < arr.length - 1) {
        var a = arr.slice();
        a.splice(i, 1);
        return a;
    }
    if (i === arr.length - 1) {
        return arr.slice(0, arr.length - 1);
    }
    return arr;
};
/**
 * 删除元素
 */
exports.arrRemove = function (arr, el) {
    var i = arr.indexOf(el);
    if (i < 0) {
        return arr;
    }
    if (i === 0) {
        return arr.slice(1, arr.length);
    }
    if (i < arr.length - 1) {
        var a = arr.slice();
        a.splice(i, 1);
        return a;
    }
    return arr.slice(0, arr.length - 1);
};
/**
 * 首字母转为大写
 */
exports.upperFirst = function (str) {
    return str.charAt(0).toUpperCase() + str.slice(1, str.length);
};
})