_$define("pi/util/res_mgr", function (require, exports, module){
"use strict";
/**
 * 负责创建、销毁BlobURL，负责维护资源的缓存和引用计数
 * 异步加载二进制数据，同步创建BlobURL，异步加载资源（图像、字体……）
 */

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

Object.defineProperty(exports, "__esModule", { value: true });
// ============================== 导入
var mod_1 = require("../lang/mod");
var time_1 = require("../lang/time");
// ============================== 导出
/**
 * @description blob的资源类型
 * @example
 */
exports.RES_TYPE_BLOB = 'blob';
exports.RES_TYPE_FILE = 'file';
/**
 * @description 资源
 * @example
 */

var Res = function () {
    function Res() {
        _classCallCheck(this, Res);

        // 必须要赋初值，不然new出来的实例里面是没有这些属性的
        // 名称
        this.name = '';
        // 类型
        // tslint:disable:no-reserved-keywords
        this.type = '';
        // 参数
        this.args = null;
        // 引用数
        this.count = 0;
        // 超时时间
        this.timeout = 0;
        // 链接
        this.link = null;
    }
    /**
     * @description 创建, 参数为源数据 可以是二进制数据，也可以是其他
     * @example
     */


    _createClass(Res, [{
        key: "create",
        value: function create(data) {
            this.link = data;
        }
        /**
         * @description 使用
         * @example
         */

    }, {
        key: "use",
        value: function use() {
            this.count++;
        }
        /**
         * @description 不使用
         * @example
         */

    }, {
        key: "unuse",
        value: function unuse(timeout, nowTime) {
            this.count--;
            if (timeout > this.timeout) {
                this.timeout = timeout;
            }
            this.release(nowTime);
        }
        /**
         * @description 释放
         * @example
         */

    }, {
        key: "release",
        value: function release(nowTime) {
            if (this.count > 0) {
                return;
            }
            if (nowTime < this.timeout) {
                timeoutRelease(this, nowTime, this.timeout);
            } else {
                resMap.delete(this.name);
                this.destroy();
            }
        }
        /**
         * @description 销毁，需要子类重载
         * @example
         */
        // tslint:disable:no-empty

    }, {
        key: "destroy",
        value: function destroy() {}
    }]);

    return Res;
}();

exports.Res = Res;
/**
 * @description 资源表，用于管理一个场景下所有的资源。需要手工释放。资源表内的资源，只会在资源上增加1个引用计数，释放后减少1个引用计数。
 * @example
 */

var ResTab = function () {
    function ResTab() {
        _classCallCheck(this, ResTab);

        // 必须要赋初值，不然new出来的实例里面是没有这些属性的
        // 本地表，为空表示资源表已经被释放
        this.tab = new Map();
        // 超时时间
        this.timeout = 0;
    }
    /**
     * @description 获取当前资源的数量
     * @example
     */


    _createClass(ResTab, [{
        key: "size",
        value: function size() {
            return this.tab ? this.tab.size : -1;
        }
        /**
         * @description 是否已释放
         */

    }, {
        key: "isReleased",
        value: function isReleased() {
            return !this.tab;
        }
        /**
         * @description 获取资源
         * @example
         */

    }, {
        key: "get",
        value: function get(name) {
            var tab = this.tab;
            if (!tab) {
                return;
            }
            var r = tab.get(name);
            if (r) {
                return r;
            }
            r = resMap.get(name);
            if (!r) {
                return;
            }
            r.use();
            tab.set(name, r);
            return r;
        }
        /**
         * @description 加载资源
         * @example
         */

    }, {
        key: "load",
        value: function load(name, type, args, funcArgs, successCallback, errorCallback) {
            var _this = this;

            var r = this.get(name);
            successCallback = successCallback || empty;
            errorCallback = errorCallback || empty;
            if (r) {
                return successCallback(r);
            }
            var create = typeMap.get(type);
            if (!create) {
                return false;
            }
            var cb = function cb(r) {
                var tab = _this.tab;
                if (tab && !tab.has(name)) {
                    r.use();
                    tab.set(r.name, r);
                }
                successCallback(r);
            };
            var wait = waitMap.get(name);
            if (wait) {
                return wait.push(cb, errorCallback);
            }
            waitMap.set(name, [cb, errorCallback]);
            create(name, type, args, funcArgs);
        }
        /**
         * @description 创建资源
         * @example
         */

    }, {
        key: "createRes",
        value: function createRes(name, type, args, construct, data) {
            var tab = this.tab;
            if (!tab) {
                return;
            }
            var r = exports.loadOK(name, type, args, construct, data);
            r.use();
            tab.set(r.name, r);
            return r;
        }
        /**
         * @description 释放资源
         * @example
         */

    }, {
        key: "delete",
        value: function _delete(res, timeout) {
            var tab = this.tab;
            if (!tab) {
                return false;
            }
            var b = tab.delete(res.name);
            if (b) {
                var time = time_1.now();
                res.unuse(time + (timeout || this.timeout), time);
            }
            return b;
        }
        /**
         * @description 清除全部资源
         * @example
         */

    }, {
        key: "clear",
        value: function clear() {
            var tab = this.tab;
            if (!tab) {
                return;
            }
            var time = time_1.now();
            var timeout = time + this.timeout;
            for (var _iterator = tab.values(), _isArray = Array.isArray(_iterator), _i = 0, _iterator = _isArray ? _iterator : _iterator[Symbol.iterator]();;) {
                var _ref;

                if (_isArray) {
                    if (_i >= _iterator.length) break;
                    _ref = _iterator[_i++];
                } else {
                    _i = _iterator.next();
                    if (_i.done) break;
                    _ref = _i.value;
                }

                var res = _ref;

                res.unuse(timeout, time);
            }
            tab.clear();
        }
        /**
         * @description 释放资源表
         * @example
         */

    }, {
        key: "release",
        value: function release() {
            var tab = this.tab;
            if (!tab) {
                return false;
            }
            this.tab = null;
            var time = time_1.now();
            var timeout = time + this.timeout;
            for (var _iterator2 = tab.values(), _isArray2 = Array.isArray(_iterator2), _i2 = 0, _iterator2 = _isArray2 ? _iterator2 : _iterator2[Symbol.iterator]();;) {
                var _ref2;

                if (_isArray2) {
                    if (_i2 >= _iterator2.length) break;
                    _ref2 = _iterator2[_i2++];
                } else {
                    _i2 = _iterator2.next();
                    if (_i2.done) break;
                    _ref2 = _i2.value;
                }

                var res = _ref2;

                res.unuse(timeout, time);
            }
            return true;
        }
    }]);

    return ResTab;
}();

exports.ResTab = ResTab;
/**
 * @description 后缀名对应的Blob类型
 * @example
 */
exports.BlobType = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
    gif: 'image/gif',
    svg: 'image/svg+xml',
    ttf: 'application/x-font-ttf',
    otf: 'application/x-font-opentype',
    woff: 'application/x-font-woff',
    woff2: 'application/x-font-woff2'
};
/**
 * @description 创建BlobURL
 * @example
 */
exports.createURL = function (data, type) {
    var blob = new Blob([data], { type: type });
    return URL.createObjectURL(blob);
};
/**
 * @description 销毁BlobURL
 */
exports.revokeURL = function (url) {
    URL.revokeObjectURL(url);
};
/**
 * @description 注册资源类型对应的创建函数
 * @example
 */
exports.register = function (type, create) {
    typeMap.set(type, create);
};
/**
 * @description 等待成功
 * @example
 */
exports.loadOK = function (name, type, args, construct, data) {
    var r = resMap.get(name);
    if (!r) {
        r = new construct();
        r.name = name;
        r.type = type;
        r.args = args;
        r.create(data);
        resMap.set(r.name, r);
        var t = time_1.now();
        timeoutRelease(r, t, t + defalutTimeout);
    }
    var arr = waitMap.get(name);
    if (!arr) {
        return r;
    }
    waitMap.delete(name);
    for (var i = arr.length - 2; i >= 0; i -= 2) {
        arr[i](r);
    }
    return r;
};
/**
 * @description 等待失败
 * @example
 */
exports.loadError = function (name, err) {
    var arr = waitMap.get(name);
    if (!arr) {
        return;
    }
    waitMap.delete(name);
    for (var i = arr.length - 1; i >= 0; i -= 2) {
        arr[i](err);
    }
};
/**
 * @description 获得资源主表
 * @example
 */
exports.getResMap = function () {
    return resMap;
};
/**
 * @description 创建ArrayBuffer资源
 * @example
 */
var createABRes = function createABRes(name, type, file, fileMap, construct) {
    file = exports.getTransWebpName(file);
    if (fileMap) {
        var data = fileMap[file];
        if (data) {
            exports.loadOK(name, type, file, construct, data);
            return;
        }
    }
    var info = mod_1.depend.get(file);
    if (!info) {
        return exports.loadError(name, {
            error: 'FILE_NOT_FOUND',
            reason: "createBlobURLRes fail: " + file
        });
    }
    var down = mod_1.load.create([info], function (r) {
        exports.loadOK(name, type, file, construct, r[file]);
    }, function (err) {
        exports.loadError(name, err);
    });
    mod_1.load.start(down);
};
/**
 * @description 获取 png jpg jpeg 自动转换成同名的webp, webp必须在depend中存在
 * @example
 */
exports.getTransWebpName = function (name) {
    if (!(mod_1.commonjs.flags.webp && mod_1.commonjs.flags.webp.alpha)) {
        return name;
    }
    var suf = mod_1.butil.fileSuffix(name);
    if (!(suf === 'png' || suf === 'jpg' || suf === 'jpeg')) {
        return name;
    }
    var s = name.slice(0, name.length - suf.length) + "webp";
    var i = s.indexOf(':');
    return mod_1.depend.get(i < 0 ? s : s.slice(i + 1)) ? s : name;
};
// ============================== 本地
// 资源类型对应的构造函数表
var typeMap = new Map();
// 全局资源
var resMap = new Map();
// 全局等待表
var waitMap = new Map();
// 空函数
// tslint:disable-next-line:only-arrow-functions no-function-expression
var empty = function empty() {};
// 定时的时间
var defalutTimeout = 1000;
// 最小释放的时间
var minReleaseTimeout = 500;
// 等待释放的资源数组
var releaseArray = [];
// 回收方法的定时器的引用
var timerRef = 0;
// 定时的时间
var timerTime = Number.MAX_SAFE_INTEGER;
/**
 * @description BlobURL资源
 * @example
 */

var BlobURLRes = function (_Res) {
    _inherits(BlobURLRes, _Res);

    function BlobURLRes() {
        _classCallCheck(this, BlobURLRes);

        return _possibleConstructorReturn(this, (BlobURLRes.__proto__ || Object.getPrototypeOf(BlobURLRes)).apply(this, arguments));
    }

    _createClass(BlobURLRes, [{
        key: "create",

        /**
         * @description 创建
         * @example
         */
        value: function create(data) {
            var type = mod_1.butil.fileSuffix(this.args);
            var blob = new Blob([data], { type: exports.BlobType[type] });
            this.link = URL.createObjectURL(blob);
        }
        /**
         * @description 销毁，需要子类重载
         * @example
         */

    }, {
        key: "destroy",
        value: function destroy() {
            URL.revokeObjectURL(this.link);
        }
    }]);

    return BlobURLRes;
}(Res);
/**
 * @description 回收超时的资源
 * @example
 */


var collect = function collect() {
    var time = time_1.now();
    var arr = releaseArray;
    releaseArray = [];
    timerRef = 0;
    timerTime = Number.MAX_SAFE_INTEGER;
    for (var _iterator3 = arr, _isArray3 = Array.isArray(_iterator3), _i3 = 0, _iterator3 = _isArray3 ? _iterator3 : _iterator3[Symbol.iterator]();;) {
        var _ref3;

        if (_isArray3) {
            if (_i3 >= _iterator3.length) break;
            _ref3 = _iterator3[_i3++];
        } else {
            _i3 = _iterator3.next();
            if (_i3.done) break;
            _ref3 = _i3.value;
        }

        var res = _ref3;

        res.release(time);
    }
};
/**
 * @description 超时释放, 最小500ms
 * @example
 */
var timeoutRelease = function timeoutRelease(res, nowTime, releaseTime) {
    releaseArray.push(res);
    if (timerTime <= releaseTime + minReleaseTimeout) {
        return;
    }
    if (timerRef) {
        clearTimeout(timerRef);
    }
    timerTime = releaseTime > nowTime + minReleaseTimeout ? releaseTime : nowTime + minReleaseTimeout;
    timerRef = setTimeout(collect, timerTime - nowTime);
};
// ============================== 立即执行
exports.register(exports.RES_TYPE_BLOB, function (name, type, args, fileMap) {
    createABRes(name, type, args, fileMap, BlobURLRes);
});
exports.register(exports.RES_TYPE_FILE, function (name, type, args, fileMap) {
    createABRes(name, type, args, fileMap, Res);
});
})