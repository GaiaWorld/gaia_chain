/**
 * 将rust的数据结构定义，转换成指定语言的数据结构定义
 * https://kaisery.gitbooks.io/rust-book-chinese/content/content/Syntax%20Index%20%E8%AF%AD%E6%B3%95%E7%B4%A2%E5%BC%95.html
 */

// ============================== 导入
import { compile, toFun } from '../util/tpl';
import { Parser as TplParser } from '../util/tpl_str';
import { gen } from './gendrust';
import { Parser, Syntax } from './parser';
import { createByStr } from './reader';
import { Scanner } from './scanner';

// ============================== 导出
/**
 * @description 设置后缀对应的模板函数
 */
export const setSuffixTpl = (suffix: string, s: string, filename?: string) => {
	// tplMap.set(suffix, toFun(compile(s, TplParser), filename));
};

/**
 * @description 将rust数据结构的定义转成ts的数据结构定义
 * @param rsd rust数据结构定义的源码
 */
export const translate = (s: string, filename: string, cfg): Syntax => {
	const reader = createByStr(s);
	scanner.setRule(lex);
	scanner.initReader(reader);
	parser.setRule(syntax, cfgs);
	parser.initScanner(scanner);
	const r = parser.parseRule('file');

	return gen(r, filename, cfg);
};

// ============================== 本地
// 词法解析器
const scanner: Scanner = new Scanner();
// 语法解析器
const parser: Parser = new Parser();

// rust的词法规则
const lex = `
	(* comment *)
	commentLinePre = "//!" , [{?notbreakline?}] ;
	commentLineSuf  = "//" , [{?notbreakline?}] ;
	commentBlockSuf = "/**" , [ { & !"*/"!, ?all? & } ], "*/" ;
	commentBlockPre = "/*!" , [ { & !"*/"!, ?all? & } ], "*/" ;
	annotatePre = "#![" , [ { & !"]"!, ?notbreakline? & } ], "]";
	annotateSuf = "#[" , [ { & !"]"!, ?notbreakline? & } ], "]";

	(* type keyword *)
	bool = & "bool", identifier &;
	string = & "string", identifier &;
	number = & "number", identifier &;
	(* class keyword *)
	struct = & "struct", identifier &;
	enum = & "enum", identifier &;
	(* keyword *)
	use = & "use", identifier &;
	as = & "as", identifier &;
	break = & "break", identifier &;
	const = & "const", identifier &;
	continue = & "continue", identifier &;
	crate = & "crate", identifier &;
	else = & "else", identifier &;
	enum = & "enum", identifier &;
	extern = & "extern", identifier &;
	false = & "false", identifier &;
	fn = & "fn", identifier &;
	for = & "for", identifier &;
	if = & "if", identifier &;
	impl = & "impl", identifier &;
	in = & "in", identifier &;
	let = & "let", identifier &;
	loop = & "loop", identifier &;
	match = & "match", identifier &;
	mod = & "mod", identifier &;
	move = & "move", identifier &;
	mut = & "mut", identifier &;
	pub = & "pub", identifier &;
	ref = & "&", identifier &;
	return = & "return", identifier &;
	Self = & "Self", identifier &;
	self = & "self", identifier &;
	static = & "static", identifier &;
	struct = & "struct", identifier &;
	trait = & "trait", identifier &;
	true = & "true", identifier &;
	type = & "type", identifier &;
	unsafe = & "unsafe", identifier &;
	use = & "use", identifier &;
	where = & "where", identifier &;
	while = & "while", identifier &;

	(* update operator *)
	".." = "..";
	(* enum operator *)
	"::" = "::";
	(* separator *)
	"," = ",";
	"." = ".";
	";" = ";";
	":" = ":";
	"{" = "{";
	"}" = "}";
	"(" = "(";
	")" = ")";
	"[" = "[";
	"]" = "]";
	(* other *)
	"?" = "?";
	"@" = "@";
	"->" = "->";
	"=>" = "=>";
	"#!" = "#!";
	"#" = "#";
	"$" = "$";

	(* compare operator *)
	"==" = "==";
	"!=" = "!=";
	"<=" = "<=";
	">=" = ">=";
	(* assignment operator *)
	"=" = "=";
	"+=" = "+=";
	"-=" = "-=";
	"*=" = "*=";
	"/=" = "/=";
	"%=" = "%=";
	"<<=" = "<<=";
	">>=" = ">>=";
	"&=" = "&=";
	"|=" = "|=";

	"^=" = "^=";
	(* arithmetic operator *)
	"**" = "**";
	"+" = "+";
	"-" = "-";
	"*" = "*";
	"/" = "/";
	"%" = "%";
	(* bool operator *)
	"&&" = "&&";
	"||" = "||";
	"!" = "!";
	(* bit operator *)
	"&" = "&";
	"|" = "|";
	"~" = "~";
	"^" = "^";
	"<<" = "<<";
	">>" = ">>";
	(* compare operator *)
	"<" = "<";
	">" = ">";

	(* normal *)
	char = "'", | ?whitespace?, ?visible? |, "'";
	lifetime = "'", identifier ;

	(* normal *)
	identifier = |"_", ?alphabetic?| , [ { ? word ? } ] ;
	float = [integer], ".", { ? digit ? }, [floate] ;
	floate = "e", |"+", "-"|, { ? digit ? } ;
	integer16 = [ "-" ] , "0x" , { |? digit ?, 'A', 'B', 'C', 'D', 'E', 'F', 'a', 'b', 'c', 'd', 'e', 'f' | } ;
	integer = | "0", integer10 | ;
	integer10 = [ "-" ] , ? digit19 ? , [ { ? digit ? } ] ;
	string = '"', { | '\\"', & !'"'!, ?visible? & | }, '"' ;
	whitespace = {?whitespace?};


`;

// rust的语法规则
const syntax = `
	importOne = "use"#?,"identifier",[{"::"#?, "identifier"}], [";"#?];
	importMany = "use"#?,"identifier",[{"::"#?, "identifier"}], "::"#?, importCs, [";"#?];
	importCs = "{"#?, "identifier", [{","#?, "identifier"}], "}"#?;

	type = |baseType, tupleBody, arrBody, igenType, structType|;
	genType = "<"#?, |type , "lifetime"|, [{","#?, |type , "lifetime"|}], ">"#?;

	igenType = "identifier", genType;
	structType = "identifier", [{"::"#?, "identifier"}];
	tupleBody = "("#?, type, [{","#?, type}], ")"#?;
	arrBody = "["#?, type, [","#?, "integer"], "]"#?;
	baseType = |"bool", "str", "char", "i8", "i16", "i32", "i64", "u8", "u16", "u32", "u64", "isize", "usize", "f32", "f64"|;

	defStructTuple = "struct"#?, "identifier", tupleBody;
	defStructEmpty = "struct"#?, "identifier", "{"#?, "}"#?;

	structKeyType = "identifier", ":"#?, ["&"], ["lifetime"], ["mut"], type, ","#?;
	defStruct = "struct"#?, "identifier", [genType], "{"#?, {structKeyType}, "}"#?;

	enumMember = |@"identifier", tupleBody@, "identifier"|, ","#?;
	enumMemberc = "identifier", ["="#?, |"string","integer", "float", "integer10", "integer16", "floate"|], ","#?;
	defEnum = "enum"#?, "identifier", [genType], "{"#?, [{enumMemberc}], "}"#?;

	file = {|defStruct, defEnum, defStructEmpty, defStructTuple, importMany, importOne|};
`;

// rust的算符优先级及绑定函数
const cfgs = [
	// 表达式结束符
	{ type: ',', rbp: -1 },
	{ type: ';', rbp: -1 },
	{ type: '}', rbp: -1 },

	// 关系运算符
	{ type: '||', lbp: 30, rbp: 29 }, // 短路逻辑运算符需要右结合，通过减少右约束力来实现的
	{ type: '&&', lbp: 32, rbp: 31 },
	{ type: '|', lbp: 35 },
	{ type: '^', lbp: 36 },
	{ type: '&', lbp: 37 },
	// 布尔运算符

	{ type: '=', lbp: 10, rbp: 9 },

	// statement 语句
	// { type: "struct", nud: "struct, structTuple, structEmpty" },
	// { type: "enum", nud: "enum" },

	// 忽略空白
	{ type: 'whitespace', ignore : true },
	// 注释
	{ type: 'commentBlockPre', note : -1 },
	{ type: 'commentBlockSuf', note : 1 },
	{ type: 'commentLinePre', note : -1 },
	{ type: 'commentLineSuf', note : 1 },
	// 注解
	{ type: 'annotatePre', note : -1 },
	{ type: 'annotateSuf', note : 1 }
];

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
