_$define("pi/compile/genvdom", function (require, exports, module){
"use strict";

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

Object.defineProperty(exports, "__esModule", { value: true });
var hash = require("../util/hash");
var log_1 = require("../util/log");
var tpl_1 = require("../util/tpl");
// ====================================== 导出
exports.level = log_1.logLevel;
var setParent = function setParent(syntax, parent) {
    syntax.parent = parent;
    var right = syntax.right;
    if (!right) {
        return;
    }
    for (var i = 0; i < right.length; i++) {
        setParent(right[i], syntax);
    }
};
exports.gen = function (syntax) {
    nodeIndex = 0;
    sid = 0;
    funcStrArr = ["let _$temp, node;"];
    funcStrIndex = 1;
    setParent(syntax, null);
    preorder(syntax, null);
    return joinStr();
};
// 判断父节点是否是widget
exports.parentIsWidget = function (syntax) {
    if (!syntax) {
        return false;
    }
    /* tslint:disable:no-reserved-keywords */
    var type = syntax.type;
    if (type === 'tag' || type === 'html') {
        var flag = false;
        if (type === 'tag') {
            var tagName = syntax.right[0].value;
            if (tagName.indexOf('-') > 0 || tagName.indexOf('$') > 0 || tagName.indexOf('widget') >= 0) {
                flag = true;
            }
        }
        return flag;
    }
    var parent = syntax.parent;
    return exports.parentIsWidget(parent);
};
var nodeIndex = 0; // 根节点为1， 第二层子为2，第三层为3...
// ====================================== 本地
// 先序遍历
// child -> node -> pre -> suf
var preorder = function preorder(syntax, parent) {
    var index = funcStrIndex;
    var funcs = seekFunc(syntax, parent);
    var childs = funcs.child();
    var childNodes = [];
    funcStrIndex++;
    if (syntax.type === 'html' || syntax.type === 'jobj' || syntax.type === 'jarr' || syntax.type === 'jpair' || syntax.type === 'text' || syntax.type === 'jsexpr') {
        nodeIndex++;
    }
    for (var i = 0; i < childs.length; i++) {
        var childNode = preorder(childs[i], syntax);
        if (childNode) childNodes.push(childNode); // 存在空文本节点的情况		
    }
    var node = funcs.node(childNodes);
    funcStrArr[index] = funcs.pre(node);
    funcStrArr[funcStrIndex++] = funcs.suf(node);
    if (syntax.type === 'html' || syntax.type === 'jobj' || syntax.type === 'jarr' || syntax.type === 'jpair' || syntax.type === 'text' || syntax.type === 'jsexpr') {
        nodeIndex--;
    }
    return node;
};
// 每一个节点都有pre字符串和suf字符串
var seekFunc = function seekFunc(syntax, parent) {
    try {
        return parserFunc[syntax.type](syntax, parent);
    } catch (error) {
        throw new Error("parserFunc[" + syntax.type + "]\u4E0D\u662F\u4E00\u4E2A\u65B9\u6CD5\uFF01");
    }
};
var joinStr = function joinStr() {
    return "(function(_cfg,it,it1){" + funcStrArr.join('') + " })";
};
// 用来存储位置的
var funcStrIndex = 0;
// 需要拼接成函数字符串
var funcStrArr = [];
// 还没想好里面存什么

var ParserNode = function ParserNode() {
    _classCallCheck(this, ParserNode);

    this.childHash = 0;
    this.attrs = {};
    this.attrHash = 0;
    this.hash = 0;
    this.str = ''; // 当前节点对应的文本值,暂时只在js中拼表达式用到
    this.v = ''; // v字段专门处理value是jsexpr的情况
    // childfuncstr:Array<String> = [];
};
// 入参parent暂时没用到


var genTagSufFunc = function genTagSufFunc(parent) {
    return function (node) {
        var str = "";
        // 如果节点下没有脚本，其hash是一个今天的值
        if (node.cs) {
            str += "_chFunc(node);";
        }
        // nodeIndex > 1是，该元素一定有父节点
        if (nodeIndex > 1) {
            str += "_$parent.children.push(node);}";
        } else {
            str += "return node;}";
        }
        return str;
    };
};
var genMathChildFunc = function genMathChildFunc(syntax) {
    return function () {
        var childs = [];
        if (syntax.left !== null && !isBuildIn(syntax.left)) {
            childs.push(syntax.left);
        }
        if (!isBuildIn(syntax.right[0])) {
            childs.push(syntax.right[0]);
        }
        return childs;
    };
};
var genMathNodeFunc = function genMathNodeFunc(operator, syntax) {
    return function (childs) {
        var node = new ParserNode();
        if (syntax.left === null) {
            node.str = operator;
        } else if (!isBuildIn(syntax.left)) {
            node.str = childs[0].str + operator;
        } else {
            node.str = syntax.left.value + operator;
        }
        if (!isBuildIn(syntax.right[0])) {
            node.str += childs[childs.length - 1].str;
        } else {
            node.str += syntax.right[0].value;
        }
        return node;
    };
};
var genMathFunc = function genMathFunc(operator) {
    return function (syntax, parent) {
        return Object.assign({}, defaultParse, { child: genMathChildFunc(syntax), node: genMathNodeFunc(operator, syntax) });
    };
};
var genAutoFunc = function genAutoFunc(operator) {
    return function (syntax, parent) {
        return Object.assign({}, defaultParse, { child: function child() {
                var childs = [];
                if (syntax.left && !isBuildIn(syntax.left)) {
                    childs.push(syntax.left);
                }
                if (syntax.right && syntax.right[0] && !isBuildIn(syntax.right[0])) {
                    childs.push(syntax.right[0]);
                }
                return childs;
            }, node: function node(childs) {
                var node = new ParserNode();
                if (childs.length === 1) {
                    if (syntax.left) {
                        node.str = childs[0].str + operator;
                    } else {
                        node.str = operator + childs[0].str;
                    }
                } else {
                    if (syntax.left) {
                        node.str = syntax.left.value + operator;
                    } else {
                        node.str = operator + syntax.right[0].value;
                    }
                }
                return node;
            } });
    };
};
var genKvDvChildFunc = function genKvDvChildFunc(syntax) {
    return function () {
        return isBuildIn(syntax.right[1]) ? [] : [syntax.right[1]];
    };
};
var genKvDvNodeFunc = function genKvDvNodeFunc(operator, syntax) {
    return function (childs) {
        var node = new ParserNode();
        node.str = syntax.right[0].value + operator + (childs.length === 0 ? syntax.right[1].value : childs[0].str);
        calHash(childs, node);
        return node;
    };
};
var genifelseifChildFunc = function genifelseifChildFunc(syntax) {
    return function () {
        var childs = [];
        if (!isBuildIn(syntax.right[0])) {
            syntax.right[0].parent = syntax;
            childs.push(syntax.right[0]);
        }
        for (var i = 1; i < syntax.right.length; i++) {
            syntax.right[i].parent = syntax;
            childs.push(syntax.right[i]);
        }
        return childs;
    };
};
var genifelseifNodeFunc = function genifelseifNodeFunc(operator, syntax) {
    return function (childs) {
        var node = new ParserNode();
        if (!isBuildIn(syntax.right[0])) {
            /* tslint:disable:prefer-template */
            node.str = operator + ("(" + childs[0].str + ")");
        } else {
            node.str = operator + ("(" + syntax.right[0].value + ")");
        }
        return node;
    };
};
var gentTagPreFunc = function gentTagPreFunc(tagName, syntax, id) {
    return function (node) {
        var ssid = syntax.sid !== undefined ? syntax.sid : id;
        var str = "_$temp=node;{let _$parent = _$temp;let node = {\"attrs\":{},\"tagName\":\"" + tagName + "\",\"sid\":" + ssid + "};";
        if (tagName.indexOf('-') > 0 || tagName.indexOf('$') > 0 || tagName.indexOf('widget') >= 0) {
            str += "node.hasChild = false;node.child = null;";
        } else {
            str += "node.children=[];";
        }
        if (!node.cs) {
            str += "node.childHash =" + node.childHash + ";";
        }
        return str;
    };
};
var genSignleTagFunc = function genSignleTagFunc(tagName) {
    return function (syntax, parent) {
        return Object.assign({}, defaultParse, { child: function child() {
                return syntax.right;
            }, node: function node(childs) {
                var node = containScript(childs);
                calTagHash(node, syntax.right[0].value); // 计算taghash
                calHash(childs, node);
                return node;
            }, pre: gentTagPreFunc(tagName, syntax, sid++), suf: genTagSufFunc(parent) });
    };
};
// 这里的child包含了属性child，但是没关系，因为attrsFunc没有计算hash值，所以全是0，算上去也没问题
var tagNodeFunc = function tagNodeFunc(tagName, childs) {
    var node = new ParserNode();
    sumChildHash(node, childs);
    calTagHash(node, tagName);
    return node;
};
var tagFunc = function tagFunc(syntax, parent) {
    return Object.assign({}, defaultParse, { child: function child() {
            return [syntax.right[1], syntax.right[2]];
        }, node: function node(childs) {
            var node = containScript(childs);
            calTagHash(node, syntax.right[0].value); // 计算taghash
            calChildsHash([childs[1]], node);
            calHash(childs, node);
            return node;
        }, pre: gentTagPreFunc(syntax.right[0].value, syntax, sid++), suf: genTagSufFunc(parent) });
};
var inputTagFunc = genSignleTagFunc('input');
var imgTagFunc = genSignleTagFunc('img');
var metaTagFunc = genSignleTagFunc('meta');
var bodyFunc = function bodyFunc(syntax, parent) {
    return Object.assign({}, defaultParse, { child: function child() {
            parent && (syntax.parent = parent);
            for (var i = 0; i < syntax.right.length; i++) {
                syntax.right[i].parent = syntax;
            }
            return syntax.right;
        }, node: function node(childs) {
            var node = containScript(childs);
            calHash(childs, node);
            return node;
        }, pre: function pre() {
            var str = "";
            if (parent && (parent.type === 'if' || parent.type === 'elseif' || parent.type === 'else')) {
                str = "{";
            }
            return str;
        }, suf: function suf() {
            var str = "";
            if (parent && (parent.type === 'if' || parent.type === 'elseif' || parent.type === 'else')) {
                str = "}";
            }
            return str;
        } });
};
var textFunc = function textFunc(syntax, parent) {
    return Object.assign({}, defaultParse, { node: function node() {
            var childs = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;

            syntax.value = syntax.value.trim();
            var node = null;
            if (syntax.value) {
                node = new ParserNode();
                node.hash = tpl_1.calTextHash(syntax.value);
            }
            return node;
        }, suf: function suf(node) {
            syntax.value = syntax.value.trim();
            var str = "";
            if (syntax.value) {
                str = "_$temp=node;{let _$parent = _$temp;let node = _installText(\"" + syntax.value + "\", " + node.hash + ");";
                str += ";\n\t\t\t\t";
                if (exports.parentIsWidget(syntax)) {
                    str += "_$parent.child = node.text;_$parent.hasChild = true;";
                } else {
                    if (nodeIndex > 1) {
                        str += "_$parent.children.push(node);";
                    } else {
                        str += "return node;";
                    }
                }
                str += '}';
            }
            return str;
        } });
};
// 单指json中的数组
// 且数组中的元素必须为同一类型
// 暂时没有处理["aa","aa {{it.name}}"]这种情况
// jarr其实有BUG,无法处理数组嵌套，且其中有变量的情况,除非变量放在尾部，不然顺序会被换掉
var jarrFunc = function jarrFunc(syntax, parent) {
    return Object.assign({}, defaultParse, { child: function child() {
            var childs = [];
            for (var i = 0; i < syntax.right.length; i++) {
                if (!isBuildIn(syntax.right[i]) && syntax.right[i].type !== 'jstr') {
                    syntax.right[i].parent = syntax;
                    if (syntax.right[i].type === 'script' && syntax.right[i].right[0].type === 'jsexpr') {
                        syntax.right[i].right[0].index = i;
                    }
                    childs.push(syntax.right[i]);
                }
            }
            return childs;
        }, node: function node(childs) {
            var node = containScript(childs);
            if (childs) {
                for (var i = 0; i < childs.length; i++) {
                    node.hash = hash.nextHash(node.hash, childs[i].hash);
                }
            } else {
                for (var _i = 0; _i < syntax.right.length; _i++) {
                    node.hash = hash.nextHash(node.hash, tpl_1.calTextHash(syntax.right[_i].value));
                }
            }
            calHash(childs, node);
            return node;
        }, pre: function pre() {
            return "_$temp=node;{let _$parent = _$temp;let node = [];";
        }, suf: function suf(node) {
            var str = "";
            for (var i = 0; i < syntax.right.length; i++) {
                var v = void 0;
                if (isBuildIn(syntax.right[i])) {
                    v = syntax.right[i].value;
                } else if (syntax.right[i].type === 'jstr') {
                    v = "\"" + syntax.right[i].right[0].value + "\"";
                }
                if (v) {
                    str += "node[" + i + "] = " + v + ";";
                }
                node.hash = hash.nextHash(node.hash, tpl_1.calTextHash(syntax.right[i].value));
            }
            if (!parent) {
                str += "return node;}";
            } else {
                if (parent.type === 'jarr') {
                    str += "_$parent.push(node);}";
                } else if (parent.type === 'jpair') {
                    var key = parent.right[0].right ? parent.right[0].right[0].value : parent.right[0].value;
                    if (parent.right[0].type === 'identifier') {
                        key = "\"" + parent.right[0].value + "\"";
                    } else {
                        key = "\"" + parent.right[0].right[0].value + "\"";
                    }
                    str += "_$parent[" + key + "]= node;}";
                } else if (parent.type === 'body') {
                    // parent分为真正有意义的节点和body节点
                    if (nodeIndex > 1) {
                        str += "_addJson(node, _$parent);";
                    } else {
                        str += "return node;";
                    }
                    str += "}";
                }
            }
            return str;
        } });
};
var jstrFunc = function jstrFunc(syntax, parent) {
    return Object.assign({}, defaultParse, { pre: function pre(node) {
            return "jvalue = \"" + syntax.right[0].value + "\";";
        }, node: function node(childs) {
            var node = new ParserNode();
            node.hash = tpl_1.calTextHash("\"" + syntax.right[0].value + "\"");
            return node;
        } });
};
var jscriptFunc = function jscriptFunc(syntax, parent) {
    return Object.assign({}, defaultParse, { child: function child() {
            var child = [];
            for (var i = 0; i < syntax.right.length; i++) {
                syntax.right[i].parent = syntax;
                child.push(syntax.right[i]);
            }
            return child;
        }, node: function node(childs) {
            var node = new ParserNode();
            node.cs = true;
            return node;
        } });
};
// 单指json中的键值对
var jpairFunc = function jpairFunc(syntax, parent) {
    return Object.assign({}, defaultParse, { child: function child() {
            var child = [];
            if (!isBuildIn(syntax.right[1])) {
                syntax.right[1].parent = syntax;
                child = [syntax.right[1]];
            }
            return child;
        }, node: function node(childs) {
            var node = containScript(childs);
            calHash(childs, node);
            if (isScript(syntax.right[1])) {
                node.v = childs[0].str;
            }
            return node;
        }, pre: function pre(node) {
            var str = "//jpair pre\n\t\t\t";
            var key = '';
            if (syntax.right[0].type === 'jstr') {
                key = "\"" + syntax.right[0].right[0].value + "\"";
            } else if (syntax.right[0].type === 'identifier') {
                key = "\"" + syntax.right[0].value + "\"";
            }
            node.hash = hash.nextHash(node.hash, tpl_1.calTextHash("" + key)); // 计算key的hash值
            if (isBuildIn(syntax.right[1])) {
                var v = parseBuildIn(syntax.right[1]);
                str += "\n\t\t\t\tnode[" + key + "]=" + v + ";";
                node.hash = hash.nextHash(node.hash, tpl_1.calTextHash(v)); // 计算key的hash值
            } else if (isScript(syntax.right[1])) {
                str += "\n\t\t\t\tnode[" + key + "]=" + node.v + ";";
            } else if (isjstrjscript(syntax.right[1])) {
                str += "\n\t\t\t\t{\n\t\t\t\t\tlet jvalue = \"\";\n\t\t\t\t\t";
            } else {
                str += "\n\t\t\t\t_$temp=node;{let _$parent = _$temp;\t";
            }
            return str;
        }, suf: function suf(node) {
            var str = "\n\t\t\t//jpair suf\n\t\t\t";
            if (isjstrjscript(syntax.right[1])) {
                var key = '';
                if (syntax.right[0].type === 'jstr') {
                    key = "\"" + syntax.right[0].right[0].value + "\"";
                } else if (syntax.right[0].type === 'identifier') {
                    key = "\"" + syntax.right[0].value + "\"";
                }
                str += "\n\t\t\t\tnode[" + key + "]=jvalue;\n\t\t\t\t}\n\t\t\t\t";
            } else if (!isBuildIn(syntax.right[1]) && !isScript(syntax.right[1])) {
                str += "\n\t\t\t\t}";
            }
            return str;
        } });
};
var jobjFunc = function jobjFunc(syntax, parent) {
    return Object.assign({}, defaultParse, { child: function child() {
            return syntax.right;
        }, node: function node(childs) {
            var node = containScript(childs);
            calHash(childs, node);
            return node;
        }, pre: function pre() {
            return "_$temp=node;{let _$parent = _$temp;let node = {};";
        }, suf: function suf(node) {
            var str = "";
            if (!parent) {
                str += "return node;}";
            } else {
                if (parent.type === 'jarr') {
                    str += "_$parent.push(node);}";
                } else if (parent.type === 'jpair') {
                    str += "_$parent[\"" + parent.right[0].right[0].value + "\"]= node;}";
                } else if (parent.type === 'body') {
                    // parent分为真正有意义的节点和body节点
                    if (nodeIndex > 1) {
                        str += "_addJson(node, _$parent);";
                    } else {
                        str += "return node;";
                    }
                    str += "}";
                }
            }
            return str;
        } });
};
var scriptFunc = function scriptFunc(syntax, parent) {
    return Object.assign({}, defaultParse, { child: function child() {
            syntax.parent = parent;
            for (var i = 0; i < syntax.right.length; i++) {
                syntax.right[i].parent = syntax;
            }
            return syntax.right;
        }, node: function node(childs) {
            var node = new ParserNode();
            node.str = childs[0].str;
            node.cs = true;
            return node;
        } });
};
var execFunc = function execFunc(syntax, parent) {
    return Object.assign({}, defaultParse, { child: function child() {
            return syntax.right;
        }, node: function node(childs) {
            var node = new ParserNode();
            node.str = childs[0].str;
            return node;
        }, suf: function suf(node) {
            return node.str + ";";
        } });
};
var fieldeFunc = function fieldeFunc(syntax, parent) {
    return Object.assign({}, defaultParse, { child: function child() {
            var childs = [];
            !isBuildIn(syntax.left) && childs.push(syntax.left);
            !isBuildIn(syntax.right[0]) && childs.push(syntax.right[0]);
            return childs;
        }, node: function node(childs) {
            var node = new ParserNode();
            var left = '';
            var right = '';
            if (childs.length === 2) {
                left = childs[0].str;
                right = childs[1].str;
            } else if (childs.length === 1) {
                if (isBuildIn(syntax.left)) {
                    left = syntax.left.value;
                    right = childs[0].str;
                } else {
                    left = childs[0].str;
                    right = syntax.right[0].value;
                }
            } else {
                left = syntax.left.value;
                right = syntax.right[0].value;
            }
            node.str = left + "[" + right + "]";
            return node;
        } });
};
var fieldFunc = function fieldFunc(syntax, parent) {
    return Object.assign({}, defaultParse, { child: function child() {
            var childs = [];
            if (!isBuildIn(syntax.left)) {
                childs.push(syntax.left);
            }
            if (!isBuildIn(syntax.right[0])) {
                childs.push(syntax.right[0]);
            }
            return childs;
        }, node: function node(childs) {
            var node = new ParserNode();
            if (!isBuildIn(syntax.left)) {
                node.str += childs[0].str + ".";
            } else {
                node.str += syntax.left.value + ".";
            }
            if (!isBuildIn(syntax.right[0])) {
                node.str += childs.length === 2 ? childs[1].str : childs[0].str;
            } else {
                node.str += syntax.right[0].value;
            }
            return node;
        } });
};
var callFunc = function callFunc(syntax, parent) {
    return Object.assign({}, defaultParse, { child: function child() {
            var childs = [];
            if (!isBuildIn(syntax.left)) {
                childs.push(syntax.left);
            }
            for (var i = 0; i < syntax.right.length; i++) {
                if (!isBuildIn(syntax.right[i])) {
                    childs.push(syntax.right[i]);
                }
            }
            return childs;
        }, node: function node(childs) {
            var node = new ParserNode();
            var index = 0;
            if (!isBuildIn(syntax.left)) {
                node.str += childs[index++].str + '(';
            } else {
                node.str += syntax.left.value + '(';
            }
            for (var i = 0; i < syntax.right.length - 1; i++) {
                if (!isBuildIn(syntax.right[i])) {
                    node.str += childs[index++].str + ',';
                } else {
                    node.str += syntax.right[i].value + ',';
                }
            }
            if (syntax.right.length > 0) {
                if (!isBuildIn(syntax.right[syntax.right.length - 1])) {
                    node.str += childs[childs.length - 1].str;
                } else {
                    node.str += syntax.right[syntax.right.length - 1].value;
                }
            }
            node.str += ')';
            return node;
        } });
};
// 子节点一定是一个dv
var defFunc = function defFunc(syntax, parent) {
    return Object.assign({}, defaultParse, { child: function child() {
            return [syntax.right[0]];
        }, node: function node(childs) {
            var node = new ParserNode();
            node.str = "let " + childs[0].str + ";";
            return node;
        }, suf: function suf(node) {
            return node.str;
        } });
};
var dvFunc = function dvFunc(syntax, parent) {
    return Object.assign({}, defaultParse, { child: genKvDvChildFunc(syntax), node: genKvDvNodeFunc("=", syntax) });
};
var kvFunc = function kvFunc(syntax, parent) {
    return Object.assign({}, defaultParse, { child: genKvDvChildFunc(syntax), node: genKvDvNodeFunc(":", syntax) });
};
// 自增自减
var mulmulFunc = genAutoFunc("--");
var addaddFunc = genAutoFunc("++");
var negFunc = genAutoFunc("!");
// 赋值是不会被嵌套的，可以等到返回了再赋值
var assignFunc = genMathFunc("=");
var addFunc = genMathFunc("+");
var subFunc = genMathFunc("-");
var mulFunc = genMathFunc("*");
var divFunc = genMathFunc("/");
var remFunc = genMathFunc("%");
var addEqualFunc = genMathFunc("+=");
var subEqualFunc = genMathFunc("-=");
var mulEqualFunc = genMathFunc("*=");
var divEqualFunc = genMathFunc("/=");
var remEqualFunc = genMathFunc("%=");
var tripleEqualFunc = genMathFunc("===");
var tripleUnequalFunc = genMathFunc("!==");
var doubleEqualFunc = genMathFunc("==");
var doubleUnequalFunc = genMathFunc("!=");
var lessEqualFunc = genMathFunc("<=");
var bigEqualFunc = genMathFunc(">=");
var lessFunc = genMathFunc("<");
var bigFunc = genMathFunc(">");
var orFunc = genMathFunc("|");
var andFunc = genMathFunc("&");
var ororFunc = genMathFunc("||");
var andandFunc = genMathFunc("&&");
var bracketFunc = function bracketFunc(syntax, parent) {
    return Object.assign({}, defaultParse, { child: function child() {
            return isBuildIn(syntax.right[0]) ? [] : [syntax.right[0]];
        }, node: function node(childs) {
            var node = new ParserNode();
            node.str = "(" + (childs.length === 0 ? syntax.right[0].value : childs[0].str) + ")";
            return node;
        } });
};
var objFunc = function objFunc(syntax, parent) {
    return Object.assign({}, defaultParse, { child: function child() {
            return syntax.right;
        }, node: function node(childs) {
            var node = new ParserNode();
            node.str = "{";
            for (var i = 0; i < childs.length - 1; i++) {
                node.str += childs[i].str + ",";
            }
            if (childs.length > 0) {
                node.str += childs[childs.length - 1].str;
            }
            node.str += "}";
            return node;
        } });
};
var arrFunc = function arrFunc(syntax, parent) {
    return Object.assign({}, defaultParse, { child: function child() {
            return syntax.right;
        }, node: function node(childs) {
            var node = new ParserNode();
            var lastIndex = childs.length - 1;
            node.str = "[";
            for (var i = 0; i < lastIndex; i++) {
                node.str += childs[i].str + ',';
            }
            if (childs[lastIndex]) {
                node.str += childs[lastIndex].str;
            }
            node.str += "]";
            return node;
        } });
};
// 本质上就退化为了一个文本节点
var jsExprFunc = function jsExprFunc(syntax, parent) {
    /* tslint:disable:no-shadowed-variable */
    var find = function find(syntax) {
        if (syntax.type === 'attr' || syntax.type === 'attrscript' || syntax.type === 'singleattrscript' || syntax.type === 'jscript' || syntax.type === 'jarr' || syntax.type === 'jpair' || syntax.type === 'html' || syntax.type === 'attrs') {
            return syntax;
        }
        return find(syntax.parent);
    };
    return Object.assign({}, defaultParse, { child: function child() {
            return isBuildIn(syntax.right[0]) ? [] : syntax.right;
        }, node: function node(childs) {
            var node = new ParserNode();
            if (!isBuildIn(syntax.right[0])) {
                node.str = childs[0].str.trim();
            } else {
                node.str = syntax.right[0].value.trim();
            }
            return node;
        }, suf: function suf(node) {
            var str = "";
            var p = find(parent);
            if (!p) {
                console.log('jsExprFunc:找不到节点！');
                return;
            }
            var hashStr = "(" + node.str + ")";
            if (p.type === 'attr') {
                str = "attrvalue = " + node.str + ";";
            } else if (p.type === 'attrscript') {
                str = "attrvalue += " + node.str + ";";
            } else if (p.type === 'singleattrscript') {
                str = "attrvalue += " + node.str + ";";
            } else if (p.type === 'jscript') {
                str = "jvalue += " + node.str + ";";
            } else if (p.type === 'jarr') {
                isBuildIn(syntax.right[0]) ? str = "node[" + syntax.index + "] = " + syntax.right[0].value + ";" : str = "node[" + syntax.index + "] = " + node.str + ";";
            } else if (p.type !== 'jpair' && node.str) {
                // 如果是jpair则会在返回的node中处理	
                str += "_$temp=node;{let _$parent = _$temp;";
                if (nodeIndex > 1) {
                    if (exports.parentIsWidget(syntax)) {
                        str += "_addJson(" + node.str + ", _$parent);";
                    } else {
                        str += "_addText(" + node.str + ", _$parent);";
                    }
                } else {
                    str += "return {\"text\":" + node.str + ", \"str\":" + node.str + ", \"childHash\":" + node.hash + ",\"hasChild\":undefined};";
                }
                str += '}';
            }
            return str;
        } });
};
var ifFunc = function ifFunc(syntax, parent) {
    return Object.assign({}, defaultParse, { child: genifelseifChildFunc(syntax), node: genifelseifNodeFunc("if", syntax), pre: function pre(node) {
            return node.str;
        } });
};
var elseifFunc = function elseifFunc(syntax, parent) {
    return Object.assign({}, defaultParse, { child: genifelseifChildFunc(syntax), node: genifelseifNodeFunc("else if", syntax), pre: function pre(node) {
            return node.str;
        } });
};
var elseFunc = function elseFunc(syntax, parent) {
    return Object.assign({}, defaultParse, { child: function child() {
            return syntax.right;
        }, pre: function pre(node) {
            return "else";
        } });
};
var forFunc = function forFunc(syntax, parent) {
    return Object.assign({}, defaultParse, { child: function child() {
            var childs = [];
            var expr = void 0;
            var body = void 0;
            var right = syntax.right;
            if (right.length === 5) {
                expr = right[3];
                body = right[4];
            } else if (right.length === 4) {
                expr = right[2];
                body = right[3];
            }
            if (!isBuildIn(expr)) {
                childs.push(expr);
            }
            childs.push(body);
            return childs;
        }, node: function node(childs) {
            var node = new ParserNode();
            var expr = void 0;
            var body = void 0;
            var type = void 0;
            var right = syntax.right;
            var forRet = void 0;
            var extra = void 0;
            node.str = '';
            if (right.length === 5) {
                type = right[2].value;
                if (type === 'of') {
                    forRet = right[1].value;
                    extra = right[0].value;
                } else if (type === 'in') {
                    forRet = right[0].value;
                    extra = right[1].value;
                }
                expr = childs.length === 2 ? childs[0].str : right[3].value;
                body = right[4];
            } else if (right.length === 4) {
                type = right[1].value;
                forRet = right[0].value;
                expr = childs.length === 2 ? childs[0].str : right[2].value;
                body = right[3];
            }
            if (type === 'of' && right.length === 5) {
                node.str += "{let _$i = 0;\n\t\t\t\t";
            }
            node.str += "for(let " + forRet + " " + type + " " + expr + "){";
            if (type === 'of' && right.length === 5) {
                node.str += "let " + extra + " = _$i++;";
            } else if (type === 'in' && right.length === 5) {
                node.str += "let " + extra + " = " + expr + "[" + forRet + "];";
            }
            return node;
        }, pre: function pre(node) {
            return node.str;
        }, suf: function suf(node) {
            var str = '}';
            if (syntax.right[2].value === 'of') {
                str += '}';
            }
            return str;
        } });
};
var whileFunc = function whileFunc(syntax, parent) {
    return Object.assign({}, defaultParse, { child: function child() {
            var childs = [];
            if (!isBuildIn(syntax.right[0])) {
                childs.push(syntax.right[0]);
            }
            childs.push(syntax.right[1]);
            return childs;
        }, node: function node(childs) {
            var node = new ParserNode();
            node.str = "while(";
            if (childs.length === 2) {
                node.str += childs[0].str + "){";
            } else {
                node.str += syntax.right[0] + "){";
            }
            return node;
        }, pre: function pre(node) {
            return node.str;
        }, suf: function suf(node) {
            return "}";
        } });
};
var jscontinueFunc = function jscontinueFunc(syntax, parent) {
    return Object.assign({}, defaultParse, { pre: function pre(node) {
            return "continue;";
        } });
};
var regularFunc = function regularFunc(syntax, parent) {
    return Object.assign({}, defaultParse, { node: function node(_node) {
            return syntax.value;
        } });
};
var jsbreankFunc = function jsbreankFunc(syntax, parent) {
    return Object.assign({}, defaultParse, { pre: function pre(node) {
            return "break;";
        } });
};
var newFunc = function newFunc(syntax, parent) {
    return Object.assign({}, defaultParse, { child: function child() {
            return isBuildIn(syntax.right[0]) ? [] : syntax.right;
        }, node: function node(childs) {
            var node = new ParserNode();
            if (!isBuildIn(syntax.right[0])) {
                node.str = "new " + childs[0].str + ";";
            } else {
                node.str = "new " + syntax.right[0].value + ";";
            }
            return node;
        } });
};
var condFunc = function condFunc(syntax, parent) {
    return Object.assign({}, defaultParse, { child: function child() {
            var childs = [];
            if (!isBuildIn(syntax.left)) {
                childs.push(syntax.left);
            }
            if (!isBuildIn(syntax.right[0])) {
                childs.push(syntax.right[0]);
            }
            if (!isBuildIn(syntax.right[1])) {
                childs.push(syntax.right[1]);
            }
            return childs;
        }, node: function node(childs) {
            var index = 0;
            var node = new ParserNode();
            if (!isBuildIn(syntax.left)) {
                node.str = childs[index++].str + "?";
            } else {
                node.str = syntax.left.value + "?";
            }
            if (!isBuildIn(syntax.right[0])) {
                node.str += childs[index++].str + ":";
            } else {
                node.str += syntax.right[0].value + ":";
            }
            if (!isBuildIn(syntax.right[1])) {
                node.str += childs[index].str;
            } else {
                node.str += syntax.right[1].value;
            }
            return node;
        } });
};
var attrsFunc = function attrsFunc(syntax, parent) {
    return Object.assign({}, defaultParse, { child: function child() {
            return syntax.right;
        }, node: function node(childs) {
            var node = containScript(childs);
            calHash(childs, node);
            return node;
        }, pre: function pre(node) {
            var size = 0;
            var str = "";
            for (var i = 0; i < syntax.right.length; i++) {
                var name = syntax.right[i].right[0].value;
                if (name !== 'w-tag' && name !== 'w-did') {
                    size++;
                }
            }
            if (size > 0) {
                str += "node.attrSize = " + size + ";";
            }
            str += "node.attrHash = " + node.hash + ";";
            return str;
        } });
};
var containScript = function containScript(childs, node) {
    node = node ? node : new ParserNode();
    for (var i = 0; i < childs.length; i++) {
        if (childs[i].cs === true) {
            node.cs = true;
        }
    }
    return node;
};
// 汇总静态hash
var calChildsHash = function calChildsHash(childs, node) {
    for (var i = 0; i < childs.length; i++) {
        node.childHash = hash.nextHash(node.childHash, childs[i].hash);
    }
};
// 汇总静态hash
var calHash = function calHash(childs, node) {
    for (var i = 0; i < childs.length; i++) {
        node.hash = hash.nextHash(node.hash, childs[i].hash);
    }
};
var attrFunc = function attrFunc(syntax, parent) {
    return Object.assign({}, defaultParse, { child: function child() {
            if (syntax.right[0].value === 'w-sid') {
                syntax.parent.parent.sid = parseInt(syntax.right[1].right[0].value, 10);
                return [];
            }
            var child = [];
            if (syntax.right[1] && syntax.right[1].type !== 'identifier' && syntax.right[1].type !== 'attrStr' && syntax.right[1].type !== 'singleattrStr') {
                child = [syntax.right[1]];
            }
            return child;
        }, node: function node(childs) {
            if (syntax.right[0].value === 'w-sid') {
                return new ParserNode();
            }
            var node = containScript(childs);
            node.hash = hash.nextHash(node.hash, tpl_1.calTextHash(syntax.right[0].value)); // 计算属性名hash
            if (syntax.parent.type === 'attrs') {
                calHash(childs, node);
            }
            return node;
        }, pre: function pre(node) {
            if (syntax.right[0].value === 'w-sid') {
                return '';
            }
            if (node.cs) {
                return "{let attrvalue = \"\";";
            } else {
                return '';
            }
        }, suf: function suf(node) {
            if (syntax.right[0].value === 'w-sid') {
                return '';
            }
            var key = syntax.right[0].value;
            var attr = key === 'w-did' ? ".did" : ".attrs[\"" + key + "\"]";
            if (!syntax.right[1]) {
                return "node" + attr + " = " + key + ";";
            }
            var str = void 0;
            var type = syntax.right[1].type;
            var value = syntax.right[1].value;
            if (type === 'identifier') {
                str = "node" + attr + " = " + value + ";";
            } else if (type === 'attrStr') {
                value = "\"" + syntax.right[1].right[0].value + "\"";
                str = "node" + attr + " = " + value + ";";
            } else if (type === 'singleattrStr') {
                value = "'" + syntax.right[1].right[0].value + "'";
                str = "node" + attr + " = " + value + ";";
            } else {
                str = "node" + attr + " = attrvalue;}"; // 属性是脚本
                if (key !== 'w-did') {
                    str += "node.attrHash = _hash.nextHash(node.attrHash, _calTextHash(node.attrs[\"" + key + "\"]));";
                }
            }
            // 父节点为body时，该属性移动是某个script的子孙节点
            if (syntax.parent.type === 'body') {
                str += "node.attrHash = _hash.nextHash(node.attrHash, _calTextHash(" + value + "));";
            } else if (type === 'identifier' || type === 'attrStr' || type === 'singleattrStr') {
                node.hash = hash.nextHash(node.hash, tpl_1.calTextHash(value)); // 计算属性值hash
            }
            if (key === 'w-tag') {
                str += "node.tagName = node.attrs[\"" + key + "\"];";
            }
            return str;
        } });
};
var attrscriptFunc = function attrscriptFunc(syntax, parent) {
    return Object.assign({}, defaultParse, { node: function node(childs) {
            var node = new ParserNode();
            node.cs = true;
            calHash(childs, node);
            return node;
        }, child: function child() {
            var child = [];
            for (var i = 0; i < syntax.right.length; i++) {
                syntax.right[i].parent = syntax;
                child.push(syntax.right[i]);
            }
            return child;
        } });
};
var singleattrscriptFunc = attrscriptFunc;
// const attrStrFunc = (syntax:Syntax, parent:Syntax) => {
// 	return Object.assign({}, defaultParse,{
// 		"node":(childs:Array<ParserNode>)=>{
// 			let node = new ParserNode();
// 			node.str = `"${syntax.right[0].value}"`;
// 		}
// 	})
// }
// const singleAttrStrFunc = (syntax:Syntax, parent:Syntax) => {
// 	return Object.assign({}, defaultParse,{
// 		"node":(childs:Array<ParserNode>)=>{
// 			let node = new ParserNode();
// 			node.str = `'${syntax.right[0].value}'`;
// 		}
// 	})
// }
var lstringFunc = function lstringFunc(syntax, parent) {
    return Object.assign({}, defaultParse, { node: function node(childs) {
            var node = new ParserNode();
            node.hash = tpl_1.calTextHash(syntax.value);
            return node;
        }, pre: function pre(node) {
            var str = "";
            var parentType = '';
            if (syntax.parent.type === 'body') {
                if (syntax.parent.parent.type === 'else') {
                    parentType = syntax.parent.parent.parent.parent.parent.type;
                } else {
                    parentType = syntax.parent.parent.parent.parent.type;
                }
            } else {
                parentType = syntax.parent.type;
            }
            if (parentType === 'attrscript') {
                str = "attrvalue += \"" + syntax.value + "\";";
            } else if (parentType === 'singleattrscript') {
                str = "attrvalue += '" + syntax.value + "';";
            } else if (parentType === 'jscript') {
                str = "jvalue += \"" + syntax.value + "\";";
            }
            return str;
        } });
};
var jsfnFunc = function jsfnFunc(syntax, parent) {
    return Object.assign({}, defaultParse, { child: function child() {
            syntax.parent = parent;
            for (var i = 0; i < syntax.right.length; i++) {
                syntax.right[i].parent = syntax;
            }
            return syntax.right;
        }, node: function node(childs) {
            var node = new ParserNode();
            node.str = 'function' + childs[0].str + childs[1].str;
            return node;
        } });
};
var jsfnargsFunc = function jsfnargsFunc(syntax, parent) {
    return Object.assign({}, defaultParse, { node: function node(childs) {
            var node = new ParserNode();
            var lastIndex = syntax.right.length - 1;
            node.str = '(';
            for (var i = 0; i < lastIndex; i++) {
                node.str += syntax.right[i].value + ',';
            }
            if (syntax.right[lastIndex]) {
                node.str += syntax.right[lastIndex].value;
            }
            node.str += ')';
            return node;
        } });
};
var jsblockFunc = function jsblockFunc(syntax, parent) {
    return Object.assign({}, defaultParse, { child: function child() {
            return syntax.right;
        }, node: function node(childs) {
            var node = new ParserNode();
            var index = 0;
            node.str = '{';
            for (var i = 0; i < syntax.right.length; i++) {
                if (!isBuildIn(syntax.right[i])) {
                    node.str += childs[index++].str + ';';
                } else {
                    node.str += syntax.right[i].value + ';';
                }
            }
            node.str += '}';
            return node;
        } });
};
var jsbodyFunc = function jsbodyFunc(syntax, parent) {
    return Object.assign({}, defaultParse, { child: function child() {
            return syntax.right;
        }, node: function node(childs) {
            var node = new ParserNode();
            var index = 0;
            node.str = '{';
            for (var i = 0; i < syntax.right.length; i++) {
                if (!isBuildIn(syntax.right[i])) {
                    node.str += childs[index++].str + ';';
                } else {
                    node.str += syntax.right[i].value + ';';
                }
            }
            node.str += '}';
            return node;
        } });
};
var jsdefFunc = function jsdefFunc(syntax, parent) {
    return Object.assign({}, defaultParse, { child: function child() {
            return syntax.right;
        }, node: function node(childs) {
            var node = new ParserNode();
            var index = 0;
            node.str = 'let ';
            for (var i = 0; i < childs.length - 1; i++) {
                node.str += childs[i].str + ',';
            }
            if (childs.length > 0) {
                node.str += childs[childs.length - 1].str;
            }
            return node;
        } });
};
var genjsifNodeFunc = function genjsifNodeFunc(op, syntax) {
    return function (childs) {
        var n = new ParserNode();
        n.str = op;
        if (syntax.right[0].type === 'identifier' || isBuildIn(syntax.right[0])) {
            n.str += "(" + syntax.right[0].value + ")";
            if (childs[0]) {
                n.str += childs[0].str;
            }
        } else {
            n.str += "(" + childs[0].str + ")";
        }
        for (var i = 1; i < childs.length; i++) {
            if (childs[i]) {
                n.str += childs[i].str;
            }
        }
        return n;
    };
};
var genBaseFunc = function genBaseFunc(syntax, parent) {
    return Object.assign({}, defaultParse, { node: function node(childs) {
            var node = new ParserNode();
            node.str = syntax.value;
            calHash(childs, node);
            return node;
        } });
};
var genRightBuiltIn = function genRightBuiltIn(syntax) {
    var childs = [];
    for (var i = 0; i < syntax.right.length; i++) {
        if (!isBuildIn(syntax.right[i])) {
            childs.push(syntax.right[i]);
        }
    }
    return childs;
};
var jsifFunc = function jsifFunc(syntax, parent) {
    return Object.assign({}, defaultParse, { child: genifelseifChildFunc(syntax), node: genjsifNodeFunc('if', syntax) });
};
var jselseifFunc = function jselseifFunc(syntax, parent) {
    return Object.assign({}, defaultParse, { child: genifelseifChildFunc(syntax), node: genjsifNodeFunc('else if', syntax) });
};
var jselseFunc = function jselseFunc(syntax, parent) {
    return Object.assign({}, defaultParse, { child: function child() {
            return syntax.right;
        }, node: function node(childs) {
            var node = new ParserNode();
            if (childs[0]) {
                node.str = "else ";
                node.str += childs[0].str;
            }
            return node;
        } });
};
var jsforFunc = function jsforFunc(syntax, parent) {
    return Object.assign({}, defaultParse, { child: function child() {
            return syntax.right;
        }, node: function node(childs) {
            if (syntax.right.length !== 4) {
                throw new Error('for语句,必须且只能包含三个条件和一个代码块！');
            }
            var node = new ParserNode();
            node.str = "for(" + childs[0].str + ";" + childs[1].str + ";" + childs[2].str + ")" + childs[3].str;
            return node;
        } });
};
var jswhileFunc = function jswhileFunc(syntax, parent) {
    return Object.assign({}, defaultParse, { child: function child() {
            return genRightBuiltIn(syntax);
        }, node: function node(childs) {
            var node = new ParserNode();
            node.str = "while(";
            if (isBuildIn(syntax.right[0])) {
                node.str += syntax.right[0].value + ')';
                node.str += childs[0].str;
            } else {
                node.str += childs[0].str + ')';
                node.str += childs[1].str;
            }
            return node;
        } });
};
var jsswitchFunc = function jsswitchFunc(syntax, parent) {
    return Object.assign({}, defaultParse, { child: function child() {
            return genRightBuiltIn(syntax);
        }, node: function node(childs) {
            var node = new ParserNode();
            var index = 0;
            node.str = "switch(";
            if (isBuildIn(syntax.right[0])) {
                node.str += syntax.right[0].value;
            } else {
                node.str += childs[0].str;
                index = 1;
            }
            node.str += "){";
            for (var i = index; i < childs.length; i++) {
                node.str += childs[i].str + ';';
            }
            node.str += "}";
            return node;
        } });
};
var jscaseFunc = function jscaseFunc(syntax, parent) {
    return Object.assign({}, defaultParse, { child: function child() {
            return genRightBuiltIn(syntax);
        }, node: function node(childs) {
            var node = new ParserNode();
            node.str = "case " + syntax.right[0].value + ":\n\t\t\t";
            for (var i = 0; i < childs.length; i++) {
                node.str += childs[i].str + ';';
            }
            return node;
        } });
};
var jsdefaultFunc = function jsdefaultFunc(syntax, parent) {
    return Object.assign({}, defaultParse, { child: function child() {
            return syntax.right;
        }, node: function node(childs) {
            var node = new ParserNode();
            node.str = "default:";
            for (var i = 0; i < childs.length; i++) {
                node.str += childs[i].str + ';';
            }
            return node;
        } });
};
var jstryFunc = function jstryFunc(syntax, parent) {
    return Object.assign({}, defaultParse, { child: function child() {
            return syntax.right;
        }, node: function node(childs) {
            var node = new ParserNode();
            node.str = "try" + childs[0].str;
            for (var i = 1; i < childs.length; i++) {
                node.str += childs[i].str;
            }
            return node;
        } });
};
var jscatchFunc = function jscatchFunc(syntax, parent) {
    return Object.assign({}, defaultParse, { child: function child() {
            return genRightBuiltIn(syntax);
        }, node: function node(childs) {
            var node = new ParserNode();
            node.str = "catch(" + syntax.right[0].value + ")" + childs[0].str;
            return node;
        } });
};
var jsfinallyFunc = function jsfinallyFunc(syntax, parent) {
    return Object.assign({}, defaultParse, { child: function child() {
            return syntax.right;
        }, node: function node(childs) {
            var node = new ParserNode();
            node.str = "finally" + childs[0].str;
            return node;
        } });
};
var jsreturnFunc = function jsreturnFunc(syntax, parent) {
    return Object.assign({}, defaultParse, { child: function child() {
            return syntax.right;
        }, node: function node(childs) {
            var node = new ParserNode();
            node.str = "return";
            if (childs[0].str) {
                node.str += ' ' + childs[0].str;
            }
            return node;
        } });
};
var exprgroupFunc = function exprgroupFunc(syntax, parent) {
    return Object.assign({}, defaultParse, { child: function child() {
            return syntax.right;
        }, node: function node(childs) {
            var node = new ParserNode();
            node.str = '';
            if (childs === null) {
                return node;
            }
            var lastIndex = childs.length - 1;
            for (var i = 0; i < lastIndex; i++) {
                node.str += childs[i].str + ',';
            }
            if (childs[lastIndex]) {
                node.str += childs[lastIndex].str;
            }
            return node;
        } });
};
var singlelstringFunc = lstringFunc;
var parserFunc = {
    // tag还需要细分为node和wnode
    tag: tagFunc,
    inputtag: inputTagFunc,
    imgtag: imgTagFunc,
    metatag: metaTagFunc,
    body: bodyFunc,
    text: textFunc,
    jarr: jarrFunc,
    jpair: jpairFunc,
    jobj: jobjFunc,
    script: scriptFunc,
    exec: execFunc,
    fielde: fieldeFunc,
    field: fieldFunc,
    call: callFunc,
    def: defFunc,
    dv: dvFunc,
    '!': negFunc,
    '--': mulmulFunc,
    '++': addaddFunc,
    '=': assignFunc,
    '+': addFunc,
    '-': subFunc,
    '*': mulFunc,
    '/': divFunc,
    '%': remFunc,
    '+=': addEqualFunc,
    '-=': subEqualFunc,
    '*=': mulEqualFunc,
    '/=': divEqualFunc,
    '%=': remEqualFunc,
    '===': tripleEqualFunc,
    '!==': tripleUnequalFunc,
    '==': doubleEqualFunc,
    '!=': doubleUnequalFunc,
    '<=': lessEqualFunc,
    '>=': bigEqualFunc,
    '<': lessFunc,
    '>': bigFunc,
    '|': orFunc,
    '&': andFunc,
    '||': ororFunc,
    '&&': andandFunc,
    bracket: bracketFunc,
    obj: objFunc,
    kv: kvFunc,
    arr: arrFunc,
    jsexpr: jsExprFunc,
    if: ifFunc,
    else: elseFunc,
    elseif: elseifFunc,
    for: forFunc,
    while: whileFunc,
    jscontinue: jscontinueFunc,
    jsbreak: jsbreankFunc,
    return: genBaseFunc,
    new: newFunc,
    cond: condFunc,
    attrs: attrsFunc,
    attr: attrFunc,
    // "attrStr":attrStrFunc,
    // "singleattrStr":singleAttrStrFunc,
    attrscript: attrscriptFunc,
    singleattrscript: singleattrscriptFunc,
    lstring: lstringFunc,
    singlelstring: singlelstringFunc,
    jstr: jstrFunc,
    jscript: jscriptFunc,
    jsblock: jsblockFunc,
    jsbody: jsbodyFunc,
    jsfnargs: jsfnargsFunc,
    jsfn: jsfnFunc,
    jsdef: jsdefFunc,
    jsif: jsifFunc,
    jselseif: jselseifFunc,
    jselse: jselseFunc,
    jsfor: jsforFunc,
    jswhile: jswhileFunc,
    jsswitch: jsswitchFunc,
    jscase: jscaseFunc,
    jsdefault: jsdefaultFunc,
    jstry: jstryFunc,
    jscatch: jscatchFunc,
    jsfinally: jsfinallyFunc,
    jsreturn: jsreturnFunc,
    exprgroup: exprgroupFunc,
    identifier: genBaseFunc,
    float: genBaseFunc,
    floate: genBaseFunc,
    integer16: genBaseFunc,
    integer: genBaseFunc,
    integer10: genBaseFunc,
    string: genBaseFunc,
    true: genBaseFunc,
    false: genBaseFunc,
    singlequotestring: genBaseFunc,
    ';': genBaseFunc
    // "identifier":identifierFunc//identifier,只在js中可能被解析到
};
parserFunc.html = parserFunc.body;
parserFunc.el = parserFunc.body;
/**
 * 将child的hash汇总为childhash
 */
var sumChildHash = function sumChildHash(node, childs) {
    for (var i = 0; i < childs.length; i++) {
        node.childHash ^= hash.nextHash(tpl_1.calTextHash(childs[i].hash + ''), i + 1);
    }
    node.hash ^= node.childHash;
};
/**
 * 只有tag才需要用到的
 */
var calTagHash = function calTagHash(node, tagName) {
    node.hash = hash.nextHash(node.hash, tpl_1.calTextHash(tagName));
};
// 字符都有双层引号，并不需要去掉，因为在字符串转函数的时候会自动去掉一层
var trimQuo = function trimQuo(str) {
    return str.substring(1, str.length - 1);
};
var isBuildIn = function isBuildIn(syntax) {
    return syntax.type === 'string' || syntax.type === 'number' || syntax.type === 'bool' || syntax.type === 'true' || syntax.type === 'false' || syntax.type === 'null' || syntax.type === 'undefined' || syntax.type === 'integer' || syntax.type === 'integer16' || syntax.type === 'float' || syntax.type === 'identifier' || syntax.type === 'singlequotestring' || syntax.type === 'regular';
};
var isScript = function isScript(syntax) {
    return syntax.type === 'script';
};
var isjstrjscript = function isjstrjscript(syntax) {
    return syntax.type === 'jscript' || syntax.type === 'jstr';
};
// 本身就有引号了
var parseBuildIn = function parseBuildIn(syntax) {
    return syntax.value;
};
var isAttrStr = function isAttrStr(syntax) {
    return syntax.type === 'attrStr';
};
// ================ JS的处理整体要简单很多
// child -> node->pre -> suf
var defaultParse = {
    child: function child() {
        return [];
    },
    node: function node(childs) {
        return new ParserNode();
    },
    pre: function pre(node) {
        return "";
    },
    suf: function suf(node) {
        return "";
    }
};
var sid = 0;
})