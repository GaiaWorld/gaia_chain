// tslint:disable:no-reserved-keywords
declare var module: any;
/**
 * 该模块提供任务组，每组提供基于任务优先级的调度。优先级高的任务获得更高概率执行，相同优先级的按时间顺序执行。
 * 初始化任务组时，必须提供全部的模块代码的二进制数据。
 * 如果该组并发线程数大于1，不保证任务执行的次序性，但保证任务返回的次序是顺序的。
 * 任务执行的调用为： send(任务组的名称，模块名称，函数名称，参数，传送数据数组，任务优先级，任务类型，成功回调函数，失败回调函数)。
 */

// ============================== 导入

import { butil, commonjs, depend, load, Mod } from '../lang/mod';
import { logLevel, warn } from '../util/log';
import { TaskPool, TaskType, temp } from '../util/task_pool';
import * as server from './server';

// ============================== 导出
export let level = logLevel;

/**
 * @description 创建任务组
 * @example
 */
export const create = (groupName: string, workerCount: number, modNames: string[], fileMap: any) => {
	let group = groupMap.get(groupName);
	if (group) {
		throw new Error(`group is created, name:${groupName}`);
	}
	group = { name: groupName, taskPool: new TaskPool(), wait: [], workerCount: workerCount, count: 0 };
	groupMap.set(groupName, group);
	const initName = butil.relativePath('./init.wjs', module.id);
	const initData = fileMap[initName];
	const fileList = initData ? [] : [depend.get(initName)];
	const serverName = butil.relativePath('./server', module.id);
	const mods = commonjs.depend([serverName].concat(modNames));
	const map = {};
	for (const m of mods) {
		const path = m.info.path;
		map[path] = fileMap[path];
		if (!map[path]) {
			fileList.push(m.info);
		}
	}
	if (fileList.length === 0) {
		return createNext(group, initData, mods, map);
	}
	const down = load.create(fileList, (r) => {
		createNext(group, initData || r[initName], mods, map);
	}, (e) => {
		warn(level, 'create worker group fail, ', e);
	});
	down.fileTab = map;
	load.start(down);
};

/**
 * @description 请求，任务组的名称，模块名称，函数名称，参数，传送数据数组，任务优先级，任务类型（异步0，同步顺序1，同步立即2），成功回调函数，失败回调函数
 * @example
 */
export const request = (groupName: string, mod: string, func: string, args: any[],
	transferrable: ArrayBuffer[], priority: number, type: TaskType, successCallback?: Function, errorCallback?: Function) => {
	const group = groupMap.get(groupName);
	if (!group) {
		throw new Error(`group not found, name:${groupName}`);
	}
	const e = { mod: mod, func: func, args: args, sendResult: !!successCallback };
	group.taskPool.push(e, [successCallback || empty, errorCallback || empty, transferrable], priority, type);
	exec(group);
};

// ============================== 本地
// 任务组
interface Group {
	name: string;
	taskPool: TaskPool;
	wait: Worker[];
	workerCount: number;
	count: number;
}

// 任务组表
const groupMap: Map<string, Group> = new Map();
// 空函数
// tslint:disable-next-line:no-empty
const empty = () => { };

// 创建任务组
const createNext = (group: Group, initData: ArrayBuffer, mods: any[], fileMap: any) => {
	let blob = new Blob([initData], { type: 'text/javascript' });
	const cfg = { url: URL.createObjectURL(blob), mods: mods, count: group.workerCount };
	for (let i = mods.length - 1; i >= 0; i--) {
		const m = mods[i];
		blob = new Blob([fileMap[m.info.path]], { type: 'text/javascript' });
		mods[i] = {
			id: m.id,
			exports: {},
			loaded: false,
			info: m.info,
			children: m.children,
			url: URL.createObjectURL(blob)
		};
	}
	for (let i = group.workerCount; i > 0; i--) {
		initWorker(group, cfg);
	}
};
// 初始化任务组的线程
const initWorker = (group: Group, cfg: any) => {
	const worker = new Worker(cfg.url);
	// tslint:disable:prefer-template
	const name = group.name + ':' + group.count++;
	(<any>worker).name = name;
	worker.postMessage({ name: name, mods: cfg.mods });
	worker.onerror = (e: any) => {
		warn(level, name + ' exec fail, msg:', e.message, 'lineno:', e.lineno);
	};
	worker.onmessage = (e: any) => {
		cfg.count--;
		if (cfg.count <= 0) {
			URL.revokeObjectURL(cfg.url);
			for (const m of cfg.mods) {
				URL.revokeObjectURL(m.url);
			}
		}
		const data = e.data;
		if (data.error) {
			return warn(level, data);
		}
		group.wait.push(worker);
		exec(group);
	};
};

// 消息接收函数
const onmessage = (e: any, group: Group, worker: Worker, args: Function[]) => {
	const data = e.data;
	if (group.taskPool.pop(temp)) {
		worker.onmessage = butil.curryFirst(onmessage, group, worker, temp.args);
		worker.postMessage(temp.func, temp.args[2]);
	} else {
		group.wait.push(worker);
	}
	if (data.error) {
		return args[1](data);
	}
	args[0](data.ok);
};
// 消息接收函数
const exec = (group: Group) => {
	let worker;
	const arr = group.wait;
	const len = arr.length - 1;
	if (len < 0) {
		return;
	}
	if (!group.taskPool.pop(temp)) {
		return;
	}
	worker = arr[len];
	arr.length = len;
	worker.onmessage = butil.curryFirst(onmessage, group, worker, temp.args);
	worker.postMessage(temp.func, temp.args[2]);
};

// ============================== 立即执行
