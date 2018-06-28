/**
 * 词法分析（Lexical analysis或Scanning）和词法分析程序（Lexical analyzer或Scanner）
 */

// ============================== 导入
import { builtIn, createRuleReader, Entry, Rule } from './ebnf';
import { CharReader } from './reader';

// ============================== 导出
/**
 * @description 记号
 */
export interface Token {
	/* tslint:disable:no-reserved-keywords */
	type: string;
	value: string;
	index: number;
	line: number;
	column: number;
}

/**
 * @description 词法分析器
 */
export class Scanner {
	public stateScanner: Map<string, StateScanner> = new Map();
	public reader: CharReader = null;
	public index: number = 1;
	public line: number = 1;
	public column: number = 1;
	public cur: string = null;
	public last: CharToken[] = [];
	public lastIndex: number = 0;
	public reset: boolean = false;
	public ss: StateScanner = null;
	public state: string = null;
	public stateStack: string[] = [];

	/**
	 * @description 设置规则，可以指定规则所在的状态
	 * @example
	 */
	public setRule(s: string, state?: string) {
		state = state || '';
		let ss = this.stateScanner.get(state);
		if (!ss) {
			ss = new StateScanner();
			this.stateScanner.set(state, ss);
		}
		if (!this.ss) {
			this.state = state;
			this.ss = ss;
		}
		const reader = createRuleReader(s);
		let r = reader();
		const arr = ss.rules;
		const map = ss.map;
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
	public initReader(r: CharReader, index?: number, line?: number, column?: number, state?: string) {
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
	public getState(): string {
		return this.state;
	}
	/**
	 * @description 获取状态堆栈的深度
	 * @example
	 */
	public stateDeep(): number {
		return this.stateStack.length;
	}
	/**
	 * @description 设置状态
	 * @example
	 */
	public setState(s: string) {
		this.stateStack.push(this.state);
		this.state = s;
		this.ss = this.stateScanner.get(s);
	}
	/**
	 * @description 回退状态
	 * @example
	 */
	public backState(): string {
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
	public next(): Scanner {
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
			const t = this.last[this.lastIndex++];
			this.cur = t.char;
		}

		return this;
	}
	/**
	 * @description 刷新，并返回前面匹配成功的字符串
	 * @example
	 */
	public flush(ignore: boolean): string {
		let s = '';
		const index = this.lastIndex - 1;
		if (!ignore) {
			for (let i = 0; i < index; i++) {
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
	public reback(arr: Token[]) {
		if (!arr.length) {
			return;
		}
		const cc = [];
		for (const t of arr) {
			let i = t.index;
			let line = t.line;
			let column = t.column;
			for (const c of t.value) {
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
	public setCur(lastIndex: number) {
		if (lastIndex === this.lastIndex) {
			return;
		}
		const t = this.last[lastIndex - 1];
		this.cur = t.char;
		this.lastIndex = lastIndex;
		this.reset = true;
	}

	/**
	 * @description 获得记号，返回undefined 表示结束
	 * @example
	 */
	public scan(t: Token): boolean {
		return stateScan(this, this.ss, t);
	}

}

// ============================== 本地
/**
 * @description 字符记号
 */
interface CharToken {
	char: string;
	index: number;
	line: number;
	column: number;
}

/**
 * @description 规则匹配器
 */
type Match = (s: Scanner) => boolean;
/**
 * @description 词法规则
 */
class LexRule {
	public rule: Rule = null;
	public match: Match = null;
	public nameType: boolean = false;
}

/**
 * @description 规则匹配器
 */
interface MatchRule {
	ok: LexRule[];
	unknown: LexRule[];
}

/**
 * @description 指定状态的词法扫描器
 */
class StateScanner {
	public rules: LexRule[] = [];
	public map: Map<string, LexRule> = new Map();
	public firstCharMap: Map<string, MatchRule> = new Map();
}

// 状态扫描
const stateScan = (s: Scanner, ss: StateScanner, t: Token): boolean => {
	if (!s.cur) {
		return false;
	}
	// 匹配
	let type;
	let rule: LexRule;
	// 检查该字符对应的匹配列表
	let mr = ss.firstCharMap.get(s.cur);
	if (!mr) {
		mr = { ok: [], unknown: ss.rules.concat() };
		ss.firstCharMap.set(s.cur, mr);
	}
	// 先匹配ok列表
	for (let arr = mr.ok, i = 0, len = arr.length; i < len; i++) {
		rule = arr[i];
		if (rule.match(s)) {
			type = rule.rule.name;
			break;
		}
	}
	if (!type) {
		// ok列表没有匹配上，则继续匹配unknown列表
		const arr = mr.unknown;
		let i = 0;
		const len = arr.length;
		s.reset = false;
		for (; i < len; i++) {
			rule = arr[i];
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
		mr.unknown = arr.slice(i + 1);
		if (!type) {
			return false;
		}
		mr.ok.push(rule);
	}
	t.index = s.last[0].index;
	t.line = s.last[0].line;
	t.column = s.last[0].column;
	let v = s.flush(rule.nameType);
	if (rule.nameType) {
		v = type;
	}
	t.type = type;
	t.value = v;

	return true;
};

// 构建词法规则
const build = (rule: Rule, arr: LexRule[], map: Map<string, LexRule>) => {
	const r = new LexRule();
	r.rule = rule;
	r.match = makeRuleEntry(rule.entry, map);
	if ((rule.entry.type === 'terminal' && rule.name === rule.entry.value) 
	|| (rule.entry.type === 'and' && rule.name === getAndTerminalValue(rule.entry.childs))) {
		r.nameType = true;
	}
	arr.push(r);
	map.set(rule.name, r);
};
// 创建词法规则函数
const makeRuleEntry = (re: Entry, map: Map<string, LexRule>): Match => {
	const func = ruleTab[re.type];
	if (!func) {
		throw new Error(`scanner, make rule fail, invalid name: ${re.type}`);		
	}

	return func(re, map);
};
// 构建与规则中终结符的值
const getAndTerminalValue = (arr: Entry[]): string => {
	for (const e of arr) {
		if (e.type === 'terminal') {
			return e.value;
		}
	}
};

// 创建词法规则函数数组
const makeMatchs = (arr: Entry[], map: Map<string, LexRule>): Match[] => {
	const matchs = [];
	for (const r of arr) {
		const func = makeRuleEntry(r, map);
		if (!func) {
			return;
		}
		matchs.push(func);
	}

	return matchs;
};
// 联合词法规则
const merge = (arr: LexRule[], map: Map<string, LexRule>) => {
	let oldlen;
	let len = 0;
	let name;
	do {
		oldlen = len;
		len = 0;
		for (const r of arr) {
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
		throw new Error(`scanner, rule merge fail, name: ${name}`);		
	}
};

// 词法规则函数表
const ruleTab = {
	series: (re: Entry, map: Map<string, LexRule>) => {
		const arr = makeMatchs(re.childs, map);
		if (!arr) {
			return;
		}

		return (s: Scanner) => {
			const sss = re.str;
			const i = s.lastIndex;
			for (const func of arr) {
				const r = func(s);
				if (!r) {
					s.setCur(i);

					return false;
				}
			}

			return true;
		};
	},
	and: (re: Entry, map: Map<string, LexRule>) => {
		const arr = makeMatchs(re.childs, map);
		if (!arr) {
			return;
		}

		return (s: Scanner) => {
			const sss = re.str;
			const i = s.lastIndex;
			const r = arr[0](s);
			if (!r) {
				return false;
			}
			let old = s.lastIndex > i ? s.lastIndex : -1;
			for (let j = 1, len = arr.length; j < len; j++) {
				s.setCur(i);
				const r = arr[j](s);
				if (!r) {
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
	or: (re: Entry, map: Map<string, LexRule>) => {
		const arr = makeMatchs(re.childs, map);
		if (!arr) {
			return;
		}

		return (s: Scanner) => {
			const sss = re.str;
			for (const func of arr) {
				if (func(s)) {
					return true;
				}
			}

			return false;
		};
	},
	not: (re: Entry, map: Map<string, LexRule>) => {
		const func = makeRuleEntry(re.child, map);
		if (!func) {
			return;
		}

		return (s: Scanner) => {
			const sss = re.str;
			const i = s.lastIndex;
			const r = func(s);
			if (r) {
				s.setCur(i);

				return false;
			}

			return true;
		};
	},
	terminal: (re: Entry, map: Map<string, LexRule>) => {
		const str = re.value;

		return (s: Scanner) => {
			const sss = re.str;
			const i = s.lastIndex;
			let x = 0;
			let c = str[x++];
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
	name: (re: Entry, map: Map<string, LexRule>) => {
		const r = map.get(re.value);
		if (!r) {
			return;
		}

		return r.match;
	},
	optional: (re: Entry, map: Map<string, LexRule>) => {
		const func = makeRuleEntry(re.child, map);
		if (!func) {
			return;
		}

		return (s: Scanner) => {
			const sss = re.str;
			func(s);

			return true;
		};
	},
	repeat: (re: Entry, map: Map<string, LexRule>) => {
		const func = makeRuleEntry(re.child, map);
		if (!func) {
			return;
		}

		return (s: Scanner) => {
			const sss = re.str;
			const i = s.lastIndex;
			let r = func(s);
			if (!r) {
				return false;
			}
			while (r) {
				if (s.lastIndex === i) {
					throw new Error(`scanner, repeat fail, endless loop: ${re.value}, line: ${s.line}, column: ${s.column}`);					
				}
				r = func(s);
			}

			return true;
		};
	},
	builtIn: (re: Entry, map: Map<string, LexRule>) => {
		const func = builtIn[re.value];
		if (!func) {
			throw new Error(`scanner, make rule fail, invalid builtIn: ${re.value}`);			
		}

		return (s: Scanner) => {
			const sss = re.str;
			const r = func(s.cur);
			if (r) {
				s.next();
			}
			
			return r;
		};
	}
};

// ============================== 立即执行
