_$define("pi/struct/struct_mgr", function (require, exports, module){
"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

Object.defineProperty(exports, "__esModule", { value: true });
var util_1 = require("../util/util");

var StructMeta = function () {
    function StructMeta() {
        _classCallCheck(this, StructMeta);
    }

    _createClass(StructMeta, [{
        key: "addStruct",

        // 添加元信息
        value: function addStruct(s) {
            s._$meta = this;
        }
        // 删除元信息

    }, {
        key: "delStruct",
        value: function delStruct(ss) {
            ss._$meta = null;
        }
    }]);

    return StructMeta;
}();

exports.StructMeta = StructMeta;
/**
 * 结构元信息
 * @example
 */

var MStructMeta = function (_StructMeta) {
    _inherits(MStructMeta, _StructMeta);

    function MStructMeta() {
        _classCallCheck(this, MStructMeta);

        var _this = _possibleConstructorReturn(this, (MStructMeta.__proto__ || Object.getPrototypeOf(MStructMeta)).apply(this, arguments));

        _this.maxIndex = 0; // 当前实例的最大索引位置
        _this.map = new Map(); // 实例表
        _this.add = []; // 插入监听器
        _this.modify = []; // 修改监听器
        _this.remove = []; // 删除监听器	
        return _this;
    }
    // 添加一个实例


    _createClass(MStructMeta, [{
        key: "addStruct",
        value: function addStruct(s) {
            s._$index = this.maxIndex++;
            s._$meta = this;
            this.map.set(s._$index, s);
            this.addNotify(s); // 通知添加监听器
        }
        // 插入一个实例

    }, {
        key: "insertStruct",
        value: function insertStruct(s, index) {
            s._$index = index;
            s._$meta = this;
            this.map.set(s._$index, s);
            this.addNotify(s); // 通知添加监听器
            if (index >= this.maxIndex) {
                this.maxIndex = index + 1;
            }
        }
        // 删除一个实例

    }, {
        key: "delStruct",
        value: function delStruct(ss) {
            var s = this.map.get(ss._$index);
            if (!s) {
                throw new Error("StructMeta Error:struct is not exist!,index:" + ss._$index);
            }
            this.map.delete(ss._$index);
            this.removeNotify(s);
            s._$meta = null;
            s._$index = -1;
        }
        // 通知插入监听

    }, {
        key: "addNotify",
        value: function addNotify(s) {
            var arr = this.add;
            for (var _iterator = arr, _isArray = Array.isArray(_iterator), _i = 0, _iterator = _isArray ? _iterator : _iterator[Symbol.iterator]();;) {
                var _ref;

                if (_isArray) {
                    if (_i >= _iterator.length) break;
                    _ref = _iterator[_i++];
                } else {
                    _i = _iterator.next();
                    if (_i.done) break;
                    _ref = _i.value;
                }

                var l = _ref;

                l(s);
            }
        }
        // 通知移除监听

    }, {
        key: "removeNotify",
        value: function removeNotify(s) {
            var arr = this.remove;
            for (var _iterator2 = arr, _isArray2 = Array.isArray(_iterator2), _i2 = 0, _iterator2 = _isArray2 ? _iterator2 : _iterator2[Symbol.iterator]();;) {
                var _ref2;

                if (_isArray2) {
                    if (_i2 >= _iterator2.length) break;
                    _ref2 = _iterator2[_i2++];
                } else {
                    _i2 = _iterator2.next();
                    if (_i2.done) break;
                    _ref2 = _i2.value;
                }

                var l = _ref2;

                l(s);
            }
        }
        // 通知修改监听

    }, {
        key: "modifyNotify",
        value: function modifyNotify(s, fieldKey, value, old, index) {
            var arr = this.modify;
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

                var l = _ref3;

                l(s, fieldKey, value, old, index);
            }
        }
        /**
         * 添加结构添加监听器
         */

    }, {
        key: "addAddListener",
        value: function addAddListener(listener) {
            this.add.push(listener);
        }
        /**
         * 移除组件添加监听器
         */

    }, {
        key: "removeAddListener",
        value: function removeAddListener(listener) {
            this.add = util_1.arrDelete(this.add, this.add.indexOf(listener));
        }
        /**
         * 注册组件修改监听器
         */

    }, {
        key: "addModifyListener",
        value: function addModifyListener(listener) {
            this.modify = util_1.arrInsert(this.modify, listener);
        }
        /**
         * 移除组件添加监听器
         */

    }, {
        key: "removeModifyListener",
        value: function removeModifyListener(listener) {
            this.modify = util_1.arrDelete(this.modify, this.modify.indexOf(listener));
        }
        /**
         * 注册组件移除监听器
         */

    }, {
        key: "addRemoveListener",
        value: function addRemoveListener(listener) {
            this.remove = util_1.arrInsert(this.remove, listener);
        }
        /**
         * 移除组件添加监听器
         */

    }, {
        key: "removeRemoveListener",
        value: function removeRemoveListener(listener) {
            this.remove = util_1.arrDelete(this.remove, this.remove.indexOf(listener));
        }
    }]);

    return MStructMeta;
}(StructMeta);

exports.MStructMeta = MStructMeta;
/**
 * 结构
 * @example
 */

var Struct = function () {
    function Struct() {
        _classCallCheck(this, Struct);
    }

    _createClass(Struct, [{
        key: "removeMeta",

        // tslint:disable-next-line:no-empty
        value: function removeMeta() {} // 从元信息上移除
        // tslint:disable-next-line:no-empty

    }, {
        key: "addMeta",
        value: function addMeta(mgr) {} // 添加到元信息上
        // tslint:disable-next-line:no-empty

    }, {
        key: "binEncode",
        value: function binEncode(bb, next) {} // 二进制编码
        // tslint:disable-next-line:no-empty

    }, {
        key: "binDecode",
        value: function binDecode(bb, next) {} // 二进制解码

    }]);

    return Struct;
}();

exports.Struct = Struct;
/**
 * 实例被管理器管理起来的结构
 * @example
 */
// tslint:disable:max-classes-per-file

var MStruct = function (_Struct) {
    _inherits(MStruct, _Struct);

    function MStruct() {
        _classCallCheck(this, MStruct);

        return _possibleConstructorReturn(this, (MStruct.__proto__ || Object.getPrototypeOf(MStruct)).apply(this, arguments));
    }

    _createClass(MStruct, [{
        key: "insertMeta",

        // tslint:disable-next-line:no-empty
        value: function insertMeta(mgr, index) {} // 添加到元信息上

    }]);

    return MStruct;
}(Struct);

exports.MStruct = MStruct;
/**
 * 将结构添加到元信息中
 */
exports.addToMeta = function (ss, struct) {
    var meta = ss.constructMap.get(struct.constructor);
    if (!meta) {
        throw new Error("unregister struct, name:" + struct.constructor.name);
    }
    meta.addStruct(struct);
};
/**
 * 将结构添加插入到元信息中
 */
exports.insertToMeta = function (ss, struct, index) {
    var meta = ss.constructMap.get(struct.constructor);
    if (!meta) {
        throw new Error("unregister struct, name:" + struct.constructor.name);
    }
    meta.insertStruct(struct, index);
};
/**
 * 从元信息中删除结构
 */
exports.removeFromMeta = function (struct) {
    struct._$meta.delStruct(struct);
};
/**
 * 通知字段改变
 */
exports.notifyModify = function (struct, field, value, old, index) {
    struct._$meta.modifyNotify(struct, field, value, old, index);
};
/**
 * 结构系统管理器
 * @example
 */

var StructMgr = function () {
    function StructMgr() {
        _classCallCheck(this, StructMgr);

        this.numberMap = new Map(); // 组件元信息表
        this.constructMap = new Map(); // 组件元信息表
    }
    /**
     * 注册
     */


    _createClass(StructMgr, [{
        key: "register",
        value: function register(nameHash, construct, name) {
            var hash = construct._$info.nameHash;
            var meta = this.numberMap.get(hash);
            if (meta) {
                throw new Error("class already register, name:" + name);
            }
            var s = void 0;
            if (MStruct.isPrototypeOf(construct)) {
                s = new MStructMeta();
            } else {
                s = new StructMeta();
            }
            s.construct = construct;
            s.mgr = this;
            s.info = construct._$info;
            construct._$info.name = name;
            s.name = name;
            this.numberMap.set(hash, s);
            this.constructMap.set(construct, s);
        }
        /**
         * 查询
         */

    }, {
        key: "lookup",
        value: function lookup(key) {
            return Number.isInteger(key) ? this.numberMap.get(key) : this.constructMap.get(key);
        }
    }]);

    return StructMgr;
}();

exports.StructMgr = StructMgr;
})