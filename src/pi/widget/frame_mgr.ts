/**
 * @description 全局渲染管理模块
 * @example 
 * 负责管理所有的渲染函数，每帧调用，计算fps。所有涉及到重布局(reflow)重绘(repaint)的操作（修改Dom结构，或者修改CSS相关属性。对于Canvas对象，执行某个操作，比如画一条线，也属于对Dom结构的改变）都应该放到渲染函数内执行。
 * RequestAnimaitonFrame会将JS产生的动画以及CSS产生的动画，放到同一个Reflow和Repaint的循环中。setTimeout并不能保证这一点。
 * 为了保证界面的流畅，操作的立即响应和显示出效果，可以不控制帧数。场景渲染可以单独控帧。
 * 可以根据即时帧率来判断当前的CPU使用率。
 */

// ============================== 导入

import { now as timeNow } from '../lang/time';
import { logLevel, warn } from '../util/log';
import { call } from '../util/util';

// ============================== 导出
export let level = logLevel;

/**
 * @description 设置全局渲染帧函数的回调函数
 * @example
 */
export const setInterval = (callback): number => {
	if (!callback) {
		return;
	}
	let start;
	// 计算真实的渲染消耗
	const timeout = () => {
		callback.realCostTime = timeNow() - start;
	};
	const request = () => {
		start = timeNow();
		callback();
		requestFrame(request);
		setTimeout(timeout, 0);
	};

	return requestFrame(request);
};
/**
 * @description 取消全局渲染帧函数
 * @example
 */
export const clearInterval = (ref: number) => {
	cancelFrame(ref);
};

/**
 * @description 创建帧管理器
 * @example
 */
// tslint:disable-next-line:max-func-body-length
export const create = () => {

	// 上次花费时间，本次帧时间，帧次数
	let frameCost = 0;
	let frameTime = 0;
	let frameCount = 0;
	// 默认的间隔时间
	let frameInterval = 16;
	// 下次调用时间
	let frameNext = 0;
	// 渲染标志，为true表示当前正在渲染
	let inRender = false;
	// 本次调用的列表
	let cur = [];
	// 下次调用的列表
	let next = [];
	// 单次调用前列表
	let before = [];
	// 单次调用前列表
	let before1 = [];
	// 永久调用列表
	let permanent: any[] = [];
	// 单次调用后列表
	let after = [];
	// 单次调用后列表
	let after1 = [];

	// 统计间隔 默认1s
	let statInterval = 1000;
	// 下次统计时间
	let statNext = 0;
	// 统计的回调函数
	let statCallback;
	// 当前统计 {时间跨度, 每间隔帧统计{帧次数, 累计花费时间, 最慢一帧所在帧次数, 最慢一帧花费时间}, 每间隔调用统计{调用次数, 累计花费时间, 最慢一帧所在帧次数, 最慢一帧花费时间, 最慢函数所在帧次数, 最慢函数花费时间, 最慢函数}}
	// tslint:disable:max-line-length
	const curStat = { time: 0, frame: { count: 0, cost: 0, slowIndex: 0, slowCost: 0 }, call: { count: 0, cost: 0, slowIndex: 0, slowCost: 0, slowFuncIndex: 0, slowFuncCost: 0, slowFunc: null } };
	// 上次统计
	const lastStat = { time: 0, frame: { count: 0, cost: 0, slowIndex: 0, slowCost: 0 }, call: { count: 0, cost: 0, slowIndex: 0, slowCost: 0, slowFuncIndex: 0, slowFuncCost: 0, slowFunc: null } };

	// 统计慢时间
	const statSlow = (stat, start, end) => {
		const cost = end - start;
		stat.count++;
		stat.cost += cost;
		if (cost > stat.slowCost) {
			stat.slowCost = cost;
			stat.slowIndex = frameCount;
		}

		return cost;
	};
	// 统计函数
	const statFunc = (stat, func, start, end) => {
		const cost = end - start;
		if (cost > stat.slowFuncCost) {
			stat.slowFuncCost = cost;
			stat.slowFuncIndex = frameCount;
			stat.slowFunc = func;
		}
	};
	// 统计切换
	const statChange = (now, curStat, lastStat) => {
		if (now < statNext) {
			return;
		}
		lastStat.time = now - curStat.time;
		curStat.time = now;

		lastStat.frame.count = curStat.frame.count;
		curStat.frame.count = 0;
		lastStat.frame.cost = curStat.frame.cost;
		curStat.frame.cost = 0;
		lastStat.frame.slowIndex = curStat.frame.slowIndex;
		lastStat.frame.slowCost = curStat.frame.slowCost;
		curStat.frame.slowCost = 0;

		lastStat.call.count = curStat.call.count;
		curStat.call.count = 0;
		lastStat.call.cost = curStat.call.cost;
		curStat.call.cost = 0;
		lastStat.call.slowIndex = curStat.call.slowIndex;
		lastStat.call.slowCost = curStat.call.slowCost;
		curStat.call.slowCost = 0;
		lastStat.frame.slowFuncIndex = curStat.frame.slowFuncIndex;
		lastStat.frame.slowFuncCost = curStat.frame.slowFuncCost;
		curStat.frame.slowFuncCost = 0;
		lastStat.frame.slowFunc = curStat.frame.slowFunc;
		statNext = now + statInterval;
	};
	// 帧函数
	let frame: any;

	frame = () => {
		const now = timeNow();
		inRender = true;
		statChange(now, curStat, lastStat);
		frameCount++;
		frameTime = now;
		let i;
		let func;
		let end;
		let start = now;
		const stat = curStat.call;
		let arr = cur;
		cur = next;
		next = arr;
		// 下次调用
		for (i = arr.length - 1; i > 0; i -= 2) {
			func = arr[i - 1];
			end = funCall(func, arr[i]);
			statFunc(stat, func, start, end);
			start = end;
		}
		arr.length = 0;
		if (now > frameNext) {
			// 一次性前调用
			arr = before;
			before = before1;
			before1 = arr;
			for (i = arr.length - 1; i > 0; i -= 2) {
				func = arr[i - 1];
				end = funCall(func, arr[i]);
				statFunc(stat, func, start, end);
				start = end;
			}
			arr.length = 0;
			// 永久调用
			arr = permanent;
			for (i = arr.length - 1; i > 0; i -= 2) {
				func = arr[i - 1];
				end = funCall(func, arr[i]);
				statFunc(stat, func, start, end);
				start = end;
			}
			arr = after;
			after = after1;
			after1 = arr;
			// 一次性后调用
			for (i = arr.length - 1; i > 0; i -= 2) {
				func = arr[i - 1];
				end = funCall(func, arr[i]);
				statFunc(stat, func, start, end);
				start = end;
			}
			arr.length = 0;
			frameNext = now >= frameNext + frameInterval ? now + 1 : frameNext + frameInterval;

			frameCost = statSlow(curStat.frame, now, end);
		}
		statSlow(stat, now, end);
		inRender = false;
		curStat.frame.count === 1 && statCallback && statCallback(lastStat);
	};

	/**
	 * @description 获得上次花费时间，可以用来计算即时帧率
	 * @example
	 */
	frame.getCost = () => {
		return frameCost;
	};
	/**
	 * @description 获得本次帧时间
	 * @example
	 */
	frame.getTime = () => {
		return frameTime;
	};
	/**
	 * @description 获得当前帧次数
	 * @example
	 */
	frame.getCount = () => {
		return frameCount;
	};
	/**
	 * @description 获得下次的调用时间
	 * @example
	 */
	frame.getNextTime = () => {
		return frameNext;
	};

	/**
	 * @description 获得帧间隔
	 * @example
	 */
	frame.getInterval = () => {
		return frameInterval;
	};
	/**
	 * @description 设置帧间隔
	 * @example
	 */
	frame.setInterval = (interval: number) => {
		frameInterval = interval;
	};
	/**
	 * @description 添加一个永久调用函数和参数（参数必须为数组）
	 * @example
	 */
	frame.setPermanent = (func: Function, args?: any[]) => {
		func && permanent.push(func, args);
	};
	/**
	 * @description 判断是否为一个永久调用函数
	 * @example
	 */
	frame.isPermanent = (func: Function) => {
		for (const index in permanent) {
			if (permanent[index] === func) {
				return true;
			}
		}

		return false;
	};
	/**
	 * @description 移除一个永久调用函数
	 * @example
	 */
	frame.clearPermanent = (func: Function) => {
		const i = permanent.indexOf(func);
		if (i >= 0) {
			permanent = permanent.slice();
			permanent.splice(i, 2);

			return true;
		}

		return false;
	};
	/**
	 * @description 添加一个一次性调用函数和参数（参数必须为数组）
	 * @example
	 */
	frame.setBefore = (func: Function, args?: any[]) => {
		func && before.push(func, args || []);
	};

	/**
	 * @description 添加一个一次性调用函数和参数（参数必须为数组）
	 * @example
	 */
	frame.setAfter = (func: Function, args?: any[]) => {
		func && after.push(func, args);
	};

	/**
	 * @description 添加一个一次性调用函数和参数（参数必须为数组）
	 * @example
	 */
	frame.setNext = (func: Function, args?: any[]) => {
		func && next.push(func, args);
	};

	/**
	 * @description 设置统计回调和统计间隔
	 * @example
	 */
	frame.setStat = (callback: Function, interval: number) => {
		statCallback = callback;
		statInterval = interval;
	};

	/**
	 * @description 获得当前的统计信息
	 * @example
	 */
	frame.getCurStat = () => {// json
		return curStat;
	};

	/**
	 * @description 获得最近的统计信息
	 * @example
	 */
	frame.getLastStat = () => {// json
		return lastStat;
	};

	return frame;
};

/**
 * @description 获取全局帧管理器
 * @example
 */
export const getGlobal = (): any => {
	if (!mgr) {
		mgr = create();
		setInterval(mgr);
	}

	return mgr;
};

/**
 * @description 清除全局帧管理器
 * @example
 */
export const clearGlobal = () => {
	if (mgr) {
		setInterval(mgr);
		mgr = null;
	}
};

const normalrRequestFrameImpl = (callback) => {

	return setTimeout(callback, ((1000 / 60) + 0.5) << 0);
};

// 获取raf函数，处理兼容性
const requestFrameImpl = window.requestAnimationFrame || (<any>window).mozRequestAnimationFrame || window.webkitRequestAnimationFrame || (<any>window).msRequestAnimationFrame || normalrRequestFrameImpl;
// tslint:disable:no-unnecessary-callback-wrapper
export const requestFrame = callBack => requestFrameImpl(callBack);

// 获取raf取消函数，处理兼容性
const cancelFrameImpl = window.cancelAnimationFrame || (<any>window).mozCancelAnimationFrame || window.webkitCancelAnimationFrame || (<any>window).msCancelAnimationFrame || clearTimeout;
export const cancelFrame = callBack => cancelFrameImpl(callBack);

// ============================== 本地
// 全局帧管理器
let mgr: any;

// 函数调用
const funCall = (func, args) => {
	try {
		call(func, args);
	} catch (ex) {
		warn(level, 'frame, ex: ', ex, ', func: ', func);
	}

	return timeNow();
};

// ============================== 立即执行