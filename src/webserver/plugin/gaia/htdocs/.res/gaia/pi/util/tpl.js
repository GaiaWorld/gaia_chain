_$define("pi/util/tpl", function (require, exports, module){
"use strict";
// 模板
/**
 *
 */

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

Object.defineProperty(exports, "__esModule", { value: true });
// 在compile方法中如果不设定varname的情况下，顶级对象的字面量一定为默认值it,it1,it2,...it8
// 直接使用代码，不输出
// {{: list[0] = 1}}
// 定义变量
// {{let x = (date(it.name) +1) * 2}}
//  for循环开始
//  i指的是index v是index对应的元素的值,这里的i v只是变量名，在嵌套循环时为了可读性采用别的变量名（不改也是可以的）
//  如果for循环只定义一个，则对象为键，其余有values方法的为值。比如：{{for v of it.array}}
// {{for i, v of it.array}}
//  循环结束
//  {{break}}
//  {{continue}}
// {{end}}
// while循环开始，注意，必须使用定义的变量来做判断，不能使用it...上的变量！
// {{while x > 0}}
//  循环结束
//  {{break}}
//  {{continue}}
// {{end}}
//  if条件判断
// {{if it.isOK}}
//  else if条件判断
// {{elseif it.size + 1 > x}}
//  else条件
// {{else}}
//  条件结束
// {{end}}
//  原样输出，去除第一个\后原样输出
// {{\ it.size + 1 > x }} 输出为{{ it.size + 1 > x }}
//  注释
// {{% 我是注释...}}
// 除上以外，都是输出表达式的值
// {{format(it.array[i], "mm:ss")}}
// {{(i > 0) ? 1 : 0 }}
// {{i + 1 }}
// {{v || 'none' }} //这种写法可以设置当前项表达式为假值（0， null, undefined, false）时的默认值,这里假值需要严格类型
// {{max(v)}}
// {{it._helper.mapStyle("player", i)}}
// {{app.sample[v]}}
// {{escapeHTML(v, true) }}
// 强烈建议在模板开头，对使用的it...，判断设置默认值，类似函数定义的参数的默认值
// {{:it = it || {index:1, start:2}}}
// 提供了_stringify函数，可以转化Json数据，提供了_get函数，可以获得已加载的模块，提供了_cfg数据和_path路径(tpl文件的路径)
// !!!特别警告！不要在模板内修改_cfg,it...的内容！这些数据是长期保留在外边的
// ============================== 导入的模块、类、函数、常量
var mod_1 = require("../lang/mod");
var hash = require("../util/hash");
var log_1 = require("../util/log");
// ============================== 导出
exports.level = log_1.logLevel;
exports.VARNAME = '_cfg, it, it1, it2, it3, it4, it5, it6, it7, it8';
exports.VALUE_REG = /\{\{([\s\S]+?)\}\}/g;
exports.es6FOR1 = 'let _values = (o) => {return o.values ? o.values() : Object.keys(o)};\n';
exports.es6FOR2 = 'let _entries = (o) => {return o.entries ? o.entries() : Object.keys(o).map(function(x) {return [x, o[x]]})};\n';
exports.FOR1 = 'var _values = function(o)  {return Object.keys(o)};\n';
exports.FOR2 = 'var _entries = function(o)  {return Object.keys(o).map(function(x) {return [x, o[x]]})};\n';
exports.stringifyName = '_stringify';
exports.getName = '_get';
exports.hashName = '_hash';
exports.pathName = '_path';
exports.convertEntityName = '_convertEntity';
exports.calAttrHashName = '_calAttrHash';
exports.calTextHashName = '_calTextHash';
exports.addJsonName = '_addJson';
exports.installTextName = '_installText';
exports.addTextName = '_addText';
exports.chFuncName = '_chFunc';
/**
 * @description  模板编译
 * @example
 * 参数为字符串，编译成模板函数的定义字符串
 */
exports.compile = function (s, construct, regex, regexIndex, varname, comment, file, version) {
    var parser = new construct(version);
    parser.line = 0;
    parser.setVarname(varname || exports.VARNAME);
    parser.setComment(comment);
    try {
        parse(s, regex || exports.VALUE_REG, regexIndex || 1, parser);
        return parser.funString();
    } catch (e) {
        log_1.warn(exports.level, 'tpl compile function fail, file: ', file, ', line: ', parser.line, e, s);
        return '';
    }
};
/**
 * @description  返回字符串
 * @example
 */
exports.toString = function (o) {
    var t = typeof o === "undefined" ? "undefined" : _typeof(o);
    if (t === 'number' || t === 'string') {
        return o;
    }
    try {
        return JSON.stringify(o);
    } catch (e) {
        log_1.warn(exports.level, 'tpl toString fail, obj: ', o, e);
        return '';
    }
};
/**
 * @description 计算文本哈希
 * @example
 */
exports.calTextHash = function (data) {
    // tslint:disable:prefer-template
    return hash.iterHashCode(typeof data === 'string' ? data : data + '', 0, hash.charHash);
};
/**
 * @description 计算节点的属性哈希（包括节点名）
 * @example
 */
exports.calAttrHash = function (node) {
    var size = 0;
    var str = '';
    for (var key in node.attrs) {
        if (key === 'w-tag') {
            node.tagName = node.attrs['w-tag'];
        } else if (key === 'w-did') {
            node.did = node.attrs['w-did'];
            delete node.attrs['w-did'];
        } else {
            size++;
            str += key;
            str += node.attrs[key];
        }
    }
    node.attrSize = size;
    return node.tagName ? exports.calTextHash(str) : exports.calTextHash(str) ^ exports.calTextHash(node.tagName);
};
exports.addJson = function (value, parent) {
    if ((typeof value === "undefined" ? "undefined" : _typeof(value)) === 'object') {
        parent.childHash = hash.objHashCode(value, parent.childHash ? parent.childHash : 0, new Set());
    } else {
        parent.childHash = hash.anyHash(value, parent.childHash ? parent.childHash : 0, new Set());
    }
    parent.child = value;
    parent.hasChild = true;
};
exports.addText = function (value, parent) {
    var deep = {
        obj: null
    };
    var hashv = exports.calTextHash(value);
    if (value && typeof value === 'string') {
        if (value.indexOf('&#x') > -1) {
            value = value.replace(/&#x(\w+?);/g, function (s0, s1) {
                return String.fromCharCode(parseInt(s1, 16));
            });
        }
        value = exports.convertEntity(value);
    }
    parent.children.push({ text: value, str: value, childHash: hashv, hash: hashv, hasChild: undefined });
};
exports.installText = function (value, hash) {
    var node = {
        text: value,
        childHash: hash,
        hash: hash,
        str: value,
        hasChild: undefined
    };
    if (node.text.indexOf('&#x') > -1) {
        node.text = node.text.replace(/&#x(\w+?);/g, function (s0, s1) {
            return String.fromCharCode(parseInt(s1, 16));
        });
    }
    node.text = exports.convertEntity(node.text);
    return node;
};
/**
 * @description 转换html的转义字符串
 * @example
 */
exports.convertEntity = function (str) {
    for (var i = 0; i < entityArr.length; i++) {
        if (str.indexOf(entityArr[i][0]) > -1) {
            str = str.replace(new RegExp(entityArr[i][0], 'ig'), String.fromCharCode(entityArr[i][1]));
        }
    }
    return str;
};
exports.chFunc = function (node) {
    if (node.childHash) {
        return;
    }
    node.childHash = 0;
    if (node.children && node.children.length > 0) {
        for (var i = 0; i < node.children.length; i++) {
            node.childHash = hash.nextHash(node.childHash, hash.nextHash(hash.nextHash(node.children[i].attrHash || 0, node.children[i].childHash), i + 1));
        }
    }
};
/**
 * @description 转换字符串成模板函数
 * @example
 */
exports.toFun = function (s, path) {
    try {
        // tslint:disable-next-line:no-function-constructor-with-string-args
        return new Function(exports.stringifyName, exports.getName, exports.hashName, exports.pathName, exports.convertEntityName, exports.calAttrHashName, exports.calTextHashName, exports.addJsonName, exports.installTextName, exports.addTextName, exports.chFuncName, 'return' + s)(exports.toString, mod_1.commonjs ? mod_1.commonjs.relativeGet : null, hash, path, exports.convertEntity, exports.calAttrHash, exports.calTextHash, exports.addJson, exports.installText, exports.addText, exports.chFunc);
    } catch (e) {
        log_1.warn(exports.level, 'tpl toFun, path: ' + path + ', s: ', s, e);
        throw e;
    }
};
/**
 * @description  返回定义的函数, 用定义字符串，转成匿名函数的返回函数
 * @example
 */
exports.toFunc = function (s, path) {
    try {
        // tslint:disable-next-line:no-function-constructor-with-string-args
        return new Function(exports.stringifyName, exports.getName, exports.pathName, 'return ' + s)(exports.toString, mod_1.commonjs ? mod_1.commonjs.relativeGet : null, path);
    } catch (e) {
        log_1.warn(exports.level, 'tpl toFun, path: ' + path + ', s: ', s, e);
        throw e;
    }
};
// ============================== 本地
var LINE_FEED_CODE = 10;
var entityArr = [['&nbsp;', 160], ['&lt;', 60], ['&gt;', 62], ['&amp;', 38], ['&quot;', 34], ['&apos;', 39], ['&cent;', 162], ['&pound;', 163], ['&yen;', 165], ['&euro;', 8364], ['&sect;', 167], ['&copy;', 169], ['&reg;', 174], ['&trade;', 8482], ['&times;', 215], ['&divide;', 247]];
/**
 * @description 统计行数
 * @example
 */
var line = function line(s) {
    var i = void 0;
    var n = 0;
    for (i = s.length - 1; i >= 0; i--) {
        s.charCodeAt(i) === LINE_FEED_CODE && n++;
    }
    return n;
};
/**
 * @description 处理代码中的无效字符串
 * @example
 */
var unescape = function unescape(code) {
    return code.replace(/[\r\t\n]/g, ' ');
};
/**
 * @description 用第一个字符出现位置，将字符串分解成2部分
 * @example
 */
var splitFirst = function splitFirst(s, c) {
    var i = s.indexOf(c);
    return i >= 0 ? [s.substring(0, i), s.substring(i + c.length)] : false;
};
/**
 * @description 表达式求值
 * @example
 */
var evaluate = function evaluate(str) {
    // %TODO 进行检查，不允许定义临时变量
    return str.trim();
};
/**
 * @description 分析定义或赋值的变量
 * @example
 */
var parseVar = function parseVar(s, parser) {
    if (s.indexOf('=') < 1) {
        throw new Error('template compile exception: ' + s);
    }
    parser.putComment(s);
    // return "let " + s + ";\n";
    return 'var ' + s + ';\n';
};
/**
 * @description 分析直接执行的代码
 * @example
 */
var parseEvaluate = function parseEvaluate(s, parser) {
    parser.putComment(s);
    return 'try{' + evaluate(s) + '}catch(e){};\n';
};
/**
 * @description for循环开始
 * @example
 */
var parseFor = function parseFor(s, parser) {
    var arr = void 0;
    arr = splitFirst(s, 'of');
    if (!arr) {
        throw new Error('template compile exception: ' + s);
    }
    parser.putComment(s);
    var r = evaluate(arr[1]);
    s = arr[0].trim();
    arr = splitFirst(s, ',');
    var t = parser.getTempVar();
    if (arr) {
        parser.useFor2();
        // tslint:disable:max-line-length
        // return "try{for(let _each of _entries(" + r + ")){\nlet " + arr[0].trim() + " = _each[0], "+ arr[1].trim() +" = _each[1];\n";
        // return "try{var _entry = _entries(" + r + "); for(var _key in _entry){\nvar " + arr[0].trim() + " = _key, "+ arr[1].trim() +" = _entry[_key];\n";
        if (parser.version === 'es5') {
            return 'try{var ' + t + ' = _entries(' + r + '); for(var _key in ' + t + '){\nvar _each = ' + t + '[_key];\nvar ' + arr[0].trim() + ' = _each[0], ' + arr[1].trim() + ' = _each[1];\n';
        } else {
            return 'try{for(let _each of _entries(' + r + ')){\nlet ' + arr[0].trim() + ' = _each[0], ' + arr[1].trim() + ' = _each[1];\n';
        }
    }
    parser.useFor1();
    // return "try{for(let " + s +" of _values(" + r + ")){\n";
    if (parser.version === 'es5') {
        return 'try{var ' + t + ' = _values(' + r + ');for(var _key  in ' + t + '){\n' + s + '= ' + t + '[_key]\n';
    } else {
        return 'try{for(let ' + s + ' of _values(' + r + ')){\n';
    }
};
/**
 * @description while循环开始
 * @example
 */
var parseWhile = function parseWhile(s, parser) {
    parser.putComment(s);
    return 'try{while(' + evaluate(s) + '){\n';
};
/**
 * @description 分析if条件判断开始
 * @example
 */
var parseIf = function parseIf(s, parser) {
    parser.putComment(s);
    return 'try{if(' + evaluate(s) + '){\n';
};
/**
 * @description 分析else if条件判断
 * @example
 */
var parseElseif = function parseElseif(s, parser) {
    parser.putComment(s);
    return '}else if(' + evaluate(s) + '){\n';
};
/**
 * @description 模板分析
 * @example
 */
// tslint:disable-next-line:cyclomatic-complexity
var parse = function parse(s, regex, regexIndex, parser) {
    var m = void 0;
    var t = void 0;
    var i = 0;
    var c = void 0;
    // tslint:disable-next-line:no-conditional-assignment
    while (m = regex.exec(s)) {
        t = s.substring(i, m.index);
        parser.putText(t);
        parser.line += line(t);
        i = m.index + m[0].length;
        t = unescape(m[regexIndex]);
        c = t.charCodeAt(0);
        if (t === 'end') {
            parser.putCode('}}catch(e){}\n');
        } else if (t === 'else') {
            parser.putCode('}else{\n');
        } else if (c === 58) {
            // : 直接执行代码
            parser.putCode(parseEvaluate(t.substring(1), parser));
        } else if (c === 37) {
            // % 注释，直接忽略
        } else if (c === 92) {
            // \ 原样输出
            parser.putText(m[0].replace(/\\/, ''));
        } else if (c === 105 && t.length > 2 && t.charCodeAt(1) === 102) {
            // if条件判断
            parser.putCode(parseIf(t.substring(2).trim(), parser));
        } else if (c === 102 && t.length > 3 && t.charCodeAt(1) === 111 && t.charCodeAt(2) === 114) {
            // for循环
            parser.putCode(parseFor(t.substring(3).trim(), parser));
        } else if (c === 101 && t.length > 6 && t.charCodeAt(1) === 108 && t.charCodeAt(2) === 115 && t.charCodeAt(3) === 101 && t.charCodeAt(4) === 105 && t.charCodeAt(5) === 102) {
            // elseif
            parser.putCode(parseElseif(t.substring(6).trim(), parser));
        } else if (c === 119 && t.length > 5 && t.charCodeAt(1) === 104 && t.charCodeAt(2) === 105 && t.charCodeAt(3) === 108 && t.charCodeAt(4) === 101) {
            // while
            parser.putCode(parseWhile(t.substring(5).trim(), parser));
        } else if (c === 108 && t.length > 3 && t.charCodeAt(1) === 101 && t.charCodeAt(2) === 116) {
            // let 赋值变量
            parser.putCode(parseVar(t.substring(3), parser));
        } else {
            parser.putComment(t);
            parser.putVar(evaluate(t));
        }
        parser.line += line(m[regexIndex]);
    }
    parser.putText(s.substring(i));
};
// ============================== 立即执行的代码
})