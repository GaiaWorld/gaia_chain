_$define("pi/util/task_mgr", function (require, exports, module){
"use strict";
/**
 * 负责管理所有的任务（函数、参数、优先级、任务），根据系统负荷调度执行。所有的复杂计算操作，都应该作为任务调度执行。
 * 主要的事件（网络、加载、UI操作等）的响应代码都应该短小、快速。如果有复杂操作，则应该作为任务执行。如果有DOM操作，则应该调度到帧循环中执行。
 * 可以根据当前的CPU使用率和下一帧的时间，来调度执行任务。
 */

Object.defineProperty(exports, "__esModule", { value: true });
// ============================== 导入
var mod_1 = require("../lang/mod");
var time_1 = require("../lang/time");
var frame_mgr_1 = require("../widget/frame_mgr");
var log_1 = require("./log");
var task_pool_1 = require("./task_pool");
var util_1 = require("./util");
// ============================== 导出
exports.level = mod_1.commonjs.debug ? log_1.logLevel : log_1.LogLevel.info;
/**
 * 定时器：每隔ms毫秒就调用一次callback, 可以设置count计数来控制最多调用的次数
 * @param callback    回调函数, 参数的最后一位为TimerRef
 * @param args    回调函数的参数
 * @param  ms    设置的时间间隔，单位：毫秒
 * @param  count    最多调用的次数, 0则不限次数, 默认为0
 * @param  delay    初始延迟时间，0表示为设置的时间间隔, 默认为0, 单位：毫秒
 * @return    定时器的引用
 */
exports.setTimer = function (callback, args, ms, count, delay) {
    count = count || -1;
    var r = { ref: 0, count: count };
    var a = void 0;
    if (Array.isArray(args)) {
        a = args.slice(0);
        a.push(r);
    } else if (args) {
        a = [args, r];
    } else {
        a = [r];
    }
    var fun = function fun() {
        r.count--;
        exports.callTime(callback, a, 'timer');
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
exports.clearTimer = function (r) {
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
exports.set = function (func, args, priority, type) {
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
exports.clear = function (priority, type) {
    return taskPool.clear(priority, type);
};
/**
 * @description 清除指定的优先级和类型的任务
 * @example
 */
exports.getPrioritySize = function (priority, type) {
    return taskPool.getPrioritySize(priority, type);
};
// 函数调用计时
exports.callTime = function (func, args, name, start) {
    start = start || time_1.now();
    try {
        util_1.call(func, args);
    } catch (ex) {
        log_1.warn(exports.level, name, ', ex: ', ex, ', func: ', func, args);
    }
    var end = time_1.now();
    if (end - start > logTimeout) {
        exports.level <= log_1.LogLevel.debug && log_1.debug(exports.level, name, ' slow, cost: ', end - start, func, args);
    }
    return end;
};
// ============================== 本地
// 3毫秒以上的定时器任务或队列任务会打印
var logTimeout = 3;
// 离渲染开始4毫秒以上的任务，会延迟到下一帧
var frameTimeout = 4;
// 任务池
var taskPool = new task_pool_1.TaskPool();
// 帧回调是否可用
var intervalWaitRef = void 0;
// 任务执行函数
var exec = function exec() {
    var frame = frame_mgr_1.getGlobal();
    var nextTime = frame.getNextTime() - frameTimeout;
    var start = time_1.now();
    if (nextTime < start) {
        nextTime = start + 1;
    }
    while (nextTime > start && taskPool.pop(task_pool_1.temp)) {
        start = exports.callTime(task_pool_1.temp.func, task_pool_1.temp.args, 'task', start);
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
var frameExec = function frameExec() {
    clearTimeout(intervalWaitRef);
    intervalWaitRef = undefined;
    requestIdle(exec);
};
// ============================== 立即执行
// requestIdleCallback 是新API（Chrome 47 已支持），当浏览器空闲的时候，用来执行不太重要的后台计划任务。但是，如果css动画很繁重，会造成一直没有空闲，所以不能使用该方法！
// tslint:disable-next-line:only-arrow-functions no-function-expression typedef
var requestIdle = self.requestIdleCallback1 || function (callback) {
    setTimeout(callback, 1);
};
var cancelIdle = self.cancelIdleCallback1 || clearTimeout;
})