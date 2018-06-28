/**
 * 语法分析（Syntax analysis或Parsing）和语法分析程序（Parser）
 * 支持左结合的递归语法，
 * 语法解析器，创建抽象语法树
 * 需要设置操作符配置表，描述所有能直接读取的操作符号及这些操作符的优先级和处理函数
 * http://www.cnblogs.com/rubylouvre/archive/2012/09/08/2657682.html
 */

// ============================== 导入
import { createRuleReader, Entry, Rule } from './ebnf';
import { Scanner, Token } from './scanner';

// ============================== 导出
/**
 * @description 语法节点
 */
export class Syntax {
	/* tslint:disable:no-reserved-keywords */
	public type: string = null;
	public value: any = null;
	public left: Syntax = null;
	public right: Syntax[] = null;
	public token: RuleToken = null;
	public preNotes: RuleToken[] = null;
	public sufNotes: RuleToken[] = null;
	public parent:Syntax = null;
}
/**
 * @description 记号
 */
export class RuleToken {
	public type: string = null;
	public value: string = null;
	public index: number = 0;
	public line: number = 0;
	public column: number = 0;
	public rule: TokenRule = null;
	public parent: Syntax = null;
	public loc: number = 0;
}

/**
 * @description 配置规则
 */
export interface Cfg {
	type: string; // 类型，和词法单元类型要相同
	lbp?: number; // 左结合优先级，越大越优先，默认为0，表示右结合
	rbp?: number; // 右结合优先级，越大越优先，默认为左结合优先级
	nud?: string; // 空指称规则，向右及自身结合，常用于值（例如变量和直接量）以及前缀操作符
	led?: string; // 左指称规则，向左结合，常用于中缀和后缀运算符
	suf?: boolean; // 是否为后缀运算符
	ignore?: boolean; // 是否忽略该token
	note?: number; // -1向前注释|注解，1表示向后注释|注解
}

/**
 * @description 语法分析器
 */
export class Parser {
	public scanner: Scanner = null;
	public tokenMap: Map<string, TokenRule> = new Map();
	public syntaxMap: Map<string, SyntaxRule> = new Map();
	public defaultRule: TokenRule = new TokenRule();
	public cur: RuleToken = null;
	public last: RuleToken[] = [];
	public lastIndex: number = 0;
	public lastMatch: RuleToken = new RuleToken();

	/**
	 * @description 设置规则及优先级
	 * @example
	 */
	public setRule(s: string, cfgs: Cfg[]) {
		const reader = createRuleReader(s);
		let r = reader();
		while (r) {
			buildSyntax(r, this.syntaxMap);
			r = reader();
		}
		merge(this.syntaxMap);
		for (const cfg of cfgs) {
			buildCfg(cfg, this.tokenMap, this.syntaxMap);
		}
		for (const token of this.tokenMap.values()) {
			buildNext(token);
		}
	}

	/**
	 * @description 初始化设置语法扫描器
	 * @example
	 */
	public initScanner(s: Scanner) {
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
	public next(): Parser {
		do {
			if (this.lastIndex >= this.last.length) {
				const t = new RuleToken();
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
	public flush() {
		this.last = this.last.slice(this.lastIndex - 1);
		this.lastIndex = 1;
	}
	/**
	 * @description 设置当前的字符及位置
	 * @example
	 */
	public setCur(lastIndex: number, lastDeep: number) {
		if (lastIndex === this.lastIndex) {
			return;
		}
		let reback = false;
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
	public parseExpr(): Syntax {
		if (!this.cur) {
			return;
		}
		const s = expression(this, 0);
		this.belongNote();
		this.flush();

		return s;
	}
	/**
	 * @description 解析规则，可以","分隔多个规则名，返回一个规则的抽象语法树，返回null表示该表达式是null，返回undefined表示结束
	 * @example
	 */
	public parseRule(rules: string): Syntax {
		if (!this.cur) {
			return;
		}
		const arr = rules.split(',');
		for (const rule of arr) {
			const rr = this.syntaxMap.get(rule.trim());
			if (!rr) {
				throw new Error(`parser, parseRule fail, invalid rule: ${rule}`);				
			}
			const s = new Syntax();
			s.type = rr.rule.name;
			s.right = [];
			s.token = this.cur;
			this.cur && (this.cur.parent = s);
			const b = rr.match(this, s);
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
	public belongNote() {
		for (const r of this.last) {
			if (r.rule.note) {
				addNote(this.last, r);
			}
		}
	}
}

/**
 * @description 内建的表达式函数
 */
export const builtIn = {
	expr: (p: Parser) => {
		return expression(p, 0);
	},
	all: (p: Parser) => {
		if (!p.cur) {
			return null;
		}
		const s = itself(p, p.cur);
		p.next();

		return s;
	}
};

// ============================== 本地
/**
 * @description 词法规则的配置
 */
/* tslint:disable:max-classes-per-file */
class TokenRule {
	public type: string = null; // 类型，和词法单元类型要相同
	public lbp: number = 0; // 左结合优先级，越大越优先，默认为0，表示右结合
	public rbp: number = 0; // 右结合优先级，越大越优先，默认为左结合优先级
	public nud: Function = itself; // 空指称函数，向右及自身结合，常用于值（例如变量和直接量）以及前缀操作符
	public led: Function = error; // 左指称函数，向左结合，常用于中缀和后缀运算符
	public suf?: boolean; // 是否为后缀运算符
	public ignore: boolean = false;
	public note?: number; // 1向前注释|注解，-1表示向后注释|注解
}

/**
 * @description 规则匹配器
 */
type Match = (p: Parser, s: Syntax) => boolean;
/**
 * @description 语法规则
 */
class SyntaxRule {
	public rule: Rule = null;
	public match: Match = null;
}

// 构建语法规则
const buildSyntax = (rule: Rule, map: Map<string, SyntaxRule>) => {
	const r = new SyntaxRule();
	r.rule = rule;
	r.match = makeRuleEntry(r, r.rule.entry, map);
	map.set(rule.name, r);
};
// 联合语法规则
const merge = (map: Map<string, SyntaxRule>) => {
	let oldlen;
	let len = 0;
	const size = map.size;
	let name;
	do {
		oldlen = len;
		len = 0;
		for (const r of map.values()) {
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
		throw new Error(`parser, rule merge fail, name: ${name}`);		
	}
};

// 构建词法规则
const buildCfg = (cfg: Cfg, map: Map<string, TokenRule>, syntaxMap: Map<string, SyntaxRule>) => {
	let r = map.get(cfg.type);
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
		const func = getNuds(cfg.nud, syntaxMap);
		r.nud = (p: Parser, token: RuleToken) => {
			const s = func(p, token);
			if (s) {
				return s;
			}
			throw new Error(
				`SyntaxError, type: ${cfg.type}, nud: ${cfg.nud}, token: ${token.value}, line: ${token.line}, column: ${token.column}`);			
		};
	}
	if (cfg.led) {
		const func = getLeds(cfg.led, syntaxMap);
		r.led = (p: Parser, token: RuleToken, left: Syntax) => {
			const s = func(p, token, left);
			if (s) {
				return s;
			}
			throw new Error(`SyntaxError, type: ${cfg.type}, led: ${cfg.led}, token: ${token.value}, line: ${token.line}, column: ${token.column}`);
		};
	}
	map.set(r.type, r);
};

// 获得ebnf定义的nud函数
const getNud = (rr: SyntaxRule) => {
	return (p: Parser, token: RuleToken) => {
		const s = new Syntax();
		s.type = rr.rule.name;
		s.right = [];
		s.token = token;
		token.parent = s;

		return rr.match(p, s) ? s : null;
	};
};
// 获得ebnf定义的led函数
const getLed = (rr: SyntaxRule) => {
	return (p: Parser, token: RuleToken, left: Syntax) => {
		const s = new Syntax();
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
const getNuds = (s: string, syntaxMap: Map<string, SyntaxRule>) => {
	const arr = makeRuleArray(s, syntaxMap, getNud);

	return arr.length > 1 ? (p: Parser, token: RuleToken): Syntax => {
		for (const f of arr) {
			const str = f(p, token);
			if (str) {
				return str;
			}
		}

		return null;
	} : arr[0];
};
// 获得ebnf定义的led函数
const getLeds = (s: string, syntaxMap: Map<string, SyntaxRule>) => {
	const arr = makeRuleArray(s, syntaxMap, getLed);

	return arr.length > 1 ? (p: Parser, token: RuleToken, left: Syntax): Syntax => {
		for (const f of arr) {
			const str = f(p, token, left);
			if (str) {
				return str;
			}
		}

		return null;
	} : arr[0];
};
// 创建规则数组
const makeRuleArray = (s: string, syntaxMap: Map<string, SyntaxRule>, func: Function) => {
	const ss = s.split(',');
	const arr = [];
	for (let s of ss) {
		s = s.trim();
		const rr = syntaxMap.get(s);
		if (!rr) {
			throw new Error(`parser, makeRuleArray fail, invalid name: ${s}`);			
		}
		arr.push(func(rr));
	}

	return arr;
};

// 构建词法规则
const buildNext = (r: TokenRule) => {
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
const expression = (p: Parser, rbp: number): Syntax => {
	let t = p.cur;
	if (!t) {
		return null;
	}
	const r = t.rule;
	if (!r.nud) {
		return null;
	}
	p.next();
	let left: Syntax = r.nud(p, t);
	/* tslint:disable:no-conditional-assignment */
	while ((t = p.cur) && rbp < t.rule.lbp) {
		p.next();
		left = t.rule.led(p, t, left);
	}

	return left;
};

// 返回自身token的符号
const itself = (p: Parser, token: RuleToken): Syntax => {
	const s = new Syntax();
	s.type = token.rule.type || token.type;
	s.value = token.value;
	s.token = token;
	token.parent = s;

	return s;
};
// 抛出错误
const error = (p: Parser, token: RuleToken) => {
	throw new Error(`invalid token: ${token.value}, line: ${token.line}, column: ${token.column}`);	
};
// 返回 前缀符号解析函数
const prefix = (p: Parser, token: RuleToken): Syntax => {
	const s = new Syntax();
	s.type = token.rule.type;
	s.right = [expression(p, token.rule.rbp)];
	s.right[0].parent = s;
	s.token = token;
	token.parent = s;

	return s;
};
// 返回 中缀符号解析函数
const infix = (p: Parser, token: RuleToken, left: Syntax): Syntax => {
	const s = new Syntax();
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
const suffix = (p: Parser, token: RuleToken, left: Syntax): Syntax => {
	const s = new Syntax();
	s.type = token.rule.type;
	s.left = left;
	left.parent = s;
	s.token = token;
	token.parent = s;

	return s;
};
// 创建语法规则函数
const makeRuleEntry = (r: SyntaxRule, re: Entry, map: Map<string, SyntaxRule>): Match => {
	const func = ruleTab[re.type];
	if (!func) {
		throw new Error(`parser, make rule fail, invalid name: ${re.type}`);		
	}

	return func(r, re, map);
};
// 创建语法规则函数数组
const makeMatchs = (r: SyntaxRule, arr: Entry[], map: Map<string, SyntaxRule>): Match[] => {
	const matchs = [];
	for (const rr of arr) {
		const func = makeRuleEntry(r, rr, map);
		if (!func) {
			return;
		}
		matchs.push(func);
	}

	return matchs;
};

// 检查是否进行状态转换
const checkOption = (p: Parser, option: any, backCur:boolean): boolean => {
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
			for (let i = option.back; i > 0; i--) {
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
const addNote = (last:RuleToken[], note:RuleToken) => {
	let s:Syntax;
	let r:RuleToken;
	if (note.rule.note < 0) {
		// 向前注释
		for (let i = note.loc - 1; i >= 0; i--) {
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
		for (let i = note.loc + 1, n = last.length; i < n; i++) {
			r = last[i];
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
const ruleTab = {
	series: (r: SyntaxRule, re: Entry, map: Map<string, SyntaxRule>) => {
		const arr = makeMatchs(r, re.childs, map);
		if (!arr) {
			return;
		}

		return (p: Parser, s: Syntax) => {
			const sss = re.str;
			const i = p.lastIndex;
			const deep = p.scanner.stateDeep();
			const c = s.right.length;
			for (const func of arr) {
				const r = func(p, s);
				if (!r) {
					p.setCur(i, deep);
					s.right.length = c;

					return false;
				}
			}

			return true;
		};
	},
	and: (r: SyntaxRule, re: Entry, map: Map<string, SyntaxRule>) => {
		const arr = makeMatchs(r, re.childs, map);
		if (!arr) {
			return;
		}

		return (p: Parser, s: Syntax) => {
			const sss = re.str;
			const i = p.lastIndex;
			const deep = p.scanner.stateDeep();
			const c = s.right.length;
			const r = arr[0](p, s);
			if (!r) {
				return false;
			}
			let old = p.lastIndex > i ? p.lastIndex : -1;
			for (let j = 1, len = arr.length; j < len; j++) {
				p.setCur(i, deep);
				s.right.length = c;
				const r = arr[j](p, s);
				if (!r) {
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
	or: (r: SyntaxRule, re: Entry, map: Map<string, SyntaxRule>) => {
		const arr = makeMatchs(r, re.childs, map);
		if (!arr) {
			return;
		}

		return (p: Parser, s: Syntax) => {
			const sss = re.str;
			for (const func of arr) {
				if (func(p, s)) {
					return true;
				}
			}

			return false;
		};
	},
	not: (r: SyntaxRule, re: Entry, map: Map<string, SyntaxRule>) => {
		const func = makeRuleEntry(r, re.child, map);
		if (!func) {
			return;
		}

		return (p: Parser, s: Syntax) => {
			const sss = re.str;

			return !func(p, s);
		};
	},
	terminal: (r: SyntaxRule, re: Entry, map: Map<string, SyntaxRule>) => {
		const str = re.value;

		return (p: Parser, s: Syntax) => {
			const sss = re.str;
			if ((!p.cur) || p.cur.type !== str) {
				return false;
			}
			if (!checkOption(p, re.option, false)) {
				const ss = itself(p, p.cur);
				s.right.push(ss);
				ss.parent = s;
			} else {
				p.cur.parent = s;
			}
			p.next();

			return true;
		};
	},
	name: (r: SyntaxRule, re: Entry, map: Map<string, SyntaxRule>) => {
		const rule = map.get(re.value);
		if (!rule) {
			return;
		}

		return (p: Parser, s: Syntax) => {
			const sss = re.str;
			const ss = new Syntax();
			ss.type = re.value;
			ss.right = [];
			ss.token = p.cur;
			p.cur && (p.cur.parent = s);
			const r = rule.match(p, ss);
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
	optional: (r: SyntaxRule, re: Entry, map: Map<string, SyntaxRule>) => {
		const func = makeRuleEntry(r, re.child, map);
		if (!func) {
			return;
		}

		return (p: Parser, s: Syntax) => {
			const sss = re.str;
			func(p, s);

			return true;
		};
	},
	repeat: (r: SyntaxRule, re: Entry, map: Map<string, SyntaxRule>) => {
		const func = makeRuleEntry(r, re.child, map);
		if (!func) {
			return;
		}

		return (p: Parser, s: Syntax) => {
			const sss = re.str;
			let r = func(p, s);
			if (!r) {
				return false;
			}
			while (r) {
				r = func(p, s);
			}

			return true;
		};
	},
	builtIn: (r: SyntaxRule, re: Entry, map: Map<string, SyntaxRule>) => {
		const func = builtIn[re.value];
		if (!func) {
			throw new Error(`scanner, make rule fail, invalid builtIn: ${re.value}`);			
		}

		return (p: Parser, s: Syntax) => {
			const ss = func(p);
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
