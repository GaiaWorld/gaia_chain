/** 
 * 日志模块
 */

// ============================== 导出
export enum LogLevel {
	debug,
	info,
	warn,
	err,
	none
}

export let logLevel = LogLevel.debug;

export const setBroadcast = (b: Function) => {
	broadcast = b;
};

export const debug = (level, msg, args1?, args2?, args3?, args4?, args5?, args6?, args7?, args8?, args9?): void => {
	log(level, msg, args1, args2, args3, args4, args5, args6, args7, args8, args9);
};

export const info = (level, msg, args1?, args2?, args3?, args4?, args5?, args6?, args7?, args8?, args9?): void => {
	if (level <= LogLevel.info) {
		log(level, msg, args1, args2, args3, args4, args5, args6, args7, args8, args9);
	}
};

export const warn = (level, msg, args1?, args2?, args3?, args4?, args5?, args6?, args7?, args8?, args9?): void => {
	if (level <= LogLevel.warn) {
		log(level, msg, args1, args2, args3, args4, args5, args6, args7, args8, args9);
	}
};

export const err = (level, msg, args1?, args2?, args3?, args4?, args5?, args6?, args7?, args8?, args9?): void => {
	if (level <= LogLevel.err) {
		log(level, msg, args1, args2, args3, args4, args5, args6, args7, args8, args9);
	}
};

// ============================== 本地
let broadcast: Function;

const log = (level, msg, args1, args2, args3, args4, args5, args6, args7, args8, args9): void => {
	if (broadcast) {
		broadcast(level, msg, args1, args2, args3, args4, args5, args6, args7, args8, args9);
	}
	if (!console) {
		return;
	}
	const now = Date.now();
	if (args9 !== undefined) {
		// tslint:disable:prefer-template
		console.log(now / 1000 + ' ' + msg, args1, args2, args3, args4, args5, args6, args7, args8, args9);
	} else if (args8 !== undefined) {
		console.log(now / 1000 + ' ' + msg, args1, args2, args3, args4, args5, args6, args7, args8);
	} else if (args7 !== undefined) {
		console.log(now / 1000 + ' ' + msg, args1, args2, args3, args4, args5, args6, args7);
	} else if (args6 !== undefined) {
		console.log(now / 1000 + ' ' + msg, args1, args2, args3, args4, args5, args6);
	} else if (args5 !== undefined) {
		console.log(now / 1000 + ' ' + msg, args1, args2, args3, args4, args5);
	} else if (args4 !== undefined) {
		console.log(now / 1000 + ' ' + msg, args1, args2, args3, args4);
	} else if (args3 !== undefined) {
		console.log(now / 1000 + ' ' + msg, args1, args2, args3);
	} else if (args2 !== undefined) {
		console.log(now / 1000 + ' ' + msg, args1, args2);
	} else if (args1 !== undefined) {
		console.log(now / 1000 + ' ' + msg, args1);
	} else {
		console.log(now / 1000 + ' ' + msg);
	}

};
