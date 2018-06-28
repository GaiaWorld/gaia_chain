/** 
 * 这个模块实际并不使用class定义的类型，类型也并不导出。主要的考虑是，在模板函数中为了优化性能，直接使用字面量表达
 * 类型定义：
 * Node = {type, attrMap, attrHash, children, childHash, simHash, ext, dom|widget}
 * ext = {classSet, clazzSet, clazzStyle, style}
 * TextNode = {hash, content, dom | json}
 */
// ============================== 导入
import { Json } from '../lang/type';
import { objDiff } from '../util/util';
import * as painter from './painter';
import { URLEffect } from './style';
import { Widget } from './widget';
// ============================== 导出

/**
 * @description 普通节点
 * @example
 */

export interface VirtualNode {
	tagName: string;
	sid: number; // 静态ID，由模板分析代码赋值，为0表示模板阶段没有确定
	did: string; // 动态ID，一般由应用代码来赋值，字段为w-id，如果不赋值，则根据attrHash和childHash来确定是否相同。如果不同，则根据自身在父容器的位置进行tag比较，如果tag相同，则认为是同一个节点
	attrs: Object;
	attrHash: number; // 属性计算出来的hash
	attrSize: number; // 属性数量
	children: VNode[];
	childHash: number; // 子节点数组计算出来的内容的hash
	didMap: Map<string, VNode>; // did快速判断是否为相同节点， 如果是其他语言，可以将tagName和sid也放入键中，这样结构更好一些
	childHashMap: Map<number, VWNode[]>; // childHash快速判断是否为相同节点， 如果是其他语言，可以将tagName和sid也放入键中，这样结构更好一些
	textHashMap: Map<number, VirtualTextNode[]>; // textHash快速判断是否为相同节点
	parent: VirtualNode;
	offset: number; // 在父节点的位置
	oldOffset: number; // 在旧节点上的位置
	widget: Widget;
	link: HTMLElement;
	ext: VNodeExt;
}

export interface VirtualWidgetNode {
	tagName: string;
	sid: number; // 静态ID，由模板分析代码赋值，为0表示模板阶段没有确定
	did: string; // 动态ID，一般由应用代码来赋值， 字段为w-id，如果不赋值，则根据attrHash和childHash来确定是否相同。如果不同，则根据自身在父容器的位置进行tag比较，如果tag相同，则认为是同一个节点
	attrs: Object;
	attrHash: number; // 属性计算出来的hash
	attrSize: number; // 属性数量
	hasChild: boolean; // 是否有child
	child: Json; // 组件数据
	childHash: number; // JSON计算出来的内容的hash
	parent: VirtualNode;
	offset: number; // 在父节点的位置
	oldOffset: number; // 在旧节点上的位置
	widget: Widget;
	link: Widget;
	ext: VNodeExt;
}

export interface VirtualTextNode {
	text: string;
	childHash: number;
	link: HTMLElement;
	parent: VirtualNode;
	offset: number; // 在父节点的位置
	oldOffset: number; // 在旧节点上的位置
	str: string;
}

export interface VNodeExt {
	style?: URLEffect;// 合并后的样式
	innerStyle?: URLEffect;// 内联样式
	clazzStyle?: URLEffect;// clazz内联样式
	plugin?: any;
	eventAttr?: any;
	eventMap?: Map<string, any>;// 用户事件表
	nativeEventMap?: Map<string, any>;// 本地事件表 key:"click" value: ()=>{}
	propsUpdate?: boolean;// props是否使用更新模式，默认为false,替换模式
}

export type VWNode = VirtualNode | VirtualWidgetNode;
export type VNode = VWNode | VirtualTextNode;

/**
 * @description 转换类型获得VirtualNode
 * @example
 */
export const isVirtualNode = (node: VNode): VirtualNode => {
	if ((<any>node).children) {
		return <VirtualNode>node;
	}
};
/**
 * @description 转换类型获得VirtualNode
 * @example
 */
export const isVirtualWidgetNode = (node: VNode): VirtualWidgetNode => {
	if ((<any>node).hasChild !== undefined || (<any>node).child !== undefined) {
		return <VirtualWidgetNode>node;
	}
};
/**
 * @description 转换类型获得VirtualNode
 * @example
 */
export const isVirtualTextNode = (node: VNode): VirtualTextNode => {
	if ((<any>node).text !== undefined) {
		return <VirtualTextNode>node;
	}
};
/**
 * @description 获得指定属性的值
 * @example
 */
export const getAttribute = (attrs: Object, name: string): string => {
	return attrs[name];
};
/**
 * @description 寻找满足指定属性的第一个节点，递归调用，遍历vdom树。value为undefined，有属性就可以
 * @example
 */
export const findNodeByAttr = (node: VirtualNode, key: string, value?: string): VWNode => {
	const arr = node.children;
	for (let n of arr) {
		if ((<any>n).children) {
			const r = getAttribute((<VirtualNode>n).attrs, key);
			if (value !== undefined) {
				if (value === r) {
					return <VirtualNode>n;
				}
			} else if (r !== undefined) {
				return <VirtualNode>n;
			}
			n = findNodeByAttr(<VirtualNode>n, key, value);
			if (n) {
				return <VirtualNode>n;
			}
		} else if (isVirtualWidgetNode(n)) {
			const r = getAttribute((<VirtualWidgetNode>n).attrs, key);
			if (value !== undefined) {
				if (value === r) {
					return <VirtualWidgetNode>n;
				}
			} else if (r !== undefined) {
				return <VirtualWidgetNode>n;
			}
		}
	}
};
/**
 * @description 寻找满足指定Tag的第一个节点，递归调用，遍历vdom树
 * @example
 */
export const findNodeByTag = (node: VirtualNode, tag: string): VWNode => {
	const arr = node.children;
	for (let n of arr) {
		if ((<any>node).children) {
			if ((<VirtualNode>n).tagName === tag) {
				return <VirtualNode>n;
			}
			n = findNodeByTag(<VirtualNode>n, tag);
			if (n) {
				return <VirtualNode>n;
			}
		} else if (isVirtualWidgetNode(n)) {
			if ((<VirtualWidgetNode>n).tagName === tag) {
				return <VirtualWidgetNode>n;
			}
		}
	}
};

/**
 * @description 用新节点创建
 * @example
 */
export const create = (n: VNode): void => {
	if (isVirtualWidgetNode(n)) {
		painter.createWidget((<VirtualWidgetNode>n));
	} else if ((<any>n).children) {
		createNode((<VirtualNode>n));
	} else if ((<any>n).text) {
		painter.createTextNode((<VirtualTextNode>n));
	}
};

/**
 * @description 用新节点替换旧节点
 * replace的前提是，已经判断这是同一个节点了，替换后对旧节点做标记，
 * @example
 */
export const replace = (oldNode: any, newNode: any): boolean => {
	let b;
	if (oldNode.text !== undefined && oldNode.text !== null && newNode.text !== undefined && newNode.text !== null) {
		newNode.link = oldNode.link;
		newNode.oldOffset = oldNode.offset;
		oldNode.offset = -1;
		if (oldNode.text === newNode.text) {
			return false;
		}
		painter.modifyText(newNode, newNode.text, oldNode.text);

		return true;
	}
	painter.replaceNode(oldNode, newNode);

	newNode.oldOffset = oldNode.offset;
	oldNode.offset = -1;
	b = replaceAttr(oldNode, newNode);
	if (oldNode.childHash !== newNode.childHash || painter.forceReplace) {
		if (oldNode.children && newNode.children) {
			replaceChilds(oldNode, newNode);
		} else if (isVirtualWidgetNode(oldNode) && isVirtualWidgetNode(newNode)) {
			painter.modifyWidget(oldNode, newNode.child, oldNode.child);
		}
		b = true;
	} else if (oldNode.children && newNode.children) {
		// 将oldNode上的子节点及索引移动到新节点上
		newNode.didMap = oldNode.didMap;
		newNode.childHashMap = oldNode.childHashMap;
		newNode.textHashMap = oldNode.textHashMap;
		newNode.children = oldNode.children;
		for (const n of newNode.children) {

			n.parent = newNode;
		}
	}

	return b;
};

// ============================== 本地
/**
 * @description 替换属性，计算和旧节点属性的差异
 * @example
 */
const replaceAttr = (oldNode: VWNode, newNode: VWNode): boolean => {
	const oldArr = oldNode.attrs;
	if (oldNode.attrHash === newNode.attrHash && !painter.forceReplace) {
		return false;
	}
	if (newNode.attrSize && !newNode.ext) {
		newNode.ext = {};

	}
	objDiff(newNode.attrs, newNode.attrSize, oldArr, oldNode.attrSize, attrDiff, newNode);

	return true;
};
/**
 * @description 替换属性，计算和旧节点属性的差异
 * @example
 */
const attrDiff = (newNode: VWNode, key: string, v1: string, v2: string) => {
	if (v1 === undefined) {
		return painter.delAttr(newNode, key);
	}
	if (v2 === undefined) {
		return painter.addAttr(newNode, key, v1);
	}
	painter.modifyAttr(newNode, key, v1, v2);
};
/**
 * @description 在数组中寻找相同节点
 * @example
 */
const findSameHashNode = (arr: VWNode[], node: VWNode): VWNode | void => {
	if (!arr) {
		return;
	}
	for (let n, i = 0, len = arr.length; i < len; i++) {
		n = arr[i];
		if (n.offset >= 0 && n.tagName === node.tagName && n.sid === node.sid && n.attrHash === node.attrHash) {
			return n;
		}
	}
};
/**
 * @description 在数组中寻找相似节点
 * @example
 */
const findLikeHashNode = (arr: VWNode[], node: VWNode): VWNode | void => {
	if (!arr) {
		return;

	}

	for (let n, i = 0, len = arr.length; i < len; i++) {

		n = arr[i];

		if (n.offset >= 0 && n.tagName === node.tagName && n.sid === node.sid) {

			return n;

		}

	}

};

/**
 * @description 寻找相同节点的函数
 * VirtualNode根据 did attrHash childHash 寻找相同节点，如果没有找到，则返回undefined
 * @example
 */

const findSameVirtualNode = (oldParent: VirtualNode, newParent: VirtualNode, child: VWNode): VWNode | void => {

	let n;

	if (child.did && oldParent.didMap) {

		n = oldParent.didMap.get(child.did);

		if (n && n.offset >= 0 && (<any>n).tagName === child.tagName && (<any>n).sid === child.sid) {

			return <any>n;

		}

	} else if (oldParent.childHashMap) {

		return findSameHashNode(oldParent.childHashMap.get(child.childHash), child);

	}

};

/**
 * @description 寻找相似节点的函数
 * VirtualNode根据 childHash attrHash offset 依次寻找相似节点，如果没有找到，则返回undefined
 * @example
 */

const findLikeVirtualNode = (oldParent: VirtualNode, newParent: VirtualNode, child: VWNode, offset: number): VWNode | void => {

	if (!oldParent.childHashMap) {

		return;

	}

	let n;

	const arr = oldParent.childHashMap.get(child.childHash);

	n = findLikeHashNode(arr, child);

	if (n) {

		return n;

	}

	n = oldParent.children[offset];

	if (n && n.childHash !== undefined && n.offset >= 0 && child.tagName === n.tagName && child.sid === n.sid) {

		return n;

	}

};

/**
 * @description 寻找相同文本节点的函数
 * VirtualNode根据 textHash依次寻找相同节点，如果没有找到，则返回undefined
 * @example
 */

const findSameVirtualTextNode = (oldParent: VirtualNode, newParent: VirtualNode, child: VirtualTextNode): VirtualTextNode | void => {

	const arr = oldParent.textHashMap && oldParent.textHashMap.get(child.childHash);

	if (arr && arr.length > 0) {

		return arr.shift();

	}

};

/**
 * @description 寻找相似文本节点的函数
 * VirtualNode根据 offset 寻找相似节点，如果没有找到，则返回undefined
 * @example
 */

// tslint:disable:max-line-length
const findLikeVirtualTextNode = (oldParent: VirtualNode, newParent: VirtualNode, child: VirtualTextNode, offset: number): VirtualTextNode | void => {

	const n = oldParent.children[offset];

	if (n && (<VirtualTextNode>n).text && n.offset >= 0) {

		return <VirtualTextNode>n;

	}

};

/**
 * @description 初始化子节点，并在父节点上添加索引
 * @example
 */

const initAndMakeIndex = (n: VWNode, i: number, parent: VirtualNode): void => {

	let map;
	let nodes;

	n.parent = parent;

	n.offset = i;

	n.widget = parent.widget;

	if (n.did) {

		if (!parent.didMap) {

			parent.didMap = new Map();

		}

		parent.didMap.set(n.did, n);

	} else {

		map = parent.childHashMap;

		if (!map) {

			parent.childHashMap = map = new Map();

		}

		nodes = map.get(n.childHash) || [];

		nodes.push(n);

		map.set(n.childHash, nodes);

		nodes = map.get(n.attrHash) || [];

		nodes.push(n);

		map.set(n.attrHash, nodes);

	}

};

/**
 * @description 文本索引
 * @example
 */

const makeTextIndex = (n: VirtualTextNode, i: number, parent: VirtualNode): void => {

	n.parent = parent;

	n.offset = i;

	let map = parent.textHashMap;

	if (!map) {

		parent.textHashMap = map = new Map();

	}

	const nodes = map.get(n.childHash) || [];

	nodes.push(n);

	map.set(n.childHash, nodes);

};

/**
 * @description 用新节点创建
 * @example
 */

const createNode = (node: VirtualNode): void => {

	const arr = node.children;

	painter.createNode(node);

	const parent = node.link;

	for (let n, i = 0, len = arr.length; i < len; i++) {

		n = arr[i];

		if (isVirtualWidgetNode(n)) {

			initAndMakeIndex(n, i, node);

			painter.createWidget(n);

		} else if (n.children) {

			initAndMakeIndex(n, i, node);

			createNode(n);

		} else {

			makeTextIndex(n, i, node);

			painter.createTextNode(n);

		}

		painter.addNode(parent, n, true);

	}

};

/**
 * @description 子节点替换方法，不应该使用编辑距离算法
 * 依次处理所有删除的和一般修改的节点。最后处理位置变动和新增的，如果位置变动超过1个，则清空重新添加节点
 * @example
 */

// tslint:disable-next-line:cyclomatic-complexity
const replaceChilds = (oldNode: VirtualNode, newNode: VirtualNode): void => {

	let n;
	let same;
	let arr = newNode.children;
	const len = arr.length;
	let next = false;
	let insert = false;
	let move = 0;

	for (let i = 0, offset = 0; i < len; i++) {
		n = arr[i];
		if (n.tagName !== undefined) {
			initAndMakeIndex(n, i, newNode);
			// 在旧节点寻找相同节点
			same = findSameVirtualNode(oldNode, newNode, n);
		} else {
			makeTextIndex(n, i, newNode);
			// 在旧节点寻找相同节点
			same = findSameVirtualTextNode(oldNode, newNode, n);
		}

		if (!same) {
			offset++;
			// 猜测用最新的位置差能够找到变动的节点
			n.oldOffset = -offset;
			next = true;
			continue;
		}

		// 记录最新相同节点的位置差
		offset = same.offset + 1;
		replace(same, n);
		// 计算有无次序变动
		if (move >= 0) {
			move = (move <= offset) ? offset : -1;
		}
	}

	if (next) {
		move = 0;
		// 寻找相似节点
		for (let i = 0; i < len; i++) {
			n = arr[i];
			if (n.oldOffset >= 0) {
				// 计算有无次序变动
				if (move >= 0) {
					move = (move <= n.oldOffset) ? n.oldOffset : -1;
				}
				continue;
			}
			if (n.tagName !== undefined) {
				same = findLikeVirtualNode(oldNode, newNode, n, -n.oldOffset - 1);
			} else {
				same = findLikeVirtualTextNode(oldNode, newNode, n, -n.oldOffset - 1);
			}
			if (!same) {
				create(n);
				insert = true;
				continue;
			}

			replace(same, n);
			// 计算有无次序变动
			if (move >= 0) {
				move = (move <= n.oldOffset) ? n.oldOffset : -1;
			}
		}
	}

	// 删除没有使用的元素

	arr = oldNode.children;

	for (let i = arr.length - 1; i >= 0; i--) {
		if (arr[i].offset >= 0) {
			painter.delNode(arr[i]);
		}
	}

	arr = newNode.children;

	const parent = newNode.link;
	// 如果有节点次序变动，则直接在新节点上加入新子节点数组，代码更简单，性能更好
	if (move < 0) {
		// painter.paintCmd3(parent, "innerHTML", ""); //不需要清空，重新加一次，一样保证次序
		for (let i = 0; i < len; i++) {
			painter.addNode(parent, arr[i]);
		}
	} else if (insert) {

		// 如果没有节点次序变动，则插入节点
		for (let i = 0; i < len; i++) {
			n = arr[i];
			if (n.oldOffset < 0) {
				painter.insertNode(parent, n, n.offset);
			}
		}
	}
};

// ============================== 立即执行
