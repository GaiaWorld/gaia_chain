/**
 * 生成  生成vdom的函数
 * VirtualNode才有children
 * VirtualWidgetNode只有child
 * VirtualTextNode没有子节点
 */
/**
 * 改进:
 * 1. 加上staticid
 * 2. json的hash值可以提前计算
 */
/**
 * json每层的每层ParserNode都计算了childHash,但是反映到函数上则只有最外层需要计算
 */
/**
 * syntax上的preType专门用于JS，用于存储在进入JS之前所属的type类型
 */
// ====================================== 导入
import { Syntax } from '../compile/parser';
import * as hash from '../util/hash';
import { logLevel, warn } from '../util/log';
import { calTextHash } from '../util/tpl';

// ====================================== 导出
export let level = logLevel;

const setParent = (syntax: Syntax, parent: Syntax) => {
	syntax.parent = parent;

	const right = syntax.right;
	if (!right) {
		return;
	}

	for (let i = 0; i < right.length; i++) {
		setParent(right[i], syntax);
	}
};

export const gen = (syntax: Syntax) => {
	nodeIndex = 0;
	sid = 0;
	funcStrArr = [`let _$temp, node;`];
	funcStrIndex = 1;
	setParent(syntax, null);
	preorder(syntax, null);

	return joinStr();
};

// 判断父节点是否是widget
export const parentIsWidget = (syntax: Syntax): boolean => {
	if (!syntax) {
		return false;
	}
	/* tslint:disable:no-reserved-keywords */
	const type = syntax.type;
	if (type === 'tag' || type === 'html') {
		let flag = false;
		if (type === 'tag') {
			const tagName = syntax.right[0].value;
			if (tagName.indexOf('-') > 0 || tagName.indexOf('$') > 0 || tagName.indexOf('widget') >= 0) {
				flag = true;
			}
		}

		return flag;
	}
	const parent = syntax.parent;

	return parentIsWidget(parent);
};

let nodeIndex = 0; // 根节点为1， 第二层子为2，第三层为3...

// ====================================== 本地
// 先序遍历
// child -> node -> pre -> suf
const preorder = (syntax: Syntax, parent: Syntax) => {
	const index: number = funcStrIndex;
	const funcs = seekFunc(syntax, parent);
	const childs: Syntax[] = funcs.child();
	const childNodes: ParserNode[] = [];
	funcStrIndex++;
	if (syntax.type === 'html' || syntax.type === 'jobj' || syntax.type === 'jarr' || syntax.type === 'jpair'
		|| syntax.type === 'text' || syntax.type === 'jsexpr') {
		nodeIndex++;
	}
	for (let i = 0; i < childs.length; i++) {
		const childNode = preorder(childs[i], syntax);
		if (childNode) childNodes.push(childNode);// 存在空文本节点的情况		
	}
	const node: ParserNode = funcs.node(childNodes);
	funcStrArr[index] = funcs.pre(node);
	funcStrArr[funcStrIndex++] = funcs.suf(node);
	if (syntax.type === 'html' || syntax.type === 'jobj' || syntax.type === 'jarr' || syntax.type === 'jpair'
		|| syntax.type === 'text' || syntax.type === 'jsexpr') {
		nodeIndex--;
	}

	return node;
};

/* tslint:disable:class-name */
interface interParser {
	pre(node: ParserNode): String;
	suf(node: ParserNode): String;
	child(): Syntax[];
	node(childs: ParserNode[]): ParserNode;
}

// 每一个节点都有pre字符串和suf字符串
const seekFunc = (syntax: Syntax, parent: Syntax): interParser => {
	try {
		return parserFunc[<any>syntax.type](syntax, parent);
	} catch (error) {
		throw new Error(`parserFunc[${<any>syntax.type}]不是一个方法！`);
	}

};

const joinStr = () => {
	return `(function(_cfg,it,it1){${funcStrArr.join('')} })`;
};
// 用来存储位置的
let funcStrIndex: number = 0;
// 需要拼接成函数字符串
let funcStrArr: String[] = [];
// 还没想好里面存什么
class ParserNode {
	public childHash: number = 0;
	public attrs: any = {};
	public attrHash: number = 0;
	public hash: number = 0;
	public str: string = '';// 当前节点对应的文本值,暂时只在js中拼表达式用到
	public v?: string = '';// v字段专门处理value是jsexpr的情况
	public cs?: boolean;// 判断子节点中是否存在脚本
	public hashstr?: string;// 当前节点计算hash值的文本
	public hashStr?: string;
	public attrHashStr?: string;// 当前节点计算属性hash值得文本
	// childfuncstr:Array<String> = [];
}

// 入参parent暂时没用到
const genTagSufFunc = (parent: Syntax): any => {// 返回值为一个函数	
	return (node: ParserNode) => {
		let str = ``;
		// 如果节点下没有脚本，其hash是一个今天的值
		if (node.cs) {
			str += `_chFunc(node);`;
		}
		// nodeIndex > 1是，该元素一定有父节点
		if (nodeIndex > 1) {
			str += `_$parent.children.push(node);}`;
		} else {
			str += `return node;}`;
		}

		return str;
	};
};

const genMathChildFunc = (syntax: Syntax) => {
	return (): Syntax[] => {
		const childs = [];
		if (syntax.left !== null && !isBuildIn(syntax.left)) {
			childs.push(syntax.left);
		}
		if (!isBuildIn(syntax.right[0])) {
			childs.push(syntax.right[0]);
		}

		return childs;
	};
};

const genMathNodeFunc = (operator: string, syntax: Syntax) => {
	return (childs: ParserNode[]) => {
		const node = new ParserNode();
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

const genMathFunc = (operator: string) => {
	return (syntax: Syntax, parent: Syntax) => {
		return {
			...defaultParse,
			child: genMathChildFunc(syntax),
			node: genMathNodeFunc(operator, syntax)
		};
	};
};

const genAutoFunc = (operator: string) => {
	return (syntax: Syntax, parent: Syntax) => {
		return {
			...defaultParse,
			child: (): Syntax[] => {
				const childs = [];
				if (syntax.left && !isBuildIn(syntax.left)) {
					childs.push(syntax.left);
				}
				if (syntax.right && syntax.right[0] && !isBuildIn(syntax.right[0])) {
					childs.push(syntax.right[0]);
				}

				return childs;
			},
			node: (childs: ParserNode[]) => {
				const node = new ParserNode();
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
			}
		};
	};
};

const genKvDvChildFunc = (syntax: Syntax) => {
	return (): Syntax[] => isBuildIn(syntax.right[1]) ? [] : [syntax.right[1]];
};

const genKvDvNodeFunc = (operator: string, syntax: Syntax) => {
	return (childs: ParserNode[]) => {
		const node = new ParserNode();
		node.str = syntax.right[0].value + operator + (childs.length === 0 ? syntax.right[1].value : childs[0].str);
		calHash(childs, node);

		return node;
	};
};

const genifelseifChildFunc = (syntax: Syntax) => {
	return (): Syntax[] => {
		const childs = [];
		if (!isBuildIn(syntax.right[0])) {
			syntax.right[0].parent = syntax;
			childs.push(syntax.right[0]);
		}

		for (let i = 1; i < syntax.right.length; i++) {
			syntax.right[i].parent = syntax;
			childs.push(syntax.right[i]);
		}

		return childs;
	};
};

const genifelseifNodeFunc = (operator: string, syntax: Syntax) => {
	return (childs: ParserNode[]) => {
		const node = new ParserNode();
		if (!isBuildIn(syntax.right[0])) {
			/* tslint:disable:prefer-template */
			node.str = operator + `(${childs[0].str})`;
		} else {
			node.str = operator + `(${syntax.right[0].value})`;
		}

		return node;
	};
};

const gentTagPreFunc = (tagName: string, syntax: Syntax, id: number) => {
	return (node: ParserNode): String => {
		const ssid = (<any>syntax).sid !== undefined ? (<any>syntax).sid : id;
		let str = `_$temp=node;{let _$parent = _$temp;let node = {"attrs":{},"tagName":"${tagName}","sid":${ssid}};`;
		if (tagName.indexOf('-') > 0 || tagName.indexOf('$') > 0 || tagName.indexOf('widget') >= 0) {// widget
			str += `node.hasChild = false;node.child = null;`;
		} else {// 普通节点
			str += `node.children=[];`;
		}
		if (!node.cs) {
			str += `node.childHash =${node.childHash};`;
		}

		return str;
	};
};

const genSignleTagFunc = (tagName: string) => {
	return (syntax: Syntax, parent: Syntax) => {
		return {
			...defaultParse,
			child: (): Syntax[] => syntax.right,// 肯定只有一个child，而且是属性
			node: (childs: ParserNode[]) => {
				const node = containScript(childs);
				calTagHash(node, syntax.right[0].value);// 计算taghash
				calHash(childs, node);

				return node;
			},
			pre: gentTagPreFunc(tagName, syntax, sid++),
			suf: genTagSufFunc(parent)
		};
	};
};

// 这里的child包含了属性child，但是没关系，因为attrsFunc没有计算hash值，所以全是0，算上去也没问题
const tagNodeFunc = (tagName: string, childs: ParserNode[]): ParserNode => {
	const node = new ParserNode();
	sumChildHash(node, childs);
	calTagHash(node, tagName);

	return node;
};

const tagFunc = (syntax: Syntax, parent: Syntax) => {
	return {
		...defaultParse,
		child: (): Syntax[] => [syntax.right[1], syntax.right[2]],
		node: (childs: ParserNode[]) => {
			const node = containScript(childs);
			calTagHash(node, syntax.right[0].value);// 计算taghash
			calChildsHash([childs[1]], node);
			calHash(childs, node);

			return node;
		},
		pre: gentTagPreFunc(syntax.right[0].value, syntax, sid++),
		suf: genTagSufFunc(parent)
	};
};

const inputTagFunc = genSignleTagFunc('input');

const imgTagFunc = genSignleTagFunc('img');

const metaTagFunc = genSignleTagFunc('meta');

const bodyFunc = (syntax: Syntax, parent: Syntax) => {
	return {
		...defaultParse,
		child: (): Syntax[] => {
			parent && (syntax.parent = parent);
			for (let i = 0; i < syntax.right.length; i++) {
				syntax.right[i].parent = syntax;
			}

			return syntax.right;
		},
		node: (childs: ParserNode[]): ParserNode => {
			const node = containScript(childs);
			calHash(childs, node);

			return node;
		},
		pre: (): string => {
			let str = ``;
			if (parent && (parent.type === 'if' || parent.type === 'elseif' || parent.type === 'else')) {
				str = `{`;
			}

			return str;
		},
		suf: (): string => {
			let str = ``;
			if (parent && (parent.type === 'if' || parent.type === 'elseif' || parent.type === 'else')) {
				str = `}`;
			}

			return str;
		}
	};
};

const textFunc = (syntax: Syntax, parent: Syntax) => {
	return {
		...defaultParse,
		node: (childs: ParserNode[] = null): ParserNode => {
			syntax.value = syntax.value.trim();
			let node = null;
			if (syntax.value) {
				node = new ParserNode();
				node.hash = calTextHash(syntax.value);
			}

			return node;
		},
		suf: (node: ParserNode): String => {
			syntax.value = syntax.value.trim();
			let str = ``;
			if (syntax.value) {
				str = `_$temp=node;{let _$parent = _$temp;let node = _installText("${syntax.value}", ${node.hash});`;
				str += `;
				`;
				if (parentIsWidget(syntax)) {
					str += `_$parent.child = node.text;_$parent.hasChild = true;`;
				} else {
					if (nodeIndex > 1) {
						str += `_$parent.children.push(node);`;
					} else {
						str += `return node;`;
					}
				}
				str += '}';
			}

			return str;
		}
	};
};

// 单指json中的数组
// 且数组中的元素必须为同一类型
// 暂时没有处理["aa","aa {{it.name}}"]这种情况
// jarr其实有BUG,无法处理数组嵌套，且其中有变量的情况,除非变量放在尾部，不然顺序会被换掉
const jarrFunc = (syntax: Syntax, parent: Syntax) => {
	return {
		...defaultParse,
		child: (): Syntax[] => {
			const childs = [];
			for (let i = 0; i < syntax.right.length; i++) {
				if (!isBuildIn(syntax.right[i]) && syntax.right[i].type !== 'jstr') {
					syntax.right[i].parent = syntax;
					if (syntax.right[i].type === 'script' && syntax.right[i].right[0].type === 'jsexpr') {
						(<any>syntax.right[i].right[0]).index = i;
					}
					childs.push(syntax.right[i]);
				}
			}

			return childs;
		},
		node: (childs: ParserNode[]) => {
			const node = containScript(childs);
			if (childs) {
				for (let i = 0; i < childs.length; i++) {
					node.hash = hash.nextHash(node.hash, childs[i].hash);
				}
			} else {
				for (let i = 0; i < syntax.right.length; i++) {
					node.hash = hash.nextHash(node.hash, calTextHash(syntax.right[i].value));
				}
			}
			calHash(childs, node);

			return node;
		},
		pre: (): String => `_$temp=node;{let _$parent = _$temp;let node = [];`,
		suf: (node: ParserNode): String => {
			let str = ``;
			for (let i = 0; i < syntax.right.length; i++) {
				let v;
				if (isBuildIn(syntax.right[i])) {
					v = syntax.right[i].value;
				} else if (syntax.right[i].type === 'jstr') {
					v = `"${syntax.right[i].right[0].value}"`;
				}
				if (v) {
					str += `node[${i}] = ${v};`;
				}
				node.hash = hash.nextHash(node.hash, calTextHash(syntax.right[i].value));
			}

			if (!parent) {
				str += `return node;}`;
			} else {
				if (parent.type === 'jarr') {
					str += `_$parent.push(node);}`;
				} else if (parent.type === 'jpair') {
					let key = parent.right[0].right ? parent.right[0].right[0].value : parent.right[0].value;
					if (parent.right[0].type === 'identifier') {
						key = `"${parent.right[0].value}"`;
					} else {
						key = `"${parent.right[0].right[0].value}"`;
					}
					str += `_$parent[${key}]= node;}`;
				} else if (parent.type === 'body') {
					// parent分为真正有意义的节点和body节点
					if (nodeIndex > 1) {
						str += `_addJson(node, _$parent);`;
					} else {
						str += `return node;`;
					}
					str += `}`;
				}
			}

			return str;
		}
	};
};

const jstrFunc = (syntax: Syntax, parent: Syntax) => {
	return {
		...defaultParse,
		pre: (node: ParserNode): String => `jvalue = "${syntax.right[0].value}";`,
		node: (childs: ParserNode[]) => {
			const node = new ParserNode();
			node.hash = calTextHash(`"${syntax.right[0].value}"`);

			return node;
		}
	};
};

const jscriptFunc = (syntax: Syntax, parent: Syntax) => {
	return {
		...defaultParse,
		child: (): Syntax[] => {
			const child = [];
			for (let i = 0; i < syntax.right.length; i++) {
				syntax.right[i].parent = syntax;
				child.push(syntax.right[i]);
			}

			return child;
		},
		node: (childs: ParserNode[]) => {
			const node = new ParserNode();
			node.cs = true;

			return node;
		}
	};
};

// 单指json中的键值对
const jpairFunc = (syntax: Syntax, parent: Syntax) => {
	return {
		...defaultParse,
		child: (): Syntax[] => {
			let child = [];
			if (!isBuildIn(syntax.right[1])) {
				syntax.right[1].parent = syntax;
				child = [syntax.right[1]];
			}

			return child;
		},
		node: (childs: ParserNode[]) => {// 肯定只有一个子节点			
			const node = containScript(childs);
			calHash(childs, node);
			if (isScript(syntax.right[1])) {
				node.v = childs[0].str;
			}

			return node;
		},
		pre: (node: ParserNode): String => {
			let str = `//jpair pre
			`;
			let key = '';
			if (syntax.right[0].type === 'jstr') {
				key = `"${syntax.right[0].right[0].value}"`;
			} else if (syntax.right[0].type === 'identifier') {
				key = `"${syntax.right[0].value}"`;
			}
			node.hash = hash.nextHash(node.hash, calTextHash(`${key}`)); // 计算key的hash值

			if (isBuildIn(syntax.right[1])) {
				const v = parseBuildIn(syntax.right[1]);
				str += `
				node[${key}]=${v};`;
				node.hash = hash.nextHash(node.hash, calTextHash(v)); // 计算key的hash值
			} else if (isScript(syntax.right[1])) {
				str += `
				node[${key}]=${node.v};`;
			} else if (isjstrjscript(syntax.right[1])) {
				str += `
				{
					let jvalue = "";
					`;
			} else {
				str += `
				_$temp=node;{let _$parent = _$temp;	`;
			}

			return str;
		},
		suf: (node: ParserNode): String => {
			let str = `
			//jpair suf
			`;
			if (isjstrjscript(syntax.right[1])) {
				let key = '';
				if (syntax.right[0].type === 'jstr') {
					key = `"${syntax.right[0].right[0].value}"`;
				} else if (syntax.right[0].type === 'identifier') {
					key = `"${syntax.right[0].value}"`;
				}

				str += `
				node[${key}]=jvalue;
				}
				`;
			} else if ((!isBuildIn(syntax.right[1])) && (!isScript(syntax.right[1]))) {
				str += `
				}`;
			}

			return str;
		}
	};
};

const jobjFunc = (syntax: Syntax, parent: Syntax) => {
	return {
		...defaultParse,
		child: (): Syntax[] => syntax.right,
		node: (childs: ParserNode[]) => {
			const node = containScript(childs);
			calHash(childs, node);

			return node;
		},
		pre: (): String => `_$temp=node;{let _$parent = _$temp;let node = {};`,
		suf: (node: ParserNode): String => {
			let str = ``;
			if (!parent) {
				str += `return node;}`;
			} else {
				if (parent.type === 'jarr') {
					str += `_$parent.push(node);}`;
				} else if (parent.type === 'jpair') {
					str += `_$parent["${parent.right[0].right[0].value}"]= node;}`;
				} else if (parent.type === 'body') {
					// parent分为真正有意义的节点和body节点
					if (nodeIndex > 1) {
						str += `_addJson(node, _$parent);`;
					} else {
						str += `return node;`;
					}
					str += `}`;
				}
			}

			return str;
		}
	};
};

const scriptFunc = (syntax: Syntax, parent: Syntax) => {
	return {
		...defaultParse,
		child: (): Syntax[] => {
			syntax.parent = parent;
			for (let i = 0; i < syntax.right.length; i++) {
				syntax.right[i].parent = syntax;
			}

			return syntax.right;
		},
		node: (childs: ParserNode[]) => {
			const node = new ParserNode();
			node.str = childs[0].str;
			node.cs = true;

			return node;
		}
	};
};

const execFunc = (syntax: Syntax, parent: Syntax) => {
	return {
		...defaultParse,
		child: (): Syntax[] => syntax.right,
		node: (childs: ParserNode[]) => {
			const node = new ParserNode();
			node.str = childs[0].str;

			return node;
		},
		suf: (node: ParserNode): String => node.str + `;`
	};
};

const fieldeFunc = (syntax: Syntax, parent: Syntax) => {
	return {
		...defaultParse,
		child: (): Syntax[] => {
			const childs = [];
			(!isBuildIn(syntax.left)) && childs.push(syntax.left);
			(!isBuildIn(syntax.right[0])) && childs.push(syntax.right[0]);

			return childs;
		},
		node: (childs: ParserNode[]) => {
			const node = new ParserNode();
			let left = '';
			let right = '';
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
			node.str = left + `[` + right + `]`;

			return node;
		}
	};
};

const fieldFunc = (syntax: Syntax, parent: Syntax) => {
	return {
		...defaultParse,
		child: (): Syntax[] => {
			const childs = [];
			if (!isBuildIn(syntax.left)) {
				childs.push(syntax.left);
			}
			if (!isBuildIn(syntax.right[0])) {// 理论上右边肯定是identifier
				childs.push(syntax.right[0]);
			}

			return childs;
		},
		node: (childs: ParserNode[]) => {
			const node = new ParserNode();
			if (!isBuildIn(syntax.left)) {
				node.str += childs[0].str + `.`;
			} else {
				node.str += syntax.left.value + `.`;
			}
			if (!isBuildIn(syntax.right[0])) {
				node.str += childs.length === 2 ? childs[1].str : childs[0].str;
			} else {
				node.str += syntax.right[0].value;
			}

			return node;
		}
	};
};

const callFunc = (syntax: Syntax, parent: Syntax) => {
	return {
		...defaultParse,
		child: (): Syntax[] => {
			const childs = [];
			if (!isBuildIn(syntax.left)) {
				childs.push(syntax.left);
			}
			for (let i = 0; i < syntax.right.length; i++) {
				if (!isBuildIn(syntax.right[i])) {
					childs.push(syntax.right[i]);
				}
			}

			return childs;
		},
		node: (childs: ParserNode[]) => {
			const node = new ParserNode();
			let index = 0;
			if (!isBuildIn(syntax.left)) {
				node.str += childs[index++].str + '(';
			} else {
				node.str += syntax.left.value + '(';
			}

			for (let i = 0; i < syntax.right.length - 1; i++) {
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
		}
	};
};

// 子节点一定是一个dv
const defFunc = (syntax: Syntax, parent: Syntax) => {
	return {
		...defaultParse,
		child: (): Syntax[] => [syntax.right[0]],
		node: (childs: ParserNode[]) => {
			const node = new ParserNode();
			node.str = `let ` + childs[0].str + `;`;

			return node;
		},
		suf: (node: ParserNode): String => node.str
	};
};

const dvFunc = (syntax: Syntax, parent: Syntax) => {
	return {
		...defaultParse,
		child: genKvDvChildFunc(syntax),
		node: genKvDvNodeFunc(`=`, syntax)
	};
};

const kvFunc = (syntax: Syntax, parent: Syntax) => {
	return {
		...defaultParse,
		child: genKvDvChildFunc(syntax),
		node: genKvDvNodeFunc(`:`, syntax)
	};
};

// 自增自减
const mulmulFunc = genAutoFunc(`--`);
const addaddFunc = genAutoFunc(`++`);
const negFunc = genAutoFunc(`!`);

// 赋值是不会被嵌套的，可以等到返回了再赋值
const assignFunc = genMathFunc(`=`);
const addFunc = genMathFunc(`+`);
const subFunc = genMathFunc(`-`);
const mulFunc = genMathFunc(`*`);
const divFunc = genMathFunc(`/`);
const remFunc = genMathFunc(`%`);
const addEqualFunc = genMathFunc(`+=`);
const subEqualFunc = genMathFunc(`-=`);
const mulEqualFunc = genMathFunc(`*=`);
const divEqualFunc = genMathFunc(`/=`);
const remEqualFunc = genMathFunc(`%=`);
const tripleEqualFunc = genMathFunc(`===`);
const tripleUnequalFunc = genMathFunc(`!==`);
const doubleEqualFunc = genMathFunc(`==`);
const doubleUnequalFunc = genMathFunc(`!=`);
const lessEqualFunc = genMathFunc(`<=`);
const bigEqualFunc = genMathFunc(`>=`);
const lessFunc = genMathFunc(`<`);
const bigFunc = genMathFunc(`>`);
const orFunc = genMathFunc(`|`);
const andFunc = genMathFunc(`&`);
const ororFunc = genMathFunc(`||`);
const andandFunc = genMathFunc(`&&`);

const bracketFunc = (syntax: Syntax, parent: Syntax) => {
	return {
		...defaultParse,
		child: (): Syntax[] => isBuildIn(syntax.right[0]) ? [] : [syntax.right[0]],
		node: (childs: ParserNode[]) => {
			const node = new ParserNode();
			node.str = `(` + (childs.length === 0 ? syntax.right[0].value : childs[0].str) + `)`;

			return node;
		}
	};
};

const objFunc = (syntax: Syntax, parent: Syntax) => {
	return {
		...defaultParse,
		child: (): Syntax[] => syntax.right,
		node: (childs: ParserNode[]) => {
			const node = new ParserNode();
			node.str = `{`;
			for (let i = 0; i < childs.length - 1; i++) {
				node.str += childs[i].str + `,`;
			}
			if (childs.length > 0) {
				node.str += childs[childs.length - 1].str;
			}
			node.str += `}`;

			return node;
		}
	};
};

const arrFunc = (syntax: Syntax, parent: Syntax) => {
	return {
		...defaultParse,
		child: (): Syntax[] => syntax.right,
		node: (childs: ParserNode[]) => {
			const node = new ParserNode();
			const lastIndex = childs.length - 1;
			node.str = `[`;
			for (let i = 0; i < lastIndex; i++) {
				node.str += childs[i].str + ',';
			}
			if (childs[lastIndex]) {
				node.str += childs[lastIndex].str;
			}
			node.str += `]`;

			return node;
		}
	};
};

// 本质上就退化为了一个文本节点
const jsExprFunc = (syntax: Syntax, parent: Syntax) => {
	/* tslint:disable:no-shadowed-variable */
	const find = (syntax: Syntax): Syntax => {
		if (syntax.type === 'attr' || syntax.type === 'attrscript' || syntax.type === 'singleattrscript'
			|| syntax.type === 'jscript' || syntax.type === 'jarr' || syntax.type === 'jpair' || syntax.type === 'html' || syntax.type === 'attrs') {
			return syntax;
		}

		return find(syntax.parent);
	};

	return {
		...defaultParse,
		child: (): Syntax[] => isBuildIn(syntax.right[0]) ? [] : syntax.right,
		node: (childs: ParserNode[]) => {
			const node = new ParserNode();
			if (!isBuildIn(syntax.right[0])) {
				node.str = childs[0].str.trim();
			} else {
				node.str = syntax.right[0].value.trim();
			}

			return node;
		},
		suf: (node: ParserNode): String => {
			let str = ``;
			const p = find(parent);
			if (!p) {
				console.log('jsExprFunc:找不到节点！');

				return;
			}
			const hashStr = `(${node.str})`;
			if (p.type === 'attr') {
				str = `attrvalue = ` + node.str + `;`;
			} else if (p.type === 'attrscript') {
				str = `attrvalue += ` + node.str + `;`;
			} else if (p.type === 'singleattrscript') {
				str = `attrvalue += ` + node.str + `;`;
			} else if (p.type === 'jscript') {
				str = `jvalue += ` + node.str + `;`;
			} else if (p.type === 'jarr') {
				isBuildIn(syntax.right[0]) ?
					str = `node[${(<any>syntax).index}] = ${syntax.right[0].value};` : str = `node[${(<any>syntax).index}] = ${node.str};`;
			} else if ((p.type !== 'jpair') && node.str) {
				// 如果是jpair则会在返回的node中处理	
				str += `_$temp=node;{let _$parent = _$temp;`;
				if (nodeIndex > 1) {
					if (parentIsWidget(syntax)) {
						str += `_addJson(${node.str}, _$parent);`;
					} else {
						str += `_addText(${node.str}, _$parent);`;
					}
				} else {
					str += `return {"text":${node.str}, "str":${node.str}, "childHash":${node.hash},"hasChild":undefined};`;
				}
				str += '}';
			}

			return str;
		}
	};
};

const ifFunc = (syntax: Syntax, parent: Syntax) => {
	return {
		...defaultParse,
		child: genifelseifChildFunc(syntax),
		node: genifelseifNodeFunc(`if`, syntax),
		pre: (node: ParserNode): String => node.str
	};
};

const elseifFunc = (syntax: Syntax, parent: Syntax) => {
	return {
		...defaultParse,
		child: genifelseifChildFunc(syntax),
		node: genifelseifNodeFunc(`else if`, syntax),
		pre: (node: ParserNode): String => node.str
	};
};

const elseFunc = (syntax: Syntax, parent: Syntax) => {
	return {
		...defaultParse,
		child: (): Syntax[] => syntax.right,
		pre: (node: ParserNode): String => `else`
	};
};

const forFunc = (syntax: Syntax, parent: Syntax) => {
	return {
		...defaultParse,
		child: (): Syntax[] => {
			const childs = [];
			let expr;
			let body;
			const right = syntax.right;
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
		node: (childs: ParserNode[]) => {
			const node = new ParserNode();
			let expr;
			let body;
			let type;
			const right = syntax.right;
			let forRet;
			let extra;
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
				node.str += `{let _$i = 0;
				`;
			}
			node.str += `for(let ${forRet} ${type} ${expr}){`;
			if (type === 'of' && right.length === 5) {
				node.str += `let ${extra} = _$i++;`;
			} else if (type === 'in' && right.length === 5) {
				node.str += `let ${extra} = ${expr}[${forRet}];`;
			}

			return node;
		},
		pre: (node: ParserNode): String => node.str,
		suf: (node: ParserNode): String => {
			let str = '}';
			if (syntax.right[2].value === 'of') {
				str += '}';
			}

			return str;
		}
	};
};

const whileFunc = (syntax: Syntax, parent: Syntax) => {
	return {
		...defaultParse,
		child: (): Syntax[] => {
			const childs = [];
			if (!isBuildIn(syntax.right[0])) {
				childs.push(syntax.right[0]);
			}
			childs.push(syntax.right[1]);

			return childs;
		},
		node: (childs: ParserNode[]) => {
			const node = new ParserNode();
			node.str = `while(`;
			if (childs.length === 2) {
				node.str += childs[0].str + `){`;
			} else {
				node.str += syntax.right[0] + `){`;
			}

			return node;
		},
		pre: (node: ParserNode): String => node.str,
		suf: (node: ParserNode): String => `}`
	};
};

const jscontinueFunc = (syntax: Syntax, parent: Syntax) => {
	return {
		...defaultParse,
		pre: (node: ParserNode): String => `continue;`
	};
};

const regularFunc = (syntax: Syntax, parent: Syntax) => {
	return {
		...defaultParse,
		node: (node: ParserNode): String => syntax.value
	};
};

const jsbreankFunc = (syntax: Syntax, parent: Syntax) => {
	return {
		...defaultParse,
		pre: (node: ParserNode): String => `break;`
	};
};

const newFunc = (syntax: Syntax, parent: Syntax) => {
	return {
		...defaultParse,
		child: (): Syntax[] => isBuildIn(syntax.right[0]) ? [] : syntax.right,
		node: (childs: ParserNode[]) => {
			const node = new ParserNode();
			if (!isBuildIn(syntax.right[0])) {
				node.str = `new ` + childs[0].str + `;`;
			} else {
				node.str = `new ` + syntax.right[0].value + `;`;
			}

			return node;
		}
	};
};

const condFunc = (syntax: Syntax, parent: Syntax) => {
	return {
		...defaultParse,
		child: (): Syntax[] => {
			const childs = [];
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
		},
		node: (childs: ParserNode[]) => {
			let index = 0;
			const node = new ParserNode();
			if (!isBuildIn(syntax.left)) {
				node.str = childs[index++].str + `?`;
			} else {
				node.str = syntax.left.value + `?`;
			}
			if (!isBuildIn(syntax.right[0])) {
				node.str += childs[index++].str + `:`;
			} else {
				node.str += syntax.right[0].value + `:`;
			}
			if (!isBuildIn(syntax.right[1])) {
				node.str += childs[index].str;
			} else {
				node.str += syntax.right[1].value;
			}

			return node;
		}
	};
};

const attrsFunc = (syntax: Syntax, parent: Syntax) => {
	return {
		...defaultParse,
		child: (): Syntax[] => syntax.right,
		node: (childs: ParserNode[]) => {
			const node = containScript(childs);
			calHash(childs, node);

			return node;
		},
		pre: (node: ParserNode) => {
			let size = 0;
			let str = ``;
			for (let i = 0; i < syntax.right.length; i++) {
				const name = syntax.right[i].right[0].value;
				if (name !== 'w-tag' && name !== 'w-did') {
					size++;
				}
			}
			if (size > 0) {
				str += `node.attrSize = ${size};`;
			}
			str += `node.attrHash = ${node.hash};`;

			return str;

		}
	};
};

const containScript = (childs: ParserNode[], node?: ParserNode) => {
	node = node ? node : new ParserNode();
	for (let i = 0; i < childs.length; i++) {
		if (childs[i].cs === true) {
			node.cs = true;
		}
	}

	return node;
};

// 汇总静态hash
const calChildsHash = (childs: ParserNode[], node: ParserNode) => {
	for (let i = 0; i < childs.length; i++) {
		node.childHash = hash.nextHash(node.childHash, childs[i].hash);
	}
};

// 汇总静态hash
const calHash = (childs: ParserNode[], node: ParserNode) => {
	for (let i = 0; i < childs.length; i++) {
		node.hash = hash.nextHash(node.hash, childs[i].hash);
	}
};

const attrFunc = (syntax: Syntax, parent: Syntax) => {
	return {
		...defaultParse,
		child: (): Syntax[] => {
			if (syntax.right[0].value === 'w-sid') {
				(<any>syntax.parent.parent).sid = parseInt(syntax.right[1].right[0].value, 10);
				
				return [];
			}
			let child = [];
			if (syntax.right[1] && syntax.right[1].type !== 'identifier' && syntax.right[1].type !== 'attrStr'
				&& syntax.right[1].type !== 'singleattrStr') {
				child = [syntax.right[1]];
			}

			return child;
		},
		node: (childs: ParserNode[]) => {
			if (syntax.right[0].value === 'w-sid') {
				return new ParserNode();
			}
			const node = containScript(childs);
			node.hash = hash.nextHash(node.hash, calTextHash(syntax.right[0].value));// 计算属性名hash
			if (syntax.parent.type === 'attrs') {
				calHash(childs, node);
			}

			return node;
		},
		pre: (node: ParserNode): String => {
			if (syntax.right[0].value === 'w-sid') {
				return '';
			}
			if (node.cs) {
				return `{let attrvalue = "";`;
			} else {
				return '';
			}
		},
		suf: (node: ParserNode): String => {
			if (syntax.right[0].value === 'w-sid') {
				return '';
			}
			const key = syntax.right[0].value;
			const attr = (key === 'w-did') ? `.did` : `.attrs["${key}"]`;
			if (!syntax.right[1]) {
				return `node${attr} = ${key};`;
			}
			let str;
			const type = syntax.right[1].type;
			let value = syntax.right[1].value;

			if (type === 'identifier') {
				str = `node${attr} = ${value};`;
			} else if (type === 'attrStr') {
				value = `"${syntax.right[1].right[0].value}"`;
				str = `node${attr} = ${value};`;
			} else if (type === 'singleattrStr') {
				value = `'${syntax.right[1].right[0].value}'`;
				str = `node${attr} = ${value};`;
			} else {
				str = `node${attr} = attrvalue;}`;// 属性是脚本
				if (key !== 'w-did') {
					str += `node.attrHash = _hash.nextHash(node.attrHash, _calTextHash(node.attrs["${key}"]));`;
				}
			}

			// 父节点为body时，该属性移动是某个script的子孙节点
			if (syntax.parent.type === 'body') {
				str += `node.attrHash = _hash.nextHash(node.attrHash, _calTextHash(${value}));`;
			} else if (type === 'identifier' || type === 'attrStr' || type === 'singleattrStr') {
				node.hash = hash.nextHash(node.hash, calTextHash(value));// 计算属性值hash
			}
			if (key === 'w-tag') {
				str += `node.tagName = node.attrs["${key}"];`;
			}

			return str;
		}
	};
};

const attrscriptFunc = (syntax: Syntax, parent: Syntax) => {
	return {
		...defaultParse,
		node: (childs: ParserNode[]) => {
			const node = new ParserNode();
			node.cs = true;
			calHash(childs, node);

			return node;
		},
		child: (): Syntax[] => {
			const child = [];
			for (let i = 0; i < syntax.right.length; i++) {
				syntax.right[i].parent = syntax;
				child.push(syntax.right[i]);
			}

			return child;
		}
	};
};

const singleattrscriptFunc = attrscriptFunc;

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

const lstringFunc = (syntax: Syntax, parent: Syntax) => {
	return {
		...defaultParse,
		node: (childs: ParserNode[]) => {
			const node = new ParserNode();
			node.hash = calTextHash(syntax.value);

			return node;
		},
		pre: (node: ParserNode): String => {
			let str = ``;
			let parentType = '';
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
				str = `attrvalue += "` + syntax.value + `";`;
			} else if (parentType === 'singleattrscript') {
				str = `attrvalue += '` + syntax.value + `';`;
			} else if (parentType === 'jscript') {
				str = `jvalue += "` + syntax.value + `";`;
			}

			return str;
		}
	};
};

const jsfnFunc = (syntax: Syntax, parent: Syntax) => {
	return {
		...defaultParse,
		child: (): Syntax[] => {
			syntax.parent = parent;
			for (let i = 0; i < syntax.right.length; i++) {
				syntax.right[i].parent = syntax;
			}

			return syntax.right;
		},
		node: (childs: ParserNode[]) => {
			const node = new ParserNode();
			node.str = 'function' + childs[0].str + childs[1].str;

			return node;
		}
	};
};

const jsfnargsFunc = (syntax: Syntax, parent: Syntax) => {
	return {
		...defaultParse,
		node: (childs: ParserNode[]) => {
			const node = new ParserNode();
			const lastIndex = syntax.right.length - 1;
			node.str = '(';
			for (let i = 0; i < lastIndex; i++) {
				node.str += syntax.right[i].value + ',';
			}
			if (syntax.right[lastIndex]) {
				node.str += syntax.right[lastIndex].value;
			}
			node.str += ')';

			return node;
		}
	};
};

const jsblockFunc = (syntax: Syntax, parent: Syntax) => {
	return {
		...defaultParse,
		child: (): Syntax[] => syntax.right,
		node: (childs: ParserNode[]) => {
			const node = new ParserNode();
			let index = 0;
			node.str = '{';
			for (let i = 0; i < syntax.right.length; i++) {
				if (!isBuildIn(syntax.right[i])) {
					node.str += childs[index++].str + ';';
				} else {
					node.str += syntax.right[i].value + ';';
				}
			}
			node.str += '}';

			return node;
		}
	};
};

const jsbodyFunc = (syntax: Syntax, parent: Syntax) => {
	return {
		...defaultParse,
		child: (): Syntax[] => syntax.right,
		node: (childs: ParserNode[]) => {
			const node = new ParserNode();
			let index = 0;
			node.str = '{';
			for (let i = 0; i < syntax.right.length; i++) {
				if (!isBuildIn(syntax.right[i])) {
					node.str += childs[index++].str + ';';
				} else {
					node.str += syntax.right[i].value + ';';
				}
			}
			node.str += '}';

			return node;
		}
	};
};

const jsdefFunc = (syntax: Syntax, parent: Syntax) => {
	return {
		...defaultParse,
		child: (): Syntax[] => syntax.right,
		node: (childs: ParserNode[]) => {
			const node = new ParserNode();
			const index = 0;
			node.str = 'let ';
			for (let i = 0; i < childs.length - 1; i++) {
				node.str += childs[i].str + ',';
			}
			if (childs.length > 0) {
				node.str += childs[childs.length - 1].str;
			}

			return node;
		}
	};
};

const genjsifNodeFunc = (op: string, syntax: Syntax) => {
	return (childs: ParserNode[]) => {
		const n = new ParserNode();
		n.str = op;
		if (syntax.right[0].type === 'identifier' || isBuildIn(syntax.right[0])) {
			n.str += `(${syntax.right[0].value})`;
			if (childs[0]) {
				n.str += childs[0].str;
			}
		} else {
			n.str += `(${childs[0].str})`;
		}

		for (let i = 1; i < childs.length; i++) {
			if (childs[i]) {
				n.str += childs[i].str;
			}
		}

		return n;
	};
};

const genBaseFunc = (syntax: Syntax, parent: Syntax) => {
	return {
		...defaultParse,
		node: (childs: ParserNode[]) => {
			const node = new ParserNode();
			node.str = syntax.value;
			calHash(childs, node);

			return node;
		}
	};
};

const genRightBuiltIn = (syntax: Syntax): Syntax[] => {
	const childs = [];
	for (let i = 0; i < syntax.right.length; i++) {
		if (!isBuildIn(syntax.right[i])) {
			childs.push(syntax.right[i]);
		}
	}

	return childs;
};

const jsifFunc = (syntax: Syntax, parent: Syntax) => {
	return {
		...defaultParse,
		child: genifelseifChildFunc(syntax),
		node: genjsifNodeFunc('if', syntax)
	};
};

const jselseifFunc = (syntax: Syntax, parent: Syntax) => {
	return {
		...defaultParse,
		child: genifelseifChildFunc(syntax),
		node: genjsifNodeFunc('else if', syntax)
	};
};

const jselseFunc = (syntax: Syntax, parent: Syntax) => {
	return {
		...defaultParse,
		child: (): Syntax[] => syntax.right,
		node: (childs: ParserNode[]) => {
			const node = new ParserNode();
			if (childs[0]) {
				node.str = `else `;
				node.str += childs[0].str;
			}

			return node;
		}
	};
};

const jsforFunc = (syntax: Syntax, parent: Syntax) => {
	return {
		...defaultParse,
		child: (): Syntax[] => syntax.right,
		node: (childs: ParserNode[]) => {
			if (syntax.right.length !== 4) {
				throw new Error('for语句,必须且只能包含三个条件和一个代码块！');
			}

			const node = new ParserNode();
			node.str = `for(${childs[0].str};${childs[1].str};${childs[2].str})${childs[3].str}`;

			return node;
		}
	};
};

const jswhileFunc = (syntax: Syntax, parent: Syntax) => {
	return {
		...defaultParse,
		child: (): Syntax[] => genRightBuiltIn(syntax),
		node: (childs: ParserNode[]) => {
			const node = new ParserNode();
			node.str = `while(`;
			if (isBuildIn(syntax.right[0])) {
				node.str += syntax.right[0].value + ')';
				node.str += childs[0].str;
			} else {
				node.str += childs[0].str + ')';
				node.str += childs[1].str;
			}

			return node;
		}
	};
};

const jsswitchFunc = (syntax: Syntax, parent: Syntax) => {
	return {
		...defaultParse,
		child: (): Syntax[] => genRightBuiltIn(syntax),
		node: (childs: ParserNode[]) => {
			const node = new ParserNode();
			let index = 0;
			node.str = `switch(`;
			if (isBuildIn(syntax.right[0])) {
				node.str += syntax.right[0].value;
			} else {
				node.str += childs[0].str;
				index = 1;
			}
			node.str += `){`;

			for (let i = index; i < childs.length; i++) {
				node.str += childs[i].str + ';';
			}
			node.str += `}`;

			return node;
		}
	};
};

const jscaseFunc = (syntax: Syntax, parent: Syntax) => {
	return {
		...defaultParse,
		child: (): Syntax[] => genRightBuiltIn(syntax),
		node: (childs: ParserNode[]) => {
			const node = new ParserNode();
			node.str = `case ${syntax.right[0].value}:
			`;
			for (let i = 0; i < childs.length; i++) {
				node.str += childs[i].str + ';';
			}

			return node;
		}
	};
};

const jsdefaultFunc = (syntax: Syntax, parent: Syntax) => {
	return {
		...defaultParse,
		child: (): Syntax[] => syntax.right,
		node: (childs: ParserNode[]) => {
			const node = new ParserNode();
			node.str = `default:`;
			for (let i = 0; i < childs.length; i++) {
				node.str += childs[i].str + ';';
			}

			return node;
		}
	};
};

const jstryFunc = (syntax: Syntax, parent: Syntax) => {
	return {
		...defaultParse,
		child: (): Syntax[] => syntax.right,
		node: (childs: ParserNode[]) => {
			const node = new ParserNode();
			node.str = `try${childs[0].str}`;
			for (let i = 1; i < childs.length; i++) {
				node.str += childs[i].str;
			}

			return node;
		}
	};
};

const jscatchFunc = (syntax: Syntax, parent: Syntax) => {
	return {
		...defaultParse,
		child: (): Syntax[] => genRightBuiltIn(syntax),
		node: (childs: ParserNode[]) => {
			const node = new ParserNode();
			node.str = `catch(${syntax.right[0].value})${childs[0].str}`;

			return node;
		}
	};
};

const jsfinallyFunc = (syntax: Syntax, parent: Syntax) => {
	return {
		...defaultParse,
		child: (): Syntax[] => syntax.right,
		node: (childs: ParserNode[]) => {
			const node = new ParserNode();
			node.str = `finally${childs[0].str}`;

			return node;
		}
	};
};

const jsreturnFunc = (syntax: Syntax, parent: Syntax) => {
	return {
		...defaultParse,
		child: (): Syntax[] => syntax.right,
		node: (childs: ParserNode[]) => {
			const node = new ParserNode();
			node.str = `return`;
			if (childs[0].str) {
				node.str += ' ' + childs[0].str;
			}

			return node;
		}
	};
};

const exprgroupFunc = (syntax: Syntax, parent: Syntax) => {
	return {
		...defaultParse,
		child: (): Syntax[] => syntax.right,
		node: (childs: ParserNode[]) => {
			const node = new ParserNode();
			node.str = '';
			if (childs === null) {
				return node;
			}

			const lastIndex = childs.length - 1;
			for (let i = 0; i < lastIndex; i++) {
				node.str += childs[i].str + ',';
			}
			if (childs[lastIndex]) {
				node.str += childs[lastIndex].str;
			}

			return node;
		}
	};
};

const singlelstringFunc = lstringFunc;

const parserFunc: any = {
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
	obj: objFunc,// obj比jobj简单
	kv: kvFunc,// kv比jpair简单
	arr: arrFunc,// 比jarr简单
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
	cond: condFunc,// 三元运算符
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
	jsfnargs: jsfnargsFunc,//
	jsfn: jsfnFunc,//
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
const sumChildHash = (node: ParserNode, childs: ParserNode[]) => {
	for (let i = 0; i < childs.length; i++) {
		node.childHash ^= hash.nextHash(calTextHash(childs[i].hash + ''), i + 1);
	}
	node.hash ^= node.childHash;
};

/**
 * 只有tag才需要用到的
 */
const calTagHash = (node: ParserNode, tagName: string) => {
	node.hash = hash.nextHash(node.hash, calTextHash(tagName));
};

// 字符都有双层引号，并不需要去掉，因为在字符串转函数的时候会自动去掉一层
const trimQuo = (str: String) => str.substring(1, str.length - 1);

const isBuildIn = (syntax: Syntax): boolean => syntax.type === 'string' || syntax.type === 'number' || syntax.type === 'bool'
	|| syntax.type === 'true' || syntax.type === 'false' || syntax.type === 'null' || syntax.type === 'undefined' || syntax.type === 'integer'
	|| syntax.type === 'integer16' || syntax.type === 'float' || syntax.type === 'identifier' || syntax.type === 'singlequotestring'
	|| syntax.type === 'regular';

const isScript = (syntax: Syntax): boolean => syntax.type === 'script';
const isjstrjscript = (syntax: Syntax): boolean => syntax.type === 'jscript' || syntax.type === 'jstr';
// 本身就有引号了
const parseBuildIn = (syntax: Syntax) => {
	return syntax.value;
};
const isAttrStr = (syntax: Syntax): boolean => syntax.type === 'attrStr';

// ================ JS的处理整体要简单很多
// child -> node->pre -> suf
const defaultParse = {
	child: (): Syntax[] => [],
	node: (childs: ParserNode[]) => {

		return new ParserNode();
	},
	pre: (node: ParserNode): String => ``,
	suf: (node: ParserNode): String => ``
};

let sid = 0;
