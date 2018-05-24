_$define("pi/compile/scanner", function (require, exports, module){
"use strict";
/**
 * 词法分析（Lexical analysis或Scanning）和词法分析程序（Lexical analyzer或Scanner）
 */

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

Object.defineProperty(exports, "__esModule", { value: true });
// ============================== 导入
var ebnf_1 = require("./ebnf");
/**
 * @description 词法分析器
 */

var Scanner = function () {
    function Scanner() {
        _classCallCheck(this, Scanner);

        this.stateScanner = new Map();
        this.reader = null;
        this.index = 1;
        this.line = 1;
        this.column = 1;
        this.cur = null;
        this.last = [];
        this.lastIndex = 0;
        this.reset = false;
        this.ss = null;
        this.state = null;
        this.stateStack = [];
    }
    /**
     * @description 设置规则，可以指定规则所在的状态
     * @example
     */


    _createClass(Scanner, [{
        key: "setRule",
        value: function setRule(s, state) {
            state = state || '';
            var ss = this.stateScanner.get(state);
            if (!ss) {
                ss = new StateScanner();
                this.stateScanner.set(state, ss);
            }
            if (!this.ss) {
                this.state = state;
                this.ss = ss;
            }
            var reader = ebnf_1.createRuleReader(s);
            var r = reader();
            var arr = ss.rules;
            var map = ss.map;
            while (r) {
                build(r, arr, map);
                r = reader();
            }
            merge(arr, map);
        }
        /**
         * @description 初始化设置字符读取流
         * @example
         */

    }, {
        key: "initReader",
        value: function initReader(r, index, line, column, state) {
            this.reader = r;
            this.index = index || 1;
            this.line = line || 1;
            this.column = column || 1;
            if (!this.cur) {
                this.next();
            }
        }
        /**
         * @description 获取状态
         * @example
         */

    }, {
        key: "getState",
        value: function getState() {
            return this.state;
        }
        /**
         * @description 获取状态堆栈的深度
         * @example
         */

    }, {
        key: "stateDeep",
        value: function stateDeep() {
            return this.stateStack.length;
        }
        /**
         * @description 设置状态
         * @example
         */

    }, {
        key: "setState",
        value: function setState(s) {
            this.stateStack.push(this.state);
            this.state = s;
            this.ss = this.stateScanner.get(s);
        }
        /**
         * @description 回退状态
         * @example
         */

    }, {
        key: "backState",
        value: function backState() {
            if (!this.stateStack.length) {
                return null;
            }
            this.state = this.stateStack.pop();
            this.ss = this.stateScanner.get(this.state);
            return this.state;
        }
        /**
         * @description 读取下一个字符
         * @example
         */

    }, {
        key: "next",
        value: function next() {
            if (this.lastIndex >= this.last.length) {
                this.cur = this.reader();
                this.lastIndex++;
                this.last.push({ char: this.cur, index: this.index, line: this.line, column: this.column });
                this.index++;
                if (this.cur === '\n') {
                    this.line++;
                    this.column = 1;
                } else {
                    this.column++;
                }
            } else {
                var t = this.last[this.lastIndex++];
                this.cur = t.char;
            }
            return this;
        }
        /**
         * @description 刷新，并返回前面匹配成功的字符串
         * @example
         */

    }, {
        key: "flush",
        value: function flush(ignore) {
            var s = '';
            var index = this.lastIndex - 1;
            if (!ignore) {
                for (var i = 0; i < index; i++) {
                    s += this.last[i].char;
                }
            }
            this.last = this.last.slice(index);
            this.lastIndex = 1;
            return s;
        }
        /**
         * @description 回退记号
         * @example
         */

    }, {
        key: "reback",
        value: function reback(arr) {
            if (!arr.length) {
                return;
            }
            var cc = [];
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

                var t = _ref;

                var i = t.index;
                var line = t.line;
                var column = t.column;
                for (var _iterator2 = t.value, _isArray2 = Array.isArray(_iterator2), _i2 = 0, _iterator2 = _isArray2 ? _iterator2 : _iterator2[Symbol.iterator]();;) {
                    var _ref2;

                    if (_isArray2) {
                        if (_i2 >= _iterator2.length) break;
                        _ref2 = _iterator2[_i2++];
                    } else {
                        _i2 = _iterator2.next();
                        if (_i2.done) break;
                        _ref2 = _i2.value;
                    }

                    var c = _ref2;

                    cc.push({ char: c, index: i++, line: line, column: column });
                    if (c === '\n') {
                        line++;
                        column = 0;
                    } else {
                        column++;
                    }
                }
            }
            this.last = cc.concat(this.last);
            this.lastIndex = 1;
            this.cur = this.last[0].char;
        }
        /**
         * @description 设置当前的字符及位置
         * @example
         */

    }, {
        key: "setCur",
        value: function setCur(lastIndex) {
            if (lastIndex === this.lastIndex) {
                return;
            }
            var t = this.last[lastIndex - 1];
            this.cur = t.char;
            this.lastIndex = lastIndex;
            this.reset = true;
        }
        /**
         * @description 获得记号，返回undefined 表示结束
         * @example
         */

    }, {
        key: "scan",
        value: function scan(t) {
            return stateScan(this, this.ss, t);
        }
    }]);

    return Scanner;
}();

exports.Scanner = Scanner;
/**
 * @description 词法规则
 */

var LexRule = function LexRule() {
    _classCallCheck(this, LexRule);

    this.rule = null;
    this.match = null;
    this.nameType = false;
};
/**
 * @description 指定状态的词法扫描器
 */


var StateScanner = function StateScanner() {
    _classCallCheck(this, StateScanner);

    this.rules = [];
    this.map = new Map();
    this.firstCharMap = new Map();
};
// 状态扫描


var stateScan = function stateScan(s, ss, t) {
    if (!s.cur) {
        return false;
    }
    // 匹配
    var type = void 0;
    var rule = void 0;
    // 检查该字符对应的匹配列表
    var mr = ss.firstCharMap.get(s.cur);
    if (!mr) {
        mr = { ok: [], unknown: ss.rules.concat() };
        ss.firstCharMap.set(s.cur, mr);
    }
    // 先匹配ok列表
    for (var arr = mr.ok, i = 0, len = arr.length; i < len; i++) {
        rule = arr[i];
        if (rule.match(s)) {
            type = rule.rule.name;
            break;
        }
    }
    if (!type) {
        // ok列表没有匹配上，则继续匹配unknown列表
        var _arr = mr.unknown;
        var _i3 = 0;
        var _len = _arr.length;
        s.reset = false;
        for (; _i3 < _len; _i3++) {
            rule = _arr[_i3];
            if (rule.match(s)) {
                type = rule.rule.name;
                break;
            }
            // 将匹配时有更多读取的规则，放入到ok规则中
            if (s.reset) {
                mr.ok.push(rule);
            } else {
                s.reset = false;
            }
        }
        mr.unknown = _arr.slice(_i3 + 1);
        if (!type) {
            return false;
        }
        mr.ok.push(rule);
    }
    t.index = s.last[0].index;
    t.line = s.last[0].line;
    t.column = s.last[0].column;
    var v = s.flush(rule.nameType);
    if (rule.nameType) {
        v = type;
    }
    t.type = type;
    t.value = v;
    return true;
};
// 构建词法规则
var build = function build(rule, arr, map) {
    var r = new LexRule();
    r.rule = rule;
    r.match = makeRuleEntry(rule.entry, map);
    if (rule.entry.type === 'terminal' && rule.name === rule.entry.value || rule.entry.type === 'and' && rule.name === getAndTerminalValue(rule.entry.childs)) {
        r.nameType = true;
    }
    arr.push(r);
    map.set(rule.name, r);
};
// 创建词法规则函数
var makeRuleEntry = function makeRuleEntry(re, map) {
    var func = ruleTab[re.type];
    if (!func) {
        throw new Error("scanner, make rule fail, invalid name: " + re.type);
    }
    return func(re, map);
};
// 构建与规则中终结符的值
var getAndTerminalValue = function getAndTerminalValue(arr) {
    for (var _iterator3 = arr, _isArray3 = Array.isArray(_iterator3), _i4 = 0, _iterator3 = _isArray3 ? _iterator3 : _iterator3[Symbol.iterator]();;) {
        var _ref3;

        if (_isArray3) {
            if (_i4 >= _iterator3.length) break;
            _ref3 = _iterator3[_i4++];
        } else {
            _i4 = _iterator3.next();
            if (_i4.done) break;
            _ref3 = _i4.value;
        }

        var e = _ref3;

        if (e.type === 'terminal') {
            return e.value;
        }
    }
};
// 创建词法规则函数数组
var makeMatchs = function makeMatchs(arr, map) {
    var matchs = [];
    for (var _iterator4 = arr, _isArray4 = Array.isArray(_iterator4), _i5 = 0, _iterator4 = _isArray4 ? _iterator4 : _iterator4[Symbol.iterator]();;) {
        var _ref4;

        if (_isArray4) {
            if (_i5 >= _iterator4.length) break;
            _ref4 = _iterator4[_i5++];
        } else {
            _i5 = _iterator4.next();
            if (_i5.done) break;
            _ref4 = _i5.value;
        }

        var r = _ref4;

        var func = makeRuleEntry(r, map);
        if (!func) {
            return;
        }
        matchs.push(func);
    }
    return matchs;
};
// 联合词法规则
var merge = function merge(arr, map) {
    var oldlen = void 0;
    var len = 0;
    var name = void 0;
    do {
        oldlen = len;
        len = 0;
        for (var _iterator5 = arr, _isArray5 = Array.isArray(_iterator5), _i6 = 0, _iterator5 = _isArray5 ? _iterator5 : _iterator5[Symbol.iterator]();;) {
            var _ref5;

            if (_isArray5) {
                if (_i6 >= _iterator5.length) break;
                _ref5 = _iterator5[_i6++];
            } else {
                _i6 = _iterator5.next();
                if (_i6.done) break;
                _ref5 = _i6.value;
            }

            var r = _ref5;

            if (!r.match) {
                r.match = makeRuleEntry(r.rule.entry, map);
                if (!r.match) {
                    name = r.rule.name;
                    continue;
                }
            }
            len++;
        }
    } while (len > oldlen && len < arr.length);
    if (len < arr.length) {
        throw new Error("scanner, rule merge fail, name: " + name);
    }
};
// 词法规则函数表
var ruleTab = {
    series: function series(re, map) {
        var arr = makeMatchs(re.childs, map);
        if (!arr) {
            return;
        }
        return function (s) {
            var sss = re.str;
            var i = s.lastIndex;
            for (var _iterator6 = arr, _isArray6 = Array.isArray(_iterator6), _i7 = 0, _iterator6 = _isArray6 ? _iterator6 : _iterator6[Symbol.iterator]();;) {
                var _ref6;

                if (_isArray6) {
                    if (_i7 >= _iterator6.length) break;
                    _ref6 = _iterator6[_i7++];
                } else {
                    _i7 = _iterator6.next();
                    if (_i7.done) break;
                    _ref6 = _i7.value;
                }

                var func = _ref6;

                var r = func(s);
                if (!r) {
                    s.setCur(i);
                    return false;
                }
            }
            return true;
        };
    },
    and: function and(re, map) {
        var arr = makeMatchs(re.childs, map);
        if (!arr) {
            return;
        }
        return function (s) {
            var sss = re.str;
            var i = s.lastIndex;
            var r = arr[0](s);
            if (!r) {
                return false;
            }
            var old = s.lastIndex > i ? s.lastIndex : -1;
            for (var j = 1, len = arr.length; j < len; j++) {
                s.setCur(i);
                var _r = arr[j](s);
                if (!_r) {
                    return false;
                }
                if (s.lastIndex === i) {
                    continue;
                }
                if (old >= 0) {
                    if (old !== s.lastIndex) {
                        s.setCur(i);
                        return false;
                    }
                } else {
                    old = s.lastIndex;
                }
            }
            return true;
        };
    },
    or: function or(re, map) {
        var arr = makeMatchs(re.childs, map);
        if (!arr) {
            return;
        }
        return function (s) {
            var sss = re.str;
            for (var _iterator7 = arr, _isArray7 = Array.isArray(_iterator7), _i8 = 0, _iterator7 = _isArray7 ? _iterator7 : _iterator7[Symbol.iterator]();;) {
                var _ref7;

                if (_isArray7) {
                    if (_i8 >= _iterator7.length) break;
                    _ref7 = _iterator7[_i8++];
                } else {
                    _i8 = _iterator7.next();
                    if (_i8.done) break;
                    _ref7 = _i8.value;
                }

                var func = _ref7;

                if (func(s)) {
                    return true;
                }
            }
            return false;
        };
    },
    not: function not(re, map) {
        var func = makeRuleEntry(re.child, map);
        if (!func) {
            return;
        }
        return function (s) {
            var sss = re.str;
            var i = s.lastIndex;
            var r = func(s);
            if (r) {
                s.setCur(i);
                return false;
            }
            return true;
        };
    },
    terminal: function terminal(re, map) {
        var str = re.value;
        return function (s) {
            var sss = re.str;
            var i = s.lastIndex;
            var x = 0;
            var c = str[x++];
            while (c) {
                if (s.cur !== c) {
                    s.setCur(i);
                    return false;
                }
                s.next();
                c = str[x++];
            }
            return true;
        };
    },
    name: function name(re, map) {
        var r = map.get(re.value);
        if (!r) {
            return;
        }
        return r.match;
    },
    optional: function optional(re, map) {
        var func = makeRuleEntry(re.child, map);
        if (!func) {
            return;
        }
        return function (s) {
            var sss = re.str;
            func(s);
            return true;
        };
    },
    repeat: function repeat(re, map) {
        var func = makeRuleEntry(re.child, map);
        if (!func) {
            return;
        }
        return function (s) {
            var sss = re.str;
            var i = s.lastIndex;
            var r = func(s);
            if (!r) {
                return false;
            }
            while (r) {
                if (s.lastIndex === i) {
                    throw new Error("scanner, repeat fail, endless loop: " + re.value + ", line: " + s.line + ", column: " + s.column);
                }
                r = func(s);
            }
            return true;
        };
    },
    builtIn: function builtIn(re, map) {
        var func = ebnf_1.builtIn[re.value];
        if (!func) {
            throw new Error("scanner, make rule fail, invalid builtIn: " + re.value);
        }
        return function (s) {
            var sss = re.str;
            var r = func(s.cur);
            if (r) {
                s.next();
            }
            return r;
        };
    }
};
// ============================== 立即执行
})