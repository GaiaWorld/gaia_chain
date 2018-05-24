_$define("pi/util/tpl_str", function (require, exports, module){
"use strict";
// 返回字符串的模板解析器

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

Object.defineProperty(exports, "__esModule", { value: true });
// ============================== 导入的模块、类、函数、常量
var tpl_1 = require("./tpl");
// ------------------------------ 导出的常量
// ------------------------------ 导出的多个类
/**
 * @description 返回字符串的模板解析器
 */

var Parser = function () {
    function Parser(version) {
        _classCallCheck(this, Parser);

        this.s1 = '_s1';
        this.tempVar = 1;
        this.varname; // String
        this.comment; // boolean
        this.arr = [];
        this.for1; // boolean
        this.for2; // boolean
        this.line; // int
        this.version = version || 'es5';
    }
    /**
     * @description 获得临时varname
     * @example
     */


    _createClass(Parser, [{
        key: "getTempVar",
        value: function getTempVar() {
            // tslint:disable:prefer-template
            return '_t' + this.tempVar++;
        }
        /**
         * @description 设置varname
         * @example
         */

    }, {
        key: "setVarname",
        value: function setVarname(s) {
            this.varname = s;
        }
        /**
         * @description 设置comment
         * @example
         */

    }, {
        key: "setComment",
        value: function setComment(b) {
            this.comment = b;
        }
        /**
         * @description 放入注释
         * @example
         */

    }, {
        key: "putComment",
        value: function putComment(s) {
            this.comment && this.arr.push('//' + s.replace(/[\r\t\n]/g, ' ') + '\n');
        }
        /**
         * @description 放入文本
         * @example
         */

    }, {
        key: "putText",
        value: function putText(s) {
            s = trimLine(s);
            s.length > 0 && this.arr.push(this.s1 + '+=\'' + escapeText(s) + '\';\n');
        }
        /**
         * @description 放入代码
         * @example
         */

    }, {
        key: "putCode",
        value: function putCode(s) {
            this.arr.push(s);
        }
        /**
         * @description 放入输出的变量
         * @example
         */

    }, {
        key: "putVar",
        value: function putVar(s) {
            this.arr.push(this.s1 + '+=' + tpl_1.stringifyName + '(' + s + ');\n');
        }
        /**
         * @description 使用了for1循环
         * @example
         */

    }, {
        key: "useFor1",
        value: function useFor1() {
            this.for1 = true;
        }
        /**
         * @description 使用了for2循环
         * @example
         */

    }, {
        key: "useFor2",
        value: function useFor2() {
            this.for2 = true;
        }
        /**
         * @description 返回函数字符串
         * @example
         */

    }, {
        key: "funString",
        value: function funString() {
            var s = 'function(' + this.varname + ') {\'use strict\';\n' +
            // let s = "("+this.varname+") => {'use strict';\n"+
            'var ' + this.s1 + ' = \'\';\n';
            var f1 = this.version === 'es6' ? tpl_1.es6FOR1 : tpl_1.FOR1;
            var f2 = this.version === 'es6' ? tpl_1.es6FOR2 : tpl_1.FOR2;
            return s + (this.for1 ? f1 : '') + (this.for2 ? f2 : '') + this.arr.join('') + '\nreturn ' + this.s1 + ';\n}';
        }
    }]);

    return Parser;
}();

exports.Parser = Parser;
// ------------------------------ 导出的静态函数
// ------------------------------ 导出的实例方法
// ============================== 本地常量
// ------------------------------ 本地类
// ------------------------------ 本地函数
/**
 * @description 处理文字
 * @example
 */
var escapeText = function escapeText(s) {
    return s.replace(/'|\\/g, '\\$&').replace(/\n/g, '\\n').replace(/\t/g, '\\t').replace(/\r/g, '\\r');
};
/**
 * @description 删除字符串首尾的空格直到换行符，如果没有遇到换行则字符串不修改
 * @example
 */
var trimLine = function trimLine(s) {
    var c = void 0;
    var i = 0;
    var j = s.length - 1;
    for (; i < j; i++) {
        c = s.charCodeAt(i);
        if (c > 32) {
            i = 0;
            break;
        }
        if (c === 10) break;
    }
    for (; j >= i; j--) {
        c = s.charCodeAt(j);
        if (c > 32) {
            j = s.length;
            break;
        }
        if (c === 10) break;
    }
    return s.substring(i, j);
};
// ============================== 立即执行的代码
})