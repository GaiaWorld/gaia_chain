_$define("pi/widget/widget", function (require, exports, module){
"use strict";
// 模块描述
/*
负责显示逻辑，是数据和原始dom间的桥梁
组件支持嵌套，并且tpl中的自定义元素支持相对路径。
组件名的规则：可以使用英文小写字母加'_'和''。 '-'表示路径分隔，'$'只能在最后，1个'$'表示本目录开始查找，N个'$'表示上溯N-1个父目录开始查找。如果没有'$'表示从根目录下开始查找
举例：
<role_show$ style=""></role_show$>表示本目录下的role_show组件，
<role_show$$ style=""> </role_show$$>表示父目录下的role_show组件，
<role_show-zb_show$$ style=""></role_show-zb_show$$>表示父目录下role_show目录下的zb_show组件
<app-base-btn style=""></app-base-btn>表示根目录开始，app/base目录下的btn组件
*/

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

Object.defineProperty(exports, "__esModule", { value: true });
var event_1 = require("../util/event");
var log_1 = require("../util/log");
var util_1 = require("../util/util");
var painter_1 = require("./painter");
// ============================== 导出
exports.level = log_1.logLevel;
/**
 * @description 组件
 * @example
 * 组件，包含样式和模板的js类,
 * 注意区分 widget实例和widget节点
 * widget节点的link属性指向了widget实例
 */

var Widget = function (_event_1$HandlerTable) {
    _inherits(Widget, _event_1$HandlerTable);

    function Widget() {
        _classCallCheck(this, Widget);

        // 必须要赋初值，不然new出来的实例里面是没有这些属性的
        var _this = _possibleConstructorReturn(this, (Widget.__proto__ || Object.getPrototypeOf(Widget)).apply(this, arguments));

        _this.name = null; // 组件的名称
        _this.tpl = null; // 组件的模板
        _this.sheet = null; // 组件的样式
        _this.config = null; // 所对应的配置
        _this.forelet = null; // 所对应的forelet
        _this.props = null; // 由父组件设置的组件属性
        _this.state = null; // 由forelet设置的组件状态
        _this.tree = null; // 组件所对应的节点树
        _this.parentNode = null; // 父节点，parentNode.link的对象就是widget
        _this.children = []; // 所有的子组件
        _this.inDomTree = false; // 是否在dom树中
        _this.resTab = null; // 资源表
        _this.resTimeout = 3000; // 资源缓冲时间，默认3秒
        _this.styleCache = new Map(); // 样式查询缓存
        return _this;
    }
    /**
     * @description 创建后调用，一般在渲染循环外调用
     * @example
     */


    _createClass(Widget, [{
        key: "create",
        value: function create() {
            this.forelet && this.forelet.addWidget(this);
        }
        /**
         * @description 第一次计算后调用，此时创建了真实的dom，但并没有加入到dom树上，一般在渲染循环外调用
         * @example
         */

    }, {
        key: "firstPaint",
        value: function firstPaint() {
            this.forelet && this.forelet.eventWidget(this, 'firstPaint');
        }
        /**
         * @description 销毁时调用，一般在渲染循环外调用
         * @example
         */

    }, {
        key: "destroy",
        value: function destroy() {
            if (!this.tpl) {
                return false;
            }
            this.tpl = undefined;
            if (this.resTab) {
                this.resTab.timeout = this.resTimeout;
                this.resTab.release();
            }
            this.forelet && this.forelet.removeWidget(this);
            return true;
        }
        /**
         * @description 添加到dom树后调用，在渲染循环内调用
         * @example
         */
        // tslint:disable:no-empty

    }, {
        key: "attach",
        value: function attach() {}
        /**
         * @description 更新到dom树前调用，一般在渲染循环外调用
         * @example
         */

    }, {
        key: "beforeUpdate",
        value: function beforeUpdate() {
            this.forelet && this.forelet.eventWidget(this, 'update');
        }
        /**
         * @description 更新到dom树后调用，在渲染循环内调用
         * @example
         */

    }, {
        key: "afterUpdate",
        value: function afterUpdate() {}
        /**
         * @description 从dom树上移除前调用，一般在渲染循环内调用
         * @example
         */

    }, {
        key: "detach",
        value: function detach() {}
        /**
         * @description 获得样式数据
         * @example
         */

    }, {
        key: "getSheet",
        value: function getSheet() {
            return this.sheet && this.sheet.value;
        }
        /**
         * @description 获得配置数据
         * @example
         */

    }, {
        key: "getConfig",
        value: function getConfig() {
            return this.config && this.config.value;
        }
        /**
         * @description 获得渲染数据
         * @example
         */

    }, {
        key: "getProps",
        value: function getProps() {
            return this.props;
        }
        /**
         * @description 设置属性，默认外部传入的props是完整的props，重载可改变行为
         * @example
         */

    }, {
        key: "setProps",
        value: function setProps(props, oldProps) {
            this.props = props;
        }
        /**
         * @description 更新属性，默认外部传入的props是更新命令，必须为Json对象，键的结构类似"a.b.c"，重载可改变行为
         * @example
         */

    }, {
        key: "updateProps",
        value: function updateProps(props, oldProps) {
            if (!props) {
                return;
            }
            for (var k in props) {
                util_1.setValue(this.props, k, props[k]);
            }
        }
        /**
         * @description 获得渲染数据
         * @example
         */

    }, {
        key: "getState",
        value: function getState() {
            return this.state;
        }
        /**
         * @description 设置状态
         * @example
         */

    }, {
        key: "setState",
        value: function setState(state) {
            this.state = state;
        }
        /**
         * @description 绘制方法，
         * @param reset表示新旧数据差异很大，不做差异计算，直接生成dom
         * @example
         */

    }, {
        key: "paint",
        value: function paint(reset) {
            painter_1.paintWidget(this, reset);
        }
    }]);

    return Widget;
}(event_1.HandlerTable);

exports.Widget = Widget;
/**
 * @description 注册组件
 * @example
 */
exports.register = function (name, widget, tpl, sheet, config, forelet) {
    var old = widgetMap.get(name);
    if (old) {
        log_1.warn(exports.level, 'widget already register, name:', name);
    }
    widget = widget || getWidget;
    widgetMap.set(name, { name: name, widget: widget, tpl: tpl, sheet: sheet, config: config, forelet: forelet });
    return old;
};
/**
 * @description 查询组件
 * @example
 */
exports.lookup = function (name) {
    return widgetMap.get(name);
};
/**
 * @description 列出所有的组件
 * @example
 */
exports.list = function () {
    return [].concat(_toConsumableArray(widgetMap.values()));
};
/**
 * @description 取消注册组件
 * @example
 */
exports.unregister = function (name) {
    return widgetMap.delete(name);
};
/**
 * @description 创建组件
 * @example
 */
exports.factory = function (name) {
    var creator = widgetMap.get(name);
    if (!creator) {
        return;
    }
    var c = creator.widget();
    var w = new c();
    w.name = name;
    if (creator.sheet) {
        w.sheet = creator.sheet;
    }
    if (creator.tpl) {
        w.tpl = creator.tpl;
    }
    if (creator.config) {
        w.config = creator.config;
    }
    if (creator.forelet) {
        w.forelet = creator.forelet();
    }
    w.create();
    return w;
};
/**
 * @description 计算相对组件路径
 * @example
 */
exports.relative = function (name, dir) {
    var j = void 0;
    var i = name.length - 1;
    if (name.charCodeAt(i) !== 36) {
        return name;
    }
    j = dir.length - 1;
    if (dir.charCodeAt(j) !== 47) {
        j = dir.lastIndexOf('-');
    }
    while (i >= 0) {
        if (name.charCodeAt(i - 1) !== 36) {
            break;
        }
        i--;
        j = dir.lastIndexOf('-', j - 1);
    }
    if (i < 0) {
        return '';
    }
    name = name.slice(0, i);
    if (j < 0) {
        return name;
    }
    if (j < dir.length - 1) {
        dir = dir.slice(0, j + 1);
    }
    return dir + name;
};
/**
 * @description 获取tpl、css和cfg缓冲
 * @example
 */
exports.getCache = function (file) {
    return cacheMap.get(file);
};
/**
 * @description 设置tpl、css和cfg缓冲
 * @example
 */
exports.setCache = function (file, data) {
    cacheMap.set(file, data);
};
/**
 * @description 清除tpl、css和cfg缓冲
 * @example
 */
exports.deleteCache = function (file) {
    cacheMap.delete(file);
};
// ============================== 本地
// 组件模板表
var widgetMap = new Map();
// tpl、css和cfg缓冲
var cacheMap = new Map();
// 获得默认组件
var getWidget = function getWidget() {
    return Widget;
};
// ============================== 立即执行
})