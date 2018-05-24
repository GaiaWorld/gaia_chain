_$define("pi/widget/frame_mgr", function (require, exports, module){
"use strict";
/**
 * @description 全局渲染管理模块
 * @example
 * 负责管理所有的渲染函数，每帧调用，计算fps。所有涉及到重布局(reflow)重绘(repaint)的操作（修改Dom结构，或者修改CSS相关属性。对于Canvas对象，执行某个操作，比如画一条线，也属于对Dom结构的改变）都应该放到渲染函数内执行。
 * RequestAnimaitonFrame会将JS产生的动画以及CSS产生的动画，放到同一个Reflow和Repaint的循环中。setTimeout并不能保证这一点。
 * 为了保证界面的流畅，操作的立即响应和显示出效果，可以不控制帧数。场景渲染可以单独控帧。
 * 可以根据即时帧率来判断当前的CPU使用率。
 */

Object.defineProperty(exports, "__esModule", { value: true });
// ============================== 导入
var time_1 = require("../lang/time");
var log_1 = require("../util/log");
var util_1 = require("../util/util");
// ============================== 导出
exports.level = log_1.logLevel;
/**
 * @description 设置全局渲染帧函数的回调函数
 * @example
 */
exports.setInterval = function (callback) {
    if (!callback) {
        return;
    }
    var start = void 0;
    // 计算真实的渲染消耗
    var timeout = function timeout() {
        callback.realCostTime = time_1.now() - start;
    };
    var request = function request() {
        start = time_1.now();
        callback();
        exports.requestFrame(request);
        setTimeout(timeout, 0);
    };
    return exports.requestFrame(request);
};
/**
 * @description 取消全局渲染帧函数
 * @example
 */
exports.clearInterval = function (ref) {
    exports.cancelFrame(ref);
};
/**
 * @description 创建帧管理器
 * @example
 */
// tslint:disable-next-line:max-func-body-length
exports.create = function () {
    // 上次花费时间，本次帧时间，帧次数
    var frameCost = 0;
    var frameTime = 0;
    var frameCount = 0;
    // 默认的间隔时间
    var frameInterval = 16;
    // 下次调用时间
    var frameNext = 0;
    // 渲染标志，为true表示当前正在渲染
    var inRender = false;
    // 本次调用的列表
    var cur = [];
    // 下次调用的列表
    var next = [];
    // 单次调用前列表
    var before = [];
    // 单次调用前列表
    var before1 = [];
    // 永久调用列表
    var permanent = [];
    // 单次调用后列表
    var after = [];
    // 单次调用后列表
    var after1 = [];
    // 统计间隔 默认1s
    var statInterval = 1000;
    // 下次统计时间
    var statNext = 0;
    // 统计的回调函数
    var statCallback = void 0;
    // 当前统计 {时间跨度, 每间隔帧统计{帧次数, 累计花费时间, 最慢一帧所在帧次数, 最慢一帧花费时间}, 每间隔调用统计{调用次数, 累计花费时间, 最慢一帧所在帧次数, 最慢一帧花费时间, 最慢函数所在帧次数, 最慢函数花费时间, 最慢函数}}
    // tslint:disable:max-line-length
    var curStat = { time: 0, frame: { count: 0, cost: 0, slowIndex: 0, slowCost: 0 }, call: { count: 0, cost: 0, slowIndex: 0, slowCost: 0, slowFuncIndex: 0, slowFuncCost: 0, slowFunc: null } };
    // 上次统计
    var lastStat = { time: 0, frame: { count: 0, cost: 0, slowIndex: 0, slowCost: 0 }, call: { count: 0, cost: 0, slowIndex: 0, slowCost: 0, slowFuncIndex: 0, slowFuncCost: 0, slowFunc: null } };
    // 统计慢时间
    var statSlow = function statSlow(stat, start, end) {
        var cost = end - start;
        stat.count++;
        stat.cost += cost;
        if (cost > stat.slowCost) {
            stat.slowCost = cost;
            stat.slowIndex = frameCount;
        }
        return cost;
    };
    // 统计函数
    var statFunc = function statFunc(stat, func, start, end) {
        var cost = end - start;
        if (cost > stat.slowFuncCost) {
            stat.slowFuncCost = cost;
            stat.slowFuncIndex = frameCount;
            stat.slowFunc = func;
        }
    };
    // 统计切换
    var statChange = function statChange(now, curStat, lastStat) {
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
    var frame = void 0;
    frame = function frame() {
        var now = time_1.now();
        inRender = true;
        statChange(now, curStat, lastStat);
        frameCount++;
        frameTime = now;
        var i = void 0;
        var func = void 0;
        var end = void 0;
        var start = now;
        var stat = curStat.call;
        var arr = cur;
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
    frame.getCost = function () {
        return frameCost;
    };
    /**
     * @description 获得本次帧时间
     * @example
     */
    frame.getTime = function () {
        return frameTime;
    };
    /**
     * @description 获得当前帧次数
     * @example
     */
    frame.getCount = function () {
        return frameCount;
    };
    /**
     * @description 获得下次的调用时间
     * @example
     */
    frame.getNextTime = function () {
        return frameNext;
    };
    /**
     * @description 获得帧间隔
     * @example
     */
    frame.getInterval = function () {
        return frameInterval;
    };
    /**
     * @description 设置帧间隔
     * @example
     */
    frame.setInterval = function (interval) {
        frameInterval = interval;
    };
    /**
     * @description 添加一个永久调用函数和参数（参数必须为数组）
     * @example
     */
    frame.setPermanent = function (func, args) {
        func && permanent.push(func, args);
    };
    /**
     * @description 判断是否为一个永久调用函数
     * @example
     */
    frame.isPermanent = function (func) {
        for (var index in permanent) {
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
    frame.clearPermanent = function (func) {
        var i = permanent.indexOf(func);
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
    frame.setBefore = function (func, args) {
        func && before.push(func, args || []);
    };
    /**
     * @description 添加一个一次性调用函数和参数（参数必须为数组）
     * @example
     */
    frame.setAfter = function (func, args) {
        func && after.push(func, args);
    };
    /**
     * @description 添加一个一次性调用函数和参数（参数必须为数组）
     * @example
     */
    frame.setNext = function (func, args) {
        func && next.push(func, args);
    };
    /**
     * @description 设置统计回调和统计间隔
     * @example
     */
    frame.setStat = function (callback, interval) {
        statCallback = callback;
        statInterval = interval;
    };
    /**
     * @description 获得当前的统计信息
     * @example
     */
    frame.getCurStat = function () {
        return curStat;
    };
    /**
     * @description 获得最近的统计信息
     * @example
     */
    frame.getLastStat = function () {
        return lastStat;
    };
    return frame;
};
/**
 * @description 获取全局帧管理器
 * @example
 */
exports.getGlobal = function () {
    if (!mgr) {
        mgr = exports.create();
        exports.setInterval(mgr);
    }
    return mgr;
};
/**
 * @description 清除全局帧管理器
 * @example
 */
exports.clearGlobal = function () {
    if (mgr) {
        exports.setInterval(mgr);
        mgr = null;
    }
};
var normalrRequestFrameImpl = function normalrRequestFrameImpl(callback) {
    return setTimeout(callback, 1000 / 60 + 0.5 << 0);
};
// 获取raf函数，处理兼容性
var requestFrameImpl = window.requestAnimationFrame || window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame || window.msRequestAnimationFrame || normalrRequestFrameImpl;
// tslint:disable:no-unnecessary-callback-wrapper
exports.requestFrame = function (callBack) {
    return requestFrameImpl(callBack);
};
// 获取raf取消函数，处理兼容性
var cancelFrameImpl = window.cancelAnimationFrame || window.mozCancelAnimationFrame || window.webkitCancelAnimationFrame || window.msCancelAnimationFrame || clearTimeout;
exports.cancelFrame = function (callBack) {
    return cancelFrameImpl(callBack);
};
// ============================== 本地
// 全局帧管理器
var mgr = void 0;
// 函数调用
var funCall = function funCall(func, args) {
    try {
        util_1.call(func, args);
    } catch (ex) {
        log_1.warn(exports.level, 'frame, ex: ', ex, ', func: ', func);
    }
    return time_1.now();
};
// ============================== 立即执行
})