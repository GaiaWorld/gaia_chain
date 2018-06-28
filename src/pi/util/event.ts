/*
 * 事件广播模块
 */

// ============================== 导入
import { commonjs } from '../lang/mod';
import { now as timeNow } from '../lang/time';
import { Func } from '../lang/type';
import { debug, LogLevel, logLevel, warn } from './log';
import { arrInsert, arrRemove, call, objCall } from './util';

// ============================== 导出
export let level = commonjs.debug ? logLevel : LogLevel.info;
// 3毫秒以上的事件会打印
const timeout = 3;

/**
 * @description 处理器返回值
 */
export enum HandlerResult {
	OK = 0, // ok
	REMOVE_SELF, // 从处理器列表删除自身，以后不会收到事件
	BREAK_OK, // 结束此次事件调用，不继续调用处理器
	BREAK_REMOVE_SELF // 结束此次事件调用，不继续调用处理器，从处理器列表删除自身，以后不会收到事件
}

export type Handler = (e: any) => HandlerResult;

export interface HandlerList {
	(e: any): HandlerResult;
	size(): number;
	add(h: Handler): void;
	remove(h: Handler): boolean;
	clear(): void;
}

/**
 * 创建事件处理器列表
 * @example
 */
export const createHandlerList = (): Handler => {
	const list = (args): HandlerResult => {
		let i;
		let handler: Handler;
		let r;
		let delIndex = -1;
		const arr = (<any>list).array;
		const n = arr.length;
		(<any>list).handling++;
		for (i = n - 1; i >= 0; i--) {
			handler = arr[i];
			if (handler) {
				r = call1(handler, args);
				if (!r) {
					continue;
				} else if (r === HandlerResult.REMOVE_SELF) {
					arr[i] = null;
					delIndex = i;
				} else if (r === HandlerResult.BREAK_OK) {
					break;
				} else if (r === HandlerResult.BREAK_REMOVE_SELF) {
					arr[i] = null;
					delIndex = i;
					break;
				}
			} else {
				delIndex = i;
			}
		}
		(<any>list).handling--;
		if (delIndex >= 0 && !(<any>list).handling) {
			for (i = delIndex + 1; i < n; ++i) {
				handler = arr[i];
				if (handler) {
					arr[delIndex] = handler;
					++delIndex;
				}
			}
			(<any>list).count = delIndex;
			arr.length = delIndex;
		}

		return r || HandlerResult.BREAK_OK;
	};
	(<any>list).handling = 0;
	(<any>list).count = 0;
	(<any>list).array = [];
	(<any>list).__proto__ = HandlerArray.prototype;

	return list;
};

/**
 * 创建事件处理器表
 * @example
 */
export class HandlerMap {

	/**
	 * 事件处理器映射表
	 */
	public map: Map<string, HandlerList> = new Map();
	/**
	 * 事件通知
	 */
	// tslint:disable:no-reserved-keywords
	public notify(type: string, args: any[]): boolean {
		const list = this.map.get(type);
		if (!list) {
			return false;
		}
		list(args);

		return true;
	}
	/**
	 * 获得事件处理器表的长度
	 */
	public size(type: string): number {
		let list;
		let n = 0;
		for (list of this.map.values()) {
			n += list.size();
		}

		return n;
	}
	/**
	 * 添加事件处理器
	 */
	public add(type: string, h: Handler): void {
		let list: any;
		const map = this.map;
		if (!(h && type)) {
			return;
		}
		list = map.get(type);
		if (!list) {
			list = createHandlerList();
			map.set(type, list);
		}
		list.add(h);
	}
	/**
	 * 删除事件处理器
	 */
	public remove(type: string, h: Handler): boolean {
		let list;
		const map = this.map;
		if (!h) {
			if (!type) {
				return false;
			}

			return map.delete(type);
		}
		if (!type) {
			for (list of this.map.values()) {
				if (!list.remove(h)) {
					continue;
				}
				if (list.size() === 0) {
					map.delete(type);

					return true;
				}
			}

			return false;
		}
		list = map.get(type);
		if (!list) {
			return false;
		}
		if (!list.remove(h)) {
			return false;
		}
		if (list.size() === 0) {
			map.delete(type);
		}

		return true;
	}
	/**
	 * 删除事件处理器
	 */
	public clear(): void {
		this.map.clear();
	}
}

/**
 * 事件处理器表
 * @example
 */
export class HandlerTable {
	// 必须要赋初值，不然new出来的实例里面是没有这些属性的
	public handlerMap: HandlerMap = null; // 事件处理器表
	/**
	 * @description 通知组件上的事件监听器
	 * @example
	 */
	public notify(eventType: string, args: any[]): boolean {
		if (this[eventType]) {
			return objCall1(this, eventType, args);
		}
		const map = this.handlerMap;
		if (!map) {
			return;
		}
		const r = map.notify(eventType, args);
		if (r) {
			return r;
		}

		return map.notify('*', args);
	}
	/**
	 * 添加事件处理器
	 */
	public addHandler(type: string, h: Handler): void {
		let map = this.handlerMap;
		if (!map) {
			map = this.handlerMap = new HandlerMap();
		}
		map.add(type, h);
	}
	/**
	 * 删除事件处理器
	 */
	public removeHandler(type: string, h: Handler): boolean {
		return this.handlerMap && this.handlerMap.remove(type, h);
	}
	/**
	 * 删除事件处理器
	 */
	public clearHandler(): void {
		return this.handlerMap && this.handlerMap.clear();
	}
}

/**
 * 创建事件监听器表
 * @example
 */
export class ListenerList<T> {
	public list: Func<T>[] = [];

	/**
	 * @description 通知列表上的每个事件监听器
	 * @example
	 */
	public notify(arg: T) {
		const r = this.list;
		for (const f of r) {
			f(arg);
		}
	}
	/**
	 * 获取事件监听器列表的长度
	 */
	public size(): number {
		return this.list.length;
	}
	/**
	 * 添加事件监听器
	 */
	public add(f: Func<T>): void {
		this.list = arrInsert(this.list, f);
	}
	/**
	 * 删除事件监听器
	 */
	public remove(f: Func<T>): boolean {
		const old = this.list;
		const r = arrRemove(this.list, f);
		const b = r === old;
		this.list = r;

		return b;
	}
	/**
	 * 清空事件监听器列表
	 */
	public clear(): void {
		this.list = [];
	}
}

// ============================== 本地
// 函数调用
const call1 = (func: Function, args: any[]) => {
	let r;
	const start = timeNow();
	try {
		r = call(func, args);
	} catch (ex) {
		return warn(level, 'event, ex: ', ex, ', func: ', func, args);
	}
	const end = timeNow();
	if (end - start > timeout) {
		level <= LogLevel.debug && debug(level, `event slow, cost: ${end - start}`, func, args);
	}

	return r;
};
// 对象方法调用
const objCall1 = (obj: any, func: string, args: any[]) => {
	let r;
	const start = timeNow();
	try {
		r = objCall(obj, func, args);
	} catch (ex) {
		return warn(level, 'event, ex: ', ex, ', func: ', obj, func, args);
	}
	const end = timeNow();
	if (end - start > timeout) {
		level <= LogLevel.debug && debug(level, `event slow, cost: ${end - start}`, obj, func, args);
	}

	return r;
};

// TODO 以后改成树结构-并且是写时复制的，就可以任意重入。而且删除效率高。js对象不能直接比较大小，可以转成字符串后的hash来比较大小。如果是乱序执行，则只需要1个树。如果是按照放入的顺序执行，则需要2个树。sbtree或fingertree
// tslint:disable:max-classes-per-file
class HandlerArray {
	public handling: number = 0;
	public count: number = 0;
	public array: Handler[] = [];
	/**
	 * 获得事件处理器列表的长度
	 */
	public size() {
		return this.count;
	}
	/**
	 * 添加事件处理器
	 */
	public add(handler: Handler) {
		this.array.push(handler);
		this.count += 1;
	}
	/**
	 * 删除事件处理器
	 */
	public remove(handler: Handler) {
		let i;
		const arr = this.array;
		for (i = arr.length - 1; i >= 0; --i) {
			if (arr[i] === handler) {
				arr[i] = null;
				this.count -= 1;

				return true;
			}
		}

		return false;
	}
	/**
	 * 清理事件处理器
	 */
	public clear() {
		this.array = [];
		this.count = 0;
	}
}
