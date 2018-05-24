_$define("pi/widget/scroller/dom", function (require, exports, module){
"use strict";
/**
 * 一些dom相关的函数
 */

Object.defineProperty(exports, "__esModule", { value: true });
// ============================================= 执行
var TOUCH_EVENT = 1;
var MOUSE_EVENT = 2;
var elementStyle = document.createElement('div').style;
var vendor = function () {
    var transformNames = {
        webkit: 'webkitTransform',
        Moz: 'MozTransform',
        O: 'OTransform',
        ms: 'msTransform',
        standard: 'transform'
    };
    for (var key in transformNames) {
        if (elementStyle[transformNames[key]] !== undefined) {
            return key;
        }
    }
    return false;
}();
var prefixStyle = function prefixStyle(style) {
    if (vendor === false) {
        return false;
    }
    if (vendor === 'standard') {
        return style;
    }
    return vendor + style.charAt(0).toUpperCase() + style.substr(1);
};
var transform = prefixStyle('transform');
// ============================================= 导出
exports.addEvent = function (el, eventType, fn, capture) {
    el.addEventListener(eventType, fn, { passive: false, capture: !!capture });
};
exports.removeEvent = function (el, eventType, fn, capture) {
    el.removeEventListener(eventType, fn, !!capture);
};
exports.offset = function (el) {
    var left = 0;
    var top = 0;
    while (el) {
        left -= el.offsetLeft;
        top -= el.offsetTop;
        el = el.offsetParent;
    }
    return {
        left: left,
        top: top
    };
};
exports.hasPerspective = prefixStyle('perspective') in elementStyle;
exports.hasTouch = 'ontouchstart' in window;
exports.hasTransform = transform !== false;
exports.hasTransition = prefixStyle('transition') in elementStyle;
exports.style = {
    transform: transform,
    transitionTimingFunction: prefixStyle('transitionTimingFunction'),
    transitionDuration: prefixStyle('transitionDuration'),
    transitionDelay: prefixStyle('transitionDelay'),
    transformOrigin: prefixStyle('transformOrigin'),
    transitionEnd: prefixStyle('transitionEnd')
};
exports.eventType = {
    touchstart: TOUCH_EVENT,
    touchmove: TOUCH_EVENT,
    touchend: TOUCH_EVENT,
    mousedown: MOUSE_EVENT,
    mousemove: MOUSE_EVENT,
    mouseup: MOUSE_EVENT
};
exports.getRect = function (el) {
    if (el instanceof window.SVGElement) {
        var rect = el.getBoundingClientRect();
        return {
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height
        };
    } else {
        return {
            top: el.offsetTop,
            left: el.offsetLeft,
            width: el.offsetWidth,
            height: el.offsetHeight
        };
    }
};
exports.preventDefaultException = function (el, exceptions) {
    for (var i in exceptions) {
        if (exceptions[i].test(el[i])) {
            return true;
        }
    }
    return false;
};
exports.tap = function (e, eventName) {
    var ev = document.createEvent('Event');
    ev.initEvent(eventName, true, true);
    ev.pageX = e.pageX;
    ev.pageY = e.pageY;
    e.target.dispatchEvent(ev);
};
exports.click = function (e) {
    var target = e.target;
    if (!/(SELECT|INPUT|TEXTAREA)/i.test(target.tagName)) {
        var ev = document.createEvent(window.MouseEvent ? 'MouseEvents' : 'Event');
        ev.initEvent('click', true, true);
        ev._constructed = true;
        target.dispatchEvent(ev);
    }
};
exports.prepend = function (el, target) {
    if (target.firstChild) {
        exports.before(el, target.firstChild);
    } else {
        target.appendChild(el);
    }
};
exports.before = function (el, target) {
    target.parentNode.insertBefore(el, target);
};
// ============================================= 本地
})