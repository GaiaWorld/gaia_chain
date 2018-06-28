// tslint:disable:no-reserved-keywords only-arrow-functions
declare function require(modName: string);
declare function postMessage(e: any, ab?: ArrayBuffer[]);

// ============================== 导入
// ============================== 导出
/**
 * 组名 线程编号
 */
export let name: string = '';

/**
 * 消息接收函数，接受任务事件
 * @example
 */
export const onmessage = (e: any): void => {
	const data = e.data;
	const r = exec(data.mod, data.func, data.args, data.sendResult);
	if (r.ok !== undefined && r.ok instanceof ArrayBuffer) {
		postMessage(r, [r.ok]);
	} else {
		postMessage(r);
	}
};
/**
 * @description 函数调用
 * @example
 */
export const call = (func: Function, args: any[]) => {
	if (Array.isArray(args)) {
		switch (args.length) {
			case 0:
				return func();
			case 1:
				return func(args[0]);
			case 2:
				return func(args[0], args[1]);
			case 3:
				return func(args[0], args[1], args[2]);
			case 4:
				return func(args[0], args[1], args[2], args[3]);
			case 5:
				return func(args[0], args[1], args[2], args[3], args[4]);
			case 6:
				return func(args[0], args[1], args[2], args[3], args[4], args[5]);
			case 7:
				return func(args[0], args[1], args[2], args[3], args[4], args[5], args[6]);
			case 8:
				return func(args[0], args[1], args[2], args[3], args[4], args[5], args[6], args[7]);
			default:
				func.apply(undefined, args);
		}
	} else {
		return func(args);
	}
};

// ============================== 本地
// 任务执行
const exec = (modName: string, funcName: string, args: any[], sendResult: boolean): any => {
	let mod;
	try {
		// tslint:disable:non-literal-require
		mod = require(modName);
	} catch (ex) {
		return {
			error: 'ERR_ARGS',
			// tslint:disable:prefer-template
			reason: 'server worker, mod not found, name: ' + modName + '.' + funcName
		};
	}
	const func = mod[funcName];
	if (!func) {
		return {
			error: 'ERR_ARGS',
			reason: 'server worker, func not found, name: ' + modName + '.' + funcName
		};
	}
	try {
		const r = call(func, args);
		
		return (sendResult) ? { ok: r } : 0;
	} catch (ex) {
		return {
			error: 'ERR_NORMAL',
			stack: ex.stack,
			reason: 'server worker, func error! name: ' + modName + '.' + funcName + ', ' + ex.msg
		};
	}
};
