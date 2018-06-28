// 返回字符串的模板解析器

// ============================== 导入的模块、类、函数、常量
import { es6FOR1, es6FOR2, FOR1,FOR2, stringifyName } from './tpl';

// ------------------------------ 导出的常量

// ------------------------------ 导出的多个类
/**
 * @description 返回字符串的模板解析器
 */

export class Parser {
	public s1: string;
	public version: string;// es5 | es6
	public tempVar: number;
	public varname: string;
	public comment: boolean;
	public arr: any[];
	public for1: boolean;
	public for2: boolean;
	public line: any;
	constructor(version: string) {
		this.s1 = '_s1';
		this.tempVar = 1;
		this.varname;// String
		this.comment;// boolean
		this.arr = [];
		this.for1;// boolean
		this.for2;// boolean
		this.line;// int
		this.version = version || 'es5';
	}
	/**
	 * @description 获得临时varname
	 * @example
	 */
	public getTempVar(): string {
		// tslint:disable:prefer-template
		return '_t' + this.tempVar++;
	}
	/**
	 * @description 设置varname
	 * @example
	 */
	public setVarname(s: string):void {
		this.varname = s;
	}

	/**
	 * @description 设置comment
	 * @example
	 */
	public setComment(b: boolean) {
		this.comment = b;
	}

	/**
	 * @description 放入注释
	 * @example
	 */
	public putComment(s: string) {
		this.comment && this.arr.push('//' + s.replace(/[\r\t\n]/g, ' ') + '\n');
	}

	/**
	 * @description 放入文本
	 * @example
	 */
	public putText(s: string) {
		s = trimLine(s);
		s.length > 0 && this.arr.push(this.s1 + '+=\'' + escapeText(s) + '\';\n');
	}

	/**
	 * @description 放入代码
	 * @example
	 */
	public putCode(s: string) {
		this.arr.push(s);
	}

	/**
	 * @description 放入输出的变量
	 * @example
	 */
	public putVar(s: string) {
		this.arr.push(this.s1 + '+=' + stringifyName + '(' + s + ');\n');
	}

	/**
	 * @description 使用了for1循环
	 * @example
	 */
	public useFor1() {
		this.for1 = true;
	}

	/**
	 * @description 使用了for2循环
	 * @example
	 */
	public useFor2() {
		this.for2 = true;
	}

	/**
	 * @description 返回函数字符串
	 * @example
	 */
	public funString() {
		const s = 'function(' + this.varname + ') {\'use strict\';\n' +
			// let s = "("+this.varname+") => {'use strict';\n"+
			'var ' + this.s1 + ' = \'\';\n';
		const f1 = this.version === 'es6' ? es6FOR1 : FOR1;
		const f2 = this.version === 'es6' ? es6FOR2 : FOR2;

		return s + (this.for1 ? f1 : '') + (this.for2 ? f2 : '') + this.arr.join('') + '\nreturn ' + this.s1 + ';\n}';
	}
}

// ------------------------------ 导出的静态函数

// ------------------------------ 导出的实例方法

// ============================== 本地常量

// ------------------------------ 本地类

// ------------------------------ 本地函数

/**
 * @description 处理文字
 * @example
 */
const escapeText = (s: string) => {
	return s.replace(/'|\\/g, '\\$&').replace(/\n/g, '\\n').replace(/\t/g, '\\t').replace(/\r/g, '\\r');
};

/**
 * @description 删除字符串首尾的空格直到换行符，如果没有遇到换行则字符串不修改
 * @example
 */
const trimLine = (s: string) => {
	let c;
	let i = 0;
	let j = s.length - 1;
	for (; i < j; i++) {
		c = s.charCodeAt(i);
		if (c > 32) {i = 0; break;}
		if (c === 10) break;
	}
	for (; j >= i; j--) {
		c = s.charCodeAt(j);
		if (c > 32) {j = s.length; break;}
		if (c === 10) break;
	}
	
	return s.substring(i, j);
};
// ============================== 立即执行的代码
