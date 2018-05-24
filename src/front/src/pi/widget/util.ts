/*
 * 组件工具模块
 */

// ============================== 导入
import { butil, commonjs, depend, load, Mod } from '../lang/mod';
import { Json } from '../lang/type';
import * as hash from '../util/hash';
import { addCssNode, loadCssNode } from '../util/html';
import { logLevel, warn } from '../util/log';
import { BlobType, RES_TYPE_BLOB, ResTab } from '../util/res_mgr';
import { set as task } from '../util/task_mgr';
import { toFun } from '../util/tpl';
import { checkInstance, checkType, getExportFunc, getValue, mapCopy } from '../util/util';
import { parse, Sheet } from '../widget/style';
import { Forelet } from './forelet';
import { paintCmd3 } from './painter';
import { factory, getCache, register, setCache, Widget } from './widget';

// ============================== 导出
export let level = logLevel;

/**
 * @description 将指定名称的组件，加入到el元素的第一个元素前，会延迟到帧调用时添加
 * @example
 */
export const addWidget = (el: HTMLElement, name: string, props?: Json): Widget => {
	const w = factory(name);
	if (!w) {
		return;
	}
	if (props) {
		w.setProps(props);
	}
	w.paint();
	paintCmd3(el, 'appendChild', [w.tree.link]);

	return w;
};

/**
 * @description 标签匹配， 判断模式字符串，是否和标签匹配，标签可以多级
 * @example
 * not($b1) or($b1,$b2) and(or($b1=c1,$b2!=c2), not($b3)
 * 	$b1、$b2表示flag是否含有此键， $b2!=c2表示flag的b2键的值要不等于c2
 */
export const flagMatch = (pattern: string, flags: Json): boolean => {
	return parseMatch({ str: pattern.trim() }, flags);
};

/**
 * @description 列出目录及子目录下所有的文件，跳过重复文件
 * 如果一个目录中含有 .exclude.<文件后缀>.<标签匹配语句> 文件，则表示该目录指定后缀（没有后缀表示所有文件）需要进行排除匹配，如果匹配成功，则该目录及子目录的指定后缀的文件被排除。
 * @example
 */
export const listDir = (info: any, flags: Json, fileList: string[], suffixMap: Json, without: any, suffixCfg: any): void => {
	if (without[info.path]) {
		return;
	}
	let scfg;
	const children = info.children;
	const files = [];
	const dirs = [];
	for (const name in children) {
		if (!children.hasOwnProperty(name)) {
			continue;
		}
		const info = children[name];
		if (info.children) {
			dirs.push(info);
			continue;
		}
		if (!name.startsWith(exclude)) {
			files.push(info);
			continue;
		}
		const i = name.indexOf('.', exclude.length);
		if (!flagMatch(name.slice(i + 1), flags)) {
			continue;
		}
		const suf = name.slice(exclude.length, i);
		if (!suf) {
			return;
		}
		if (!scfg) {
			scfg = { ...suffixCfg };
		}
		scfg[suf] = 'none';
	}
	for (let i = files.length - 1; i > -1; i--) {
		listFile(files[i], flags, fileList, suffixMap, without, scfg || suffixCfg);
	}
	for (const d of dirs) {
		listDir(d, flags, fileList, suffixMap, without, scfg || suffixCfg);
	}
};

/**
 * @description 加载并注册指定目录及子目录下的所有模块、组件和资源（图片、声音、字体……）
 * 次序是按照目录逐层加载，目录按序深度遍历加载
 * 精确下载，如果目录含匹配定义文件，如果和当前标签不匹配，则该目录及子目录不下载和加载
 * 先加载所有的模块及其依赖模块，然后加载所有的组件，最后执行所有模块内的loadDirCompleted方法
 * 前端的三种兼容（compat）： 1、模块（B模块修饰A模块） 2、组件（B组件修饰A组件） 3、资源（文字-构建系统预处理 css图片及字体-构建系统预处理），统一通过loadDirCompleted方法来处理兼容问题
 * 
 * 组件可以是<组件名>.widget，也可以是<组件名>.wcss, <组件名>.tpl, <组件名>.js，如果有tpl就算一个组件，会默认同名的css和js构成组件，如果js模块内导出了一个forelet，则认为是这个组件的forelet。
 * .widget、*.wcss、*.js可以引用到dirs以外的文件，该文件又可能引用新的文件，会需要多次碎片加载，所以都不支持引用外部目录的文件。
 * @example
 */
export const loadDir = (dirs: string[], flags: Json, without: any, suffixCfg: any,
	successCallback: Function, errorCallback: Function, processCallback?: Function): Json => {
	const fileList = [];
	const dirSuffixCfg = {};
	const suffixMap = { js: [], tpl: [], widget: [] };
	without = without || {};
	if (suffixCfg) {
		for (const k in suffix_cfg) {
			if (!suffixCfg[k]) {
				suffixCfg[k] = suffix_cfg[k];
			}
		}
	} else {
		suffixCfg = suffix_cfg;
	}
	for (const dir of dirs) {
		const info = depend.get(dir);
		if (!info) {
			continue;
		}
		if (info.children) {
			listDir(info, flags, fileList, suffixMap, without, findExclude(getParentInfo(info.path), flags, suffixCfg, dirSuffixCfg));
		} else {
			listFile(info, flags, fileList, suffixMap, without, suffixCfg);
		}
	}
	// fileList 去除所有的模块文件
	for (let f, i = fileList.length - 1; i >= 0; i--) {
		f = fileList[i].path;
		// 跳过后缀不为".js"的文件
		if ((f.charCodeAt(f.length - 1) !== 115 || f.charCodeAt(f.length - 2) !== 106 || f.charCodeAt(f.length - 3) !== 46)) {
			continue;
		}
		if (i < fileList.length - 1) {
			fileList[i] = fileList[fileList.length - 1];
		}
		fileList.length--;
	}
	// modNames 去除已经加载的模块文件
	const modNames = suffixMap.js;
	for (let f, j, i = modNames.length - 1; i >= 0; i--) {
		f = modNames[i];
		modNames[i] = f.slice(0, f.length - 3);
		if (commonjs.check(modNames[i]) !== true) {
			continue;
		}
		if (i < modNames.length - 1) {
			modNames[i] = modNames[modNames.length - 1];
		}
		modNames.length--;
	}
	// 获得包括依赖模块在内的等待加载的模块文件
	// tslint:disable:no-reserved-keywords
	const set = commonjs.depend(modNames);
	modNames.length = 0;
	// fileList 加上模块依赖的文件，合并下载
	for (let i = set.length - 1; i >= 0; i--) {
		const m = set[i];
		if (m.loaded) {
			continue;
		}
		fileList.push(m.info);
		modNames.push(m.id);
	}
	processCallback && processCallback({
		type: 'requireStart', total: modNames.length,
		download: modNames.length, fileList: fileList, modNames: modNames
	});
	const down = load.create(fileList, (fileMap) => {
		// 加载所有的模块
		// tslint:disable:non-literal-require
		commonjs.require(modNames, fileMap, (mods) => {
			loadNext(suffixMap, fileMap, mods, successCallback, processCallback);
		}, errorCallback, processCallback);
	}, errorCallback, processCallback);
	down.fileTab = without;
	load.start(down);

	return down;
};
/**
 * @description 加载全局css，并自动加载css上的图片和字体，并加载fileMap的BlobURL资源
 * @example
 */
export const loadCssRes = (fileMap, callback: Function): ResTab => {
	// 从fileMap中，提前将全部的BlobURL资源载入资源管理器上
	const tab = new ResTab();
	const cssArr = [];
	const rcssArr = [];
	for (const k in fileMap) {
		const type = butil.fileSuffix(k);
		if (BlobType[type]) {
			// tslint:disable:prefer-template
			tab.load(RES_TYPE_BLOB + ':' + (type === 'webp' ? getWebpSrc(k) : k), RES_TYPE_BLOB, k, fileMap);
		} else if (type === 'css') {
			cssArr.push(k);
		} else if (type === 'rcss') {
			rcssArr.push(k);
		}
	}
	// 加载不包含资源的全局样式和应用全局样式，应该是完全的兼容样式
	for (const k of cssArr) {
		loadCss(fileMap[k]);
	}
	// 加载包含资源的全局样式和应用全局样式，并自动加载css上的资源，应该是完全的兼容样式
	let count = 1;
	const cb = (s: string) => {
		s && addCssNode(s);
		count--;
		count === 0 && callback && callback();
	};
	for (const k of rcssArr) {
		count++;
		replaceURL(butil.utf8Decode(fileMap[k]), k, fileMap, cb);
	}
	cb('');

	return tab;
};
/**
 * @description 设置tpl模板加载函数
 * @example
 */
export const setTplFun = (func: Function) => {
	tplFun = func;
};

// ============================== 本地
// 排除前缀
const exclude = '.exclude.';
// 标签匹配的正则表达式
// tslint:disable:variable-name
const var_reg = /^\$([a-zA-Z0-9\.\_]+)\s*/;
const str_reg = /^([a-zA-Z][a-zA-Z0-9\.\_]*)\s*/;
const number_reg = /^([0-9\.]+)\s*/;

// 样式中匹配URL的正则表达式，不匹配含有:的字符串，所以如果是http:或https:，则不替换
const CSS_URL = /url\(([^\)"':]*)\)/g;

// 默认的后缀配置处理, "downonly"表示仅下载，如果本地有则不加载， "none"表示不下载不加载
const suffix_cfg = {
	png: 'downonly', jpg: 'downonly', jpeg: 'downonly',
	webp: 'downonly', gif: 'downonly', svg: 'downonly', mp3: 'downonly', ogg: 'downonly', aac: 'downonly'
};

// tpl模板加载函数
let tplFun: Function = (tplStr, filename) => {
	return { value: toFun(tplStr, filename), path: filename, wpath: null };
};

/**
 * @description 获得webp文件的源文件
 * @example
 */
const getWebpSrc = (path): string => {
	const s = path.slice(0, path.length - 5);
	let s1 = s + '.png';
	if (depend.get(s1)) {
		return s1;
	}
	s1 = s + '.jpg';
	if (depend.get(s1)) {
		return s1;
	}
	s1 = s + '.jpeg';
	if (depend.get(s1)) {
		return s1;
	}

	return path;
};
/**
 * @description 寻找父目录的文件信息
 * @example
 */
const getParentInfo = (path): string => {
	const i = path.lastIndexOf('/');

	return (i > 0) ? depend.get(path.slice(0, i + 1)) : undefined;
};

/**
 * @description 寻找父目录下的排除文件
 * @example
 */
const findExclude = (parent: Json, flags: Json, suffixCfg: Json, cache: Json): Json => {
	let scfg;
	while (parent) {
		let c = cache[parent.path];
		if (c === undefined) {
			const children = parent.children;
			for (const name in children) {
				if (!children.hasOwnProperty(name)) {
					continue;
				}
				if (children[name].children) {
					continue;
				}
				if (!name.startsWith(exclude)) {
					continue;
				}
				const i = name.indexOf('.', exclude.length);
				if (!flagMatch(name.slice(i + 1), flags)) {
					continue;
				}
				const suf = name.slice(exclude.length, i);
				if (!suf) {
					continue;
				}
				if (!c) {
					c = {};
				}
				c[suf] = 'none';
			}
			cache[parent.path] = c || null;
		}
		if (c) {
			if (!scfg) {
				scfg = { ...suffixCfg };
			}
			Object.assign(scfg, c);
		}
		parent = getParentInfo(parent.path);
	}

	return scfg || suffixCfg;
};
/**
 * @description 列出文件
 * @example
 */
const listFile = (info: Json, flags: Json, fileList: string[], suffixMap: Json, without: any, suffixCfg: any): void => {
	const path = info.path;
	if (without[path]) {
		return;
	}
	const suffix = butil.fileSuffix(path);
	const type = suffixCfg[suffix];
	if (type === 'none') {
		return;
	}
	if (type === 'downonly') {
		if (load.isLocal(path)) {
			return;
		}
	}
	fileList && fileList.push(info);
	if (!suffixMap) {
		return;
	}
	const arr = suffixMap[suffix];
	if (arr) {
		arr.push(path);
	}
};

/**
 * @description 用BlobURL方式加载css
 * @example
 */
const loadCss = (data: ArrayBuffer): HTMLStyleElement => {
	const url = URL.createObjectURL(new Blob([data], { type: 'text/css' }));

	return loadCssNode(url, () => {
		URL.revokeObjectURL(url);
	});
};

/**
 * @description 替换样式字符串中的url，并增加资源的引用计数
 * @example
 */
const replaceURL = (css: string, path: string, fileMap, callback: Function) => {
	const tab = new ResTab();
	let count = 1;
	const cb = () => {
		count--;
		count === 0 && callback(css.replace(CSS_URL, (str: string, s: string) => {
			s = butil.relativePath(s, path);
			const res = tab.get(RES_TYPE_BLOB + ':' + s);
			if (!res) {
				return '';
			}
			res.use();

			return 'url(' + res.link + ')';
		}));
	};
	css.replace(CSS_URL, (str: string, s: string) => {
		count++;
		s = butil.relativePath(s, path);
		tab.load(RES_TYPE_BLOB + ':' + s, RES_TYPE_BLOB, s, fileMap, cb, cb);

		return '';
	});
	cb();
};

/**
 * @description 目录加载的下一步，分析和创建*.tpl和*.widget对应的组件，执行脚本
 * @example
 */
const loadNext = (suffixMap: Json, fileMap: Json, mods: Mod[], successCallback?: Function, processCallback?: Function): void => {
	task(() => {
		processCallback && processCallback({ type: 'loadTpl' });
		const arr = suffixMap.tpl;
		for (const f of arr) {
			loadTpl(f, fileMap);
		}
	}, undefined, 3000000, 1);
	task(() => {
		processCallback && processCallback({ type: 'loadWidget' });
		const arr = suffixMap.widget;
		for (const f of arr) {
			loadWidget(f, fileMap);
		}
	}, undefined, 3000000, 1);
	task(() => {
		processCallback && processCallback({ type: 'loadDirCompleted' });
		for (const m of mods) {
			loadDirCompleted(m, fileMap);
		}
		successCallback && successCallback(fileMap, mods);
	}, undefined, 3000000, 1);
};

/**
 * @description 创建组件
 * @example
 */
const loadTpl = (filename: string, fileMap: Json): void => {
	let widget;
	let forelet;
	const name = filename.slice(0, filename.length - 4);
	const s = name + '.widget'; // 忽略有widget配置的组件
	if (fileMap[s]) {
		return;
	}
	const mod = commonjs.relativeGet(name);
	if (mod) {
		widget = getExportFunc(mod, checkType, Widget);
		forelet = getExportFunc(mod, checkInstance, Forelet);
	}
	const config = loadCfg(name + '.cfg', fileMap, name);
	const tpl = loadTpl1(filename, fileMap, name);
	const css = loadWcss(name + '.wcss', fileMap, name);
	register(name.replace(/\//g, '-'), widget, tpl, css, config, forelet);
};

/**
 * @description 创建组件
 * @example
 */
const loadWidget = (filename: string, fileMap: Json): void => {
	let widget;
	let config;
	let tpl;
	let css;
	let forelet;
	const name = filename.slice(0, filename.length - 7);
	const cfg = JSON.parse(butil.utf8Decode(fileMap[filename]));
	if (cfg.js || cfg.widget) {
		const mod = commonjs.relativeGet(commonjs.modName(cfg.js || cfg.widget), name);
		if (!mod) {
			warn(level, 'widget not found, name:', name, cfg.js || cfg.widget);

			return;
		}
		widget = getExportFunc(mod, checkType, Widget);
	}
	if (cfg.cfg) {
		config = loadCfg(cfg.cfg, fileMap, name);
		if (!config) {
			warn(level, 'widget cfg not found, name:', name, cfg.cfg);
		}
	}
	if (cfg.css) {
		css = loadWcss(cfg.css, fileMap, name);
		if (!css) {
			warn(level, 'widget css not found, name:', name, cfg.css);
		}
	}
	if (cfg.tpl) {
		tpl = loadTpl1(cfg.tpl, fileMap, name);
	}
	if (cfg.forelet) {
		const mod = commonjs.relativeGet(commonjs.modName(cfg.forelet), name);
		if (!mod) {
			warn(level, 'widget forelet not found, name:', name, cfg.forelet);

			return;
		}
		forelet = getExportFunc(mod, checkInstance, Forelet);
	}
	register(name.replace(/\//g, '-'), widget, tpl, css, config, forelet);
};

/**
 * @description 加载模板
 * @example
 */
const loadTpl1 = (file: string, fileMap: Json, widget: string): Json => {
	const s = butil.relativePath(file, widget);
	let tpl = getCache(s);
	if (!tpl) {
		const data = fileMap[s];
		if (!data) {
			warn(level, 'widget tpl not found, name:', widget, file);

			return;
		}
		tpl = tplFun(butil.utf8Decode(data), s);
		setCache(s, tpl);
	} else if (!tpl.value) {
		tpl.value = toFun(butil.utf8Decode(fileMap[s]), s);
	}

	return tpl;
};

/**
 * @description 加载配置
 * @example
 */
const loadCfg = (cfg: string | string[], fileMap: Json, widget: string): Json => {
	if (Array.isArray(cfg)) {
		let c;
		for (const f of cfg) {
			let config = loadCfg1(f, fileMap, widget);
			if (!config) {
				continue;
			}
			config = config.value;
			if (!config) {
				continue;
			}
			if (!c) {
				c = {};
			}
			for (const k in config) {
				c[k] = config[k];
			}
		}

		return c ? { value: c } : null;
	} else {
		return loadCfg1(cfg, fileMap, widget);
	}
};
/**
 * @description 加载配置
 * @example
 */
const loadCfg1 = (cfg: string, fileMap: Json, widget: string): Json => {
	const s = butil.relativePath(cfg, widget);
	let config = getCache(s);
	if (!config) {
		const data = fileMap[s];
		if (!data) {
			return;
		}
		config = { value: JSON.parse(butil.utf8Decode(data)) };
		setCache(s, config);
	} else if (!config.value) {
		config.value = parse(butil.utf8Decode(fileMap[s]), s);
	}

	return config;
};
/**
 * @description 加载配置
 * @example
 */
const loadWcss = (wcss: string | string[], fileMap: Json, widget: string): Json => {
	if (Array.isArray(wcss)) {
		let sheet;
		for (const f of wcss) {
			let css = loadWcss1(f, fileMap, widget);
			if (!css) {
				continue;
			}
			css = css.value;
			if (!css) {
				continue;
			}
			if (!sheet) {
				sheet = new Map();
			}
			mapCopy(css, sheet);
		}

		return { value: sheet };
	} else {
		return loadWcss1(wcss, fileMap, widget);
	}
};
/**
 * @description 加载样式
 * @example
 */
const loadWcss1 = (wcss: string, fileMap: Json, widget: string): Json => {
	const s = butil.relativePath(wcss, widget);
	let css = getCache(s);
	if (!css) {
		const data = fileMap[s];
		if (!data) {
			return;
		}
		css = { value: parse(butil.utf8Decode(data), s) };
		setCache(s, css);
	} else if (!css.value) {
		css.value = parse(butil.utf8Decode(fileMap[s]), s);
	}

	return css;
};

/**
 * @description 调用模块的loadDirCompleted方法
 * @example
 */
const loadDirCompleted = (mod: Json, fileMap: Json): void => {
	const func = mod.loadDirCompleted;
	func && func(fileMap);
};

/**
 * @description 标签匹配， 判断模式字符串，是否和标签匹配，标签可以多级
 * @example
 * not($b1) or($b1,$b2) and(or($b1=c1,$b2!=c2), not($b3)) ($b2)
 * 	$b1、$b2表示flag是否含有此键， $b2!=c2表示flag的b2键的值要不等于c2
 */
export const parseMatch = (pattern: any, flags: Json): boolean => {
	let s = pattern.str;
	if (s.startsWith('and(')) {
		pattern.str = s.slice(4).trim();

		return parseAnd(pattern, flags);
	}
	if (s.startsWith('or(')) {
		pattern.str = s.slice(3).trim();

		return parseOr(pattern, flags);
	}
	if (s.startsWith('not(')) {
		pattern.str = s.slice(4).trim();

		return parseNot(pattern, flags);
	}
	if (s.startsWith('(')) {
		pattern.str = s.slice(1).trim();
		const r = parseMatch(pattern, flags);
		s = pattern.str;
		if (s.charCodeAt(0) !== 41) { // ")"
			throw new Error('parse error, invalid pattern:' + pattern.str);
		}

		return r;
	}

	return parseEqual(pattern, flags);
};

/**
 * @description 分析not， ")"结束
 * @example
 */
const parseNot = (pattern: any, flags: Json): boolean => {
	const r = parseMatch(pattern, flags);
	const s = pattern.str;
	if (s.charCodeAt(0) !== 41) { // ")"
		throw new Error('parse error, invalid pattern:' + pattern.str);
	}
	pattern.str = s.slice(1).trim();

	return !r;
};
/**
 * @description 分析or， ","分隔， ")"结束
 * @example
 */
const parseOr = (pattern: any, flags: Json): boolean => {
	let rr = false;
	// tslint:disable-next-line:no-constant-condition
	while (true) {
		const r = parseMatch(pattern, flags);
		const s = pattern.str;
		if (s.charCodeAt(0) === 44) { // ","
			pattern.str = s.slice(1).trim();
		} else if (s.charCodeAt(0) === 41) { // ")"
			pattern.str = s.slice(1).trim();

			return rr || r;
		} else {
			throw new Error('parse error, invalid pattern:' + pattern.str);
		}
		rr = rr || r;
	}
};
/**
 * @description 分析and， ","分隔， ")"结束
 * @example
 */
const parseAnd = (pattern: any, flags: Json): boolean => {
	let rr = true;
	// tslint:disable-next-line:no-constant-condition
	while (true) {
		const r = parseMatch(pattern, flags);
		const s = pattern.str;
		if (s.charCodeAt(0) === 44) { // ","
			pattern.str = s.slice(1).trim();
		} else if (s.charCodeAt(0) === 41) { // ")"
			pattern.str = s.slice(1).trim();

			return rr && r;
		} else {
			throw new Error('parse error, invalid pattern:' + pattern.str);
		}
		rr = rr && r;
	}
};
/**
 * @description 分析变量， 判断 = != 3种情况
 * @example
 */
const parseEqual = (pattern: any, flags: Json): boolean => {
	const v1 = parseValue(pattern, flags);
	const s = pattern.str;
	if (s.charCodeAt(0) === 41) { // ")"
		return v1 !== false && v1 !== undefined;
	}
	if (s.charCodeAt(0) === 44) { // ","
		return v1 !== false && v1 !== undefined;
	}
	if (s.charCodeAt(0) === 61) { // "="
		pattern.str = s.slice(1).trim();
		const v2 = parseValue(pattern, flags);

		return v1 === v2;
	}
	if (s.charCodeAt(0) === 33 && s.charCodeAt(1) === 61) {// "!="
		pattern.str = s.slice(2).trim();
		const v2 = parseValue(pattern, flags);

		return v1 !== v2;
	}
	throw new Error('parse error, invalid pattern:' + pattern.str);
};

/**
 * @description 分析值，要么是变量，要么是字面量
 * @example
 */
const parseValue = (pattern: any, flags: Json): any => {
	const s = pattern.str;
	if (s.charCodeAt(0) === 36) { // "$"
		const arr = var_reg.exec(s);
		if (!arr) {
			throw new Error('parse error, invalid pattern:' + pattern.str);
		}
		pattern.str = s.slice(arr[0].length);

		return getValue(flags, arr[1]);
	}
	let arr = str_reg.exec(s);
	if (arr) {
		pattern.str = s.slice(arr[0].length);

		return arr[1];
	}
	arr = number_reg.exec(s);
	if (!arr) {
		throw new Error('parse error, invalid pattern:' + pattern.str);
	}
	pattern.str = s.slice(arr[0].length);

	return parseFloat(arr[1]);
};

// ============================== 立即执行
