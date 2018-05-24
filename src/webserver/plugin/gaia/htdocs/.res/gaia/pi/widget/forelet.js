_$define("pi/widget/forelet", function (require, exports, module){
"use strict";
/*
负责进行业务逻辑处理，是数据库和显示组件间的桥梁， 输入->逻辑计算->输出
输入：
1、用户事件
2、数据库中数据被修改的事件
3、网络事件

输出：
1、操作数据库（同步）
2、网络通信（异步）
3、生成显示数据，调用paint，显示到界面上（可选同步或异步）

为了平滑显示，复杂的处理逻辑应该使用任务管理器进行调度处理
*/

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

Object.defineProperty(exports, "__esModule", { value: true });
var event_1 = require("../util/event");
var task_mgr_1 = require("../util/task_mgr");
// ============================== 导出
/**
 * @description 前端部件
 * @example
 */

var Forelet = function (_event_1$HandlerTable) {
    _inherits(Forelet, _event_1$HandlerTable);

    function Forelet() {
        _classCallCheck(this, Forelet);

        // 必须要赋初值，不然new出来的实例里面是没有这些属性的
        var _this = _possibleConstructorReturn(this, (Forelet.__proto__ || Object.getPrototypeOf(Forelet)).apply(this, arguments));

        _this.widgets = []; // 关联的组件
        _this.listener = null; // 监听器
        // tslint:disable:variable-name
        _this._data = null; // 延迟渲染的数据
        _this._dataState = DataState.init; // 延迟渲染的状态
        _this._args = [_this];
        return _this;
    }
    /**
     * @description 添加widget，自动在widget创建时调用
     * @example
     */


    _createClass(Forelet, [{
        key: "addWidget",
        value: function addWidget(w) {
            this.listener && this.listener('add', w);
            w.setState(this._data);
            this.widgets.push(w);
        }
        /**
         * @description widget事件
         * @example
         */
        // tslint:disable:no-reserved-keywords

    }, {
        key: "eventWidget",
        value: function eventWidget(w, type) {
            this.listener && this.listener(type, w);
        }
        /**
         * @description widget被移除，自动在widget销毁时调用
         * @example
         */

    }, {
        key: "removeWidget",
        value: function removeWidget(w) {
            var arr = this.widgets;
            var i = arr.indexOf(w);
            if (i < 0) {
                return;
            }
            if (i < arr.length - 1) {
                arr[i] = arr[arr.length - 1];
            }
            arr.length--;
            this.listener && this.listener('remove', w);
        }
        /**
         * @description 获取指定名称的widget
         * @example
         */

    }, {
        key: "getWidget",
        value: function getWidget(name) {
            var arr = this.widgets;
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

                var w = _ref;

                if (w.name === name) {
                    return w;
                }
            }
        }
        /**
         * @description 绘制方法，
         * @parms reset表示新旧数据差异很大，不做差异计算，直接生成dom
         * @parms immediately，表示同步计算dom，不延迟到系统空闲时
         * @example
         */

    }, {
        key: "paint",
        value: function paint(data, reset, immediately) {
            var s = this._dataState;
            // tslint:disable:no-constant-condition
            this._dataState = reset || s === DataState.reset_true ? DataState.reset_true : DataState.reset_false;
            this._data = data;
            if (immediately) {
                return paint1(this);
            }
            if (s === DataState.init) {
                if (this.widgets.length > 0) {
                    task_mgr_1.set(paint1, this._args, 900000, 1);
                } else {
                    this._dataState = DataState.init;
                }
            }
        }
    }]);

    return Forelet;
}(event_1.HandlerTable);

exports.Forelet = Forelet;
// ============================== 本地
/**
 * @description 处理器返回值
 */
var DataState;
(function (DataState) {
    DataState[DataState["init"] = 0] = "init";
    DataState[DataState["reset_false"] = 1] = "reset_false";
    DataState[DataState["reset_true"] = 2] = "reset_true";
})(DataState || (DataState = {}));
/**
 * @description 绘制方法，
 * @example
 */
var paint1 = function paint1(f) {
    var data = f._data;
    var r = f._dataState === DataState.reset_true;
    f._dataState = DataState.init;
    for (var _iterator2 = f.widgets, _isArray2 = Array.isArray(_iterator2), _i2 = 0, _iterator2 = _isArray2 ? _iterator2 : _iterator2[Symbol.iterator]();;) {
        var _ref2;

        if (_isArray2) {
            if (_i2 >= _iterator2.length) break;
            _ref2 = _iterator2[_i2++];
        } else {
            _i2 = _iterator2.next();
            if (_i2.done) break;
            _ref2 = _i2.value;
        }

        var w = _ref2;

        w.setState(data);
        w.paint(r);
    }
};
// ============================== 立即执行
})