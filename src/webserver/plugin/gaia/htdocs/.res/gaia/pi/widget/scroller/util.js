_$define("pi/widget/scroller/util", function (require, exports, module){
"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
/**
 * 存放了scroller的util函数
 */
// ======================================================== 导出
/**
 * 是否具有冲量,就是手指松开之后再滑动一段
 */
exports.momentum = function (current, start, time, lowerMargin, wrapperSize, options) {
    var distance = current - start;
    var speed = Math.abs(distance) / time;
    var deceleration = options.deceleration,
        itemHeight = options.itemHeight,
        swipeBounceTime = options.swipeBounceTime,
        bounceTime = options.bounceTime;

    var duration = options.swipeTime;
    var rate = 15;
    var destination = current + speed / deceleration * (distance < 0 ? -1 : 1);
    if (destination < lowerMargin) {
        destination = wrapperSize ? lowerMargin - wrapperSize / rate * speed : lowerMargin;
        duration = swipeBounceTime - bounceTime;
    } else if (destination > 0) {
        destination = wrapperSize ? wrapperSize / rate * speed : 0;
        duration = swipeBounceTime - bounceTime;
    }
    return {
        destination: Math.round(destination),
        duration: duration
    };
};
// 属性扩展
exports.extend = function (target, source) {
    for (var key in source) {
        target[key] = source[key];
    }
};
/**
 * 感觉这个判断没啥实际意义啊
 */
exports.isBadAndroid = /Android /.test(window.navigator.appVersion) && !/Chrome\/\d/.test(window.navigator.appVersion);
})