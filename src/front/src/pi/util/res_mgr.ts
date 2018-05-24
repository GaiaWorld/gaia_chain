/**
 * 负责创建、销毁BlobURL，负责维护资源的缓存和引用计数
 * 异步加载二进制数据，同步创建BlobURL，异步加载资源（图像、字体……）
 */

// ============================== 导入
import { butil, commonjs, depend, load } from '../lang/mod';
import { now } from '../lang/time';

// ============================== 导出
/**
 * @description blob的资源类型
 * @example
 */
export const RES_TYPE_BLOB = 'blob';
export const RES_TYPE_FILE = 'file';
/**
 * @description 资源
 * @example
 */
export class Res {
	// 必须要赋初值，不然new出来的实例里面是没有这些属性的
	// 名称
	public name: string = '';
	// 类型
	// tslint:disable:no-reserved-keywords
	public type: string = '';
	// 参数
	public args: any = null;
	// 引用数
	public count: number = 0;
	// 超时时间
	public timeout: number = 0;
	// 链接
	public link: any = null;

	/**
	 * @description 创建, 参数为源数据 可以是二进制数据，也可以是其他
	 * @example
	 */
	public create(data: any): void {
		this.link = data;
	}
	/**
	 * @description 使用
	 * @example
	 */
	public use(): void {
		this.count++;
	}
	/**
	 * @description 不使用
	 * @example
	 */
	public unuse(timeout: number, nowTime: number): void {
		this.count--;
		if (timeout > this.timeout) {
			this.timeout = timeout;
		}
		this.release(nowTime);
	}
	/**
	 * @description 释放
	 * @example
	 */
	public release(nowTime: number): void {
		if (this.count > 0) {
			return;
		}
		if (nowTime < this.timeout) {
			timeoutRelease(this, nowTime, this.timeout);
		} else {
			resMap.delete(this.name);
			this.destroy();
		}
	}
	/**
	 * @description 销毁，需要子类重载
	 * @example
	 */
	// tslint:disable:no-empty
	public destroy(): void {

	}
}

/**
 * @description 资源表，用于管理一个场景下所有的资源。需要手工释放。资源表内的资源，只会在资源上增加1个引用计数，释放后减少1个引用计数。
 * @example
 */
export class ResTab {
	// 必须要赋初值，不然new出来的实例里面是没有这些属性的
	// 本地表，为空表示资源表已经被释放
	public tab: Map<string, Res> = new Map();
	// 超时时间
	public timeout: number = 0;

	/**
	 * @description 获取当前资源的数量
	 * @example
	 */
	public size(): number {
		return this.tab ? this.tab.size : -1;
	}	
	/**
	 * @description 是否已释放
	 */
	public isReleased(): boolean {
		return !this.tab;
	}
	/**
	 * @description 获取资源
	 * @example
	 */
	public get(name: string): Res {
		const tab = this.tab;
		if (!tab) {
			return;
		}
		let r = tab.get(name);
		if (r) {
			return r;
		}
		r = resMap.get(name);
		if (!r) {
			return;
		}
		r.use();
		tab.set(name, r);

		return r;
	}
	/**
	 * @description 加载资源
	 * @example
	 */
	public load(name: string, type: string, args: any, funcArgs: any, successCallback?: Function, errorCallback?: Function): any {
		const r = this.get(name);
		successCallback = successCallback || empty;
		errorCallback = errorCallback || empty;
		if (r) {
			return successCallback(r);
		}
		const create = typeMap.get(type);
		if (!create) {
			return false;
		}
		const cb = (r) => {
			const tab = this.tab;
			if (tab && !tab.has(name)) {
				r.use();
				tab.set(r.name, r);
			}
			successCallback(r);
		};
		const wait = waitMap.get(name);
		if (wait) {
			return wait.push(cb, errorCallback);
		}
		waitMap.set(name, [cb, errorCallback]);
		create(name, type, args, funcArgs);
	}
	/**
	 * @description 创建资源
	 * @example
	 */
	public createRes(name: string, type: string, args: any, construct: any, data: any): Res {
		const tab = this.tab;
		if (!tab) {
			return;
		}
		const r = loadOK(name, type, args, construct, data);
		r.use();
		tab.set(r.name, r);

		return r;
	}
	/**
	 * @description 释放资源
	 * @example
	 */
	public delete(res: Res, timeout?: number): boolean {
		const tab = this.tab;
		if (!tab) {
			return false;
		}
		const b = tab.delete(res.name);
		if (b) {
			const time = now();
			res.unuse(time + (timeout || this.timeout), time);
		}

		return b;
	}
	/**
	 * @description 清除全部资源
	 * @example
	 */
	public clear(): void {
		const tab = this.tab;
		if (!tab) {
			return;
		}
		const time = now();
		const timeout = time + this.timeout;
		for (const res of tab.values()) {
			res.unuse(timeout, time);
		}
		tab.clear();
	}
	/**
	 * @description 释放资源表
	 * @example
	 */
	public release(): boolean {
		const tab = this.tab;
		if (!tab) {
			return false;
		}
		this.tab = null;
		const time = now();
		const timeout = time + this.timeout;
		for (const res of tab.values()) {
			res.unuse(timeout, time);
		}

		return true;
	}
}

/**
 * @description 后缀名对应的Blob类型
 * @example
 */
export const BlobType = {
	png: 'image/png',
	jpg: 'image/jpeg',
	jpeg: 'image/jpeg',
	webp: 'image/webp',
	gif: 'image/gif',
	svg: 'image/svg+xml',
	ttf: 'application/x-font-ttf',
	otf: 'application/x-font-opentype',
	woff: 'application/x-font-woff',
	woff2: 'application/x-font-woff2'
};

/**
 * @description 创建BlobURL
 * @example
 */
export const createURL = (data: ArrayBuffer, type: string): string => {
	const blob = new Blob([data], { type: type });

	return URL.createObjectURL(blob);
};
/**
 * @description 销毁BlobURL
 */
export const revokeURL = (url: string): void => {
	URL.revokeObjectURL(url);
};

/**
 * @description 注册资源类型对应的创建函数
 * @example
 */
export const register = (type: string, create: Function) => {
	typeMap.set(type, create);
};

/**
 * @description 等待成功
 * @example
 */
export const loadOK = (name: string, type: string, args: any, construct: any, data: any) => {
	let r = resMap.get(name);
	if (!r) {
		r = new construct();
		r.name = name;
		r.type = type;
		r.args = args;
		r.create(data);
		resMap.set(r.name, r);
		const t = now();
		timeoutRelease(r, t, t + defalutTimeout);
	}
	const arr = waitMap.get(name);
	if (!arr) {
		return r;
	}
	waitMap.delete(name);
	for (let i = arr.length - 2; i >= 0; i -= 2) {
		arr[i](r);
	}

	return r;
};
/**
 * @description 等待失败
 * @example
 */
export const loadError = (name: string, err: any) => {
	const arr = waitMap.get(name);
	if (!arr) {
		return;
	}
	waitMap.delete(name);
	for (let i = arr.length - 1; i >= 0; i -= 2) {
		arr[i](err);
	}
};

/**
 * @description 获得资源主表
 * @example
 */
export const getResMap = () => {
	return resMap;
};

/**
 * @description 创建ArrayBuffer资源
 * @example
 */
const createABRes = (name: string, type: string, file: string, fileMap: Map<string, ArrayBuffer>, construct: Function): void => {
	file = getTransWebpName(file);
	if (fileMap) {
		const data = fileMap[file];
		if (data) {
			loadOK(name, type, file, construct, data);

			return;
		}
	}
	const info = depend.get(file);
	if (!info) {
		return loadError(name, {
			error: 'FILE_NOT_FOUND',
			reason: `createBlobURLRes fail: ${file}`			
		});
	}
	const down = load.create([info], (r) => {
		loadOK(name, type, file, construct, r[file]);
	}, (err) => {
		loadError(name, err);
	});
	load.start(down);
};
/**
 * @description 获取 png jpg jpeg 自动转换成同名的webp, webp必须在depend中存在
 * @example
 */
export const getTransWebpName = (name: string): string => {
	if (!(commonjs.flags.webp && commonjs.flags.webp.alpha)) {
		return name;
	}
	const suf = butil.fileSuffix(name);
	if (!(suf === 'png' || suf === 'jpg' || suf === 'jpeg')) {
		return name;
	}
	const s = `${name.slice(0, name.length - suf.length)}webp`;	
	const i = s.indexOf(':');

	return depend.get(i < 0 ? s : s.slice(i + 1)) ? s : name;
};

// ============================== 本地
// 资源类型对应的构造函数表
const typeMap: Map<string, Function> = new Map();
// 全局资源
const resMap: Map<string, Res> = new Map();
// 全局等待表
const waitMap: Map<string, Function[]> = new Map();
// 空函数
// tslint:disable-next-line:only-arrow-functions no-function-expression
const empty = function () { };
// 定时的时间
const defalutTimeout = 1000;
// 最小释放的时间
const minReleaseTimeout = 500;

// 等待释放的资源数组
let releaseArray = [];
// 回收方法的定时器的引用
let timerRef = 0;
// 定时的时间
let timerTime = Number.MAX_SAFE_INTEGER;

/**
 * @description BlobURL资源
 * @example
 */
class BlobURLRes extends Res {
	/**
	 * @description 创建
	 * @example
	 */
	public create(data: any): void {
		const type = butil.fileSuffix(this.args);
		const blob = new Blob([data], { type: BlobType[type] });
		this.link = URL.createObjectURL(blob);
	}
	/**
	 * @description 销毁，需要子类重载
	 * @example
	 */
	public destroy(): void {
		URL.revokeObjectURL(this.link);
	}
}

/**
 * @description 回收超时的资源
 * @example
 */
const collect = (): void => {
	const time = now();
	const arr = releaseArray;
	releaseArray = [];
	timerRef = 0;
	timerTime = Number.MAX_SAFE_INTEGER;
	for (const res of arr) {
		res.release(time);
	}
};

/**
 * @description 超时释放, 最小500ms
 * @example
 */
const timeoutRelease = (res: Res, nowTime: number, releaseTime: number): void => {
	releaseArray.push(res);
	if (timerTime <= releaseTime + minReleaseTimeout) {
		return;
	}
	if (timerRef) {
		clearTimeout(timerRef);
	}
	timerTime = (releaseTime > nowTime + minReleaseTimeout) ? releaseTime : nowTime + minReleaseTimeout;
	timerRef = setTimeout(collect, timerTime - nowTime);
};

// ============================== 立即执行
register(RES_TYPE_BLOB, (name: string, type: string, args: string, fileMap: Map<string, ArrayBuffer>) => {
	createABRes(name, type, args, fileMap, BlobURLRes);
});
register(RES_TYPE_FILE, (name: string, type: string, args: string, fileMap: Map<string, ArrayBuffer>) => {
	createABRes(name, type, args, fileMap, Res);
});
