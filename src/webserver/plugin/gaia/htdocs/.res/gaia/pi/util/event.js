_$define("pi/util/event", function (require, exports, module){
"use strict";
/*
 * 事件广播模块
 */

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

Object.defineProperty(exports, "__esModule", { value: true });
// ============================== 导入
var mod_1 = require("../lang/mod");
var time_1 = require("../lang/time");
var log_1 = require("./log");
var util_1 = require("./util");
// ============================== 导出
exports.level = mod_1.commonjs.debug ? log_1.logLevel : log_1.LogLevel.info;
// 3毫秒以上的事件会打印
var timeout = 3;
/**
 * @description 处理器返回值
 */
var HandlerResult;
(function (HandlerResult) {
    HandlerResult[HandlerResult["OK"] = 0] = "OK";
    HandlerResult[HandlerResult["REMOVE_SELF"] = 1] = "REMOVE_SELF";
    HandlerResult[HandlerResult["BREAK_OK"] = 2] = "BREAK_OK";
    HandlerResult[HandlerResult["BREAK_REMOVE_SELF"] = 3] = "BREAK_REMOVE_SELF"; // 结束此次事件调用，不继续调用处理器，从处理器列表删除自身，以后不会收到事件
})(HandlerResult = exports.HandlerResult || (exports.HandlerResult = {}));
/**
 * 创建事件处理器列表
 * @example
 */
exports.createHandlerList = function () {
    var list = function list(args) {
        var i = void 0;
        var handler = void 0;
        var r = void 0;
        var delIndex = -1;
        var arr = list.array;
        var n = arr.length;
        list.handling++;
        for (i = n - 1; i >= 0; i--) {
            handler = arr[i];
            if (handler) {
                r = call1(handler, args);
                if (!r) {
                    continue;
                } else if (r === HandlerResult.REMOVE_SELF) {
                    arr[i] = null;
                    delIndex = i;
                } else if (r === HandlerResult.BREAK_OK) {
                    break;
                } else if (r === HandlerResult.BREAK_REMOVE_SELF) {
                    arr[i] = null;
                    delIndex = i;
                    break;
                }
            } else {
                delIndex = i;
            }
        }
        list.handling--;
        if (delIndex >= 0 && !list.handling) {
            for (i = delIndex + 1; i < n; ++i) {
                handler = arr[i];
                if (handler) {
                    arr[delIndex] = handler;
                    ++delIndex;
                }
            }
            list.count = delIndex;
            arr.length = delIndex;
        }
        return r || HandlerResult.BREAK_OK;
    };
    list.handling = 0;
    list.count = 0;
    list.array = [];
    list.__proto__ = HandlerArray.prototype;
    return list;
};
/**
 * 创建事件处理器表
 * @example
 */

var HandlerMap = function () {
    function HandlerMap() {
        _classCallCheck(this, HandlerMap);

        /**
         * 事件处理器映射表
         */
        this.map = new Map();
    }
    /**
     * 事件通知
     */
    // tslint:disable:no-reserved-keywords


    _createClass(HandlerMap, [{
        key: "notify",
        value: function notify(type, args) {
            var list = this.map.get(type);
            if (!list) {
                return false;
            }
            list(args);
            return true;
        }
        /**
         * 获得事件处理器表的长度
         */

    }, {
        key: "size",
        value: function size(type) {
            var list = void 0;
            var n = 0;
            for (var _iterator = this.map.values(), _isArray = Array.isArray(_iterator), _i = 0, _iterator = _isArray ? _iterator : _iterator[Symbol.iterator]();;) {
                if (_isArray) {
                    if (_i >= _iterator.length) break;
                    list = _iterator[_i++];
                } else {
                    _i = _iterator.next();
                    if (_i.done) break;
                    list = _i.value;
                }

                n += list.size();
            }
            return n;
        }
        /**
         * 添加事件处理器
         */

    }, {
        key: "add",
        value: function add(type, h) {
            var list = void 0;
            var map = this.map;
            if (!(h && type)) {
                return;
            }
            list = map.get(type);
            if (!list) {
                list = exports.createHandlerList();
                map.set(type, list);
            }
            list.add(h);
        }
        /**
         * 删除事件处理器
         */

    }, {
        key: "remove",
        value: function remove(type, h) {
            var list = void 0;
            var map = this.map;
            if (!h) {
                if (!type) {
                    return false;
                }
                return map.delete(type);
            }
            if (!type) {
                for (var _iterator2 = this.map.values(), _isArray2 = Array.isArray(_iterator2), _i2 = 0, _iterator2 = _isArray2 ? _iterator2 : _iterator2[Symbol.iterator]();;) {
                    if (_isArray2) {
                        if (_i2 >= _iterator2.length) break;
                        list = _iterator2[_i2++];
                    } else {
                        _i2 = _iterator2.next();
                        if (_i2.done) break;
                        list = _i2.value;
                    }

                    if (!list.remove(h)) {
                        continue;
                    }
                    if (list.size() === 0) {
                        map.delete(type);
                        return true;
                    }
                }
                return false;
            }
            list = map.get(type);
            if (!list) {
                return false;
            }
            if (!list.remove(h)) {
                return false;
            }
            if (list.size() === 0) {
                map.delete(type);
            }
            return true;
        }
        /**
         * 删除事件处理器
         */

    }, {
        key: "clear",
        value: function clear() {
            this.map.clear();
        }
    }]);

    return HandlerMap;
}();

exports.HandlerMap = HandlerMap;
/**
 * 事件处理器表
 * @example
 */

var HandlerTable = function () {
    function HandlerTable() {
        _classCallCheck(this, HandlerTable);

        // 必须要赋初值，不然new出来的实例里面是没有这些属性的
        this.handlerMap = null; // 事件处理器表
    }
    /**
     * @description 通知组件上的事件监听器
     * @example
     */


    _createClass(HandlerTable, [{
        key: "notify",
        value: function notify(eventType, args) {
            if (this[eventType]) {
                return objCall1(this, eventType, args);
            }
            var map = this.handlerMap;
            if (!map) {
                return;
            }
            var r = map.notify(eventType, args);
            if (r) {
                return r;
            }
            return map.notify('*', args);
        }
        /**
         * 添加事件处理器
         */

    }, {
        key: "addHandler",
        value: function addHandler(type, h) {
            var map = this.handlerMap;
            if (!map) {
                map = this.handlerMap = new HandlerMap();
            }
            map.add(type, h);
        }
        /**
         * 删除事件处理器
         */

    }, {
        key: "removeHandler",
        value: function removeHandler(type, h) {
            return this.handlerMap && this.handlerMap.remove(type, h);
        }
        /**
         * 删除事件处理器
         */

    }, {
        key: "clearHandler",
        value: function clearHandler() {
            return this.handlerMap && this.handlerMap.clear();
        }
    }]);

    return HandlerTable;
}();

exports.HandlerTable = HandlerTable;
/**
 * 创建事件监听器表
 * @example
 */

var ListenerList = function () {
    function ListenerList() {
        _classCallCheck(this, ListenerList);

        this.list = [];
    }
    /**
     * @description 通知列表上的每个事件监听器
     * @example
     */


    _createClass(ListenerList, [{
        key: "notify",
        value: function notify(arg) {
            var r = this.list;
            for (var _iterator3 = r, _isArray3 = Array.isArray(_iterator3), _i3 = 0, _iterator3 = _isArray3 ? _iterator3 : _iterator3[Symbol.iterator]();;) {
                var _ref;

                if (_isArray3) {
                    if (_i3 >= _iterator3.length) break;
                    _ref = _iterator3[_i3++];
                } else {
                    _i3 = _iterator3.next();
                    if (_i3.done) break;
                    _ref = _i3.value;
                }

                var f = _ref;

                f(arg);
            }
        }
        /**
         * 获取事件监听器列表的长度
         */

    }, {
        key: "size",
        value: function size() {
            return this.list.length;
        }
        /**
         * 添加事件监听器
         */

    }, {
        key: "add",
        value: function add(f) {
            this.list = util_1.arrInsert(this.list, f);
        }
        /**
         * 删除事件监听器
         */

    }, {
        key: "remove",
        value: function remove(f) {
            var old = this.list;
            var r = util_1.arrRemove(this.list, f);
            var b = r === old;
            this.list = r;
            return b;
        }
        /**
         * 清空事件监听器列表
         */

    }, {
        key: "clear",
        value: function clear() {
            this.list = [];
        }
    }]);

    return ListenerList;
}();

exports.ListenerList = ListenerList;
// ============================== 本地
// 函数调用
var call1 = function call1(func, args) {
    var r = void 0;
    var start = time_1.now();
    try {
        r = util_1.call(func, args);
    } catch (ex) {
        return log_1.warn(exports.level, 'event, ex: ', ex, ', func: ', func, args);
    }
    var end = time_1.now();
    if (end - start > timeout) {
        exports.level <= log_1.LogLevel.debug && log_1.debug(exports.level, "event slow, cost: " + (end - start), func, args);
    }
    return r;
};
// 对象方法调用
var objCall1 = function objCall1(obj, func, args) {
    var r = void 0;
    var start = time_1.now();
    try {
        r = util_1.objCall(obj, func, args);
    } catch (ex) {
        return log_1.warn(exports.level, 'event, ex: ', ex, ', func: ', obj, func, args);
    }
    var end = time_1.now();
    if (end - start > timeout) {
        exports.level <= log_1.LogLevel.debug && log_1.debug(exports.level, "event slow, cost: " + (end - start), obj, func, args);
    }
    return r;
};
// TODO 以后改成树结构-并且是写时复制的，就可以任意重入。而且删除效率高。js对象不能直接比较大小，可以转成字符串后的hash来比较大小。如果是乱序执行，则只需要1个树。如果是按照放入的顺序执行，则需要2个树。sbtree或fingertree
// tslint:disable:max-classes-per-file

var HandlerArray = function () {
    function HandlerArray() {
        _classCallCheck(this, HandlerArray);

        this.handling = 0;
        this.count = 0;
        this.array = [];
    }
    /**
     * 获得事件处理器列表的长度
     */


    _createClass(HandlerArray, [{
        key: "size",
        value: function size() {
            return this.count;
        }
        /**
         * 添加事件处理器
         */

    }, {
        key: "add",
        value: function add(handler) {
            this.array.push(handler);
            this.count += 1;
        }
        /**
         * 删除事件处理器
         */

    }, {
        key: "remove",
        value: function remove(handler) {
            var i = void 0;
            var arr = this.array;
            for (i = arr.length - 1; i >= 0; --i) {
                if (arr[i] === handler) {
                    arr[i] = null;
                    this.count -= 1;
                    return true;
                }
            }
            return false;
        }
        /**
         * 清理事件处理器
         */

    }, {
        key: "clear",
        value: function clear() {
            this.array = [];
            this.count = 0;
        }
    }]);

    return HandlerArray;
}();
})