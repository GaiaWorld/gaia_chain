_$define("pi/compile/gendrust", function (require, exports, module){
"use strict";

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

Object.defineProperty(exports, "__esModule", { value: true });
var hash = require("../util/hash");
var tpl_1 = require("../util/tpl");
var tpl_str_1 = require("../util/tpl_str");
var util_1 = require("../util/util");
// 将语法树转换成ts代码
exports.gen = function (syntax, path, cfg) {
				var arr = preorder(syntax).childs;
				return exports.tplFunc(null, arr, path, cfg);
};
// ====================================== 本地
// 先序遍历
var preorder = function preorder(syntax) {
				var funcs = seekFunc(syntax);
				var childs = funcs.child();
				var childNodes = [];
				for (var i = 0; i < childs.length; i++) {
								var childNode = preorder(childs[i]);
								if (childNode) childNodes.push(childNode); // 存在空文本节点的情况		
				}
				return funcs.node(childNodes);
};
// 每一个节点都有pre字符串和suf字符串
var seekFunc = function seekFunc(syntax) {
				try {
								return parserFunc[syntax.type](syntax);
				} catch (error) {
								throw new Error("parserFunc[" + syntax.type + "]\u4E0D\u662F\u4E00\u4E2A\u65B9\u6CD5\uFF01");
				}
};
var tupleBodyFunc = function tupleBodyFunc(syntax) {
				return Object.assign({}, defaultParse, { child: function child() {
												return syntax.right;
								}, node: function node(childs) {
												var node = new Type();
												node.type = 'Tuple';
												node.genType = [];
												for (var i = 0; i < childs.length; i++) {
																node.genType.push(childs[i]);
												}
												return node;
								} });
};
var typeFunc = function typeFunc(syntax) {
				return Object.assign({}, defaultParse, { child: function child() {
												return syntax.right;
								}, node: function node(childs) {
												return childs[0];
								} });
};
var baseTypeFunc = function baseTypeFunc(syntax) {
				return Object.assign({}, defaultParse, { node: function node(childs) {
												var node = new Type();
												node.type = syntax.right[0].value;
												return node;
								} });
};
var arrBodyFunc = function arrBodyFunc(syntax) {
				return Object.assign({}, defaultParse, { child: function child() {
												return [syntax.right[0]]; // type
								}, node: function node(childs) {
												var node = new Type();
												node.type = 'Array';
												node.genType = childs[0];
												return node;
								} });
};
var igenTypeFunc = function igenTypeFunc(syntax) {
				return Object.assign({}, defaultParse, { child: function child() {
												return [syntax.right[syntax.right.length - 1]]; // genType
								}, node: function node(childs) {
												var node = new Type();
												node.type = syntax.right[0].value;
												node.genType = childs[0].genType;
												return node;
								} });
};
var structTypeFunc = function structTypeFunc(syntax) {
				return Object.assign({}, defaultParse, { child: function child() {
												return []; // genType
								}, node: function node(childs) {
												var node = new Type();
												var ts = [];
												for (var i = 0; i < syntax.right.length; i++) {
																ts.push(syntax.right[i].value);
												}
												node.type = ts.join('.');
												return node;
								} });
};
var onlyRightFunc = function onlyRightFunc(syntax) {
				return Object.assign({}, defaultParse, { child: function child() {
												return syntax.right;
								} });
};
var valueFunc = function valueFunc(syntax) {
				return Object.assign({}, defaultParse, { node: function node(childs) {
												var node = new ParserNode();
												node.str = syntax.value;
												return node;
								} });
};
var fileFunc = function fileFunc(syntax) {
				return Object.assign({}, defaultParse, { child: function child() {
												return syntax.right;
								}, node: function node(childs) {
												var node = new ParserNode();
												node.childs = childs;
												return node;
								} });
};
// 定义结构体或枚举
var defFunc = function defFunc(syntax) {
				return Object.assign({}, defaultParse, { child: function child() {
												return syntax.right.slice(1, syntax.right.length); // genType, enumBody|structBody
								}, node: function node(childs) {
												var right = syntax.right;
												var node = new Struct();
												node.name = right[0].value;
												node.type = syntax.type;
												if (right[1] && right[1].type === 'genType') {
																node.genType = childs[0].genType;
																node.members = childs.splice(1, childs.length);
												} else {
																node.members = childs;
												}
												parseNote(syntax, node); // 解析注释和注解
												return node;
								} });
};
var enumMemberFunc = function enumMemberFunc(syntax) {
				return Object.assign({}, defaultParse, { node: function node(childs) {
												var right = syntax.right;
												var node = new Member();
												parseNote(syntax, node); // 解析注释和注解
												node.name = right[0].value; // key
												// type
												if (right[1]) {
																var t = new Type();
																t.type = right[1].right[0].value;
																node.type = t;
												}
												return node;
								} });
};
var enumMembercFunc = function enumMembercFunc(syntax) {
				return Object.assign({}, defaultParse, { node: function node(childs) {
												var right = syntax.right;
												var node = new Member();
												parseNote(syntax, node); // 解析注释和注解
												node.name = right[0].value; // key
												// type
												if (right[1]) {
																node.value = right[1].value;
												}
												return node;
								} });
};
var structKeyTypeFunc = function structKeyTypeFunc(syntax) {
				return Object.assign({}, defaultParse, { child: function child() {
												return [syntax.right[syntax.right.length - 1]]; // type
								}, node: function node(childs) {
												var right = syntax.right;
												var node = new Member();
												parseNote(syntax, node); // 解析注释和注解
												node.name = right[0].value; // key
												node.type = childs[0];
												return node;
								} });
};
var genTypeFunc = function genTypeFunc(syntax) {
				return Object.assign({}, defaultParse, { child: function child() {
												var arr = [];
												var right = syntax.right; // type(不包含lifetime)
												for (var i = 0; i < right.length; i++) {
																if (right[i].type !== 'lifetime') {
																				arr.push(right[i]);
																}
												}
												return arr;
								}, node: function node(childs) {
												var node = new GenType();
												node.genType = [];
												for (var i = 0; i < childs.length; i++) {
																node.genType.push(childs[i]);
												}
												return node;
								} });
};
var importFunc = function importFunc(syntax) {
				return Object.assign({}, defaultParse, { child: function child() {
												return syntax.right;
								}, node: function node(childs) {
												var node = new Import();
												node.type = 'import';
												var paths = [];
												var contents = void 0;
												for (var i = 0; i < childs.length; i++) {
																if (i < childs.length - 1) {
																				paths.push(childs[i].str);
																} else {
																				contents = childs[i].str.split(',');
																}
												}
												node.path = paths.join('/');
												node.contents = contents;
												parseNote(syntax, node); // 解析注释和注解
												return node;
								} });
};
var importOneFunc = function importOneFunc(syntax) {
				return Object.assign({}, defaultParse, { child: function child() {
												return syntax.right;
								}, node: function node(childs) {
												var node = new Import();
												node.type = 'importOne';
												var paths = [];
												var contents = void 0;
												for (var i = 0; i < childs.length; i++) {
																if (i < childs.length - 1) {
																				paths.push(childs[i].str);
																} else {
																				contents = childs[i].str.split(',');
																}
												}
												node.path = paths.join('/');
												node.contents = contents;
												parseNote(syntax, node); // 解析注释和注解
												return node;
								} });
};
var importCsFunc = function importCsFunc(syntax) {
				return Object.assign({}, defaultParse, { child: function child() {
												return syntax.right;
								}, node: function node(childs) {
												var node = new ParserNode();
												var strs = [];
												for (var i = 0; i < childs.length; i++) {
																strs.push(childs[i].str);
												}
												node.str = strs.join(',');
												return node;
								} });
};
var parserFunc = {
				defStruct: defFunc,
				structKeyType: structKeyTypeFunc,
				importOne: importOneFunc,
				importMany: importFunc,
				importCs: importCsFunc,
				defEnum: defFunc,
				enumMember: enumMemberFunc,
				enumMemberc: enumMembercFunc,
				defStructEmpty: defFunc,
				defStructTuple: defFunc,
				genType: genTypeFunc,
				structType: structTypeFunc,
				type: typeFunc,
				baseType: baseTypeFunc,
				tupleBody: tupleBodyFunc,
				igenType: igenTypeFunc,
				arrBody: arrBodyFunc,
				file: fileFunc,
				identifier: valueFunc,
				string: valueFunc,
				bool: valueFunc,
				char: valueFunc,
				i8: valueFunc,
				i16: valueFunc,
				i32: valueFunc,
				i64: valueFunc,
				u8: valueFunc,
				u16: valueFunc,
				u32: valueFunc,
				u64: valueFunc,
				isize: valueFunc,
				usize: valueFunc,
				f32: valueFunc,
				f64: valueFunc,
				integer: valueFunc,
				float: valueFunc,
				integer10: valueFunc,
				integer16: valueFunc,
				floate: valueFunc
};
// ================ JS的处理整体要简单很多
// child -> node->pre -> suf
var defaultParse = {
				child: function child() {
								return [];
				},
				node: function node(childs) {
								return new ParserNode();
				}
};
// 解析注释和注解
var parseNote = function parseNote(syntax, node) {
				if (syntax.preNotes) {
								var preNotes = syntax.preNotes;
								for (var i = 0; i < preNotes.length; i++) {
												if (preNotes[i].type === 'commentBlockPre' || preNotes[i].type === 'commentLinePre') {
																if (!node.preComment) {
																				node.preComment = [];
																}
																node.preComment.push(preNotes[i].value);
												} else if (preNotes[i].type === 'annotatePre') {
																if (!node.annotate) {
																				node.annotate = {};
																}
																var ans = preNotes[i].value.slice(3, preNotes[i].value.length - 1).split(',');
																parseAnnotate(ans, node.annotate);
												}
								}
				}
				if (syntax.sufNotes) {
								var sufNotes = syntax.sufNotes;
								for (var _i = 0; _i < sufNotes.length; _i++) {
												if (sufNotes[_i].type === 'commentBlockSuf' || sufNotes[_i].type === 'commentLineSuf') {
																if (!node.sufNotes) {
																				node.sufNotes = [];
																}
																node.sufNotes.push(sufNotes[_i].value);
												} else if (sufNotes[_i].type === 'annotateSuf') {
																if (!node.annotate) {
																				node.annotate = {};
																}
																var _ans = sufNotes[_i].value.slice(2, sufNotes[_i].value.length - 1).split(',');
																parseAnnotate(_ans, node.annotate);
												}
								}
				}
};
// 解析注解
var parseAnnotate = function parseAnnotate(ans, anno) {
				var temp = void 0;
				for (var i = 0; i < ans.length; i++) {
								temp = ans[i].split('=');
								if (temp.length === 1) {
												anno[temp[0]] = true;
								} else if (temp.length === 2) {
												anno[temp[0]] = "" + temp[1];
								}
				}
};
var setTplFunc = function setTplFunc() {
				exports.tplFunc = exports.toFunc(tpl_1.compile(tplStr, tpl_str_1.Parser));
};

var TG = function TG() {
				_classCallCheck(this, TG);
};

exports.typeToString = function (tg) {
				if (tg.type === 'Tuple') {
								/* tslint:disable:prefer-template */
								return '[' + tg.genType.join(',') + ']';
				}
				var type = void 0;
				if (exports.isNumber(tg.type)) {
								type = 'number';
				} else if (exports.isString(tg.type)) {
								type = 'string';
				} else if (tg.type === 'bool') {
								type = 'boolean';
				} else {
								type = tg.type;
				}
				if (!tg.genType) {
								return type;
				}
				var str = void 0;
				if (tg.genType) {
								str += type + '<' + tg.genType.join(',') + '>';
				}
				return str;
};
exports.parseType = function (t) {
				var type = { type: t.type };
				if (!t.genType) {
								return type;
				}
				type.genType = [];
				for (var i = 0; i < t.genType.length; i++) {
								type.genType.push(exports.typeToString(exports.parseType(t.genType[i])));
				}
				return type;
};
exports.tansType = function (t) {
				return exports.typeToString(exports.parseType(t));
};
exports.isInteger = function (type) {
				if (type === 'i8' || type === 'i16' || type === 'i32' || type === 'i64' || type === 'u8' || type === 'u16' || type === 'u32' || type === 'u64' || type === 'isize' || type === 'usize') {
								return true;
				}
};
exports.isFloat = function (type) {
				if (type === 'f32' || type === 'f64') return true;
};
exports.isString = function (type) {
				if (type === 'str' || type === 'char') return true;
};
exports.isNumber = function (type) {
				if (exports.isInteger(type) || exports.isFloat(type)) return true;
};
exports.isBase = function (type) {
				if (exports.isNumber(type) || type === 'bool' || exports.isString(type)) return true;
};
exports.isBool = function (type) {
				if (type === 'bool') return true;
};
exports.isStruct = function (type) {
				if (!exports.isNumber(type) && !exports.isString(type) && type !== 'bool' && type !== 'Array' && type !== 'Map' && type !== 'Tuple') return true;
};

var ParserNode = function ParserNode() {
				_classCallCheck(this, ParserNode);
};

var Type = function (_ParserNode) {
				_inherits(Type, _ParserNode);

				function Type() {
								_classCallCheck(this, Type);

								return _possibleConstructorReturn(this, (Type.__proto__ || Object.getPrototypeOf(Type)).apply(this, arguments));
				}

				return Type;
}(ParserNode);
/* tslint:disable:max-classes-per-file */


var GenType = function (_ParserNode2) {
				_inherits(GenType, _ParserNode2);

				function GenType() {
								_classCallCheck(this, GenType);

								return _possibleConstructorReturn(this, (GenType.__proto__ || Object.getPrototypeOf(GenType)).apply(this, arguments));
				}

				return GenType;
}(ParserNode);

var Struct = function (_ParserNode3) {
				_inherits(Struct, _ParserNode3);

				function Struct() {
								_classCallCheck(this, Struct);

								return _possibleConstructorReturn(this, (Struct.__proto__ || Object.getPrototypeOf(Struct)).apply(this, arguments));
				}

				return Struct;
}(ParserNode);

var Import = function (_ParserNode4) {
				_inherits(Import, _ParserNode4);

				function Import() {
								_classCallCheck(this, Import);

								return _possibleConstructorReturn(this, (Import.__proto__ || Object.getPrototypeOf(Import)).apply(this, arguments));
				}

				return Import;
}(ParserNode);

var Member = function (_ParserNode5) {
				_inherits(Member, _ParserNode5);

				function Member() {
								_classCallCheck(this, Member);

								return _possibleConstructorReturn(this, (Member.__proto__ || Object.getPrototypeOf(Member)).apply(this, arguments));
				}

				return Member;
}(ParserNode);

var Members = function (_ParserNode6) {
				_inherits(Members, _ParserNode6);

				function Members() {
								_classCallCheck(this, Members);

								return _possibleConstructorReturn(this, (Members.__proto__ || Object.getPrototypeOf(Members)).apply(this, arguments));
				}

				return Members;
}(ParserNode);

var createWBStr = function createWBStr(type, key) {
				if (type.type === 'f32') {
								return "bb.writeF32(this." + key + ");";
				} else if (type.type === 'f64') {
								return "bb.writeF64(this." + key + ");";
				} else if (exports.isInteger(type.type)) {
								return "bb.writeInt(this." + key + ");";
				} else if (exports.isString(type.type)) {
								return "bb.writeUtf8(this." + key + ");";
				} else if (type.type === 'bool') {
								return "bb.writeBool(this." + key + ");";
				}
};
/**
 * @description  返回定义的函数, 用定义字符串，转成匿名函数的返回函数
 * @example
 */
exports.toFunc = function (s) {
				try {
								/* tslint:disable:no-function-constructor-with-string-args prefer-template*/
								return new Function('_stringify', '_tansType', '_typeToString', '_parseType', '_isStruct', '_isInteger', '_isString', '_createWBStr', '_isBase', '_strHashCode', '_upperFirst', 'return ' + s)(tpl_1.toString, exports.tansType, exports.typeToString, exports.parseType, exports.isStruct, exports.isInteger, exports.isString, createWBStr, exports.isBase, hash.strHashCode, util_1.upperFirst);
				} catch (e) {
								// warn(level, "tpl toFun, path: "+", s: ", s, e);
								throw e;
				}
};
/* tslint:disable:max-line-length*/
var tplStr = "\n\n\t{{let _path = it1}}\n\n\t{{let _cfg = it2}}\n\n\timport { partWrite, allWrite } from \"{{_cfg.util}}\";\n\n\timport { BinBuffer, BinCode, ReadNext, WriteNext } from \"{{_cfg.bin}}\";\n\n\timport { addToMeta, removeFromMeta, Struct, notifyModify, StructMgr } from \"{{_cfg.mgr}}\";\n\n\t{{for k, v of it}}\n\n\t{{if v.type === \"import\" || \"importOne\"}}\n\n\t{{if v.sufComment}}{{for i, v1 of v.sufComment}}{{v1}}{{end}}{{end}}\n\n\t{{if v.type === \"import\"}}\n\n\t{{if v.annotate && v.annotate.path}}\n\n\timport { {{for index, c of v.contents}}{{if index > 0}},{{end}}{{c}}{{end}} } from \"{{v.annotate.path + v.path}}\";\n\n\t{{else}}\n\n\timport { {{for index, c of v.contents}}{{if index > 0}},{{end}}{{c}}{{end}} } from \"./{{v.path}}\";\n\n\t{{end}}\n\n\t{{elseif v.type === \"importOne\"}}\n\n\t{{if v.annotate && v.annotate.path}}\n\n\timport * as {{v.contents[0]}} from \"{{v.annotate.path + v.path + v.contents[0]}}\";\n\n\t{{else}}\n\n\timport * as {{v.contents[0]}} from \"./{{v.path + v.contents[0]}}\";\n\n\t{{end}}\n\n\t{{end}}\n\n\t{{if v.preComment}}{{for i, v1 of v.preComment}}{{v1}}{{end}}{{end}}\n\n\t{{end}}\n\n\t{{end}}\n\n\n\n\t{{for k, v of it}}\n\n\t{{if v.type === \"defStruct\" || v.type === \"defStructEmpty\"}}\n\n\t{{if v.sufComment}}{{for i, v1 of v.sufComment}}{{v1}}{{end}}{{end}}\n\n\t{{let members = v.members}}\n\n\t{{let clazz = v.name }}\n\n\texport class {{clazz}} {{if v.genType}}<{{for i, v1 of v.genType}}{{if i > 0}},{{end}}{{_tansType(v1)}}{{end}}>{{end}} extends {{if v.annotate && v.annotate.extends}}{{v.annotate.extends}}{{else}}Struct{{end}} {\n\n\t\t{{for i, v1 of members}}\n\n\t\t{{if v1.sufComment}}\n\n\t\t{{for j, vv of v.sufComment}}\n\n\t\t\n\n\t\t{{ vv }}\n\n\t\t{{end}}\n\n\t\t{{end}}\n\n\t\t{{if (v.annotate && v.annotate.readonly === \"true\") || (v1.annotate && v1.annotate.readonly === \"true\")}}\n\n\t\treadonly {{v1.name}}: {{_tansType(v1.type)}}\n\n\t\t{{else}}\n\n\n\n\t\t{{v1.name}}: {{_tansType(v1.type)}}\n\n\t\t{{end}}\n\n\t\t{{if v1.annotate && v1.annotate.default != undefined}} = {{v1.annotate.default}}{{end}};\n\n\t\t{{if v1.preComment}}{{for j, vv of v.preComment}}{{ vv }}{{end}}{{end}}\n\n\t\t{{end}}\n\n\n\n\t\t{{% \u79FB\u9664}}\n\n\t\t{{if v.annotate && v.annotate.readonly === \"true\"}}\n\n\t\tconstructor({{for j, v1 of members}}{{if j > 0}},{{end}}{{v1.name}}?: {{_tansType(v1.type)}}{{end}}, old?: {{clazz}}){\n\n\t\t\tsuper();\n\n\t\t\tif(!old){\n\n\t\t\t\t{{for j, v1 of members}}\n\n\t\t\t\tthis.{{v1.name}} = {{v1.name}};\n\n\t\t\t\t{{end}}\n\n\t\t\t}else{\n\n\t\t\t\t{{for j, v1 of members}}\n\n\t\t\t\tthis.{{v1.name}} = {{v1.name}} === undefined? old.{{v1.name}}:{{v1.name}};\n\n\t\t\t\t{{end}}\n\n\t\t\t}\n\n\t\t}\n\n\t\t{{end}}\n\n\n\n\t\t{{% \u6DFB\u52A0}}\n\n\t\taddMeta(mgr: StructMgr){\n\n\t\t\tif(this._$meta)\n\n\t\t\t\treturn;\n\n\t\t\t{{for j, v1 of members}}\n\n\t\t\t{{if _isStruct(v1.type.type)}}\n\n\t\t\tthis.{{v1.name}} && this.{{v1.name}}.addMeta(mgr);\n\n\t\t\t{{elseif v1.type === \"Array\" && _isStruct(v1.type.genType[0].type)}}\n\n\t\t\tif(this.{{v1.name}}){\n\n\t\t\t\tfor(let i = 0; i < this.{{v1.name}}.length; i++){\n\n\t\t\t\t\tif(this.{{v1.name}}[i]){\n\n\t\t\t\t\t\tthis.{{v1.name}}[i].addMeta(mgr);\n\n\t\t\t\t\t}\n\n\t\t\t\t}\n\n\t\t\t}\n\n\t\t\t{{elseif v1.type === \"Tuple\"}}\n\n\t\t\t{{for j2,v2 of v1.genType}}\n\n\t\t\t{{if _isStruct(v2.type)}}\n\n\t\t\tif(this.{{v1.name}}[j2])\n\n\t\t\t\tthis.{{v1.name}}[j2].addMeta(mgr);\n\n\t\t\t{{end}}\n\n\t\t\t{{end}}\n\n\t\t\t{{elseif v1.type === \"Map\" && _isStruct(v1.type.genType[1].type)}}\n\n\t\t\tif(this.{{v1.name}}){\n\n\t\t\t\tthis.{{v1.name}}.forEach((v,k) => {\n\n\t\t\t\t\tv && c.addMeta(mgr);\n\n\t\t\t\t});\n\n\t\t\t}\n\n\t\t\t{{end}}\n\n\t\t\t{{end}}\n\n\t\t\taddToMeta(mgr, this);\n\n\t\t}\n\n\n\n\t\t{{% \u79FB\u9664}}\n\n\t\tremoveMeta(){\n\n\t\t\tremoveFromMeta(this);\n\n\t\t\t{{for j, v1 of members}}\n\n\t\t\t{{if _isStruct(v1.type.type)}}\n\n\t\t\tthis.{{v1.name}} && this.{{v1.name}}.removeMeta();\n\n\t\t\t{{elseif v1.type === \"Array\" && _isStruct(v1.type.genType[0].type)}}\n\n\t\t\tif(this.{{v1.name}}){\n\n\t\t\t\tfor(let i = 0; i < this.{{v1.name}}.length; i++){\n\n\t\t\t\t\tif(this.{{v1.name}}[i]){\n\n\t\t\t\t\t\tthis.{{v1.name}}[i].removeMeta();\n\n\t\t\t\t\t}\n\n\t\t\t\t}\n\n\t\t\t}\n\n\t\t\t{{elseif v1.type === \"Tuple\"}}\n\n\t\t\t{{for j2,v2 of v1.genType}}\n\n\t\t\t{{if _isStruct(v2.type)}}\n\n\t\t\tif(this.{{v1.name}}[j2])\n\n\t\t\t\tthis.{{v1.name}}[j2].removeMeta();\n\n\t\t\t{{end}}\n\n\t\t\t{{end}}\n\n\t\t\t{{elseif v1.type === \"Map\" && _isStruct(v1.type.genType[1].type)}}\n\n\t\t\tif(this.{{v1.name}}){\n\n\t\t\t\tthis.{{v1.name}}.forEach((v,k) => {\n\n\t\t\t\t\tv && c.removeMeta();\n\n\t\t\t\t});\n\n\t\t\t}\n\n\t\t\t{{end}}\n\n\t\t\t{{end}}\t\t\t\n\n\t\t}\n\n\n\n\t\t{{% set \u8BBE\u7F6E}}\n\n\t\t{{if !v.annotate || !v.annotate.readonly || v.annotate.readonly === \"false\"}}\n\n\t\t{{for j, v1 of members}}\n\n\t\t{{let _type = _tansType(v1.type)}}\n\n\t\t{{if v1.type.type === \"Array\"}}\n\n\t\tset{{_upperFirst(v1.name)}} (value: {{_tansType(v1.type.genType[0])}}, index: number | string){\n\n\t\t\t!this.{{v1.name}} && (this.{{v1.name}} = [] as {{_tansType(v1.type)}});\n\n\t\t\t{{if _isStruct(v1.type.genType[0].type)}}\n\n\t\t\tlet old = this.{{v1.name}}[index];\n\n\t\t\tthis.{{v1.name}}[index] = value;\n\n\t\t\tif(this._$meta){\n\n\t\t\t\tif(old)\n\n\t\t\t\t\told.removeMeta();\n\n\t\t\t\tvalue.addMeta(this._$meta.mgr);\n\n\t\t\t\t{{if v.annotate && v.annotate.hasmgr === \"true\"}}\t\t\t\n\n\t\t\t\tnotifyModify(this, \"{{v1.name}}\", value, old, index);\n\n\t\t\t\t{{end}}\n\n\t\t\t}\n\n\t\t\t{{else}}\n\n\t\t\tlet old = this.{{v1.name}}[index];\n\n\t\t\tthis.{{v1.name}}[index] = value;\n\n\t\t\t{{if v.annotate && v.annotate.hasmgr === \"true\"}}\n\n\t\t\tif(this._$meta)\n\n\t\t\t\tnotifyModify(this, \"{{v1.name}}\", value, old, index);\n\n\t\t\t{{end}}\n\n\t\t\t{{end}}\n\n\t\t}\n\n\t\t{{elseif v1.type.type === \"Tuple\"}}\n\n\t\t{{for j2, v2 of v1.type.genType}}\n\n\t\tset{{_upperFirst(v1.name)}}_{{j2}} (value: {{_tansType(v2)}}){\n\n\t\t\t!this.{{v1.name}} && (this.{{v1.name}} = [] as {{_tansType(v1.type)}});\n\n\t\t\t{{if _isStruct(v2.type)}}\n\n\t\t\tlet old = this.{{v1.name}}[{{j2}}];\n\n\t\t\tthis.{{v1.name}}[{{j2}}] = value;\n\n\t\t\tif(this._$meta){\n\n\t\t\t\tif(old)\n\n\t\t\t\t\told.removeMeta();\n\n\t\t\t\tvalue.addMeta(this._$meta.mgr);\t\n\n\t\t\t\t{{if v.annotate && v.annotate.hasmgr === \"true\"}}\t\t\n\n\t\t\t\tnotifyModify(this, \"{{v1.name}}\", value, old, {{j2}});\n\n\t\t\t\t{{end}}\n\n\t\t\t}\n\n\t\t\t{{else}}\n\n\t\t\tlet old = this.{{v1.name}}[{{j2}}];\n\n\t\t\tthis.{{v1.name}}[{{j2}}] = value;\n\n\t\t\t{{if v.annotate && v.annotate.hasmgr === \"true\"}}\n\n\t\t\tif(this._$meta)\n\n\t\t\t\tnotifyModify(this, \"{{v1.name}}\", value, old, {{j2}});\n\n\t\t\t{{end}}\n\n\t\t\t{{end}}\n\n\t\t}\n\n\t\t{{end}}\n\n\t\t{{elseif v1.type.type === \"Map\"}}\n\n\t\tset{{_upperFirst(v1.name)}} (value: {{_tansType(v1.type.genType[1])}}, key: number | string){\n\n\t\t\t!this.{{v1.name}} && (this.{{v1.name}} = [] as Map<{{_tansType(v1.type.genType[0])}}, {{_tansType(v1.type.genType[1])}}>);\n\n\t\t\t{{if _isStruct(v1.type.genType[0].type)}}\n\n\t\t\tlet old = this.{{v1.name}}.get(key);\n\n\t\t\tthis.{{v1.name}}.set(key,value);\n\n\t\t\tif(this._$meta){\n\n\t\t\t\tif(old)\n\n\t\t\t\t\told.removeMeta();\n\n\t\t\t\tvalue.addMeta(this._$meta.mgr);\n\n\t\t\t\t{{if v.annotate && v.annotate.hasmgr === \"true\"}}\n\n\t\t\t\tnotifyModify(this, \"{{v1.name}}\", value, old, key);\n\n\t\t\t\t{{end}}\n\n\t\t\t}\n\n\t\t\t{{else}}\n\n\t\t\tlet old = this.{{v1.name}}.get(key);\n\n\t\t\tthis.{{v1.name}}.set(key,value);\n\n\t\t\t{{if v.annotate && v.annotate.hasmgr === \"true\"}}\n\n\t\t\tif(this._$meta)\n\n\t\t\t\tnotifyModify(this, \"{{v1.name}}\", value, old, key);\n\n\t\t\t{{end}}\n\n\t\t\t{{end}}\n\n\t\t}\n\n\t\t{{else}}\n\n\t\tset{{_upperFirst(v1.name)}} (value: {{_type}}){\t\n\n\t\t\t{{if _isStruct(v1.type.type)}}\n\n\t\t\tlet old = this.{{v1.name}};\n\n\t\t\tthis.{{v1.name}} = value;\n\n\t\t\tif(this._$meta){\n\n\t\t\t\tif(old)\n\n\t\t\t\t\told.removeMeta();\n\n\t\t\t\tvalue.addMeta(this._$meta.mgr);\n\n\t\t\t\t{{if v.annotate && v.annotate.hasmgr === \"true\"}}\n\n\t\t\t\tnotifyModify(this, \"{{v1.name}}\", value, old);\n\n\t\t\t\t{{end}}\n\n\t\t\t}\n\n\t\t\t{{else}}\n\n\t\t\tlet old = this.{{v1.name}};\n\n\t\t\tthis.{{v1.name}} = value;\n\n\t\t\t{{if v.annotate && v.annotate.hasmgr === \"true\"}}\n\n\t\t\tif(this._$meta)\n\n\t\t\t\tnotifyModify(this, \"{{v1.name}}\", value, old);\n\n\t\t\t{{end}}\n\n\t\t\t{{end}}\t\t\t\n\n\t\t}\n\n\t\t{{end}}\n\n\t\t{{end}}\n\n\t\t{{end}}\n\n\n\n\t\t{{%\u5982\u679C\u5B57\u6BB5noCopy\u6CE8\u89E3\u4E3Afalse\uFF0C\u5E94\u8BE5\u8BBE\u7F6Ecopy\u548Cclone\u65B9\u6CD5}}\n\n\t\t{{if !v.annotate || !v.annotate.noCopy || v.annotate.noCopy === \"false\"}}\n\n\t\tcopy(o: {{clazz}}) : {{clazz}} {\n\n\t\t\t{{for i, v1 of members}}\n\n\t\t\t{{if (v.annotate && v.annotate.readonly === \"true\") || (v1.annotate && v1.annotate.readonly === \"true\")}}\n\n\t\t\t{{elseif _isStruct(v1.type.type)}}\n\n\t\t\to.{{v1.name}} && ((<any>this).{{v1.name}} = o.{{v1.name}}.clone());\n\n\t\t\t{{elseif v1.type.type === \"Array\"}}\n\n\t\t\tif(o.{{v1.name}}){\n\n\t\t\t\t(<any>this).{{v1.name}} = [] as {{_tansType(v1.type.genType)}};\n\n\t\t\t\tfor(let i = 0; i < o.{{v1.name}}.length; i++){\n\n\t\t\t\t\t{{if _isStruct(v1.type.genType.type)}}\n\n\t\t\t\t\to.{{v1.name}} && ((<any>this).{{v1.name}} = o.{{v1.name}}.clone());\n\n\t\t\t\t\t{{else}}\n\n\t\t\t\t\t(<any>this).{{v1.name}} = o.{{v1.name}};\n\n\t\t\t\t\t{{end}}\n\n\t\t\t\t}\n\n\t\t\t}\n\n\t\t\t{{elseif v1.type.type === \"Tuple\"}}\n\n\t\t\tif(o.{{v1.name}}){\n\n\t\t\t\tthis.{{v1.name}} = [] as {{_tansType(v1.type)}}\n\n\t\t\t\t{{for j2, v2 of v1.type.genType}}\n\n\t\t\t\t{{if _isStruct(v2.type)}}\n\n\t\t\t\to.{{v1.name}}[{{j2}}] && ((<any>this).{{v1.name}}[{{j2}}] = o.{{v1.name}}[{{j2}}].clone());\n\n\t\t\t\t{{else}}\n\n\t\t\t\t(<any>this).{{v1.name}}[{{j2}}] = o.{{v1.name}}[{{j2}}];\n\n\t\t\t\t{{end}}\n\n\t\t\t\t{{end}}\n\n\t\t\t}\n\n\t\t\t{{elseif v1.type.type === \"Map\"}}\n\n\t\t\tif(o.{{v1.name}}){\n\n\t\t\t\to.{{v1.name}}.forEach((v, k) => {\n\n\t\t\t\t\t{{if _isStruct(v1.type.genType.type)}}\n\n\t\t\t\t\tv && (this.{{v1.name}} = v.clone());\n\n\t\t\t\t\t{{else}}\n\n\t\t\t\t\tthis.{{v1.name}} = v;\n\n\t\t\t\t\t{{end}}\n\n\t\t\t\t});\n\n\t\t\t}\n\n\t\t\t{{else}}\n\n\t\t\tthis.{{v1.name}} = o.{{v1.name}};\n\n\t\t\t{{end}}\n\n\t\t\t{{end}}\n\n\t\t\treturn this;\n\n\t\t}\n\n\n\n\t\tclone() : {{clazz}} {\n\n\t\t\treturn new {{clazz}}().copy(this);\n\n\t\t}\n\n\t\t{{end}}\n\n\n\n\t\t{{%\u5982\u679C\u5B57\u6BB5noBinSeri\u6CE8\u89E3\u4E3Afalse\uFF0C\u5E94\u8BE5\u8BBE\u7F6E_binDecode\u548C_binEncode\u65B9\u6CD5}}\n\n\t\t{{if !v.annotate || !v.annotate.noBinSeri || v.annotate.noBinSeri === \"false\"}}\n\n\t\tbinDecode(bb:BinBuffer, next: Function) {\n\n\t\t\t{{for j, v1 of members}}\n\n\t\t\t{{if !v1.annotate || !v1.annotate.noBinSeri || v1.annotate.noBinSeri === \"false\"}}\n\n\t\t\t{{if v1.type.type === \"Array\" && _isStruct(v1.type.genType[0].type)}}\n\n\t\t\t(<any>this).{{v1.name}} = bb.read(next(this._$meta.mgr)) as Array<{{_tansType(v1.type.genType[0].type)}}>;\n\n\t\t\t{{elseif v1.type.type === \"Map\" && _isStruct(v1.type.genType[1].type)}}\n\n\t\t\t(<any>this).{{v1.name}} = bb.read(next(this._$meta.mgr)) as Map<{{v1.type.genType[0].type}}, {{_tansType(v1.type.genType[1].type)}}>;\n\n\t\t\t{{elseif v1.type.type === \"Tuple\"}}\n\n\t\t\t(<any>this).{{v1.name}} = [] as {{_tansType(v1.type)}};\n\n\t\t\t{{for j2, v2 of v1.type.genType}}\n\n\t\t\t{{if _isStruct(v2.type)}}\t\t\n\n\t\t\t(<any>this).{{v1.name}}.push(bb.read(next(this._$meta.mgr)) as {{_tansType(v2)}});\n\n\t\t\t{{else}}\n\n\t\t\t(<any>this).{{v1.name}}.push(bb.read() as {{_tansType(v2)}});\n\n\t\t\t{{end}}\n\n\t\t\t{{end}}\t\t\n\n\t\t\t{{elseif _isStruct(v1.type.type)}}\n\n\t\t\t(<any>this).{{v1.name}} = bb.read(next(this._$meta.mgr)) as {{_tansType(v1.type)}};\n\n\t\t\t{{else}}\n\n\t\t\t(<any>this).{{v1.name}} = bb.read() as {{_tansType(v1.type)}};\n\n\t\t\t{{end}}\n\n\t\t\t{{end}}\n\n\t\t\t{{end}}\n\n\t\t}\n\n\n\n\t\tbinEncode(bb:BinBuffer, next: WriteNext) {\n\n\t\t\tlet temp: any;\n\n\t\t\t{{for j, v1 of members}}\n\n\t\t\t{{if !v1.annotate || !v1.annotate.noBinSeri || v1.annotate.noBinSeri === \"false\"}}\n\n\t\t\tif(this.{{v1.name}} === null || this.{{v1.name}} === undefined)\n\n\t\t\t\tbb.writeNil();\n\n\t\t\telse{\n\n\t\t\t\t{{if v1.type.type === \"Tuple\"}}\t\t\t\t\t\t\t\t\n\n\t\t\t\t{{for j2, v2 of v1.type.genType}}\n\n\t\t\t\tif(this.{{v1.name}}[{{j2}}] === null || this.{{v1.name}}[{{j2}}] === undefined)\n\n\t\t\t\t\tbb.writeNil();\n\n\t\t\t\telse{\n\n\t\t\t\t{{if _isStruct(v2.type)}}\n\n\t\t\t\tbb.writeCt(this.{{v1.name}}, next);\n\n\t\t\t\t{{elseif v2.type === \"f32\"}}\n\n\t\t\t\tbb.writeF32(this.{{v1.name}}[{{j2}}]);\n\n\t\t\t\t{{elseif v2.type === \"f64\"}}\n\n\t\t\t\tbb.writeF64(this.{{v1.name}}[{{j2}}]);\n\n\t\t\t\t{{elseif _isInteger(v2.type)}}\n\n\t\t\t\tbb.writeInt(this.{{v1.name}}[{{j2}}]);\n\n\t\t\t\t{{elseif _isString(v2.type)}}\n\n\t\t\t\tbb.writeUtf8(this.{{v1.name}}[{{j2}}]);\n\n\t\t\t\t{{elseif v2.type === \"bool\"}}\n\n\t\t\t\tbb.writeBool(this.{{v1.name}}[{{j2}}]);\n\n\t\t\t\t{{end}}\t\n\n\t\t\t\t}\t\t\n\n\t\t\t\t{{end}}\t\n\n\t\t\t\t{{elseif v1.type.type === \"Array\" || v1.type.type === \"Map\" || _isStruct(v1.type.type)}}\n\n\t\t\t\tbb.writeCt(this.{{v1.name}}, next);\n\n\t\t\t\t{{elseif v1.type.type === \"f32\"}}\n\n\t\t\t\tbb.writeF32(this.{{v1.name}});\n\n\t\t\t\t{{elseif v1.type.type === \"f64\"}}\n\n\t\t\t\tbb.writeF64(this.{{v1.name}});\n\n\t\t\t\t{{elseif _isInteger(v1.type.type)}}\n\n\t\t\t\tbb.writeInt(this.{{v1.name}});\n\n\t\t\t\t{{elseif _isString(v1.type.type)}}\n\n\t\t\t\tbb.writeUtf8(this.{{v1.name}});\n\n\t\t\t\t{{elseif v1.type.type === \"bool\"}}\n\n\t\t\t\tbb.writeBool(this.{{v1.name}});\n\n\t\t\t\t{{end}}\t\n\n\t\t\t}\t\t\t\t\t\t\n\n\t\t\t{{end}}\n\n\t\t\t{{end}}\t\t\t\t\t\t\n\n\t\t}\n\n\t\t{{end}}\n\n\t}\n\n\t{{if v.preComment}}{{for i, v1 of v.preComment}}{{v1}}{{end}}{{end}}\n\n\n\n\t{{%\u8BBE\u7F6E\u7ED3\u6784\u4F53\u7684\u57FA\u672C\u4FE1\u606F\uFF0C\u5305\u542B\u7528nameHash\uFF0Cannotate\uFF0Cfields}}\n\n\t(<any>{{clazz}})._$info = {\n\n\t\tnameHash:{{_strHashCode(_path + clazz, 0)}},\n\n\t\t{{if v.annotate}}\n\n\t\tannotate:{{JSON.stringify(v.annotate)}},\n\n\t\t{{end}}\n\n\t\tfields:{ {{for j,v1 of v.members}}{{if j > 0}},{{end}}{{v1.name}}:{{JSON.stringify(v1)}}{{end}} }\n\n\t}\n\n\t{{elseif v.type === \"defEnum\"}}\n\n\t{{if v.sufComment}}{{for i, v1 of v.sufComment}}{{v1}}{{end}}{{end}}\n\n\texport enum {{v.name}}{\n\n\t{{let members = v.members}}\n\n\t{{for k1, v1 of members}}\n\n\t\t{{if k1 > 0}},\n\n\t\t{{end}}\n\n\t\t{{v1.name}}={{v1.value}}\n\n\t{{end}} }\n\n\n\n\t{{end}}\n\n\t{{end}}\n\n";
tplStr = tplStr.replace(/^\t/mg, '');
setTplFunc();
})