/*
 * 样式模块，提供组件内包含子组件范围内基于clazz的样式匹配，clazz使用内联样式作用到实际节点上。
 * 而内联样式则不支持伪类( :hover)、伪对象( :first-child)和关键帧动画( animation keyframes)。
 * 因此，不能支持伪类和关键帧动画。可以使用全局class来处理。
 * 样式沿组件树上溯，寻找到后就注入，这样优先使用外部定义，如果没有则使用默认。
 */

// ============================== 导入
import { butil, Mod } from '../lang/mod';
import { Json } from '../lang/type';
import { getSupportedProperty } from '../util/html';
import { arrayEqual, mapCopy, mapDiff } from '../util/util';
import { Widget } from './widget';

// ============================== 导出

/**
 * @description 含有URL的信息
 * @example
 */
export interface URLInfo {
	key: string; // 效果名称
	arr: string[]; // 前缀,(文件,后缀)...
}
/**
 * @description 效果表
 * @example
 */
export interface URLEffect {
	map: Map<string, string>;
	url: URLInfo; // 含有的键和URL
}
/**
 * @description 组件样式表
 * @example
 */
export type Sheet = Map<string, URLEffect>;

/**
 * @description 解析字符串，返回样式表
 * @example
 * 只支持class
 */
export const parse = (str: string, path: string): Sheet => {
	let r = styleRxp.exec(str);
	if (!r) {
		return null;
	}
	const sheet = new Map();
	while (r) {
		const s = r[1];
		const effect = parseEffect(r[2], path);
		r = styleRxp.exec(str);
		if (!effect) {
			continue;
		}
		let rr = classRxp.exec(s);
		while (rr) {
			sheet.set(rr[1], effect);
			rr = classRxp.exec(s);
		}
	}

	return sheet.size > 0 ? sheet : null;
};

/**
 * @description 分析样式效果，可用于内联样式和外部样式的分析
 * @example
 */
export const parseEffect = (str: string, path: string): URLEffect => {
	const arr = str.split(';');
	const effect: URLEffect = { map: new Map(), url: null };
	const map = effect.map;
	let n = 0;
	for (const s of arr) {
		const i = s.indexOf(':');
		if (i < 0) {
			continue;
		}
		n++;
		const k = getSupportedProperty(s.slice(0, i).trim());
		const v = s.slice(i + 1);
		const url = getURL(k, v, path);
		if (!url) {
			map.set(k, v);
		} else {
			effect.url = url;
		}
	}

	return n > 0 ? effect : null;
};

/**
 * @description 计算clazz的样式特效，沿组件树上溯查找定义的clazz
 * @example
 */
export const calc = (widget: Widget, clazz: string[], clazzStr: string, result: URLEffect) => {
	// 先从本地缓存中寻找
	let effect = (<any>widget).styleCache.get(clazzStr);
	if (effect) {
		mapCopy(effect.map, result.map);
		if (effect.url) {
			result.url = effect.url;
		}

		return result;
	}
	effect = { map: new Map(), url: null };
	const sheet = widget.getSheet();
	if (sheet) {
		// unMatchClazz数组里面存放了还没有匹配到的clazz
		const unMatchClazz = [];
		for (const name of clazz) {
			const e = sheet.get(name);
			if (e) {
				mapCopy(e.map, effect.map);
				if (e.url) {
					effect.url = e.url;
				}
			} else {
				unMatchClazz.push(name);
			}
		}
		if (unMatchClazz.length > 0 && widget.parentNode) {
			calc(widget.parentNode.widget, unMatchClazz, unMatchClazz.join(' '), effect);
		}
	} else if (widget.parentNode) {
		calc(widget.parentNode.widget, clazz, clazzStr, effect);
	}
	(<any>widget).styleCache.set(clazzStr, effect);
	mapCopy(effect.map, result.map);
	result.url = effect.url;

	return result;
};
/**
 * @description 合并内联样式和clazz样式
 * @example
 */
export const merge = (innerStyle: URLEffect, clazzStyle: URLEffect): URLEffect => {
	if (!innerStyle) {
		return clazzStyle;
	}
	if (!clazzStyle) {
		return innerStyle;
	}
	const map = new Map();
	mapCopy(clazzStyle.map, map);
	mapCopy(innerStyle.map, map);

	return { map: map, url: innerStyle.url ? innerStyle.url : clazzStyle.url };
};

/**
 * @description 计算新旧样式的差异部分
 * @example
 */
export const difference = (oldStyle: URLEffect, newStyle: URLEffect): URLEffect => {
	if (!oldStyle) {
		return newStyle;
	}
	const diff = { map: new Map(), url: null };
	const om = oldStyle.map;
	const dm = diff.map;
	if (!newStyle) {
		for (const k of om.keys()) {
			dm.set(k, '');
		}

		return diff;
	}
	mapDiff(newStyle.map, om, diffMap, dm);
	if (oldStyle.url) {
		if (newStyle.url) {
			if (oldStyle.url.key !== newStyle.url.key || !arrayEqual(oldStyle.url.arr, newStyle.url.arr)) {
				diff.url = newStyle.url;
			}
		}
	} else if (newStyle.url) {
		diff.url = newStyle.url;
	}

	return diff;
};
/**
 * @description 在高优先级的样式中过滤指定新样式
 * @example
 */
export const filter = (highStyle: URLEffect, style: URLEffect) => {
	if (!highStyle) {
		return;
	}
	const map2 = style.map;
	const map1 = highStyle.map;
	for (const k of map2.keys()) {
		if (!map1.has(k)) {
			continue;
		}
		map2.delete(k);
		if (style.url && style.url.key === k) {
			style.url = null;
		}
	}
};

// ============================== 本地
// 匹配样式
const styleRxp = /\s*([^{]*)\s*{\s*([^}]*)}/g;
// 匹配类选择器
const classRxp = /\s*\.([-_\w]+)\s*,?/g;
// 匹配CSS的effect中的url，不匹配含有:的字符串，所以如果是http:或https:，则不替换
const effectURL = /url\(([^\)"':]*)\)/g;

// 获得路径的url
const getURL = (k: string, v: string, path: string): URLInfo => {
	// 替换url为全路径
	let rr = effectURL.exec(v);
	if (!rr) {
		return;
	}
	const info = { key: k, arr: [] };
	let suffix = 0;
	const arr = info.arr;
	do {
		// tslint:disable:prefer-template
		arr.push(v.slice(suffix, rr.index) + 'url(');
		arr.push(butil.relativePath(rr[1], path));
		suffix = rr.index + rr[0].length - 1;
		rr = effectURL.exec(v);
	} while (rr);
	arr.push(v.slice(suffix));

	return info;
};

// 写入diffMap
const diffMap = (dm: Map<string, string>, key: string, newv: string, oldv: string) => {
	dm.set(key, newv || '');
};
