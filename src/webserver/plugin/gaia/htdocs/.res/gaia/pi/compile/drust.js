_$define("pi/compile/drust", function (require, exports, module){
"use strict";
/**
 * 将rust的数据结构定义，转换成指定语言的数据结构定义
 * https://kaisery.gitbooks.io/rust-book-chinese/content/content/Syntax%20Index%20%E8%AF%AD%E6%B3%95%E7%B4%A2%E5%BC%95.html
 */

Object.defineProperty(exports, "__esModule", { value: true });
var gendrust_1 = require("./gendrust");
var parser_1 = require("./parser");
var reader_1 = require("./reader");
var scanner_1 = require("./scanner");
// ============================== 导出
/**
 * @description 设置后缀对应的模板函数
 */
exports.setSuffixTpl = function (suffix, s, filename) {
	// tplMap.set(suffix, toFun(compile(s, TplParser), filename));
};
/**
 * @description 将rust数据结构的定义转成ts的数据结构定义
 * @param rsd rust数据结构定义的源码
 */
exports.translate = function (s, filename, cfg) {
	var reader = reader_1.createByStr(s);
	scanner.setRule(lex);
	scanner.initReader(reader);
	parser.setRule(syntax, cfgs);
	parser.initScanner(scanner);
	var r = parser.parseRule('file');
	return gendrust_1.gen(r, filename, cfg);
};
// ============================== 本地
// 词法解析器
var scanner = new scanner_1.Scanner();
// 语法解析器
var parser = new parser_1.Parser();
// rust的词法规则
var lex = "\n\t(* comment *)\n\tcommentLinePre = \"//!\" , [{?notbreakline?}] ;\n\tcommentLineSuf  = \"//\" , [{?notbreakline?}] ;\n\tcommentBlockSuf = \"/**\" , [ { & !\"*/\"!, ?all? & } ], \"*/\" ;\n\tcommentBlockPre = \"/*!\" , [ { & !\"*/\"!, ?all? & } ], \"*/\" ;\n\tannotatePre = \"#![\" , [ { & !\"]\"!, ?notbreakline? & } ], \"]\";\n\tannotateSuf = \"#[\" , [ { & !\"]\"!, ?notbreakline? & } ], \"]\";\n\n\t(* type keyword *)\n\tbool = & \"bool\", identifier &;\n\tstring = & \"string\", identifier &;\n\tnumber = & \"number\", identifier &;\n\t(* class keyword *)\n\tstruct = & \"struct\", identifier &;\n\tenum = & \"enum\", identifier &;\n\t(* keyword *)\n\tuse = & \"use\", identifier &;\n\tas = & \"as\", identifier &;\n\tbreak = & \"break\", identifier &;\n\tconst = & \"const\", identifier &;\n\tcontinue = & \"continue\", identifier &;\n\tcrate = & \"crate\", identifier &;\n\telse = & \"else\", identifier &;\n\tenum = & \"enum\", identifier &;\n\textern = & \"extern\", identifier &;\n\tfalse = & \"false\", identifier &;\n\tfn = & \"fn\", identifier &;\n\tfor = & \"for\", identifier &;\n\tif = & \"if\", identifier &;\n\timpl = & \"impl\", identifier &;\n\tin = & \"in\", identifier &;\n\tlet = & \"let\", identifier &;\n\tloop = & \"loop\", identifier &;\n\tmatch = & \"match\", identifier &;\n\tmod = & \"mod\", identifier &;\n\tmove = & \"move\", identifier &;\n\tmut = & \"mut\", identifier &;\n\tpub = & \"pub\", identifier &;\n\tref = & \"&\", identifier &;\n\treturn = & \"return\", identifier &;\n\tSelf = & \"Self\", identifier &;\n\tself = & \"self\", identifier &;\n\tstatic = & \"static\", identifier &;\n\tstruct = & \"struct\", identifier &;\n\ttrait = & \"trait\", identifier &;\n\ttrue = & \"true\", identifier &;\n\ttype = & \"type\", identifier &;\n\tunsafe = & \"unsafe\", identifier &;\n\tuse = & \"use\", identifier &;\n\twhere = & \"where\", identifier &;\n\twhile = & \"while\", identifier &;\n\n\t(* update operator *)\n\t\"..\" = \"..\";\n\t(* enum operator *)\n\t\"::\" = \"::\";\n\t(* separator *)\n\t\",\" = \",\";\n\t\".\" = \".\";\n\t\";\" = \";\";\n\t\":\" = \":\";\n\t\"{\" = \"{\";\n\t\"}\" = \"}\";\n\t\"(\" = \"(\";\n\t\")\" = \")\";\n\t\"[\" = \"[\";\n\t\"]\" = \"]\";\n\t(* other *)\n\t\"?\" = \"?\";\n\t\"@\" = \"@\";\n\t\"->\" = \"->\";\n\t\"=>\" = \"=>\";\n\t\"#!\" = \"#!\";\n\t\"#\" = \"#\";\n\t\"$\" = \"$\";\n\n\t(* compare operator *)\n\t\"==\" = \"==\";\n\t\"!=\" = \"!=\";\n\t\"<=\" = \"<=\";\n\t\">=\" = \">=\";\n\t(* assignment operator *)\n\t\"=\" = \"=\";\n\t\"+=\" = \"+=\";\n\t\"-=\" = \"-=\";\n\t\"*=\" = \"*=\";\n\t\"/=\" = \"/=\";\n\t\"%=\" = \"%=\";\n\t\"<<=\" = \"<<=\";\n\t\">>=\" = \">>=\";\n\t\"&=\" = \"&=\";\n\t\"|=\" = \"|=\";\n\n\t\"^=\" = \"^=\";\n\t(* arithmetic operator *)\n\t\"**\" = \"**\";\n\t\"+\" = \"+\";\n\t\"-\" = \"-\";\n\t\"*\" = \"*\";\n\t\"/\" = \"/\";\n\t\"%\" = \"%\";\n\t(* bool operator *)\n\t\"&&\" = \"&&\";\n\t\"||\" = \"||\";\n\t\"!\" = \"!\";\n\t(* bit operator *)\n\t\"&\" = \"&\";\n\t\"|\" = \"|\";\n\t\"~\" = \"~\";\n\t\"^\" = \"^\";\n\t\"<<\" = \"<<\";\n\t\">>\" = \">>\";\n\t(* compare operator *)\n\t\"<\" = \"<\";\n\t\">\" = \">\";\n\n\t(* normal *)\n\tchar = \"'\", | ?whitespace?, ?visible? |, \"'\";\n\tlifetime = \"'\", identifier ;\n\n\t(* normal *)\n\tidentifier = |\"_\", ?alphabetic?| , [ { ? word ? } ] ;\n\tfloat = [integer], \".\", { ? digit ? }, [floate] ;\n\tfloate = \"e\", |\"+\", \"-\"|, { ? digit ? } ;\n\tinteger16 = [ \"-\" ] , \"0x\" , { |? digit ?, 'A', 'B', 'C', 'D', 'E', 'F', 'a', 'b', 'c', 'd', 'e', 'f' | } ;\n\tinteger = | \"0\", integer10 | ;\n\tinteger10 = [ \"-\" ] , ? digit19 ? , [ { ? digit ? } ] ;\n\tstring = '\"', { | '\\\"', & !'\"'!, ?visible? & | }, '\"' ;\n\twhitespace = {?whitespace?};\n\n\n";
// rust的语法规则
var syntax = "\n\timportOne = \"use\"#?,\"identifier\",[{\"::\"#?, \"identifier\"}], [\";\"#?];\n\timportMany = \"use\"#?,\"identifier\",[{\"::\"#?, \"identifier\"}], \"::\"#?, importCs, [\";\"#?];\n\timportCs = \"{\"#?, \"identifier\", [{\",\"#?, \"identifier\"}], \"}\"#?;\n\n\ttype = |baseType, tupleBody, arrBody, igenType, structType|;\n\tgenType = \"<\"#?, |type , \"lifetime\"|, [{\",\"#?, |type , \"lifetime\"|}], \">\"#?;\n\n\tigenType = \"identifier\", genType;\n\tstructType = \"identifier\", [{\"::\"#?, \"identifier\"}];\n\ttupleBody = \"(\"#?, type, [{\",\"#?, type}], \")\"#?;\n\tarrBody = \"[\"#?, type, [\",\"#?, \"integer\"], \"]\"#?;\n\tbaseType = |\"bool\", \"str\", \"char\", \"i8\", \"i16\", \"i32\", \"i64\", \"u8\", \"u16\", \"u32\", \"u64\", \"isize\", \"usize\", \"f32\", \"f64\"|;\n\n\tdefStructTuple = \"struct\"#?, \"identifier\", tupleBody;\n\tdefStructEmpty = \"struct\"#?, \"identifier\", \"{\"#?, \"}\"#?;\n\n\tstructKeyType = \"identifier\", \":\"#?, [\"&\"], [\"lifetime\"], [\"mut\"], type, \",\"#?;\n\tdefStruct = \"struct\"#?, \"identifier\", [genType], \"{\"#?, {structKeyType}, \"}\"#?;\n\n\tenumMember = |@\"identifier\", tupleBody@, \"identifier\"|, \",\"#?;\n\tenumMemberc = \"identifier\", [\"=\"#?, |\"string\",\"integer\", \"float\", \"integer10\", \"integer16\", \"floate\"|], \",\"#?;\n\tdefEnum = \"enum\"#?, \"identifier\", [genType], \"{\"#?, [{enumMemberc}], \"}\"#?;\n\n\tfile = {|defStruct, defEnum, defStructEmpty, defStructTuple, importMany, importOne|};\n";
// rust的算符优先级及绑定函数
var cfgs = [
// 表达式结束符
{ type: ',', rbp: -1 }, { type: ';', rbp: -1 }, { type: '}', rbp: -1 },
// 关系运算符
{ type: '||', lbp: 30, rbp: 29 }, { type: '&&', lbp: 32, rbp: 31 }, { type: '|', lbp: 35 }, { type: '^', lbp: 36 }, { type: '&', lbp: 37 },
// 布尔运算符
{ type: '=', lbp: 10, rbp: 9 },
// statement 语句
// { type: "struct", nud: "struct, structTuple, structEmpty" },
// { type: "enum", nud: "enum" },
// 忽略空白
{ type: 'whitespace', ignore: true },
// 注释
{ type: 'commentBlockPre', note: -1 }, { type: 'commentBlockSuf', note: 1 }, { type: 'commentLinePre', note: -1 }, { type: 'commentLineSuf', note: 1 },
// 注解
{ type: 'annotatePre', note: -1 }, { type: 'annotateSuf', note: 1 }];
// ============================== 立即执行的代码
// scanner.setRule(lex);
// parser.setRule(syntax, cfgs);
// setSuffixTpl("", `
// 	{{if it.comments}}{{for i, v of it.comments}}{{ v.value }}{{end}}{{end}}
// 	{{if it.type === 'struct'}}
// 	{{let arr = it.childs}}
// 	{{let clazz = arr[0].value }}
// 	export class {{ clazz }} {{if arr[1].childs.length > 0 }} <{{ arr[1].childs[0].value }}>{{end}} {
// 		{{: arr = arr.slice(2)}}
// 		{{for i, v of arr}}
// 		{{if v.comments}}{{for i, vv of v.comments}}{{ vv.value }}{{end}}{{end}}
// 		{{let name = v.childs[1].value}}
// 		{{let type = v.childs[3].childs[0]}}
// 		{{let t = type.type}}
// 		{{if t==='identifier'}}
// 		{{ name }}: {{ type.value }} = null;
// 		{{elseif t==='bool'}}
// 		{{ name }}: boolean = false;
// 		{{elseif t==='f32' || t==='f64'}}
// 		{{ name }}: number = 0.0;
// 		{{else}}
// 		{{ name }}: number = 0;
// 		{{end}}
// 		{{end}}
// 		// 克隆
// 		copy() : {{ clazz }} -> {
// 			return new {{ clazz }}().copy(this);
// 		}
// 		// 拷贝
// 		copy(dst: {{ clazz }}) : {{ clazz }} -> {
// 		}
// 		// 从ArrayBuffer上序列化域
// 		decode(bs:BufferStream) -> {
// 		{{for i, v of arr}}
// 			{{let name = v.childs[1].value}}
// 			{{let type = v.childs[3].childs[0]}}
// 			{{let t = type.type}}
// 			{{if t==='identifier'}}
// 			if(bs.getU8()) {
// 				this.{{ name }} = new {{ type.value }};
// 				this.{{ name }}.decode(bs);
// 			}
// 			{{else}}
// 			this.{{ name }} = bs.get{{ t.charAt(0).toUpperCase() }}{{ t.slice(1) }}();
// 			{{end}}
// 		{{end}}
// 		}
// 		// 将域序列化到ArrayBuffer上
// 		encode(bs:BufferStream) -> {
// 		{{for i, v of arr}}
// 			{{let name = v.childs[1].value}}
// 			{{let type = v.childs[3].childs[0]}}
// 			{{let t = type.type}}
// 			{{if t==='identifier'}}
// 			if({{ name }}) {
// 				bs.setU8(1);
// 				this.{{ name }}.encode(bs);
// 			}else
// 				bs.setU8(0);
// 			{{else}}
// 			bs.set{{ t.charAt(0).toUpperCase() }}{{ t.slice(1) }}(this.{{ name }});
// 			{{end}}
// 		{{end}}
// 		}
// 	}
// 	{{end}}
// `);
})