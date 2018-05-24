_$define("pi/compile/parser", function (require, exports, module){
"use strict";
/**
 * 语法分析（Syntax analysis或Parsing）和语法分析程序（Parser）
 * 支持左结合的递归语法，
 * 语法解析器，创建抽象语法树
 * 需要设置操作符配置表，描述所有能直接读取的操作符号及这些操作符的优先级和处理函数
 * http://www.cnblogs.com/rubylouvre/archive/2012/09/08/2657682.html
 */

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

Object.defineProperty(exports, "__esModule", { value: true });
// ============================== 导入
var ebnf_1 = require("./ebnf");
// ============================== 导出
/**
 * @description 语法节点
 */

var Syntax = function Syntax() {
    _classCallCheck(this, Syntax);

    /* tslint:disable:no-reserved-keywords */
    this.type = null;
    this.value = null;
    this.left = null;
    this.right = null;
    this.token = null;
    this.preNotes = null;
    this.sufNotes = null;
    this.parent = null;
};

exports.Syntax = Syntax;
/**
 * @description 记号
 */

var RuleToken = function RuleToken() {
    _classCallCheck(this, RuleToken);

    this.type = null;
    this.value = null;
    this.index = 0;
    this.line = 0;
    this.column = 0;
    this.rule = null;
    this.parent = null;
    this.loc = 0;
};

exports.RuleToken = RuleToken;
/**
 * @description 语法分析器
 */

var Parser = function () {
    function Parser() {
        _classCallCheck(this, Parser);

        this.scanner = null;
        this.tokenMap = new Map();
        this.syntaxMap = new Map();
        this.defaultRule = new TokenRule();
        this.cur = null;
        this.last = [];
        this.lastIndex = 0;
        this.lastMatch = new RuleToken();
    }
    /**
     * @description 设置规则及优先级
     * @example
     */


    _createClass(Parser, [{
        key: "setRule",
        value: function setRule(s, cfgs) {
            var reader = ebnf_1.createRuleReader(s);
            var r = reader();
            while (r) {
                buildSyntax(r, this.syntaxMap);
                r = reader();
            }
            merge(this.syntaxMap);
            for (var _iterator = cfgs, _isArray = Array.isArray(_iterator), _i = 0, _iterator = _isArray ? _iterator : _iterator[Symbol.iterator]();;) {
                var _ref;

                if (_isArray) {
                    if (_i >= _iterator.length) break;
                    _ref = _iterator[_i++];
                } else {
                    _i = _iterator.next();
                    if (_i.done) break;
                    _ref = _i.value;
                }

                var cfg = _ref;

                buildCfg(cfg, this.tokenMap, this.syntaxMap);
            }
            for (var _iterator2 = this.tokenMap.values(), _isArray2 = Array.isArray(_iterator2), _i2 = 0, _iterator2 = _isArray2 ? _iterator2 : _iterator2[Symbol.iterator]();;) {
                var _ref2;

                if (_isArray2) {
                    if (_i2 >= _iterator2.length) break;
                    _ref2 = _iterator2[_i2++];
                } else {
                    _i2 = _iterator2.next();
                    if (_i2.done) break;
                    _ref2 = _i2.value;
                }

                var token = _ref2;

                buildNext(token);
            }
        }
        /**
         * @description 初始化设置语法扫描器
         * @example
         */

    }, {
        key: "initScanner",
        value: function initScanner(s) {
            this.scanner = s;
            this.cur = null;
            this.last.length = 0;
            this.lastIndex = 0;
            this.next();
        }
        /**
         * @description 读取下一个记号
         * @example
         */

    }, {
        key: "next",
        value: function next() {
            do {
                if (this.lastIndex >= this.last.length) {
                    var t = new RuleToken();
                    if (this.scanner.scan(t)) {
                        t.rule = this.tokenMap.get(t.type);
                        if (!t.rule) {
                            t.rule = this.defaultRule;
                        }
                        t.loc = this.last.length;
                        this.lastIndex++;
                        this.last.push(t);
                        this.cur = t;
                        if (t.index > this.lastMatch.index) {
                            this.lastMatch = t;
                        }
                    } else {
                        this.cur = null;
                    }
                } else {
                    this.cur = this.last[this.lastIndex++];
                }
                if (!this.cur) {
                    return this;
                }
            } while (this.cur.rule.ignore || this.cur.rule.note);
            return this;
        }
        /**
         * @description 刷新
         * @example
         */

    }, {
        key: "flush",
        value: function flush() {
            this.last = this.last.slice(this.lastIndex - 1);
            this.lastIndex = 1;
        }
        /**
         * @description 设置当前的字符及位置
         * @example
         */

    }, {
        key: "setCur",
        value: function setCur(lastIndex, lastDeep) {
            if (lastIndex === this.lastIndex) {
                return;
            }
            var reback = false;
            while (lastDeep < this.scanner.stateDeep()) {
                this.scanner.backState();
                reback = true;
            }
            // 将多读取的token，推回到scanner
            if (reback) {
                this.scanner.reback(this.last.slice(lastIndex));
                this.last.length = lastIndex;
            }
            this.cur = this.last[lastIndex - 1];
            this.lastIndex = lastIndex;
        }
        /**
         * @description 解析表达式，返回一个表达式的抽象语法树，返回null表示该表达式是null，返回undefined表示结束
         * @example
         */

    }, {
        key: "parseExpr",
        value: function parseExpr() {
            if (!this.cur) {
                return;
            }
            var s = expression(this, 0);
            this.belongNote();
            this.flush();
            return s;
        }
        /**
         * @description 解析规则，可以","分隔多个规则名，返回一个规则的抽象语法树，返回null表示该表达式是null，返回undefined表示结束
         * @example
         */

    }, {
        key: "parseRule",
        value: function parseRule(rules) {
            if (!this.cur) {
                return;
            }
            var arr = rules.split(',');
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

                var rule = _ref3;

                var rr = this.syntaxMap.get(rule.trim());
                if (!rr) {
                    throw new Error("parser, parseRule fail, invalid rule: " + rule);
                }
                var s = new Syntax();
                s.type = rr.rule.name;
                s.right = [];
                s.token = this.cur;
                this.cur && (this.cur.parent = s);
                var b = rr.match(this, s);
                if (!b) {
                    continue;
                }
                this.belongNote();
                this.flush();
                return s;
            }
            return null;
        }
        /**
         * @description 计算注解和注释的归属
         * @example
         */

    }, {
        key: "belongNote",
        value: function belongNote() {
            for (var _iterator4 = this.last, _isArray4 = Array.isArray(_iterator4), _i4 = 0, _iterator4 = _isArray4 ? _iterator4 : _iterator4[Symbol.iterator]();;) {
                var _ref4;

                if (_isArray4) {
                    if (_i4 >= _iterator4.length) break;
                    _ref4 = _iterator4[_i4++];
                } else {
                    _i4 = _iterator4.next();
                    if (_i4.done) break;
                    _ref4 = _i4.value;
                }

                var r = _ref4;

                if (r.rule.note) {
                    addNote(this.last, r);
                }
            }
        }
    }]);

    return Parser;
}();

exports.Parser = Parser;
/**
 * @description 内建的表达式函数
 */
exports.builtIn = {
    expr: function expr(p) {
        return expression(p, 0);
    },
    all: function all(p) {
        if (!p.cur) {
            return null;
        }
        var s = itself(p, p.cur);
        p.next();
        return s;
    }
};
// ============================== 本地
/**
 * @description 词法规则的配置
 */
/* tslint:disable:max-classes-per-file */

var TokenRule = function TokenRule() {
    _classCallCheck(this, TokenRule);

    this.type = null; // 类型，和词法单元类型要相同
    this.lbp = 0; // 左结合优先级，越大越优先，默认为0，表示右结合
    this.rbp = 0; // 右结合优先级，越大越优先，默认为左结合优先级
    this.nud = itself; // 空指称函数，向右及自身结合，常用于值（例如变量和直接量）以及前缀操作符
    this.led = error; // 左指称函数，向左结合，常用于中缀和后缀运算符
    this.ignore = false;
};
/**
 * @description 语法规则
 */


var SyntaxRule = function SyntaxRule() {
    _classCallCheck(this, SyntaxRule);

    this.rule = null;
    this.match = null;
};
// 构建语法规则


var buildSyntax = function buildSyntax(rule, map) {
    var r = new SyntaxRule();
    r.rule = rule;
    r.match = makeRuleEntry(r, r.rule.entry, map);
    map.set(rule.name, r);
};
// 联合语法规则
var merge = function merge(map) {
    var oldlen = void 0;
    var len = 0;
    var size = map.size;
    var name = void 0;
    do {
        oldlen = len;
        len = 0;
        for (var _iterator5 = map.values(), _isArray5 = Array.isArray(_iterator5), _i5 = 0, _iterator5 = _isArray5 ? _iterator5 : _iterator5[Symbol.iterator]();;) {
            var _ref5;

            if (_isArray5) {
                if (_i5 >= _iterator5.length) break;
                _ref5 = _iterator5[_i5++];
            } else {
                _i5 = _iterator5.next();
                if (_i5.done) break;
                _ref5 = _i5.value;
            }

            var r = _ref5;

            if (!r.match) {
                r.match = makeRuleEntry(r, r.rule.entry, map);
                if (!r.match) {
                    name = r.rule.name;
                    continue;
                }
            }
            len++;
        }
    } while (len > oldlen && len < size);
    if (len < size) {
        throw new Error("parser, rule merge fail, name: " + name);
    }
};
// 构建词法规则
var buildCfg = function buildCfg(cfg, map, syntaxMap) {
    var r = map.get(cfg.type);
    if (!r) {
        r = new TokenRule();
        r.type = cfg.type;
    }
    if (cfg.lbp) {
        r.lbp = cfg.lbp;
    }
    if (cfg.rbp) {
        r.rbp = cfg.rbp;
    }
    if (cfg.suf) {
        r.suf = cfg.suf;
    }
    if (cfg.ignore) {
        r.ignore = cfg.ignore;
    }
    if (cfg.note) {
        r.note = cfg.note;
    }
    if (cfg.nud) {
        var func = getNuds(cfg.nud, syntaxMap);
        r.nud = function (p, token) {
            var s = func(p, token);
            if (s) {
                return s;
            }
            throw new Error("SyntaxError, type: " + cfg.type + ", nud: " + cfg.nud + ", token: " + token.value + ", line: " + token.line + ", column: " + token.column);
        };
    }
    if (cfg.led) {
        var _func = getLeds(cfg.led, syntaxMap);
        r.led = function (p, token, left) {
            var s = _func(p, token, left);
            if (s) {
                return s;
            }
            throw new Error("SyntaxError, type: " + cfg.type + ", led: " + cfg.led + ", token: " + token.value + ", line: " + token.line + ", column: " + token.column);
        };
    }
    map.set(r.type, r);
};
// 获得ebnf定义的nud函数
var getNud = function getNud(rr) {
    return function (p, token) {
        var s = new Syntax();
        s.type = rr.rule.name;
        s.right = [];
        s.token = token;
        token.parent = s;
        return rr.match(p, s) ? s : null;
    };
};
// 获得ebnf定义的led函数
var getLed = function getLed(rr) {
    return function (p, token, left) {
        var s = new Syntax();
        s.type = rr.rule.name;
        s.left = left;
        left.parent = s;
        s.right = [];
        s.token = token;
        token.parent = s;
        return rr.match(p, s) ? s : null;
    };
};
// 获得ebnf定义的nud函数
var getNuds = function getNuds(s, syntaxMap) {
    var arr = makeRuleArray(s, syntaxMap, getNud);
    return arr.length > 1 ? function (p, token) {
        for (var _iterator6 = arr, _isArray6 = Array.isArray(_iterator6), _i6 = 0, _iterator6 = _isArray6 ? _iterator6 : _iterator6[Symbol.iterator]();;) {
            var _ref6;

            if (_isArray6) {
                if (_i6 >= _iterator6.length) break;
                _ref6 = _iterator6[_i6++];
            } else {
                _i6 = _iterator6.next();
                if (_i6.done) break;
                _ref6 = _i6.value;
            }

            var f = _ref6;

            var str = f(p, token);
            if (str) {
                return str;
            }
        }
        return null;
    } : arr[0];
};
// 获得ebnf定义的led函数
var getLeds = function getLeds(s, syntaxMap) {
    var arr = makeRuleArray(s, syntaxMap, getLed);
    return arr.length > 1 ? function (p, token, left) {
        for (var _iterator7 = arr, _isArray7 = Array.isArray(_iterator7), _i7 = 0, _iterator7 = _isArray7 ? _iterator7 : _iterator7[Symbol.iterator]();;) {
            var _ref7;

            if (_isArray7) {
                if (_i7 >= _iterator7.length) break;
                _ref7 = _iterator7[_i7++];
            } else {
                _i7 = _iterator7.next();
                if (_i7.done) break;
                _ref7 = _i7.value;
            }

            var f = _ref7;

            var str = f(p, token, left);
            if (str) {
                return str;
            }
        }
        return null;
    } : arr[0];
};
// 创建规则数组
var makeRuleArray = function makeRuleArray(s, syntaxMap, func) {
    var ss = s.split(',');
    var arr = [];
    for (var _iterator8 = ss, _isArray8 = Array.isArray(_iterator8), _i8 = 0, _iterator8 = _isArray8 ? _iterator8 : _iterator8[Symbol.iterator]();;) {
        var _ref8;

        if (_isArray8) {
            if (_i8 >= _iterator8.length) break;
            _ref8 = _iterator8[_i8++];
        } else {
            _i8 = _iterator8.next();
            if (_i8.done) break;
            _ref8 = _i8.value;
        }

        var _s = _ref8;

        _s = _s.trim();
        var rr = syntaxMap.get(_s);
        if (!rr) {
            throw new Error("parser, makeRuleArray fail, invalid name: " + _s);
        }
        arr.push(func(rr));
    }
    return arr;
};
// 构建词法规则
var buildNext = function buildNext(r) {
    r.lbp = r.lbp || 0;
    r.rbp = r.rbp || r.lbp || 0;
    if (r.nud === itself && r.rbp !== 0) {
        r.nud = r.rbp > 0 ? prefix : null;
    }
    if (r.led === error && r.lbp) {
        r.led = r.suf ? suffix : infix;
    }
};
/**
 * @description 内置的表达式函数
 */
var expression = function expression(p, rbp) {
    var t = p.cur;
    if (!t) {
        return null;
    }
    var r = t.rule;
    if (!r.nud) {
        return null;
    }
    p.next();
    var left = r.nud(p, t);
    /* tslint:disable:no-conditional-assignment */
    while ((t = p.cur) && rbp < t.rule.lbp) {
        p.next();
        left = t.rule.led(p, t, left);
    }
    return left;
};
// 返回自身token的符号
var itself = function itself(p, token) {
    var s = new Syntax();
    s.type = token.rule.type || token.type;
    s.value = token.value;
    s.token = token;
    token.parent = s;
    return s;
};
// 抛出错误
var error = function error(p, token) {
    throw new Error("invalid token: " + token.value + ", line: " + token.line + ", column: " + token.column);
};
// 返回 前缀符号解析函数
var prefix = function prefix(p, token) {
    var s = new Syntax();
    s.type = token.rule.type;
    s.right = [expression(p, token.rule.rbp)];
    s.right[0].parent = s;
    s.token = token;
    token.parent = s;
    return s;
};
// 返回 中缀符号解析函数
var infix = function infix(p, token, left) {
    var s = new Syntax();
    s.type = token.rule.type;
    s.left = left;
    left.parent = s;
    s.right = [expression(p, token.rule.rbp)];
    s.right[0].parent = s;
    s.token = token;
    token.parent = s;
    return s;
};
// 返回 后缀符号解析函数
var suffix = function suffix(p, token, left) {
    var s = new Syntax();
    s.type = token.rule.type;
    s.left = left;
    left.parent = s;
    s.token = token;
    token.parent = s;
    return s;
};
// 创建语法规则函数
var makeRuleEntry = function makeRuleEntry(r, re, map) {
    var func = ruleTab[re.type];
    if (!func) {
        throw new Error("parser, make rule fail, invalid name: " + re.type);
    }
    return func(r, re, map);
};
// 创建语法规则函数数组
var makeMatchs = function makeMatchs(r, arr, map) {
    var matchs = [];
    for (var _iterator9 = arr, _isArray9 = Array.isArray(_iterator9), _i9 = 0, _iterator9 = _isArray9 ? _iterator9 : _iterator9[Symbol.iterator]();;) {
        var _ref9;

        if (_isArray9) {
            if (_i9 >= _iterator9.length) break;
            _ref9 = _iterator9[_i9++];
        } else {
            _i9 = _iterator9.next();
            if (_i9.done) break;
            _ref9 = _i9.value;
        }

        var rr = _ref9;

        var func = makeRuleEntry(r, rr, map);
        if (!func) {
            return;
        }
        matchs.push(func);
    }
    return matchs;
};
// 检查是否进行状态转换
var checkOption = function checkOption(p, option, backCur) {
    if (!option) {
        return false;
    }
    if (option.back || option.state) {
        // 将当前的token，推回到scanner
        if (backCur) {
            p.lastIndex--;
        }
        // 将还未读取的token，推回到scanner
        if (p.lastIndex < p.last.length) {
            p.scanner.reback(p.last.slice(p.lastIndex));
            p.last.length = p.lastIndex;
        }
        if (option.back) {
            for (var i = option.back; i > 0; i--) {
                p.scanner.backState();
            }
        } else if (option.state) {
            p.scanner.setState(option.state);
        }
        // 读出当前的token
        if (backCur) {
            p.next();
        }
    }
    return option.ignore;
};
// 添加注释和注解
var addNote = function addNote(last, note) {
    var s = void 0;
    var r = void 0;
    if (note.rule.note < 0) {
        // 向前注释
        for (var i = note.loc - 1; i >= 0; i--) {
            r = last[i];
            if (r.rule.note || r.rule.ignore) {
                continue;
            }
            s = r.parent;
            if (!s.right) {
                s = s.parent;
            }
            s.preNotes = s.preNotes || [];
            s.preNotes.push(note);
            break;
        }
    } else {
        // 向后注释
        for (var _i10 = note.loc + 1, n = last.length; _i10 < n; _i10++) {
            r = last[_i10];
            if (r.rule.note || r.rule.ignore) {
                continue;
            }
            s = r.parent;
            if (!s.right) {
                s = s.parent;
            }
            s.sufNotes = s.sufNotes || [];
            s.sufNotes.push(note);
            break;
        }
    }
};
// 词法规则函数表
var ruleTab = {
    series: function series(r, re, map) {
        var arr = makeMatchs(r, re.childs, map);
        if (!arr) {
            return;
        }
        return function (p, s) {
            var sss = re.str;
            var i = p.lastIndex;
            var deep = p.scanner.stateDeep();
            var c = s.right.length;
            for (var _iterator10 = arr, _isArray10 = Array.isArray(_iterator10), _i11 = 0, _iterator10 = _isArray10 ? _iterator10 : _iterator10[Symbol.iterator]();;) {
                var _ref10;

                if (_isArray10) {
                    if (_i11 >= _iterator10.length) break;
                    _ref10 = _iterator10[_i11++];
                } else {
                    _i11 = _iterator10.next();
                    if (_i11.done) break;
                    _ref10 = _i11.value;
                }

                var func = _ref10;

                var _r = func(p, s);
                if (!_r) {
                    p.setCur(i, deep);
                    s.right.length = c;
                    return false;
                }
            }
            return true;
        };
    },
    and: function and(r, re, map) {
        var arr = makeMatchs(r, re.childs, map);
        if (!arr) {
            return;
        }
        return function (p, s) {
            var sss = re.str;
            var i = p.lastIndex;
            var deep = p.scanner.stateDeep();
            var c = s.right.length;
            var r = arr[0](p, s);
            if (!r) {
                return false;
            }
            var old = p.lastIndex > i ? p.lastIndex : -1;
            for (var j = 1, len = arr.length; j < len; j++) {
                p.setCur(i, deep);
                s.right.length = c;
                var _r2 = arr[j](p, s);
                if (!_r2) {
                    return false;
                }
                if (i === p.lastIndex) {
                    continue;
                }
                if (old >= 0) {
                    if (old !== p.lastIndex) {
                        p.setCur(i, deep);
                        s.right.length = c;
                        return false;
                    }
                } else {
                    old = p.lastIndex;
                }
            }
            return true;
        };
    },
    or: function or(r, re, map) {
        var arr = makeMatchs(r, re.childs, map);
        if (!arr) {
            return;
        }
        return function (p, s) {
            var sss = re.str;
            for (var _iterator11 = arr, _isArray11 = Array.isArray(_iterator11), _i12 = 0, _iterator11 = _isArray11 ? _iterator11 : _iterator11[Symbol.iterator]();;) {
                var _ref11;

                if (_isArray11) {
                    if (_i12 >= _iterator11.length) break;
                    _ref11 = _iterator11[_i12++];
                } else {
                    _i12 = _iterator11.next();
                    if (_i12.done) break;
                    _ref11 = _i12.value;
                }

                var func = _ref11;

                if (func(p, s)) {
                    return true;
                }
            }
            return false;
        };
    },
    not: function not(r, re, map) {
        var func = makeRuleEntry(r, re.child, map);
        if (!func) {
            return;
        }
        return function (p, s) {
            var sss = re.str;
            return !func(p, s);
        };
    },
    terminal: function terminal(r, re, map) {
        var str = re.value;
        return function (p, s) {
            var sss = re.str;
            if (!p.cur || p.cur.type !== str) {
                return false;
            }
            if (!checkOption(p, re.option, false)) {
                var ss = itself(p, p.cur);
                s.right.push(ss);
                ss.parent = s;
            } else {
                p.cur.parent = s;
            }
            p.next();
            return true;
        };
    },
    name: function name(r, re, map) {
        var rule = map.get(re.value);
        if (!rule) {
            return;
        }
        return function (p, s) {
            var sss = re.str;
            var ss = new Syntax();
            ss.type = re.value;
            ss.right = [];
            ss.token = p.cur;
            p.cur && (p.cur.parent = s);
            var r = rule.match(p, ss);
            if (!r) {
                return false;
            }
            if (!checkOption(p, re.option, true)) {
                s.right.push(ss);
                ss.parent = s;
            }
            return true;
        };
    },
    optional: function optional(r, re, map) {
        var func = makeRuleEntry(r, re.child, map);
        if (!func) {
            return;
        }
        return function (p, s) {
            var sss = re.str;
            func(p, s);
            return true;
        };
    },
    repeat: function repeat(r, re, map) {
        var func = makeRuleEntry(r, re.child, map);
        if (!func) {
            return;
        }
        return function (p, s) {
            var sss = re.str;
            var r = func(p, s);
            if (!r) {
                return false;
            }
            while (r) {
                r = func(p, s);
            }
            return true;
        };
    },
    builtIn: function builtIn(r, re, map) {
        var func = exports.builtIn[re.value];
        if (!func) {
            throw new Error("scanner, make rule fail, invalid builtIn: " + re.value);
        }
        return function (p, s) {
            var ss = func(p);
            if (!ss) {
                return false;
            }
            if (re.option !== '') {
                s.right.push(ss);
                ss.parent = s;
            }
            return true;
        };
    }
};
// ============================== 立即执行
})