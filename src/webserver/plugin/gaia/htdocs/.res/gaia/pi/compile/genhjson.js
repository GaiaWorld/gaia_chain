_$define("pi/compile/genhjson", function (require, exports, module){
"use strict";

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

Object.defineProperty(exports, "__esModule", { value: true });
var hash = require("../util/hash");
var tpl_1 = require("../util/tpl");
var log_1 = require("../util/log");
var mod_1 = require("../lang/mod");
// ====================================== 导出
exports.level = log_1.logLevel;
var setParent = function setParent(syntax, parent) {
    syntax.parent = parent;
    var right = syntax.right;
    if (!right) return;
    for (var i = 0; i < right.length; i++) {
        setParent(right[i], syntax);
    }
};
exports.gen = function (syntax) {
    nodeIndex = 0;
    sid = 0;
    funcStrArr = ["let _$temp, node; let _set = new Set();"];
    funcStrIndex = 1;
    setParent(syntax, null);
    preorder(syntax, null);
    return joinStr();
};
//判断父节点是否是widget
exports.parentIsWidget = function (syntax) {
    if (!syntax) return false;
    var type = syntax.type;
    if (type === "tag" || type === "html") {
        var flag = false;
        if (type === "tag") {
            var tagName = syntax.right[0].value;
            if (tagName.indexOf("-") > 0 || tagName.indexOf("$") > 0 || tagName.indexOf("widget") >= 0) {
                flag = true;
            }
        }
        return flag;
    }
    var parent = syntax.parent;
    return exports.parentIsWidget(parent);
};
var nodeIndex = 0; //根节点为1， 第二层子为2，第三层为3...
// ====================================== 本地
//先序遍历
// child -> node -> pre -> suf
var preorder = function preorder(syntax, parent) {
    var index = funcStrIndex;
    var funcs = seekFunc(syntax, parent);
    var childs = funcs.child();
    var childNodes = [];
    funcStrIndex++;
    if (syntax.type === "jobj" || syntax.type === "jarr" || syntax.type === "jpair" || syntax.type === "text" || syntax.type === "jsexpr") {
        nodeIndex++;
    }
    for (var i = 0; i < childs.length; i++) {
        var childNode = preorder(childs[i], syntax);
        if (childNode) childNodes.push(childNode); //存在空文本节点的情况		
    }
    var node = funcs.node(childNodes);
    funcStrArr[index] = funcs.pre(node);
    funcStrArr[funcStrIndex++] = funcs.suf(node);
    if (syntax.type === "jobj" || syntax.type === "jarr" || syntax.type === "jpair" || syntax.type === "text" || syntax.type === "jsexpr") {
        nodeIndex--;
    }
    return node;
};
//每一个节点都有pre字符串和suf字符串
var seekFunc = function seekFunc(syntax, parent) {
    try {
        return parserFunc[syntax.type](syntax, parent);
    } catch (error) {
        throw "parserFunc[" + syntax.type + "]\u4E0D\u662F\u4E00\u4E2A\u65B9\u6CD5\uFF01";
    }
};
var joinStr = function joinStr() {
    return "(function(_cfg,it,it1){" + funcStrArr.join("") + " })";
};
// 用来存储位置的
var funcStrIndex = 0;
// 需要拼接成函数字符串
var funcStrArr = [];
//还没想好里面存什么

var ParserNode = function ParserNode() {
    _classCallCheck(this, ParserNode);

    this.childHash = 0;
    this.attrs = {};
    this.attrHash = 0;
    this.hash = 0;
    this.str = ""; //当前节点对应的文本值,暂时只在js中拼表达式用到
    this.v = ""; //v字段专门处理value是jsexpr的情况
    this.cs = false; //判断子节点中是否存在脚本
    // childfuncstr:Array<String> = [];
};

var baseFunc = function baseFunc(syntax) {
    return Object.assign({}, defaultParse, {
        "node": function node(childs) {
            var node = new ParserNode();
            node.str = syntax.value;
            node.hash = hash.anyHash(node.str);
            return node;
        },
        "pre": function pre(node) {
            var p = findJsonContainer(syntax.parent);
            if (p) {
                var str = getJarrJpair(p, node.str);
                var ps = findSJpairJarr(syntax.parent);
                if (ps.type === "script") {
                    str += "node[\"_$hash\"] = _nextHash(node[\"_$hash\"], " + node.hash + ");";
                }
                return str;
            }
        }
    });
};
var jstringFunc = function jstringFunc(syntax) {
    return Object.assign({}, defaultParse, {
        "node": function node(childs) {
            var node = new ParserNode();
            if (syntax.right === null && syntax.right.length === 0) {
                node.str = "\"\"";
            } else {
                node.str = "\"" + syntax.right[0].value + "\"";
            }
            node.hash = hash.anyHash(node.str);
            return node;
        },
        "pre": function pre(node) {
            var p = findJsonContainer(syntax.parent);
            if (p) {
                var str = "";
                var ps = findSJpairJarr(syntax.parent);
                ;
                if (p.type != "jpair" || p.right[0] !== syntax) {
                    str = getJarrJpair(p, node.str);
                }
                if (ps.type === "script") {
                    str += "node[\"_$hash\"] = _nextHash(node[\"_$hash\"], " + node.hash + ");";
                }
                return str;
            }
        }
    });
};
var jpairFunc = function jpairFunc(syntax, parent) {
    return Object.assign({}, defaultParse, {
        "child": function child() {
            return syntax.right;
        },
        "node": function node(childs) {
            var node = containScript(childs);
            node.childs = childs;
            node.hash = hash.nextHash(node.hash, node.childs[0].hash); //计算key的hash值
            if (node.cs === false || syntax.right[1].type === "jscript") {
                node.hash = hash.nextHash(node.hash, node.childs[1].hash); //计算值的hash值
            }
            return node;
        },
        "pre": function pre(node) {
            var str = "";
            var findP = function findP(syntax) {
                if (!syntax) {
                    return null;
                }
                if (syntax.type === "script" || syntax.type === "jobj") {
                    return syntax;
                }
                return findP(syntax.parent);
            };
            var p = findP(syntax);
            if (p.type === "script") {
                str += "node[\"_$hash\"] = _nextHash(node[\"_$hash\"], " + node.hash + ");";
            }
            return str;
        }
    });
};
//单指json中的数组
//且数组中的元素必须为同一类型
// 暂时没有处理["aa","aa {{it.name}}"]这种情况
// jarr其实有BUG,无法处理数组嵌套，且其中有变量的情况,除非变量放在尾部，不然顺序会被换掉
//"["#?10, [|"jstring", "number","bool","null", jobj, jarr, script, jscript|, [{","#?, |"jstring", "number","bool","null", jobj, jarr, script, jscript|}]], "]"#?back;
var jarrFunc = function jarrFunc(syntax, parent) {
    return Object.assign({}, defaultParse, {
        "child": function child() {
            return syntax.right;
        },
        "node": function node(childs) {
            var node = containScript(childs);
            node.childs = childs;
            for (var i = 0; i < syntax.right.length; i++) {
                if (isBuildIn(syntax.right[i]) || syntax.right[i].type === "jscript") {
                    node.hash = hash.nextHash(node.hash, node.childs[i].hash);
                }
            }
            return node;
        },
        "pre": function pre(node) {
            return "_$temp=node;{let _$parent = _$temp;let node = [];node[\"_$hash\"] = " + node.hash + ";";
        },
        "suf": function suf(node) {
            var str = "";
            var p = findJsonContainer(syntax.parent);
            if (!p) {
                str += "return node;";
            } else {
                if (node.cs === true) {
                    str += "_$parent[\"_$hash\"] = _nextHash(_$parent[\"_$hash\"],node[\"_$hash\"]);";
                } else {
                    var pp = findSJpairJarr(syntax.parent);
                    if (pp.type === "script") {
                        str += "_$parent[\"_$hash\"] = _nextHash(_$parent[\"_$hash\"],node[\"_$hash\"]);";
                    }
                }
                if (p.type === "jarr") {
                    str += "_$parent.push(node);";
                } else {
                    var key = getJsonKey(p.right[0]);
                    str += "_$parent[" + key + "] = node;";
                }
            }
            return str + "};";
        }
    });
};
var findSJpairJarr = function findSJpairJarr(syntax) {
    if (!syntax) {
        return null;
    }
    if (syntax.type === "script" || syntax.type === "jpair" || syntax.type === "jarr") {
        return syntax;
    }
    return findSJpairJarr(syntax.parent);
};
//"{"#?10,  [|jpair,script|], [{[","#?], |jpair,script|}], "}"#?back ;
var jobjFunc = function jobjFunc(syntax, parent) {
    return Object.assign({}, defaultParse, {
        "child": function child() {
            return syntax.right;
        },
        "node": function node(childs) {
            var node = containScript(childs);
            calHash(childs, node); //jpair和script都需要计算静态hash，因为，jobj环境中script的body也是jpair
            return node;
        },
        "pre": function pre(node) {
            return "_$temp=node;{let _$parent = _$temp;let node = {};node[\"_$hash\"] = " + node.hash + ";";
        },
        "suf": function suf(node) {
            var str = "";
            var p = findJsonContainer(syntax);
            if (!p) {
                str += "return node;";
            } else {
                if (node.cs === true) {
                    str += "_$parent[\"_$hash\"] = _nextHash(_$parent[\"_$hash\"],node[\"_$hash\"]);";
                } else {
                    var pp = findSJpairJarr(syntax.parent);
                    if (pp.type === "script") {
                        str += "_$parent[\"_$hash\"] = _nextHash(_$parent[\"_$hash\"],node[\"_$hash\"]);";
                    }
                }
                if (p.type === "jarr") {
                    str += "_$parent.push(node);";
                } else {
                    var key = getJsonKey(p.right[0]);
                    str += "_$parent[" + key + "] = node;";
                }
            }
            return str + "};";
        }
    });
};
var jsExprFunc = function jsExprFunc(syntax, parent) {
    var find = function find(syntax) {
        if (syntax.type === "jarr" || syntax.type === "jpair" || syntax.type === "jscript") {
            return syntax;
        }
        return find(syntax.parent);
    };
    return Object.assign({}, defaultParse, {
        "child": function child() {
            return syntax.right;
        },
        "node": function node(childs) {
            var node = new ParserNode();
            node.str = childs[0].str.trim();
            return node;
        },
        "suf": function suf(node) {
            var str = "";
            var p = find(parent);
            if (!p) {
                throw "jsExpr必须是在jarr，jpair环境中 ";
            }
            var ptype = p.type;
            if (syntax.parent.parent.type === "jscript") {
                str = "jvalue += " + node.str + ";";
            } else {
                str = getJarrJpair(p, node.str);
            }
            str += "_set.clear();node[\"_$hash\"] = _nextHash(node[\"_$hash\"],_anyHash(" + node.str + ", 0,_set));"; //计算script的hash
            return str;
        }
    });
};
var jscriptFunc = function jscriptFunc(syntax, parent) {
    return Object.assign({}, defaultParse, {
        "child": function child() {
            return syntax.right;
        },
        "node": function node(childs) {
            var node = new ParserNode();
            node.cs = true;
            for (var i = 0; i < syntax.right.length; i++) {
                if (syntax.right[i].type === "stringstr") {
                    node.hash = hash.nextHash(node.hash, childs[i].hash);
                }
            }
            return node;
        },
        "pre": function pre(node) {
            return "{let jvalue = \"\";";
        },
        "suf": function suf(node) {
            var p = findJsonContainer(syntax);
            if (!p) {
                throw "jscript类型必须以jarr或jpair做为容器";
            }
            var str = getJarrJpair(p, "jvalue");
            str += "}";
            return str;
        }
    });
};
var stringstrFunc = function stringstrFunc(syntax, parent) {
    return Object.assign({}, defaultParse, {
        "node": function node(childs) {
            var node = new ParserNode();
            node.str = "\"" + syntax.value + "\"";
            node.hash = hash.strHashCode(node.str, 0);
            return node;
        },
        "pre": function pre(node) {
            return "jvalue += " + node.str + ";";
        }
    });
};
var bodyFunc = function bodyFunc(syntax, parent) {
    return Object.assign({}, defaultParse, {
        "child": function child() {
            return syntax.right;
        },
        "node": function node(childs) {
            var node = containScript(childs);
            node.childs = childs;
            calHash(childs, node);
            return node;
        },
        "pre": function pre(node) {
            var str = "";
            if (parent && isBuildIn(syntax)) {
                var p = findJsonContainer(syntax);
                if (!p) {
                    throw "基础类型必须以jarr或jpair做为容器";
                }
                if (p.type === "jpair") {
                    var key = getJsonKey(p.right[0]);
                    str += "node[" + key + "] = " + node.childs[0].str + ";";
                } else {
                    str += "node.push(" + node.childs[0].str + ");";
                }
                str += "node[\"_$hash\"] = _nextHash(node[\"_$hash\"], " + node.childs[0].hash + ")};";
            } else if (parent && (parent.type == "if" || parent.type == "elseif" || parent.type == "else")) str = "{";
            return str;
        },
        "suf": function suf() {
            var str = "";
            if (parent && (parent.type == "if" || parent.type == "elseif" || parent.type == "else")) str = "}";
            return str;
        }
    });
};
var genMathChildFunc = function genMathChildFunc(syntax) {
    return function () {
        var childs = [];
        if (syntax.left !== null && !isBuildIn(syntax.left)) childs.push(syntax.left);
        if (!isBuildIn(syntax.right[0])) childs.push(syntax.right[0]);
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
        return Object.assign({}, defaultParse, {
            "child": genMathChildFunc(syntax),
            "node": genMathNodeFunc(operator, syntax)
        });
    };
};
var genAutoFunc = function genAutoFunc(operator) {
    return function (syntax, parent) {
        return Object.assign({}, defaultParse, {
            "child": function child() {
                var childs = [];
                if (syntax.left && !isBuildIn(syntax.left)) {
                    childs.push(syntax.left);
                }
                if (syntax.right && syntax.right[0] && !isBuildIn(syntax.right[0])) {
                    childs.push(syntax.right[0]);
                }
                return childs;
            },
            "node": function node(childs) {
                var node = new ParserNode();
                if (childs.length == 1) {
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
            }
        });
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
        node.str = syntax.right[0].value + operator + (childs.length == 0 ? syntax.right[1].value : childs[0].str);
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
        if (!isBuildIn(syntax.right[0])) node.str = operator + ("(" + childs[0].str + ")");else node.str = operator + ("(" + syntax.right[0].value + ")");
        return node;
    };
};
var scriptFunc = function scriptFunc(syntax, parent) {
    return Object.assign({}, defaultParse, {
        "child": function child() {
            syntax.parent = parent;
            for (var i = 0; i < syntax.right.length; i++) {
                syntax.right[i].parent = syntax;
            }
            return syntax.right;
        },
        "node": function node(childs) {
            var node = new ParserNode();
            //node.str = childs[0].str;
            node.cs = true;
            return node;
        }
    });
};
var execFunc = function execFunc(syntax, parent) {
    return Object.assign({}, defaultParse, {
        "child": function child() {
            return syntax.right;
        },
        "node": function node(childs) {
            var node = new ParserNode();
            node.str = childs[0].str;
            return node;
        },
        "suf": function suf(node) {
            return node.str + ";";
        }
    });
};
var fieldeFunc = function fieldeFunc(syntax, parent) {
    return Object.assign({}, defaultParse, {
        "child": function child() {
            var childs = [];
            !isBuildIn(syntax.left) && childs.push(syntax.left);
            !isBuildIn(syntax.right[0]) && childs.push(syntax.right[0]);
            return childs;
        },
        "node": function node(childs) {
            var node = new ParserNode();
            var left = "";
            var right = "";
            if (childs.length == 2) {
                left = childs[0].str;
                right = childs[1].str;
            } else if (childs.length == 1) {
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
        }
    });
};
var fieldFunc = function fieldFunc(syntax, parent) {
    return Object.assign({}, defaultParse, {
        "child": function child() {
            var childs = [];
            if (!isBuildIn(syntax.left)) childs.push(syntax.left);
            if (!isBuildIn(syntax.right[0])) childs.push(syntax.right[0]);
            return childs;
        },
        "node": function node(childs) {
            var node = new ParserNode();
            if (!isBuildIn(syntax.left)) {
                node.str += childs[0].str + ".";
            } else {
                node.str += syntax.left.value + ".";
            }
            if (!isBuildIn(syntax.right[0])) {
                node.str += childs.length == 2 ? childs[1].str : childs[0].str;
            } else {
                node.str += syntax.right[0].value;
            }
            return node;
        }
    });
};
var callFunc = function callFunc(syntax, parent) {
    return Object.assign({}, defaultParse, {
        "child": function child() {
            var childs = [];
            if (!isBuildIn(syntax.left)) childs.push(syntax.left);
            for (var i = 0; i < syntax.right.length; i++) {
                if (!isBuildIn(syntax.right[i])) childs.push(syntax.right[i]);
            }
            return childs;
        },
        "node": function node(childs) {
            var node = new ParserNode();
            var index = 0;
            if (!isBuildIn(syntax.left)) node.str += childs[index++].str + "(";else node.str += syntax.left.value + "(";
            for (var i = 0; i < syntax.right.length - 1; i++) {
                if (!isBuildIn(syntax.right[i])) node.str += childs[index++].str + ",";else node.str += syntax.right[i].value + ",";
            }
            if (syntax.right.length > 0) {
                if (!isBuildIn(syntax.right[syntax.right.length - 1])) node.str += childs[childs.length - 1].str;else node.str += syntax.right[syntax.right.length - 1].value;
            }
            node.str += ")";
            return node;
        }
    });
};
//子节点一定是一个dv
var defFunc = function defFunc(syntax, parent) {
    return Object.assign({}, defaultParse, {
        "child": function child() {
            return [syntax.right[0]];
        },
        "node": function node(childs) {
            var node = new ParserNode();
            node.str = "let " + childs[0].str + ";";
            return node;
        },
        "suf": function suf(node) {
            return node.str;
        }
    });
};
var dvFunc = function dvFunc(syntax, parent) {
    return Object.assign({}, defaultParse, {
        "child": genKvDvChildFunc(syntax),
        "node": genKvDvNodeFunc("=", syntax)
    });
};
var kvFunc = function kvFunc(syntax, parent) {
    return Object.assign({}, defaultParse, {
        "child": genKvDvChildFunc(syntax),
        "node": genKvDvNodeFunc(":", syntax)
    });
};
//自增自减
var mulmulFunc = genAutoFunc("--");
var addaddFunc = genAutoFunc("++");
var negFunc = genAutoFunc("!");
//赋值是不会被嵌套的，可以等到返回了再赋值
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
    return Object.assign({}, defaultParse, {
        "child": function child() {
            return isBuildIn(syntax.right[0]) ? [] : [syntax.right[0]];
        },
        "node": function node(childs) {
            var node = new ParserNode();
            node.str = "(" + (childs.length == 0 ? syntax.right[0].value : childs[0].str) + ")";
            return node;
        }
    });
};
var objFunc = function objFunc(syntax, parent) {
    return Object.assign({}, defaultParse, {
        "child": function child() {
            return syntax.right;
        },
        "node": function node(childs) {
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
        }
    });
};
var arrFunc = function arrFunc(syntax, parent) {
    return Object.assign({}, defaultParse, {
        "child": function child() {
            return syntax.right;
        },
        "node": function node(childs) {
            var node = new ParserNode();
            var lastIndex = childs.length - 1;
            node.str = "[";
            for (var i = 0; i < lastIndex; i++) {
                node.str += childs[i].str + ",";
            }
            if (childs[lastIndex]) {
                node.str += childs[lastIndex].str;
            }
            node.str += "]";
            return node;
        }
    });
};
var ifFunc = function ifFunc(syntax, parent) {
    return Object.assign({}, defaultParse, {
        "child": genifelseifChildFunc(syntax),
        "node": genifelseifNodeFunc("if", syntax),
        "pre": function pre(node) {
            return node.str;
        }
    });
};
var elseifFunc = function elseifFunc(syntax, parent) {
    return Object.assign({}, defaultParse, {
        "child": genifelseifChildFunc(syntax),
        "node": genifelseifNodeFunc("else if", syntax),
        "pre": function pre(node) {
            return node.str;
        }
    });
};
var elseFunc = function elseFunc(syntax, parent) {
    return Object.assign({}, defaultParse, {
        "child": function child() {
            return syntax.right;
        },
        "pre": function pre(node) {
            return "else";
        }
    });
};
var forFunc = function forFunc(syntax, parent) {
    return Object.assign({}, defaultParse, {
        "child": function child() {
            var childs = [],
                expr = void 0,
                body = void 0,
                right = syntax.right;
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
        },
        "node": function node(childs) {
            var node = new ParserNode(),
                expr = void 0,
                body = void 0,
                type = void 0,
                right = syntax.right,
                forRet = void 0,
                extra = void 0;
            node.str = "";
            if (right.length === 5) {
                type = right[2].value;
                if (type === "of") {
                    forRet = right[1].value;
                    extra = right[0].value;
                } else if (type === "in") {
                    forRet = right[0].value;
                    extra = right[1].value;
                }
                expr = childs.length == 2 ? childs[0].str : right[3].value;
                body = right[4];
            } else if (right.length === 4) {
                type = right[1].value;
                forRet = right[0].value;
                expr = childs.length == 2 ? childs[0].str : right[2].value;
                body = right[3];
            }
            if (type === "of" && right.length === 5) {
                node.str += "{let _$i = 0;\n\t\t\t\t";
            }
            node.str += "for(let " + forRet + " " + type + " " + expr + "){";
            if (type === "of" && right.length === 5) {
                node.str += "let " + extra + " = _$i++;";
            } else if (type === "in" && right.length === 5) {
                node.str += "let " + extra + " = " + expr + "[" + forRet + "];";
            }
            return node;
        },
        "pre": function pre(node) {
            return node.str;
        },
        "suf": function suf(node) {
            var str = "}";
            if (syntax.right[2].value === "of") {
                str += "}";
            }
            return str;
        }
    });
};
var whileFunc = function whileFunc(syntax, parent) {
    return Object.assign({}, defaultParse, {
        "child": function child() {
            var childs = [];
            if (!isBuildIn(syntax.right[0])) {
                childs.push(syntax.right[0]);
            }
            childs.push(syntax.right[1]);
            return childs;
        },
        "node": function node(childs) {
            var node = new ParserNode();
            node.str = "while(";
            if (childs.length == 2) node.str += childs[0].str + "){";else node.str += syntax.right[0] + "){";
            return node;
        },
        "pre": function pre(node) {
            return node.str;
        },
        "suf": function suf(node) {
            return "}";
        }
    });
};
var jscontinueFunc = function jscontinueFunc(syntax, parent) {
    return Object.assign({}, defaultParse, {
        "pre": function pre(node) {
            return "continue;";
        }
    });
};
var regularFunc = function regularFunc(syntax, parent) {
    return Object.assign({}, defaultParse, {
        "node": function node(_node) {
            return syntax.value;
        }
    });
};
var jsbreankFunc = function jsbreankFunc(syntax, parent) {
    return Object.assign({}, defaultParse, {
        "pre": function pre(node) {
            return "break;";
        }
    });
};
var newFunc = function newFunc(syntax, parent) {
    return Object.assign({}, defaultParse, {
        "child": function child() {
            return isBuildIn(syntax.right[0]) ? [] : syntax.right;
        },
        "node": function node(childs) {
            var node = new ParserNode();
            if (!isBuildIn(syntax.right[0])) node.str = "new " + childs[0].str + ";";else node.str = "new " + syntax.right[0].value + ";";
            return node;
        }
    });
};
var condFunc = function condFunc(syntax, parent) {
    return Object.assign({}, defaultParse, {
        "child": function child() {
            var childs = [];
            if (!isBuildIn(syntax.left)) childs.push(syntax.left);
            if (!isBuildIn(syntax.right[0])) childs.push(syntax.right[0]);
            if (!isBuildIn(syntax.right[1])) childs.push(syntax.right[1]);
            return childs;
        },
        "node": function node(childs) {
            var index = 0;
            var node = new ParserNode();
            if (!isBuildIn(syntax.left)) node.str = childs[index++].str + "?";else node.str = syntax.left.value + "?";
            if (!isBuildIn(syntax.right[0])) node.str += childs[index++].str + ":";else node.str += syntax.right[0].value + ":";
            if (!isBuildIn(syntax.right[1])) node.str += childs[index].str;else node.str += syntax.right[1].value;
            return node;
        }
    });
};
var attrsFunc = function attrsFunc(syntax, parent) {
    return Object.assign({}, defaultParse, {
        "child": function child() {
            return syntax.right;
        },
        "node": function node(childs) {
            var node = containScript(childs);
            calHash(childs, node);
            return node;
        },
        "pre": function pre(node) {
            var size = 0;
            var str = "";
            for (var i = 0; i < syntax.right.length; i++) {
                var name = syntax.right[i].right[0].value;
                if (name != "w-tag" && name != "w-did") {
                    size++;
                }
            }
            if (size > 0) {
                str += "node.attrSize = " + size + ";";
            }
            str += "node.attrHash = " + node.hash + ";";
            return str;
        }
    });
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
//汇总静态hash
var calHash = function calHash(childs, node) {
    for (var i = 0; i < childs.length; i++) {
        if (childs[i].hash) {
            node.hash = hash.nextHash(node.hash, childs[i].hash);
        }
    }
};
var lstringFunc = function lstringFunc(syntax, parent) {
    return Object.assign({}, defaultParse, {
        "node": function node(childs) {
            var node = new ParserNode();
            node.hash = tpl_1.calTextHash(syntax.value);
            return node;
        },
        "pre": function pre(node) {
            var str = "";
            var parentType = "";
            if (syntax.parent.type == "body") {
                if (syntax.parent.parent.type == "else") {
                    parentType = syntax.parent.parent.parent.parent.parent.type;
                } else {
                    parentType = syntax.parent.parent.parent.parent.type;
                }
            } else {
                parentType = syntax.parent.type;
            }
            if (parentType == "attrscript") {
                str = "attrvalue += \"" + syntax.value + "\";";
            } else if (parentType == "singleattrscript") {
                str = "attrvalue += '" + syntax.value + "';";
            } else if (parentType == "jscript") {
                str = "jvalue += \"" + syntax.value + "\";";
            }
            return str;
        }
    });
};
var jsfnFunc = function jsfnFunc(syntax, parent) {
    return Object.assign({}, defaultParse, {
        "child": function child() {
            syntax.parent = parent;
            for (var i = 0; i < syntax.right.length; i++) {
                syntax.right[i].parent = syntax;
            }
            return syntax.right;
        },
        "node": function node(childs) {
            var node = new ParserNode();
            node.str = "function" + childs[0].str + childs[1].str;
            return node;
        }
    });
};
var jsfnargsFunc = function jsfnargsFunc(syntax, parent) {
    return Object.assign({}, defaultParse, {
        "node": function node(childs) {
            var node = new ParserNode();
            var lastIndex = syntax.right.length - 1;
            node.str = "(";
            for (var i = 0; i < lastIndex; i++) {
                node.str += syntax.right[i].value + ",";
            }
            if (syntax.right[lastIndex]) node.str += syntax.right[lastIndex].value;
            node.str += ")";
            return node;
        }
    });
};
var jsblockFunc = function jsblockFunc(syntax, parent) {
    return Object.assign({}, defaultParse, {
        "child": function child() {
            return syntax.right;
        },
        "node": function node(childs) {
            var node = new ParserNode();
            var index = 0;
            node.str = "{";
            for (var i = 0; i < syntax.right.length; i++) {
                if (!isBuildIn(syntax.right[i])) node.str += childs[index++].str + ";";else node.str += syntax.right[i].value + ";";
            }
            node.str += "}";
            return node;
        }
    });
};
var jsbodyFunc = function jsbodyFunc(syntax, parent) {
    return Object.assign({}, defaultParse, {
        "child": function child() {
            return syntax.right;
        },
        "node": function node(childs) {
            var node = new ParserNode();
            var index = 0;
            node.str = "{";
            for (var i = 0; i < syntax.right.length; i++) {
                if (!isBuildIn(syntax.right[i])) node.str += childs[index++].str + ";";else node.str += syntax.right[i].value + ";";
            }
            node.str += "}";
            return node;
        }
    });
};
var jsdefFunc = function jsdefFunc(syntax, parent) {
    return Object.assign({}, defaultParse, {
        "child": function child() {
            return syntax.right;
        },
        "node": function node(childs) {
            var node = new ParserNode();
            var index = 0;
            node.str = "let ";
            for (var i = 0; i < childs.length - 1; i++) {
                node.str += childs[i].str + ",";
            }
            if (childs.length > 0) {
                node.str += childs[childs.length - 1].str;
            }
            return node;
        }
    });
};
var genjsifNodeFunc = function genjsifNodeFunc(op, syntax) {
    return function (childs) {
        var n = new ParserNode();
        n.str = op;
        if (syntax.right[0].type === "identifier" || isBuildIn(syntax.right[0])) {
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
    return Object.assign({}, defaultParse, {
        "node": function node(childs) {
            var node = new ParserNode();
            node.str = syntax.value;
            calHash(childs, node);
            return node;
        }
    });
};
var genRightBuiltIn = function genRightBuiltIn(syntax) {
    var childs = [];
    for (var i = 0; i < syntax.right.length; i++) {
        if (!isBuildIn(syntax.right[i])) childs.push(syntax.right[i]);
    }
    return childs;
};
var jsifFunc = function jsifFunc(syntax, parent) {
    return Object.assign({}, defaultParse, {
        "child": genifelseifChildFunc(syntax),
        "node": genjsifNodeFunc("if", syntax)
    });
};
var jselseifFunc = function jselseifFunc(syntax, parent) {
    return Object.assign({}, defaultParse, {
        "child": genifelseifChildFunc(syntax),
        "node": genjsifNodeFunc("else if", syntax)
    });
};
var jselseFunc = function jselseFunc(syntax, parent) {
    return Object.assign({}, defaultParse, {
        "child": function child() {
            return syntax.right;
        },
        "node": function node(childs) {
            var node = new ParserNode();
            if (childs[0]) {
                node.str = "else ";
                node.str += childs[0].str;
            }
            return node;
        }
    });
};
var jsforFunc = function jsforFunc(syntax, parent) {
    return Object.assign({}, defaultParse, {
        "child": function child() {
            return syntax.right;
        },
        "node": function node(childs) {
            if (syntax.right.length != 4) {
                throw "for语句,必须且只能包含三个条件和一个代码块！";
            }
            var node = new ParserNode();
            node.str = "for(" + childs[0].str + ";" + childs[1].str + ";" + childs[2].str + ")" + childs[3].str;
            return node;
        }
    });
};
var jswhileFunc = function jswhileFunc(syntax, parent) {
    return Object.assign({}, defaultParse, {
        "child": function child() {
            return genRightBuiltIn(syntax);
        },
        "node": function node(childs) {
            var node = new ParserNode();
            node.str = "while(";
            if (isBuildIn(syntax.right[0])) {
                node.str += syntax.right[0].value + ")";
                node.str += childs[0].str;
            } else {
                node.str += childs[0].str + ")";
                node.str += childs[1].str;
            }
            return node;
        }
    });
};
var jsswitchFunc = function jsswitchFunc(syntax, parent) {
    return Object.assign({}, defaultParse, {
        "child": function child() {
            return genRightBuiltIn(syntax);
        },
        "node": function node(childs) {
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
                node.str += childs[i].str + ";";
            }
            node.str += "}";
            return node;
        }
    });
};
var jscaseFunc = function jscaseFunc(syntax, parent) {
    return Object.assign({}, defaultParse, {
        "child": function child() {
            return genRightBuiltIn(syntax);
        },
        "node": function node(childs) {
            var node = new ParserNode();
            node.str = "case " + syntax.right[0].value + ":\n\t\t\t";
            for (var i = 0; i < childs.length; i++) {
                node.str += childs[i].str + ";";
            }
            return node;
        }
    });
};
var jsdefaultFunc = function jsdefaultFunc(syntax, parent) {
    return Object.assign({}, defaultParse, {
        "child": function child() {
            return syntax.right;
        },
        "node": function node(childs) {
            var node = new ParserNode();
            node.str = "default:";
            for (var i = 0; i < childs.length; i++) {
                node.str += childs[i].str + ";";
            }
            return node;
        }
    });
};
var jstryFunc = function jstryFunc(syntax, parent) {
    return Object.assign({}, defaultParse, {
        "child": function child() {
            return syntax.right;
        },
        "node": function node(childs) {
            var node = new ParserNode();
            node.str = "try" + childs[0].str;
            for (var i = 1; i < childs.length; i++) {
                node.str += childs[i].str;
            }
            return node;
        }
    });
};
var jscatchFunc = function jscatchFunc(syntax, parent) {
    return Object.assign({}, defaultParse, {
        "child": function child() {
            return genRightBuiltIn(syntax);
        },
        "node": function node(childs) {
            var node = new ParserNode();
            node.str = "catch(" + syntax.right[0].value + ")" + childs[0].str;
            return node;
        }
    });
};
var jsfinallyFunc = function jsfinallyFunc(syntax, parent) {
    return Object.assign({}, defaultParse, {
        "child": function child() {
            return syntax.right;
        },
        "node": function node(childs) {
            var node = new ParserNode();
            node.str = "finally" + childs[0].str;
            return node;
        }
    });
};
var jsreturnFunc = function jsreturnFunc(syntax, parent) {
    return Object.assign({}, defaultParse, {
        "child": function child() {
            return syntax.right;
        },
        "node": function node(childs) {
            var node = new ParserNode();
            node.str = "return";
            if (childs[0].str) node.str += " " + childs[0].str;
            return node;
        }
    });
};
var exprgroupFunc = function exprgroupFunc(syntax, parent) {
    return Object.assign({}, defaultParse, {
        "child": function child() {
            return syntax.right;
        },
        "node": function node(childs) {
            var node = new ParserNode();
            node.str = "";
            if (childs === null) return node;
            var lastIndex = childs.length - 1;
            for (var i = 0; i < lastIndex; i++) {
                node.str += childs[i].str + ",";
            }
            if (childs[lastIndex]) {
                node.str += childs[lastIndex].str;
            }
            return node;
        }
    });
};
var singlelstringFunc = lstringFunc;
var parserFunc = {
    "jarr": jarrFunc,
    "jobj": jobjFunc,
    "jpair": jpairFunc,
    "stringstr": stringstrFunc,
    "jscript": jscriptFunc,
    "jstring": jstringFunc,
    "number": baseFunc,
    "bool": baseFunc,
    "null": baseFunc,
    "body": bodyFunc,
    "script": scriptFunc,
    "exec": execFunc,
    "fielde": fieldeFunc,
    "field": fieldFunc,
    "call": callFunc,
    "def": defFunc,
    "dv": dvFunc,
    "!": negFunc,
    "--": mulmulFunc,
    "++": addaddFunc,
    "=": assignFunc,
    "+": addFunc,
    "-": subFunc,
    "*": mulFunc,
    "/": divFunc,
    "%": remFunc,
    "+=": addEqualFunc,
    "-=": subEqualFunc,
    "*=": mulEqualFunc,
    "/=": divEqualFunc,
    "%=": remEqualFunc,
    "===": tripleEqualFunc,
    "!==": tripleUnequalFunc,
    "==": doubleEqualFunc,
    "!=": doubleUnequalFunc,
    "<=": lessEqualFunc,
    ">=": bigEqualFunc,
    "<": lessFunc,
    ">": bigFunc,
    "|": orFunc,
    "&": andFunc,
    "||": ororFunc,
    "&&": andandFunc,
    "bracket": bracketFunc,
    "obj": objFunc,
    "kv": kvFunc,
    "arr": arrFunc,
    "jsexpr": jsExprFunc,
    "if": ifFunc,
    "else": elseFunc,
    "elseif": elseifFunc,
    "for": forFunc,
    "while": whileFunc,
    "jscontinue": jscontinueFunc,
    "jsbreak": jsbreankFunc,
    "return": genBaseFunc,
    "new": newFunc,
    "cond": condFunc,
    "jsblock": jsblockFunc,
    "jsbody": jsbodyFunc,
    "jsfnargs": jsfnargsFunc,
    "jsfn": jsfnFunc,
    "jsdef": jsdefFunc,
    "jsif": jsifFunc,
    "jselseif": jselseifFunc,
    "jselse": jselseFunc,
    "jsfor": jsforFunc,
    "jswhile": jswhileFunc,
    "jsswitch": jsswitchFunc,
    "jscase": jscaseFunc,
    "jsdefault": jsdefaultFunc,
    "jstry": jstryFunc,
    "jscatch": jscatchFunc,
    "jsfinally": jsfinallyFunc,
    "jsreturn": jsreturnFunc,
    "exprgroup": exprgroupFunc,
    "identifier": genBaseFunc,
    "float": genBaseFunc,
    "floate": genBaseFunc,
    "integer16": genBaseFunc,
    "integer": genBaseFunc,
    "integer10": genBaseFunc,
    "string": genBaseFunc,
    "true": genBaseFunc,
    "false": genBaseFunc,
    ";": genBaseFunc
    // "identifier":identifierFunc//identifier,只在js中可能被解析到
};
parserFunc.html = parserFunc.body;
parserFunc.el = parserFunc.body;
/**
 * 将child的hash汇总为childhash
 */
var sumChildHash = function sumChildHash(node, childs) {
    for (var i = 0; i < childs.length; i++) {
        node.childHash ^= hash.nextHash(tpl_1.calTextHash(childs[i].hash + ""), i + 1);
    }
    node.hash ^= node.childHash;
};
/**
 * 只有tag才需要用到的
 */
var calTagHash = function calTagHash(node, tagName) {
    node.hash = hash.nextHash(node.hash, tpl_1.calTextHash(tagName));
};
//字符都有双层引号，并不需要去掉，因为在字符串转函数的时候会自动去掉一层
var trimQuo = function trimQuo(str) {
    return str.substring(1, str.length - 1);
};
var isBuildIn = function isBuildIn(syntax) {
    return syntax.type == "string" || syntax.type == "number" || syntax.type == "bool" || syntax.type == "true" || syntax.type == "false" || syntax.type == "null" || syntax.type == "undefined" || syntax.type == "integer" || syntax.type == "integer16" || syntax.type == "float" || syntax.type == "identifier" || syntax.type == "singlequotestring" || syntax.type == "regular";
};
var isScript = function isScript(syntax) {
    return syntax.type == "script";
};
var isjstrjscript = function isjstrjscript(syntax) {
    return syntax.type == "jscript" || syntax.type == "jstr";
};
//本身就有引号了
var parseBuildIn = function parseBuildIn(syntax) {
    return syntax.value;
};
var isAttrStr = function isAttrStr(syntax) {
    return syntax.type == "attrStr";
};
// ================ JS的处理整体要简单很多
// child -> node->pre -> suf
var defaultParse = {
    "child": function child() {
        return [];
    },
    "node": function node(childs) {
        var node = new ParserNode();
        return node;
    },
    "pre": function pre(node) {
        return "";
    },
    "suf": function suf(node) {
        return "";
    }
};
var sid = 0;
var getJsonKey = function getJsonKey(syntax) {
    if (syntax.type === "jstring") {
        return "\"" + syntax.right[0].value + "\"";
    } else if (syntax.type === "identifier") {
        return "\"" + syntax.value + "\"";
    }
};
var findJsonContainer = function findJsonContainer(syntax) {
    if (!syntax) {
        return null;
    }
    if (syntax.type === "jarr" || syntax.type === "jpair") {
        return syntax;
    }
    return findJsonContainer(syntax.parent);
};
var getJarrJpair = function getJarrJpair(p, value) {
    if (p.type === "jarr") {
        return "node.push(" + value + ");";
    } else {
        var key = getJsonKey(p.right[0]);
        return "node[" + key + "] = " + value + ";";
    }
};
/**
 * @description 转换字符串成模板函数
 * @example
 */
exports.toFun = function (s, path) {
    try {
        return new Function("_nextHash", "_anyHash", "_get", "return" + s.slice(0, s.length - 1))(hash.nextHash, hash.anyHash, mod_1.commonjs ? mod_1.commonjs.relativeGet : null);
    } catch (e) {
        log_1.warn(exports.level, "tpl toFun, path: " + path + ", s: ", s, e);
        throw e;
    }
};
})