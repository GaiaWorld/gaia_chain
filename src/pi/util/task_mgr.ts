/**
 * 负责管理所有的任务（函数、参数、优先级、任务），根据系统负荷调度执行。所有的复杂计算操作，都应该作为任务调度执行。
 * 主要的事件（网络、加载、UI操作等）的响应代码都应该短小、快速。如果有复杂操作，则应该作为任务执行。如果有DOM操作，则应该调度到帧循环中执行。
 * 可以根据当前的CPU使用率和下一帧的时间，来调度执行任务。
 */

// ============================== 导入

import { commonjs } from '../lang/mod';
import { now as timeNow } from '../lang/time';
import { getGlobal } from '../widget/frame_mgr';
import { debug, LogLevel, logLevel, warn } from './log';
import { TaskPool, TaskType, temp } from './task_pool';
import { call } from './util';

// ============================== 导出
export let level = commonjs.debug ? logLevel : LogLevel.info;

/**
 * @description 定时器引用
 * @example
 */
export interface TimerRef {
	ref: number; // 实际定时器引用
	count: number;
}

/**
 * 定时器：每隔ms毫秒就调用一次callback, 可以设置count计数来控制最多调用的次数
 * @param callback    回调函数, 参数的最后一位为TimerRef
 * @param args    回调函数的参数
 * @param  ms    设置的时间间隔，单位：毫秒
 * @param  count    最多调用的次数, 0则不限次数, 默认为0
 * @param  delay    初始延迟时间，0表示为设置的时间间隔, 默认为0, 单位：毫秒
 * @return    定时器的引用
 */
export const setTimer = (callback: Function, args: any[], ms: number, count?: number, delay?: number): TimerRef => {
	count = count || -1;
	const r = { ref: 0, count: count };
	let a: any[];
	if (Array.isArray(args)) {
		a = args.slice(0);
		a.push(r);
	} else if (args) {
		a = [args, r];
	} else {
		a = [r];
	}
	const fun = () => {
		r.count--;
		callTime(callback, a, 'timer');
		if (r.ref && r.count !== 0) {
			r.ref = setTimeout(fun, ms);
		} else {
			r.ref = 0;
		}
	};
	r.ref = setTimeout(fun, delay || ms);

	return r;
};

/**
 * 取消定时器
 * @param r 定时器的引用
 */
export const clearTimer = (r: TimerRef): void => {
	if (r && r.ref) {
		clearTimeout(r.ref);
		r.ref = undefined;
	}
};

/**
 * @description 设置任务，任务的调用函数和参数（参数必须为数组），任务的优先级和类型（异步0，同步顺序1，同步立即2）
 * @example
 */
// tslint:disable:no-reserved-keywords
export const set = (func: Function, args: any[], priority: number, type: TaskType) => {
	if (func) {
		taskPool.push(func, args, priority, type);
		if (taskPool.size() === 1) {
			requestIdle(exec);
		}
	}
};

/**
 * @description 清除指定的优先级和类型的任务
 * @example
 */
export const clear = (priority: number, type: TaskType): number => {
	return taskPool.clear(priority, type);
};

/**
 * @description 清除指定的优先级和类型的任务
 * @example
 */
export const getPrioritySize = (priority: number, type: TaskType): number => {
	return taskPool.getPrioritySize(priority, type);
};

// 函数调用计时
export const callTime = (func: Function, args: any[], name: string, start?: number) => {
	start = start || timeNow();
	try {
		call(func, args);
	} catch (ex) {
		warn(level, name, ', ex: ', ex, ', func: ', func, args);
	}
	const end = timeNow();
	if (end - start > logTimeout) {
		level <= LogLevel.debug && debug(level, name, ' slow, cost: ', (end - start), func, args);
	}

	return end;
};
// ============================== 本地
// 3毫秒以上的定时器任务或队列任务会打印
const logTimeout = 3;

// 离渲染开始4毫秒以上的任务，会延迟到下一帧
const frameTimeout = 4;

// 任务池
const taskPool = new TaskPool();

// 帧回调是否可用
let intervalWaitRef;

// 任务执行函数
const exec = () => {
	const frame = getGlobal();
	let nextTime = frame.getNextTime() - frameTimeout;
	let start = timeNow();
	if (nextTime < start) {
		nextTime = start + 1;
	}
	while ((nextTime > start) && taskPool.pop(temp)) {
		start = callTime(temp.func, temp.args, 'task', start);
	}
	if (taskPool.size() > 0) {
		// 防止在没有帧推的情况下，多次加入回调函数
		if (!intervalWaitRef) {
			frame.setAfter(frameExec);
		}
		intervalWaitRef = setTimeout(exec, frame.getInterval());
	}
};

// 渲染完成时尽快开始任务执行
const frameExec = () => {
	clearTimeout(intervalWaitRef);
	intervalWaitRef = undefined;
	requestIdle(exec);
};

// ============================== 立即执行
// requestIdleCallback 是新API（Chrome 47 已支持），当浏览器空闲的时候，用来执行不太重要的后台计划任务。但是，如果css动画很繁重，会造成一直没有空闲，所以不能使用该方法！
// tslint:disable-next-line:only-arrow-functions no-function-expression typedef
const requestIdle = (<any>self).requestIdleCallback1 || function (callback) { setTimeout(callback, 1); };

const cancelIdle = (<any>self).cancelIdleCallback1 || clearTimeout;
