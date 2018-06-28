/**
 * 扩展巴科斯范式
 * https://zh.wikipedia.org/wiki/%E6%89%A9%E5%B1%95%E5%B7%B4%E7%A7%91%E6%96%AF%E8%8C%83%E5%BC%8F
 * 支持 "'+*-/!|=:;&^%?@#$~`<>()[]{} 等基础符号用引号引起作为定义的name，但这类规则是无法被其他规则引用的
 * 重复的表达式可以通过花括号{ ... }表示，表示1-n次。如果要0-n次，可以用[{...}]表示。
 * 修改或操作(| ... , ... |, 间隔符为,)
 * 增加与操作(& ... , ... &, 间隔符为,), 取反操作(!...!)
 * 因为与或操作也使用","分割，所以增加 顺序操作符(@ ... , ... @, 间隔符为,)
 * 因为与操作联合取反操作可替代排除操作(-)，故取消排除操作。
 * 比如： all characters − '"'， 可改成 & !'"'! , all characters&
 * 如果规则项后为字符#，表示扩展信息，?表示可忽略，后面跟其他字符串表示状态切换或状态后退，back2为状态退后2次。
 */

// ============================== 导入
import { CharReader, createByStr } from './reader';

// ============================== 导出
/**
 * @description 规则读取器
 */
export type RuleReader = () => Rule;
/**
 * @description 规则
 */
export interface Rule {
	name: string;
	entry: Entry;
}
/**
 * @description 规则项
 */
export interface Entry {
	/* tslint:disable:no-reserved-keywords */
	type: 'series' | 'and' | 'or' | 'not' | 'terminal' | 'name' | 'optional' | 'repeat' | 'builtIn';
	str: string;
	value?: string;
	child?: Entry;
	childs?: Entry[];
	option: any;
}
/**
 * @description 内建的字符函数
 */
export const builtIn = {
	all: (c: string): boolean => {
		return !!c;
	},
	visible: (c: string): boolean => {
		return (c >= ' ' && c <= '~') || c.charCodeAt(0) > 256;
	},
	whitespace: (c: string): boolean => {
		return c === ' ' || c === '\t' || c === '\v' || c === '\f' || c === '\n' || c === '\r';
	},
	notwhitespace: (c: string): boolean => {
		return !((!c) || c === ' ' || c === '\t' || c === '\v' || c === '\f' || c === '\n' || c === '\r');
	},
	spacetab: (c: string): boolean => {
		return c === ' ' || c === '\t' || c === '\v' || c === '\f';
	},
	breakline: (c: string): boolean => {
		return c === '\n' || c === '\r';
	},
	notbreakline: (c: string): boolean => {
		return !((!c) || c === '\n' || c === '\r');
	},
	digit: (c: string): boolean => {
		return (c >= '0' && c <= '9');
	},
	notdigit: (c: string): boolean => {
		return !((!c) || c >= '0' && c <= '9');
	},
	digit19: (c: string): boolean => {
		return (c >= '1' && c <= '9');
	},
	alphabetic: (c: string): boolean => {
		return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z');
	},
	notalphabetic: (c: string): boolean => {
		return !((!c) || (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z'));
	},
	lowercase: (c: string): boolean => {
		return (c >= 'a' && c <= 'z');
	},
	uppercase: (c: string): boolean => {
		return (c >= 'A' && c <= 'Z');
	},
	word: (c: string): boolean => {
		return c === '_' || (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9');
	},
	notword: (c: string): boolean => {
		return !((!c) || c === '_' || (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9'));
	}
};

/**
 * @description 创建规则读取器
 */
export const createRuleReader = (s: string): RuleReader => {
	const parser = new Parser();
	parser.reader = createByStr(s.replace(regComment, '').trim());

	parser.nextIgnoreWhitespace();

	return () => {
		if (!parser.cur) {
			return;
		}
		const name = parseDefine(parser);
		parser.name = name;
		if (builtIn.whitespace(parser.cur)) {
			parser.nextIgnoreWhitespace();
		}
		if (parser.cur !== '=') {
			throw new Error(`${parser.name}, parse rule error, need = !`);
		}
		const e = parseSeries(parser.next());
		if (<string>parser.cur !== ';') {
			throw new Error(`${parser.name}, parse rule error, need ; !`);
		}
		parser.next();
		if (builtIn.whitespace(parser.cur)) {
			parser.nextIgnoreWhitespace();
		}

		return { name: name, entry: e };
	};
};
// ============================== 本地
// 匹配注释，要排除"(*" "*)" 被放入到终止符的情况
const regComment = /\(\*[^"'][^\*]*[^"']\*\)/g;

/**
 * @description 解析器
 */
class Parser {
	public name: string = null;
	public reader: CharReader = null;
	public cur: string = null;

	// 读取下一个字符
	public next() {
		this.cur = this.reader();

		return this;
	}
	// 读取下一个非空白字符
	public nextIgnoreWhitespace() {
		do {
			this.cur = this.reader();
		} while (this.cur && this.cur <= ' ');
	}
}

// 解析定义的规则名，支持 "'+*-/!|=:;&^%?@#$~`<>()[]{} 等基础符号用引号引起作为定义的name
const parseDefine = (parser: Parser): string => {
	switch (parser.cur) {
		case '"':
			return parseTerminal(parser.next(), '"').value;
		case '\'':
			return parseTerminal(parser.next(), '\'').value;
		default:
			if (builtIn.word(parser.cur)) {
				return parseName(parser).value;
			}
	}
};

// 解析结果集
const parseResult = (parser: Parser): string => {
	let s = '';
	while (parser.cur !== ';') {
		if (!parser.cur) {
			throw new Error(`${parser.name}, parse result incomplate!`);
		}
		s += parser.cur;
		parser.next();
	}

	return s.trim();
};

// 解析
const parse = (parser: Parser): Entry => {
	while (parser.cur) {
		switch (parser.cur) {
			case '"':
				return parseTerminal(parser.next(), '"');
			case '\'':
				return parseTerminal(parser.next(), '\'');
			case '[':
				return parseOptional(parser.next());
			case '{':
				return parseRepeat(parser.next());
			case '|':
				return parseAndOr(parser, 'or');
			case '&':
				return parseAndOr(parser, 'and');
			case '!':
				return parseNot(parser.next());
			case '?':
				return parseBuiltIn(parser.next());
			case '@':
				return parseSeries(parser.next(), true);
			default:
				if (parser.cur === '_' || builtIn.alphabetic(parser.cur)) {
					return parseName(parser);
				}
		}
		parser.nextIgnoreWhitespace();
	}
};
// 解析规则项的可选项，#字符开始，?为忽略，?1为忽略并切换到状态1，back2为状态退后2次
const parseOption = (parser: Parser): any => {
	if (builtIn.whitespace(parser.cur)) {
		parser.nextIgnoreWhitespace();
	}
	if (parser.cur !== '#') {
		return;
	}
	parser.next();
	const s = { ignore: true, state: '', back: 0 };
	if (<any>parser.cur !== '?') {
		s.ignore = false;
	} else {
		parser.next();
	}
	while (parser.cur && builtIn.word(parser.cur)) {
		s.state += parser.cur;
		parser.next();
	}
	if (s.state.startsWith('back')) {
		s.back = parseInt(s.state.slice(4), 10) || 1;
	}

	return s;
};

// 解析终结符或规则名
const parseTerminal = (parser: Parser, char: string): Entry => {
	let s = '';
	while (parser.cur !== char) {
		if (!parser.cur) {
			throw new Error(`${parser.name}, parse terminal incomplate!`);
		}
		s += parser.cur;
		parser.next();
	}
	parser.next();

	return {
		type: 'terminal',
		/* tslint:disable:prefer-template */
		str: '"' + s + '"',
		value: s,
		child: null,
		childs: null,
		option: parseOption(parser)
	};
};

// 解析规则名
const parseName = (parser: Parser): Entry => {
	let s = '';
	while (parser.cur) {
		if (parser.cur !== ' ' && !builtIn.word(parser.cur)) {
			break;
		}
		s += parser.cur;
		parser.next();
	}
	s = s.trim();

	return {
		type: 'name',
		str: s,
		value: s,
		child: null,
		childs: null,
		option: parseOption(parser)
	};
};

// 解析连续操作
const parseSeries = (parser: Parser, end?: boolean): Entry => {
	const arr = [];
	while (parser.cur) {
		arr.push(parse(parser));
		if (builtIn.whitespace(parser.cur)) {
			parser.nextIgnoreWhitespace();
		}
		if (parser.cur !== ',') {
			break;
		}
		parser.next();
	}
	if (end) {
		parser.next();
	}
	if (arr.length === 1) {
		return arr[0];
	}

	return {
		type: 'series',
		str: getArrStr(arr),
		value: null,
		child: null,
		childs: arr,
		option: parseOption(parser)
	};
};

// 解析与或操作
const parseAndOr = (parser: Parser, type: 'and' | 'or'): Entry => {
	const c = parser.cur;
	const arr = [];
	parser.next();
	while (parser.cur) {
		arr.push(parse(parser));
		if (builtIn.whitespace(parser.cur)) {
			parser.nextIgnoreWhitespace();
		}
		if (parser.cur === c) {
			parser.next();
			if (arr.length === 1) {
				return arr[0];
			}

			return {
				type: type,
				str: c + ' ' + getArrStr(arr) + ' ' + c,
				value: null,
				child: null,
				childs: arr,
				option: parseOption(parser)
			};
		}
		if (parser.cur !== ',') {
			throw new Error(parser.name + ', parse ' + type + ' error, need , !');
		}
		parser.next();
	}
	throw new Error(parser.name + ', parse ' + type + ' incomplate!');
};

// 解析取反操作
const parseNot = (parser: Parser): Entry => {
	const e = parseSeries(parser);
	if (builtIn.whitespace(parser.cur)) {
		parser.nextIgnoreWhitespace();
	}
	if (parser.cur !== '!') {
		throw new Error(parser.name + ', parse not error, need ! !');
	}
	parser.next();

	return {
		type: 'not',
		str: '! ' + e.str + ' !',
		value: null,
		child: e,
		childs: null,
		option: parseOption(parser)
	};
};

// 解析重复操作
const parseRepeat = (parser: Parser): Entry => {
	const e = parseSeries(parser);
	if (builtIn.whitespace(parser.cur)) {
		parser.nextIgnoreWhitespace();
	}
	if (parser.cur !== '}') {
		throw new Error(parser.name + ', parse repeat error, need } !');
	}
	parser.next();

	return {
		type: 'repeat',
		str: '{ ' + e.str + ' }',
		value: null,
		child: e,
		childs: null,
		option: parseOption(parser)
	};
};
// 解析可选操作
const parseOptional = (parser: Parser): Entry => {
	const e = parseSeries(parser);
	if (builtIn.whitespace(parser.cur)) {
		parser.nextIgnoreWhitespace();
	}
	if (parser.cur !== ']') {
		throw new Error(parser.name + ', parse optional error, need ] !');
	}
	parser.next();

	return {
		type: 'optional',
		str: '[ ' + e.str + ' ]',
		value: null,
		child: e,
		childs: null,
		option: parseOption(parser)
	};
};
// 解析内置操作
const parseBuiltIn = (parser: Parser): Entry => {
	let s = '';
	while (parser.cur !== '?') {
		if (!parser.cur) {
			throw new Error(parser.name + ', parse builtIn incomplate!');
		}
		s += parser.cur;
		parser.next();
	}
	parser.next();
	s = s.trim();

	return {
		type: 'builtIn',
		str: '? ' + s + ' ?',
		value: s,
		child: null,
		childs: null,
		option: parseOption(parser)
	};
};

// 获得数组字符串
const getArrStr = (arr: Entry[]): string => {
	const a = [];
	a.length = arr.length;
	for (let i = arr.length - 1; i >= 0; i--) {
		a[i] = arr[i].str;
	}

	return a.join(' , ');
};

// ============================== 立即执行
