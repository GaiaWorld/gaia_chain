/**
 * 生成  生成drust的函数, 支持注释，注解
 * 例：
 * #[path=../../ecs/]   --注解
 * use world::{Component};   --导入
 * #[type=rpc,readonly=true,noCopy=true]---注解
 * struct setName {
 * 	id: i16,
 * 	name:str,
 * }
 * 
 * 结构体支持注解有：
 * 		type-类型，用户自定义类型，为运行时注解, 
 * 		readonly（默认false）-只读，表示结构体的所有属性都是只读属性，编译为ts的类时，提供了构造方法设置属性，为编译期注解
 * 		noCopy（默认false）-不能copy，不会生成copy和clone方法，为编译期注解
 * 		noBinSeri（默认false）-不能序列化，没有binEncode，bindecode方法，为编译期注解
 * 		hasmgr（默认false）-有管理者，该注解为true时， 表示该结构体的实例应该被元数据管理起来， 当调用结构体的set方法时，会通知元数据中的修改监听器，为编译期注解
 * 		extends-继承， 表示继承另一个结构体， 为编译期注解
 * 属性支持注解：
 * 		default-默认值
 * 		readonly（默认false）-只读，当类的readonly注解为false时生效
 * 		noBinSeri（默认false）-不能序列化，当类的noBinSeri注解为false时生效
 * 导入支持注解：
 * 		path：表示导入模块的路径
 */
// ====================================== 导入
import { Syntax } from '../compile/parser';
import { Json } from '../lang/type';
import * as hash from '../util/hash';
import { logLevel, warn } from '../util/log';
import { calTextHash, compile, toString } from '../util/tpl';
import { Parser as TplParser } from '../util/tpl_str';
import { upperFirst } from '../util/util';

// ====================================== 导出
export let tplFunc;

// 将语法树转换成ts代码
export const gen = (syntax: Syntax, path: string, cfg: Json) => {
	const arr = preorder(syntax).childs;

	return tplFunc(null, arr, path, cfg);
};

// ====================================== 本地
// 先序遍历
const preorder = (syntax: Syntax): ParserNode => {
	const funcs = seekFunc(syntax);
	const childs: Syntax[] = funcs.child();
	const childNodes: ParserNode[] = [];
	for (let i = 0; i < childs.length; i++) {
		const childNode = preorder(childs[i]);
		if (childNode) childNodes.push(childNode);// 存在空文本节点的情况		
	}

	return funcs.node(childNodes);
};

interface InterParser {
	child(): Syntax[];
	node(childs: ParserNode[]): ParserNode;
}

// 每一个节点都有pre字符串和suf字符串
const seekFunc = (syntax: Syntax): InterParser => {
	try {
		return parserFunc[<any>syntax.type](syntax);
	} catch (error) {
		throw new Error(`parserFunc[${<any>syntax.type}]不是一个方法！`);
	}

};

const tupleBodyFunc = (syntax: Syntax) => {
	return {
		...defaultParse,
		child: (): Syntax[] => syntax.right,
		node: (childs: ParserNode[]): ParserNode => {
			const node = new Type();
			node.type = 'Tuple';
			node.genType = [];
			for (let i = 0; i < childs.length; i++) {
				node.genType.push(<Type>childs[i]);
			}

			return node;
		}
	};
};

const typeFunc = (syntax: Syntax) => {
	return {
		...defaultParse,
		child: (): Syntax[] => syntax.right,
		node: (childs: ParserNode): ParserNode => {
			return childs[0];
		}
	};
};
const baseTypeFunc = (syntax: Syntax) => {
	return {
		...defaultParse,
		node: (childs: ParserNode): ParserNode => {
			const node = new Type();
			node.type = syntax.right[0].value;

			return node;
		}
	};
};

const arrBodyFunc = (syntax: Syntax) => {
	return {
		...defaultParse,
		child: (): Syntax[] => {
			return [syntax.right[0]]; // type
		},
		node: (childs: ParserNode): ParserNode => {
			const node = new Type();
			node.type = 'Array';
			node.genType = childs[0];

			return node;
		}
	};
};

const igenTypeFunc = (syntax: Syntax) => {
	return {
		...defaultParse,
		child: (): Syntax[] => {
			return [syntax.right[syntax.right.length - 1]]; // genType
		},
		node: (childs: ParserNode): ParserNode => {
			const node = new Type();
			node.type = syntax.right[0].value;
			node.genType = childs[0].genType;

			return node;
		}
	};
};

const structTypeFunc = (syntax: Syntax) => {
	return {
		...defaultParse,
		child: (): Syntax[] => {
			return []; // genType
		},
		node: (childs: ParserNode): ParserNode => {
			const node = new Type();
			const ts = [];
			for (let i = 0; i < syntax.right.length; i++) {
				ts.push(syntax.right[i].value);
			}
			node.type = ts.join('.');

			return node;
		}
	};
};

const onlyRightFunc = (syntax: Syntax) => {
	return {
		...defaultParse,
		child: (): Syntax[] => syntax.right
	};
};

const valueFunc = (syntax: Syntax) => {
	return {
		...defaultParse,
		node: (childs: ParserNode): ParserNode => {
			const node = new ParserNode();
			node.str = syntax.value;

			return node;
		}
	};
};

const fileFunc = (syntax: Syntax) => {
	return {
		...defaultParse,
		child: (): Syntax[] => syntax.right,
		node: (childs: ParserNode[]): ParserNode => {
			const node = new ParserNode();
			node.childs = childs;

			return node;
		}
	};
};

// 定义结构体或枚举
const defFunc = (syntax: Syntax) => {
	return {
		...defaultParse,
		child: (): Syntax[] => {
			return syntax.right.slice(1, syntax.right.length); // genType, enumBody|structBody
		},
		node: (childs: ParserNode[]): ParserNode => {
			const right = syntax.right;
			const node = new Struct();

			node.name = right[0].value;
			node.type = syntax.type;
			if (right[1] && right[1].type === 'genType') {
				node.genType = (<GenType>childs[0]).genType;
				node.members = <Member[]>childs.splice(1, childs.length);
			} else {
				node.members = <Member[]>childs;
			}
			parseNote(syntax, node);// 解析注释和注解

			return node;
		}
	};
};

const enumMemberFunc = (syntax: Syntax) => {
	return {
		...defaultParse,
		node: (childs: ParserNode[]): Member => {
			const right = syntax.right;
			const node = new Member();
			parseNote(syntax, node);// 解析注释和注解
			node.name = right[0].value;// key
			// type
			if (right[1]) {
				const t = new Type();
				t.type = right[1].right[0].value;
				node.type = t;
			}

			return node;
		}
	};
};

const enumMembercFunc = (syntax: Syntax) => {
	return {
		...defaultParse,
		node: (childs: ParserNode[]): Member => {
			const right = syntax.right;
			const node = new Member();
			parseNote(syntax, node);// 解析注释和注解
			node.name = right[0].value;// key
			// type
			if (right[1]) {
				node.value = right[1].value;
			}

			return node;
		}
	};
};

const structKeyTypeFunc = (syntax: Syntax) => {
	return {
		...defaultParse,
		child: (): Syntax[] => {
			return [syntax.right[syntax.right.length - 1]];// type
		},
		node: (childs: ParserNode[]): Member => {
			const right = syntax.right;
			const node = new Member();
			parseNote(syntax, node);// 解析注释和注解
			node.name = right[0].value;// key
			node.type = <Type>childs[0];

			return node;
		}
	};
};

const genTypeFunc = (syntax: Syntax) => {
	return {
		...defaultParse,
		child: (): Syntax[] => {
			const arr = [];
			const right = syntax.right;// type(不包含lifetime)
			for (let i = 0; i < right.length; i++) {
				if (right[i].type !== 'lifetime') {
					arr.push(right[i]);
				}
			}

			return arr;
		},
		node: (childs: ParserNode[]): ParserNode => {
			const node = new GenType();
			node.genType = [];
			for (let i = 0; i < childs.length; i++) {
				node.genType.push(<Type>childs[i]);
			}

			return node;
		}
	};
};

const importFunc = (syntax: Syntax) => {
	return {
		...defaultParse,
		child: (): Syntax[] => {
			return syntax.right;
		},
		node: (childs: ParserNode[]): Import => {
			const node = new Import();
			node.type = 'import';
			const paths = [];
			let contents;
			for (let i = 0; i < childs.length; i++) {
				if (i < childs.length - 1) {
					paths.push(childs[i].str);
				} else {
					contents = childs[i].str.split(',');
				}
			}
			node.path = paths.join('/');
			node.contents = contents;
			parseNote(syntax, node);// 解析注释和注解

			return node;
		}
	};
};

const importOneFunc = (syntax: Syntax) => {
	return {
		...defaultParse,
		child: (): Syntax[] => {
			return syntax.right;
		},
		node: (childs: ParserNode[]): Import => {
			const node = new Import();
			node.type = 'importOne';
			const paths = [];
			let contents;
			for (let i = 0; i < childs.length; i++) {
				if (i < childs.length - 1) {
					paths.push(childs[i].str);
				} else {
					contents = childs[i].str.split(',');
				}
			}
			node.path = paths.join('/');
			node.contents = contents;
			parseNote(syntax, node);// 解析注释和注解

			return node;
		}
	};
};

const importCsFunc = (syntax: Syntax) => {
	return {
		...defaultParse,
		child: (): Syntax[] => {
			return syntax.right;
		},
		node: (childs: ParserNode[]): ParserNode => {
			const node = new ParserNode();
			const strs = [];
			for (let i = 0; i < childs.length; i++) {
				strs.push(childs[i].str);
			}
			node.str = strs.join(',');

			return node;
		}
	};
};

const parserFunc: any = {

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

const defaultParse = {
	child: (): Syntax[] => [],
	node: (childs: ParserNode[]) => {

		return new ParserNode();
	}
};

// 解析注释和注解
const parseNote = (syntax: Syntax, node: Json) => {
	if (syntax.preNotes) {
		const preNotes = syntax.preNotes;
		for (let i = 0; i < preNotes.length; i++) {
			if (preNotes[i].type === 'commentBlockPre' || preNotes[i].type === 'commentLinePre') {
				if (!node.preComment) {
					node.preComment = [];
				}
				node.preComment.push(preNotes[i].value);
			} else if (preNotes[i].type === 'annotatePre') {
				if (!node.annotate) {
					node.annotate = {};
				}
				const ans = preNotes[i].value.slice(3, preNotes[i].value.length - 1).split(',');
				parseAnnotate(ans, node.annotate);
			}
		}
	}
	if (syntax.sufNotes) {
		const sufNotes = syntax.sufNotes;
		for (let i = 0; i < sufNotes.length; i++) {
			if (sufNotes[i].type === 'commentBlockSuf' || sufNotes[i].type === 'commentLineSuf') {
				if (!node.sufNotes) {
					node.sufNotes = [];
				}
				node.sufNotes.push(sufNotes[i].value);
			} else if (sufNotes[i].type === 'annotateSuf') {
				if (!node.annotate) {
					node.annotate = {};
				}
				const ans = sufNotes[i].value.slice(2, sufNotes[i].value.length - 1).split(',');
				parseAnnotate(ans, node.annotate);
			}
		}
	}
};

// 解析注解
const parseAnnotate = (ans: string[], anno: Json) => {
	let temp;
	for (let i = 0; i < ans.length; i++) {
		temp = ans[i].split('=');
		if (temp.length === 1) {
			anno[temp[0]] = true;
		} else if (temp.length === 2) {
			anno[temp[0]] = `${temp[1]}`;
		}
	}
};

const setTplFunc = () => {
	tplFunc = toFunc(compile(tplStr, TplParser));
};

class TG {
	/* tslint:disable:no-reserved-keywords */
	public type: string;
	public genType?: string[];
}
export const typeToString = (tg: TG): string => {
	if (tg.type === 'Tuple') {
		/* tslint:disable:prefer-template */
		return '[' + tg.genType.join(',') + ']';
	}

	let type;
	if (isNumber(tg.type)) {
		type = 'number';
	} else if (isString(tg.type)) {
		type = 'string';
	} else if (tg.type === 'bool') {
		type = 'boolean';
	} else {
		type = tg.type;
	}

	if (!tg.genType) {
		return type;
	}

	let str;
	if (tg.genType) {
		str += type + '<' + tg.genType.join(',') + '>';
	}

	return str;
};

export const parseType = (t: Type): TG => {
	const type: TG = { type: t.type };
	if (!t.genType) {
		return type;
	}
	type.genType = [];
	for (let i = 0; i < t.genType.length; i++) {
		type.genType.push(typeToString(parseType(t.genType[i])));
	}

	return type;
};

export const tansType = (t: Type): string => {
	return typeToString(parseType(t));
};

export const isInteger = (type: string) => {
	if (type === 'i8' || type === 'i16' || type === 'i32' || type === 'i64' || type === 'u8' || type === 'u16'
		|| type === 'u32' || type === 'u64' || type === 'isize' || type === 'usize') {
		return true;
	}
};

export const isFloat = (type: string) => {
	if (type === 'f32' || type === 'f64') return true;
};

export const isString = (type: string) => {
	if (type === 'str' || type === 'char') return true;
};

export const isNumber = (type: string) => {
	if (isInteger(type) || isFloat(type)) return true;
};

export const isBase = (type: string) => {
	if (isNumber(type) || type === 'bool' || isString(type)) return true;
};

export const isBool = (type: string) => {
	if (type === 'bool') return true;
};

export const isStruct = (type: string) => {
	if (!isNumber(type) && !isString(type) && type !== 'bool' && type !== 'Array' && type !== 'Map' && type !== 'Tuple') return true;
};

class ParserNode {
	public childs?: ParserNode[];
	public str?: string;
}

class Type extends ParserNode {
	public type: string;
	public genType?: Type[];
}

/* tslint:disable:max-classes-per-file */
class GenType extends ParserNode {
	public genType: Type[];
}

class Struct extends ParserNode {
	public type: string;
	public name: string;
	public genType?: Type[];
	public members: Member[];
	public preComment?: string[];
	public sufComment?: string[];
	public annotate?: Json[];
}

class Import extends ParserNode {
	public type: string;
	public path: string;
	public contents: string[];
	public preComment?: string[];
	public sufComment?: string[];
	public annotate?: Json[];
}

class Member extends ParserNode {
	public name: string;
	public value?: string;
	public type: Type;
	public preComment?: string[];
	public sufComment?: string[];
	public annotate?: Json[];
}

class Members extends ParserNode {
	public members: Member[];
}

const createWBStr = (type: Type, key: string): string => {
	if (type.type === 'f32') {
		return `bb.writeF32(this.${key});`;
	} else if (type.type === 'f64') {
		return `bb.writeF64(this.${key});`;
	} else if (isInteger(type.type)) {
		return `bb.writeInt(this.${key});`;
	} else if (isString(type.type)) {
		return `bb.writeUtf8(this.${key});`;
	} else if (type.type === 'bool') {
		return `bb.writeBool(this.${key});`;
	}
};

/**
 * @description  返回定义的函数, 用定义字符串，转成匿名函数的返回函数
 * @example
 */
export const toFunc = (s: string) => {
	try {
		/* tslint:disable:no-function-constructor-with-string-args prefer-template*/
		return (new Function('_stringify', '_tansType', '_typeToString', '_parseType', '_isStruct', '_isInteger', '_isString',
			'_createWBStr', '_isBase', '_strHashCode', '_upperFirst', 'return ' + s))(toString, tansType, typeToString, parseType, isStruct,
				isInteger, isString, createWBStr, isBase, hash.strHashCode, upperFirst);
	} catch (e) {
		// warn(level, "tpl toFun, path: "+", s: ", s, e);
		throw (e);
	}
};

/* tslint:disable:max-line-length*/
let tplStr = `

	{{let _path = it1}}

	{{let _cfg = it2}}

	import { partWrite, allWrite } from "{{_cfg.util}}";

	import { BinBuffer, BinCode, ReadNext, WriteNext } from "{{_cfg.bin}}";

	import { addToMeta, removeFromMeta, Struct, notifyModify, StructMgr } from "{{_cfg.mgr}}";

	{{for k, v of it}}

	{{if v.type === "import" || "importOne"}}

	{{if v.sufComment}}{{for i, v1 of v.sufComment}}{{v1}}{{end}}{{end}}

	{{if v.type === "import"}}

	{{if v.annotate && v.annotate.path}}

	import { {{for index, c of v.contents}}{{if index > 0}},{{end}}{{c}}{{end}} } from "{{v.annotate.path + v.path}}";

	{{else}}

	import { {{for index, c of v.contents}}{{if index > 0}},{{end}}{{c}}{{end}} } from "./{{v.path}}";

	{{end}}

	{{elseif v.type === "importOne"}}

	{{if v.annotate && v.annotate.path}}

	import * as {{v.contents[0]}} from "{{v.annotate.path + v.path + v.contents[0]}}";

	{{else}}

	import * as {{v.contents[0]}} from "./{{v.path + v.contents[0]}}";

	{{end}}

	{{end}}

	{{if v.preComment}}{{for i, v1 of v.preComment}}{{v1}}{{end}}{{end}}

	{{end}}

	{{end}}



	{{for k, v of it}}

	{{if v.type === "defStruct" || v.type === "defStructEmpty"}}

	{{if v.sufComment}}{{for i, v1 of v.sufComment}}{{v1}}{{end}}{{end}}

	{{let members = v.members}}

	{{let clazz = v.name }}

	export class {{clazz}} {{if v.genType}}<{{for i, v1 of v.genType}}{{if i > 0}},{{end}}{{_tansType(v1)}}{{end}}>{{end}} extends {{if v.annotate && v.annotate.extends}}{{v.annotate.extends}}{{else}}Struct{{end}} {

		{{for i, v1 of members}}

		{{if v1.sufComment}}

		{{for j, vv of v.sufComment}}

		

		{{ vv }}

		{{end}}

		{{end}}

		{{if (v.annotate && v.annotate.readonly === "true") || (v1.annotate && v1.annotate.readonly === "true")}}

		readonly {{v1.name}}: {{_tansType(v1.type)}}

		{{else}}



		{{v1.name}}: {{_tansType(v1.type)}}

		{{end}}

		{{if v1.annotate && v1.annotate.default != undefined}} = {{v1.annotate.default}}{{end}};

		{{if v1.preComment}}{{for j, vv of v.preComment}}{{ vv }}{{end}}{{end}}

		{{end}}



		{{% 移除}}

		{{if v.annotate && v.annotate.readonly === "true"}}

		constructor({{for j, v1 of members}}{{if j > 0}},{{end}}{{v1.name}}?: {{_tansType(v1.type)}}{{end}}, old?: {{clazz}}){

			super();

			if(!old){

				{{for j, v1 of members}}

				this.{{v1.name}} = {{v1.name}};

				{{end}}

			}else{

				{{for j, v1 of members}}

				this.{{v1.name}} = {{v1.name}} === undefined? old.{{v1.name}}:{{v1.name}};

				{{end}}

			}

		}

		{{end}}



		{{% 添加}}

		addMeta(mgr: StructMgr){

			if(this._$meta)

				return;

			{{for j, v1 of members}}

			{{if _isStruct(v1.type.type)}}

			this.{{v1.name}} && this.{{v1.name}}.addMeta(mgr);

			{{elseif v1.type === "Array" && _isStruct(v1.type.genType[0].type)}}

			if(this.{{v1.name}}){

				for(let i = 0; i < this.{{v1.name}}.length; i++){

					if(this.{{v1.name}}[i]){

						this.{{v1.name}}[i].addMeta(mgr);

					}

				}

			}

			{{elseif v1.type === "Tuple"}}

			{{for j2,v2 of v1.genType}}

			{{if _isStruct(v2.type)}}

			if(this.{{v1.name}}[j2])

				this.{{v1.name}}[j2].addMeta(mgr);

			{{end}}

			{{end}}

			{{elseif v1.type === "Map" && _isStruct(v1.type.genType[1].type)}}

			if(this.{{v1.name}}){

				this.{{v1.name}}.forEach((v,k) => {

					v && c.addMeta(mgr);

				});

			}

			{{end}}

			{{end}}

			addToMeta(mgr, this);

		}



		{{% 移除}}

		removeMeta(){

			removeFromMeta(this);

			{{for j, v1 of members}}

			{{if _isStruct(v1.type.type)}}

			this.{{v1.name}} && this.{{v1.name}}.removeMeta();

			{{elseif v1.type === "Array" && _isStruct(v1.type.genType[0].type)}}

			if(this.{{v1.name}}){

				for(let i = 0; i < this.{{v1.name}}.length; i++){

					if(this.{{v1.name}}[i]){

						this.{{v1.name}}[i].removeMeta();

					}

				}

			}

			{{elseif v1.type === "Tuple"}}

			{{for j2,v2 of v1.genType}}

			{{if _isStruct(v2.type)}}

			if(this.{{v1.name}}[j2])

				this.{{v1.name}}[j2].removeMeta();

			{{end}}

			{{end}}

			{{elseif v1.type === "Map" && _isStruct(v1.type.genType[1].type)}}

			if(this.{{v1.name}}){

				this.{{v1.name}}.forEach((v,k) => {

					v && c.removeMeta();

				});

			}

			{{end}}

			{{end}}			

		}



		{{% set 设置}}

		{{if !v.annotate || !v.annotate.readonly || v.annotate.readonly === "false"}}

		{{for j, v1 of members}}

		{{let _type = _tansType(v1.type)}}

		{{if v1.type.type === "Array"}}

		set{{_upperFirst(v1.name)}} (value: {{_tansType(v1.type.genType[0])}}, index: number | string){

			!this.{{v1.name}} && (this.{{v1.name}} = [] as {{_tansType(v1.type)}});

			{{if _isStruct(v1.type.genType[0].type)}}

			let old = this.{{v1.name}}[index];

			this.{{v1.name}}[index] = value;

			if(this._$meta){

				if(old)

					old.removeMeta();

				value.addMeta(this._$meta.mgr);

				{{if v.annotate && v.annotate.hasmgr === "true"}}			

				notifyModify(this, "{{v1.name}}", value, old, index);

				{{end}}

			}

			{{else}}

			let old = this.{{v1.name}}[index];

			this.{{v1.name}}[index] = value;

			{{if v.annotate && v.annotate.hasmgr === "true"}}

			if(this._$meta)

				notifyModify(this, "{{v1.name}}", value, old, index);

			{{end}}

			{{end}}

		}

		{{elseif v1.type.type === "Tuple"}}

		{{for j2, v2 of v1.type.genType}}

		set{{_upperFirst(v1.name)}}_{{j2}} (value: {{_tansType(v2)}}){

			!this.{{v1.name}} && (this.{{v1.name}} = [] as {{_tansType(v1.type)}});

			{{if _isStruct(v2.type)}}

			let old = this.{{v1.name}}[{{j2}}];

			this.{{v1.name}}[{{j2}}] = value;

			if(this._$meta){

				if(old)

					old.removeMeta();

				value.addMeta(this._$meta.mgr);	

				{{if v.annotate && v.annotate.hasmgr === "true"}}		

				notifyModify(this, "{{v1.name}}", value, old, {{j2}});

				{{end}}

			}

			{{else}}

			let old = this.{{v1.name}}[{{j2}}];

			this.{{v1.name}}[{{j2}}] = value;

			{{if v.annotate && v.annotate.hasmgr === "true"}}

			if(this._$meta)

				notifyModify(this, "{{v1.name}}", value, old, {{j2}});

			{{end}}

			{{end}}

		}

		{{end}}

		{{elseif v1.type.type === "Map"}}

		set{{_upperFirst(v1.name)}} (value: {{_tansType(v1.type.genType[1])}}, key: number | string){

			!this.{{v1.name}} && (this.{{v1.name}} = [] as Map<{{_tansType(v1.type.genType[0])}}, {{_tansType(v1.type.genType[1])}}>);

			{{if _isStruct(v1.type.genType[0].type)}}

			let old = this.{{v1.name}}.get(key);

			this.{{v1.name}}.set(key,value);

			if(this._$meta){

				if(old)

					old.removeMeta();

				value.addMeta(this._$meta.mgr);

				{{if v.annotate && v.annotate.hasmgr === "true"}}

				notifyModify(this, "{{v1.name}}", value, old, key);

				{{end}}

			}

			{{else}}

			let old = this.{{v1.name}}.get(key);

			this.{{v1.name}}.set(key,value);

			{{if v.annotate && v.annotate.hasmgr === "true"}}

			if(this._$meta)

				notifyModify(this, "{{v1.name}}", value, old, key);

			{{end}}

			{{end}}

		}

		{{else}}

		set{{_upperFirst(v1.name)}} (value: {{_type}}){	

			{{if _isStruct(v1.type.type)}}

			let old = this.{{v1.name}};

			this.{{v1.name}} = value;

			if(this._$meta){

				if(old)

					old.removeMeta();

				value.addMeta(this._$meta.mgr);

				{{if v.annotate && v.annotate.hasmgr === "true"}}

				notifyModify(this, "{{v1.name}}", value, old);

				{{end}}

			}

			{{else}}

			let old = this.{{v1.name}};

			this.{{v1.name}} = value;

			{{if v.annotate && v.annotate.hasmgr === "true"}}

			if(this._$meta)

				notifyModify(this, "{{v1.name}}", value, old);

			{{end}}

			{{end}}			

		}

		{{end}}

		{{end}}

		{{end}}



		{{%如果字段noCopy注解为false，应该设置copy和clone方法}}

		{{if !v.annotate || !v.annotate.noCopy || v.annotate.noCopy === "false"}}

		copy(o: {{clazz}}) : {{clazz}} {

			{{for i, v1 of members}}

			{{if (v.annotate && v.annotate.readonly === "true") || (v1.annotate && v1.annotate.readonly === "true")}}

			{{elseif _isStruct(v1.type.type)}}

			o.{{v1.name}} && ((<any>this).{{v1.name}} = o.{{v1.name}}.clone());

			{{elseif v1.type.type === "Array"}}

			if(o.{{v1.name}}){

				(<any>this).{{v1.name}} = [] as {{_tansType(v1.type.genType)}};

				for(let i = 0; i < o.{{v1.name}}.length; i++){

					{{if _isStruct(v1.type.genType.type)}}

					o.{{v1.name}} && ((<any>this).{{v1.name}} = o.{{v1.name}}.clone());

					{{else}}

					(<any>this).{{v1.name}} = o.{{v1.name}};

					{{end}}

				}

			}

			{{elseif v1.type.type === "Tuple"}}

			if(o.{{v1.name}}){

				this.{{v1.name}} = [] as {{_tansType(v1.type)}}

				{{for j2, v2 of v1.type.genType}}

				{{if _isStruct(v2.type)}}

				o.{{v1.name}}[{{j2}}] && ((<any>this).{{v1.name}}[{{j2}}] = o.{{v1.name}}[{{j2}}].clone());

				{{else}}

				(<any>this).{{v1.name}}[{{j2}}] = o.{{v1.name}}[{{j2}}];

				{{end}}

				{{end}}

			}

			{{elseif v1.type.type === "Map"}}

			if(o.{{v1.name}}){

				o.{{v1.name}}.forEach((v, k) => {

					{{if _isStruct(v1.type.genType.type)}}

					v && (this.{{v1.name}} = v.clone());

					{{else}}

					this.{{v1.name}} = v;

					{{end}}

				});

			}

			{{else}}

			this.{{v1.name}} = o.{{v1.name}};

			{{end}}

			{{end}}

			return this;

		}



		clone() : {{clazz}} {

			return new {{clazz}}().copy(this);

		}

		{{end}}



		{{%如果字段noBinSeri注解为false，应该设置_binDecode和_binEncode方法}}

		{{if !v.annotate || !v.annotate.noBinSeri || v.annotate.noBinSeri === "false"}}

		binDecode(bb:BinBuffer, next: Function) {

			{{for j, v1 of members}}

			{{if !v1.annotate || !v1.annotate.noBinSeri || v1.annotate.noBinSeri === "false"}}

			{{if v1.type.type === "Array" && _isStruct(v1.type.genType[0].type)}}

			(<any>this).{{v1.name}} = bb.read(next(this._$meta.mgr)) as Array<{{_tansType(v1.type.genType[0].type)}}>;

			{{elseif v1.type.type === "Map" && _isStruct(v1.type.genType[1].type)}}

			(<any>this).{{v1.name}} = bb.read(next(this._$meta.mgr)) as Map<{{v1.type.genType[0].type}}, {{_tansType(v1.type.genType[1].type)}}>;

			{{elseif v1.type.type === "Tuple"}}

			(<any>this).{{v1.name}} = [] as {{_tansType(v1.type)}};

			{{for j2, v2 of v1.type.genType}}

			{{if _isStruct(v2.type)}}		

			(<any>this).{{v1.name}}.push(bb.read(next(this._$meta.mgr)) as {{_tansType(v2)}});

			{{else}}

			(<any>this).{{v1.name}}.push(bb.read() as {{_tansType(v2)}});

			{{end}}

			{{end}}		

			{{elseif _isStruct(v1.type.type)}}

			(<any>this).{{v1.name}} = bb.read(next(this._$meta.mgr)) as {{_tansType(v1.type)}};

			{{else}}

			(<any>this).{{v1.name}} = bb.read() as {{_tansType(v1.type)}};

			{{end}}

			{{end}}

			{{end}}

		}



		binEncode(bb:BinBuffer, next: WriteNext) {

			let temp: any;

			{{for j, v1 of members}}

			{{if !v1.annotate || !v1.annotate.noBinSeri || v1.annotate.noBinSeri === "false"}}

			if(this.{{v1.name}} === null || this.{{v1.name}} === undefined)

				bb.writeNil();

			else{

				{{if v1.type.type === "Tuple"}}								

				{{for j2, v2 of v1.type.genType}}

				if(this.{{v1.name}}[{{j2}}] === null || this.{{v1.name}}[{{j2}}] === undefined)

					bb.writeNil();

				else{

				{{if _isStruct(v2.type)}}

				bb.writeCt(this.{{v1.name}}, next);

				{{elseif v2.type === "f32"}}

				bb.writeF32(this.{{v1.name}}[{{j2}}]);

				{{elseif v2.type === "f64"}}

				bb.writeF64(this.{{v1.name}}[{{j2}}]);

				{{elseif _isInteger(v2.type)}}

				bb.writeInt(this.{{v1.name}}[{{j2}}]);

				{{elseif _isString(v2.type)}}

				bb.writeUtf8(this.{{v1.name}}[{{j2}}]);

				{{elseif v2.type === "bool"}}

				bb.writeBool(this.{{v1.name}}[{{j2}}]);

				{{end}}	

				}		

				{{end}}	

				{{elseif v1.type.type === "Array" || v1.type.type === "Map" || _isStruct(v1.type.type)}}

				bb.writeCt(this.{{v1.name}}, next);

				{{elseif v1.type.type === "f32"}}

				bb.writeF32(this.{{v1.name}});

				{{elseif v1.type.type === "f64"}}

				bb.writeF64(this.{{v1.name}});

				{{elseif _isInteger(v1.type.type)}}

				bb.writeInt(this.{{v1.name}});

				{{elseif _isString(v1.type.type)}}

				bb.writeUtf8(this.{{v1.name}});

				{{elseif v1.type.type === "bool"}}

				bb.writeBool(this.{{v1.name}});

				{{end}}	

			}						

			{{end}}

			{{end}}						

		}

		{{end}}

	}

	{{if v.preComment}}{{for i, v1 of v.preComment}}{{v1}}{{end}}{{end}}



	{{%设置结构体的基本信息，包含用nameHash，annotate，fields}}

	(<any>{{clazz}})._$info = {

		nameHash:{{_strHashCode(_path + clazz, 0)}},

		{{if v.annotate}}

		annotate:{{JSON.stringify(v.annotate)}},

		{{end}}

		fields:{ {{for j,v1 of v.members}}{{if j > 0}},{{end}}{{v1.name}}:{{JSON.stringify(v1)}}{{end}} }

	}

	{{elseif v.type === "defEnum"}}

	{{if v.sufComment}}{{for i, v1 of v.sufComment}}{{v1}}{{end}}{{end}}

	export enum {{v.name}}{

	{{let members = v.members}}

	{{for k1, v1 of members}}

		{{if k1 > 0}},

		{{end}}

		{{v1.name}}={{v1.value}}

	{{end}} }



	{{end}}

	{{end}}

`;

tplStr = tplStr.replace(/^\t/mg, '');

setTplFunc();