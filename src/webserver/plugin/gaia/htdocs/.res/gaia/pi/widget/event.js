_$define("pi/widget/event", function (require, exports, module){
"use strict";
/**
 * 事件处理模块
 * 提供在节点的事件上直接声明简单函数调用，简单函数还可以是抛出自定义事件的$notify函数
 * 将5种手势事件（单击tap、双击dbltap、长按longtap、移动move(挥swipe)、旋转缩放rotsal(rotote scale)）代码集成进来，作为引擎提供的本地事件，检测平台，模拟缺失平台的事件
 * 挥的判断是：touchend离开时间减去最后一次touchmove移动时间小于规定的值，并且最后一次移动的速度超过规定的速度
 *
 * 事件支持直接调用widget组件上的方法，和notify方法。
 * 如果是简单字符串就认为是无参数方法。
 * @example <app-ui-btn on-tap=select>"g2"</app-ui-btn>
 * 如果是方法调用，支持参数中使用事件e, 及e的域。
 * @example <app-ui-btn on-tap="select({{v.id}}, 1, e.x, e.y)">"g2"</app-ui-btn>
 * 如果是$notify，支持直接抛出自定义的事件。
 * @example <app-ui-btn on-tap='$notify("ev-brand-btn-select", { "id":{{v.id}}, "x":e.x, "y":e.y})'>"g2"</app-ui-btn>
 */

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

Object.defineProperty(exports, "__esModule", { value: true });
// ============================== 导入
var mod_1 = require("../lang/mod");
var event_1 = require("../util/event");
var math_1 = require("../util/math");
var util_1 = require("../util/util");
// ============================== 导出
exports.USER_EVENT_PRE = 'ev-';
exports.BUBBLE_EVENT_PRE = 'on-';
exports.CAPTURE_EVENT_PRE = 'cap-';
/**
 * @description tap事件默认的间隔时间
 */
exports.TapInterval = 300;
/**
 * @description tap事件默认是否停止广播
 */
exports.TapStopPropagation = true;
/**
 * @description 5种手势事件的移动距离限制
 */
exports.MoveLimit = 15;
/**
 * @description 单击的时间值，毫秒
 */
exports.TapTime = 600;
/**
 * @description 双击的时间值，毫秒
 */
exports.DblTapTime = 600;
/**
 * @description 长按的时间值，毫秒
 */
exports.LongTapTime = 800;
/**
 * @description 挥的速度的平方，px/秒
 */
exports.SwipeSpeed = 300 * 300;
/**
 * @description 挥的最后停顿时间（touchend离开时间减去最后一次touchmove移动时间），必须小于该时间才认为是挥动
 */
exports.SwipeTime = 100;
/**
 * @description 获得事件类型， 只能是ev- on- cap-
 * @example
 */
exports.getEventType = function (key) {
    var c = key.charCodeAt(0);
    if (c === 101 && key.startsWith(exports.USER_EVENT_PRE)) {
        return exports.USER_EVENT_PRE;
    } else if (c === 111 && key.startsWith(exports.BUBBLE_EVENT_PRE)) {
        return exports.BUBBLE_EVENT_PRE;
    } else if (c === 99 && key.startsWith(exports.CAPTURE_EVENT_PRE)) {
        return exports.CAPTURE_EVENT_PRE;
    }
};
/**
 * @description 获得用户事件监听器
 * @example
 */
// tslint:disable:no-reserved-keywords
exports.getUserEventListener = function (key, value) {
    return getFunction(value);
};
/**
 * @description 获得本地事件监听器
 * @example
 */
exports.getNativeEventListener = function (key, value) {
    return getNativeFunction(getFunction(value));
};
/**
 * @description 重绑定节点事件表
 * @example
 */
exports.rebindEventMap = function (oldNode, newNode) {
    if (!oldNode.ext) {
        return;
    }
    var map = oldNode.ext.nativeEventMap;
    if (map) {
        for (var _iterator = map.values(), _isArray = Array.isArray(_iterator), _i = 0, _iterator = _isArray ? _iterator : _iterator[Symbol.iterator]();;) {
            var _ref;

            if (_isArray) {
                if (_i >= _iterator.length) break;
                _ref = _iterator[_i++];
            } else {
                _i = _iterator.next();
                if (_i.done) break;
                _ref = _i.value;
            }

            var v = _ref;

            v.handler.vnode = newNode;
        }
    }
};
/**
 * @description 添加用户事件监听器，没有Handler表示删除用户事件监听器
 * @example
 */
exports.addUserEventListener = function (node, key, type, value) {
    var map = node.ext.eventMap;
    if (!map) {
        node.ext.eventMap = map = new Map();
    }
    if (value) {
        map.set(key, exports.getUserEventListener(key, value));
    } else {
        map.delete(key);
    }
};
/**
 * @description 添加本地事件监听器，没有Handler表示删除本地事件监听器
 * @example
 */
exports.addNativeEventListener = function (node, realNode, key, type, value) {
    var isCap = type === exports.CAPTURE_EVENT_PRE;
    var map = node.ext.nativeEventMap;
    if (!map) {
        node.ext.nativeEventMap = map = new Map();
    } else {
        var old = map.get(key);
        if (old) {
            if (key === 'cap-hashchange') {
                window.removeEventListener('hashchange', old.listener, false);
            } else {
                realNode.removeEventListener(old.type, old.listener, isCap);
                var arr = old.types;
                if (arr) {
                    for (var _iterator2 = arr, _isArray2 = Array.isArray(_iterator2), _i2 = 0, _iterator2 = _isArray2 ? _iterator2 : _iterator2[Symbol.iterator]();;) {
                        var _ref2;

                        if (_isArray2) {
                            if (_i2 >= _iterator2.length) break;
                            _ref2 = _iterator2[_i2++];
                        } else {
                            _i2 = _iterator2.next();
                            if (_i2.done) break;
                            _ref2 = _i2.value;
                        }

                        var t = _ref2;

                        realNode.removeEventListener(t.type, t.listener, isCap);
                    }
                }
            }
        }
    }
    if (!value) {
        return;
    }
    var h = exports.getNativeEventListener(key, value);
    // 在监听器上绑定虚拟节点，这样不使用闭包来获得虚拟节点
    h.vnode = node;
    var bind = eventBind(realNode, h, getEventName(key, type));
    map.set(key, bind);
    // hashchange事件是一个只能绑定在body上的事件，要特殊处理,使得他能向下传递，其他事件都是可以向上传递的
    if (key === 'cap-hashchange') {
        window.addEventListener('hashchange', h, false);
    } else {
        realNode.addEventListener(bind.type, bind.listener, isCap);
        var _arr = bind.listeners;
        if (_arr) {
            for (var _iterator3 = _arr, _isArray3 = Array.isArray(_iterator3), _i3 = 0, _iterator3 = _isArray3 ? _iterator3 : _iterator3[Symbol.iterator]();;) {
                var _ref3;

                if (_isArray3) {
                    if (_i3 >= _iterator3.length) break;
                    _ref3 = _iterator3[_i3++];
                } else {
                    _i3 = _iterator3.next();
                    if (_i3.done) break;
                    _ref3 = _i3.value;
                }

                var _t = _ref3;

                realNode.addEventListener(_t.type, _t.listener, isCap);
            }
        }
    }
};
/**
 * @description 沿节点树，通知节点上的事件监听器
 * @example
 */
exports.notify = function (node, eventType, e) {
    // tslint:disable-next-line:prefer-const
    var listener = void 0;
    // tslint:disable-next-line:prefer-const
    var r = void 0;
    var set = false;
    if (e) {
        if ((typeof e === "undefined" ? "undefined" : _typeof(e)) === 'object' || typeof e === 'function') {
            e.type = eventType;
            // e.srcNode为初始事件源，e.native为原生事件
            e.srcNode = node;
            // e.srcWidget为初始组件源
            e.srcWidget = node.widget;
            set = true;
        }
    } else {
        e = { type: eventType, srcNode: node, srcWidget: node.widget, node: null, widget: null };
    }
    while (node) {
        if (set) {
            // e.node为当前节点源
            e.node = node;
            e.widget = node.widget;
        }
        var _listener = node.ext ? node.ext.eventMap ? node.ext.eventMap.get(eventType) : null : null;
        if (_listener) {
            var _r = _listener(e, node.widget);
            // tslint:disable-next-line:no-empty
            if (!_r) {} else if (_r === event_1.HandlerResult.BREAK_OK) {
                return;
            }
        }
        node = node.parent ? node.parent : node.widget.parentNode;
    }
};
// 全局事件函数的缓存
var cacheMap = new Map();
/**
 * @description 获得简单事件函数
 * @example
 */
var getSampleFunction = function getSampleFunction(funName, args) {
    return function (e, w) {
        var arr = void 0;
        if (args) {
            arr = args.arr;
            if (args.index >= 0) {
                arr[args.index] = args.fields ? util_1.getValue(e, args.fields) : e;
            }
        } else {
            arr = [e];
        }
        if (funName === '$notify') {
            exports.notify(w.parentNode, arr[0], arr[1]);
            return event_1.HandlerResult.BREAK_OK;
        }
        var r = w.notify(funName, arr);
        if (r) {
            return r;
        }
        var f = w.forelet;
        if (!f) {
            return;
        }
        return f.notify(funName, arr);
    };
};
/**
 * @description 解析参数
 * @example
 */
var parseArgs = function parseArgs(arg) {
    arg = arg.replace(/'/g, '"');
    var len = arg.length;
    var attr = void 0;
    var findElemE = function findElemE(arg, start) {
        for (var i = start; i < len; i++) {
            if (arg[i] !== ' ') {
                return arg[i] === 'e' ? i : -1;
            }
        }
    };
    var findAttrOfE = function findAttrOfE(arg, start) {
        if (arg[start] !== '.') {
            return;
        }
        var i = start + 1;
        for (; i < len; i++) {
            if (arg[i] === ' ' || arg[i] === ',') {
                break;
            }
        }
        attr = arg.slice(start + 1, i);
    };
    var findStrEnd = function findStrEnd(arg, start, closedChar) {
        for (var i = start; i < len; i++) {
            if (arg[i] === closedChar) {
                return i;
            }
        }
    };
    var j = findElemE(arg, 0);
    if (j < 0) {
        for (var c, i = 0; i < len; i++) {
            c = arg[i];
            if (c === '\'') {
                i = findStrEnd(arg, i + 1, '\'');
            } else if (c === '"') {
                i = findStrEnd(arg, i + 1, '"');
            } else if (c === ',') {
                j = findElemE(arg, i + 1);
                if (j !== -1) {
                    findAttrOfE(arg, j + 1);
                    break;
                }
            }
        }
    } else {
        findAttrOfE(arg, j + 1);
    }
    if (j >= 0) {
        // tslint:disable:prefer-template
        arg = arg.substring(0, j) + '"$_"' + arg.substring(attr ? j + attr.length + 2 : j + 1, arg.length);
    }
    try {
        var r = JSON.parse('[' + arg + ']'); // 匹配字符串中的",e",将其替换成",'$_'"
        return { arr: r, index: r.indexOf('$_'), fields: attr };
    } catch (error) {
        throw new Error('parseArgs fail, args: ' + arg);
    }
};
/**
 * @description 获得事件函数
 * @example
 */
var getFunction = function getFunction(str) {
    str = str.trim();
    // 字符串中存在(,解析字符串中的方法名和参数
    var index = str.indexOf('(');
    if (index > 0) {
        var funName = str.slice(0, index);
        return getSampleFunction(funName, parseArgs(str.slice(index + 1, str.length - 1)));
    }
    return getSampleFunction(str);
};
/**
 * @description 获得本地事件函数，从函数身上取到绑定的虚拟节点，添加到事件上
 * @example
 */
var getNativeFunction = function getNativeFunction(h) {
    // tslint:disable-next-line:no-unnecessary-local-variable
    var func = function func(e) {
        var node = func.vnode;
        if (!node) {
            return;
        }
        var ext = node.ext;
        if (!ext) {
            ext = node.ext = {};
        }
        if (!ext.eventAttr && e.type === 'tap') {
            ext.eventAttr = { tap: { interval: exports.TapInterval, stop: exports.TapStopPropagation, nextTime: 0 } };
        }
        if (ext.eventAttr) {
            var cfg = ext.eventAttr[e.type];
            if (!cfg && e.type === 'tap') {
                ext.eventAttr[e.type] = cfg = { interval: exports.TapInterval, stop: exports.TapStopPropagation, nextTime: 0 };
            }
            if (cfg) {
                if (cfg.stop) {
                    e.native ? e.native.stopPropagation() : e.stopPropagation();
                }
                if (cfg.prevent) {
                    e.native ? e.native.preventDefault() : e.preventDefault();
                }
                if (cfg.interval) {
                    if (cfg.nextTime && cfg.nextTime > e.timeStamp) {
                        return;
                    }
                    cfg.nextTime = e.timeStamp + cfg.interval;
                }
            }
        }
        e.node = node;
        e.srcNode = node;
        e.widget = node.widget;
        e.srcWidget = node.widget;
        return h(e, node.widget);
    };
    return func;
};
/**
 * @description 获得原始的事件类型名
 * @example
 */
var getEventName = function getEventName(str, type) {
    return str.slice(type.length);
};
/**
 * @description 事件绑定
 * @example
 */
var eventBind = function eventBind(el, h, name) {
    var func = gesture[mod_1.commonjs.flags.mobile ? 0 : 1][name];
    return func ? func(el, h) : { type: name, name2: null, handler: h, listener: h };
};
// 触控手势
// 移动
var touchMove = function touchMove(el, h) {
    var time = 0;
    var x = 0;
    var y = 0;
    var xx = 0;
    var yy = 0;
    var lasttime = 0;
    var lastx = 0;
    var lasty = 0;
    var state = -1;
    var fire = function fire(e, type) {
        h({
            type: 'move', subType: type, native: e, x: xx, y: yy,
            timeStamp: e.timeStamp, startTime: time, startX: x, startY: y, lastTime: lasttime, lastX: lastx, lastY: lasty
        });
    };
    var down = function down(e) {
        if (e.touches.length > 1) {
            if (state > 0) {
                cancel(e);
            } else if (state === 0) {
                state = -1;
            }
            return;
        }
        state = 0;
        time = e.timeStamp;
        x = e.touches[0].pageX;
        y = e.touches[0].pageY;
        lasttime = time;
        lastx = x;
        lasty = y;
        xx = x;
        yy = y;
    };
    var move = function move(e) {
        if (state < 0) {
            return;
        }
        if (e.touches.length > 1) {
            return cancel(e);
        }
        lasttime = e.timeStamp;
        lastx = xx;
        lasty = yy;
        xx = e.touches[0].pageX;
        yy = e.touches[0].pageY;
        if (state > 0) {
            fire(e, 'keep');
        } else if (Math.abs(x - xx) > exports.MoveLimit || Math.abs(y - yy) > exports.MoveLimit) {
            state = 1;
            fire(e, 'start');
        }
    };
    var up = function up(e) {
        if (state > 0) {
            var t = e.timeStamp - lasttime;
            h({
                type: 'move', subType: 'over', native: e, x: xx, y: yy, timeStamp: e.timeStamp,
                startTime: time, startX: x, startY: y, lastTime: lasttime, lastX: lastx, lastY: lasty,
                swipe: t < exports.SwipeTime && (lasty - xx) * (lasty - xx) + (lasty - yy) * (lasty - yy) > exports.SwipeSpeed * t / 1000
            });
        }
        state = -1;
    };
    var cancel = function cancel(e) {
        if (state > 0) {
            fire(e, 'cancel');
        }
        state = -1;
    };
    return {
        type: 'touchstart', listener: down, listeners: [{ type: 'touchmove', listener: move }, { type: 'touchend', listener: up }, { type: 'touchcancel', listener: cancel }], handler: h
    };
};
// 单击
var touchTap = function touchTap(el, h) {
    var time = 0;
    var x = 0;
    var y = 0;
    var state = -1;
    var down = function down(e) {
        if (e.touches.length > 1) {
            state = -1;
            return;
        }
        state = 1;
        time = e.timeStamp;
        x = e.touches[0].pageX;
        y = e.touches[0].pageY;
    };
    var move = function move(e) {
        var xx = e.touches[0].pageX;
        var yy = e.touches[0].pageY;
        if (state > 0 && (e.touches.length > 1 || Math.abs(x - xx) > exports.MoveLimit || Math.abs(y - yy) > exports.MoveLimit)) {
            state = -1;
        }
    };
    var up = function up(e) {
        if (state > 0 && e.timeStamp < time + exports.TapTime) {
            h({ type: 'tap', native: e, x: x, y: y, timeStamp: e.timeStamp });
        }
        state = -1;
    };
    var cancel = function cancel(e) {
        state = -1;
    };
    return {
        type: 'touchstart', listener: down, listeners: [{ type: 'touchmove', listener: move }, { type: 'touchend', listener: up }, { type: 'touchcancel', listener: cancel }], handler: h
    };
};
// 双击
var touchDbltap = function touchDbltap(el, h) {
    var time = 0;
    var x = 0;
    var y = 0;
    var state = -1;
    var down = function down(e) {
        if (e.touches.length > 1 || state === 0 || state > 1) {
            state = -1;
            return;
        }
        var t = e.timeStamp;
        var xx = e.touches[0].pageX;
        var yy = e.touches[0].pageY;
        if (state === 1 && (t > time + exports.DblTapTime || Math.abs(x - xx) > exports.MoveLimit || Math.abs(y - yy) > exports.MoveLimit)) {
            state = -1;
            return;
        }
        state++;
        time = t;
        x = xx;
        y = yy;
    };
    var move = function move(e) {
        var xx = e.touches[0].pageX;
        var yy = e.touches[0].pageY;
        if (state > 0 && (e.touches.length > 1 || Math.abs(x - xx) > exports.MoveLimit || Math.abs(y - yy) > exports.MoveLimit)) {
            state = -1;
        }
    };
    var up = function up(e) {
        if (state === 0 && e.timeStamp < time + exports.TapTime) {
            state = 1;
            time = e.timeStamp;
            return;
        }
        if (state === 2 && e.timeStamp < time + exports.TapTime) {
            h({ type: 'dbltap', native: e, x: x, y: y, timeStamp: e.timeStamp });
        }
        state = -1;
    };
    var cancel = function cancel(e) {
        state = -1;
    };
    return {
        type: 'touchstart', listener: down, listeners: [{ type: 'touchmove', listener: move }, { type: 'touchend', listener: up }, { type: 'touchcancel', listener: cancel }], handler: h
    };
};
// 抬起
var touchUp = function touchUp(el, h) {
    var up = function up(e) {
        h({ type: 'up', native: e, timeStamp: e.timeStamp });
    };
    return { type: 'touchend', listener: up, listeners: null, handler: h };
};
// 按下
var touchDown = function touchDown(el, h) {
    var down = function down(e) {
        h({ type: 'down', native: e, x: e.touches[0].pageX, y: e.touches[0].pageY, timeStamp: e.timeStamp });
    };
    return { type: 'touchstart', listener: down, listeners: null, handler: h };
};
// 长按
var touchLongtap = function touchLongtap(el, h) {
    var time = 0;
    var x = 0;
    var y = 0;
    var ref = 0;
    var down = function down(e) {
        if (e.touches.length > 1) {
            return up(e);
        }
        ref && clearTimeout(ref);
        time = e.timeStamp;
        x = e.touches[0].pageX;
        y = e.touches[0].pageY;
        ref = setTimeout(function () {
            ref = 0;
            h({ type: 'longtap', native: e, x: x, y: y, timeStamp: time + exports.LongTapTime, startTime: time });
        }, exports.LongTapTime);
    };
    var move = function move(e) {
        if (ref && (e.touches.length > 1 || Math.abs(x - e.touches[0].pageX) > exports.MoveLimit || Math.abs(y - e.touches[0].pageY) > exports.MoveLimit)) {
            clearTimeout(ref);
            ref = 0;
        }
    };
    var up = function up(e) {
        ref && clearTimeout(ref);
        ref = 0;
    };
    return {
        type: 'touchstart', listener: down, listeners: [{ type: 'touchmove', listener: move }, { type: 'touchend', listener: up }, { type: 'touchcancel', listener: up }], handler: h
    };
};
// 旋转 缩放
// tslint:disable-next-line:max-func-body-length
var touchRotsal = function touchRotsal(el, h) {
    var time = 0;
    var x = 0;
    var y = 0;
    var x1 = 0;
    var y1 = 0;
    var x2 = 0;
    var y2 = 0;
    var xx = 0;
    var yy = 0;
    var xx1 = 0;
    var yy1 = 0;
    var xx2 = 0;
    var yy2 = 0;
    var dist1 = 0;
    var dist2 = 0;
    var vx1 = 0;
    var vy1 = 0;
    var vx2 = 0;
    var vy2 = 0;
    var direction = 0;
    var angle = 0;
    var state = -1;
    var fire = function fire(e, type) {
        h({
            type: 'rotsal', subType: type, native: e, dist: dist2, scale: dist2 / dist1,
            direction: direction, angle: angle, timeStamp: e.timeStamp, startTime: time,
            x: xx, y: yy, x1: x1, y1: y2, x2: x2, y2: y2, xx1: xx1, yy1: yy1, xx2: xx2, yy2: yy2, startDist: dist1
        });
    };
    var down = function down(e) {
        if (e.touches.length === 1) {
            if (state > 0) {
                cancel(e);
            } else if (state === 0) {
                state = -1;
            }
            return;
        }
        state = 0;
        time = e.timeStamp;
        x1 = e.touches[0].pageX;
        y1 = e.touches[0].pageY;
        x2 = e.touches[1].pageX;
        y2 = e.touches[1].pageY;
        x = (x1 + x2) / 2;
        y = (y1 + y2) / 2;
        vx1 = x1 - x2;
        vy1 = y1 - y2;
        dist1 = Math.sqrt(vx1 * vx1 + vy1 * vy1);
    };
    var move = function move(e) {
        if (state < 0) {
            return;
        }
        if (e.touches.length === 1) {
            return cancel(e);
        }
        xx1 = e.touches[0].pageX;
        yy1 = e.touches[0].pageY;
        xx2 = e.touches[1].pageX;
        yy2 = e.touches[1].pageY;
        xx = (xx1 + xx2) / 2;
        yy = (yy1 + yy2) / 2;
        vx2 = xx1 - xx2;
        vy2 = yy1 - yy2;
        if (state > 0) {
            dist2 = Math.sqrt(vx2 * vx2 + vy2 * vy2);
            direction = math_1.getDirection(vx1, vy1, vx2, vy2);
            angle = math_1.getAngle(vx1, vy1, vx2, vy2);
            fire(e, 'keep');
        } else {
            var dx1 = Math.abs(x1 - xx1);
            var dy1 = Math.abs(y1 - yy1);
            var dx2 = Math.abs(x2 - xx2);
            var dy2 = Math.abs(y2 - yy2);
            if (dx1 + dy1 + dx2 + dy2 > exports.MoveLimit) {
                state = 1;
                dist2 = Math.sqrt(vx2 * vx2 + vy2 * vy2);
                direction = math_1.getDirection(vx1, vy1, vx2, vy2);
                angle = math_1.getAngle(vx1, vy1, vx2, vy2);
                fire(e, 'start');
            }
        }
    };
    var up = function up(e) {
        if (state > 0) {
            fire(e, 'over');
        }
        state = -1;
    };
    var cancel = function cancel(e) {
        if (state > 0) {
            fire(e, 'cancel');
        }
        state = -1;
    };
    return {
        type: 'touchstart', listener: down, listeners: [{ type: 'touchmove', listener: move }, { type: 'touchend', listener: up }, { type: 'touchcancel', listener: cancel }], handler: h
    };
};
// 鼠标手势
// 移动
var mouseMove = function mouseMove(el, h) {
    var time = 0;
    var x = 0;
    var y = 0;
    var lasttime = 0;
    var lastx = 0;
    var lasty = 0;
    var state = -1;
    var fire = function fire(e, type) {
        h({
            type: 'move', subType: type, native: e, x: e.pageX, y: e.pageY, timeStamp: e.timeStamp,
            startTime: time, startX: x, startY: y, lastTime: lasttime, lastX: lastx, lastY: lasty
        });
    };
    var down = function down(e) {
        state = 0;
        time = e.timeStamp;
        x = e.pageX;
        y = e.pageY;
        lasttime = time;
        lastx = x;
        lasty = y;
    };
    var move = function move(e) {
        if (state > 0) {
            fire(e, 'keep');
            // tslint:disable-next-line:no-empty
        } else if (state < 0) {} else if (Math.abs(x - e.pageX) > exports.MoveLimit || Math.abs(y - e.pageY) > exports.MoveLimit) {
            state = 1;
            lasttime = e.timeStamp;
            lastx = e.pageX;
            lasty = e.pageY;
            fire(e, 'start');
        }
    };
    var up = function up(e) {
        if (state > 0) {
            var t = e.timeStamp - lasttime;
            h({
                type: 'move', subType: 'over', native: e, x: e.pageX, y: e.pageY, timeStamp: e.timeStamp,
                startTime: time, startX: x, startY: y, lastTime: lasttime, lastX: lastx, lastY: lasty,
                swipe: t < exports.SwipeTime && (lasty - e.pageX) * (lasty - e.pageX) + (lasty - e.pageY) * (lasty - e.pageY) > exports.SwipeSpeed * t / 1000
            });
        }
        state = -1;
    };
    return {
        type: 'mousedown', listener: down, listeners: [{ type: 'mousemove', listener: move }, { type: 'mouseup', listener: up }], handler: h
    };
};
// 单击
var mouseTap = function mouseTap(el, h) {
    var hh = function hh(e) {
        h({ type: 'tap', native: e, x: e.pageX, y: e.pageY, timeStamp: e.timeStamp });
    };
    return { type: 'click', listener: hh, listeners: null, handler: h };
};
// 双击
var mouseDbltap = function mouseDbltap(el, h) {
    var hh = function hh(e) {
        h({ type: 'dbltap', native: e, x: e.pageX, y: e.pageY, timeStamp: e.timeStamp });
    };
    return { type: 'dblclick', listener: hh, listeners: null, handler: h };
};
// 长按
var mouseLongtap = function mouseLongtap(el, h) {
    var time = 0;
    var x = 0;
    var y = 0;
    var ref = 0;
    var down = function down(e) {
        ref && clearTimeout(ref);
        time = e.timeStamp;
        x = e.pageX;
        y = e.pageY;
        ref = setTimeout(function () {
            ref = 0;
            h({ type: 'longtap', native: e, x: x, y: y, timeStamp: time + exports.LongTapTime, startTime: time });
        }, exports.LongTapTime);
    };
    var move = function move(e) {
        if (ref && (Math.abs(x - e.pageX) > exports.MoveLimit || Math.abs(y - e.pageY) > exports.MoveLimit)) {
            clearTimeout(ref);
            ref = 0;
        }
    };
    var up = function up(e) {
        ref && clearTimeout(ref);
        ref = 0;
    };
    return {
        type: 'mousedown', listener: down, listeners: [{ type: 'mousemove', listener: move }, { type: 'mouseup', listener: up }],
        handler: h
    };
};
// 抬起
var mouseUp = function mouseUp(el, h) {
    var up = function up(e) {
        h({ type: 'up', native: e, x: e.pageX, y: e.pageY, timeStamp: e.timeStamp });
    };
    return { type: 'mouseup', listener: up, listeners: null, handler: h };
};
// 按下
var mouseDown = function mouseDown(el, h) {
    var down = function down(e) {
        h({ type: 'down', native: e, x: e.pageX, y: e.pageY, timeStamp: e.timeStamp });
    };
    return { type: 'mousedown', listener: down, listeners: null, handler: h };
};
// ============================== 立即执行
// 设置当前的手势函数表
var gesture = [{
    move: touchMove,
    tap: touchTap,
    dbltap: touchDbltap,
    longtap: touchLongtap,
    rotsal: touchRotsal,
    up: touchUp,
    down: touchDown
}, {
    move: mouseMove,
    tap: mouseTap,
    dbltap: mouseDbltap,
    longtap: mouseLongtap,
    up: mouseUp,
    down: mouseDown
}];
// 事件分类，参考用
var HTML_DEFAULT_EVENTS = {
    WINDOW_EVENT: {
        AFTER_PRINT: 'afterprint',
        BEFORE_PRINT: 'beforeprint',
        BEFORE_UNLOAD: 'beforeunload',
        ERROR: 'error',
        HASH_CHANGE: 'hashchange',
        LOAD: 'load',
        MESSAGE: 'message',
        OFFLINE: 'offline',
        LINE: 'line',
        PAGE_HIDE: 'pagehide',
        PAGE_SHOW: 'pageshow',
        POP_STATE: 'popstate',
        REDO: 'redo',
        RESIZE: 'resize',
        STORAGE: 'storage',
        UNDO: 'undo',
        UNLOAD: 'unload'
    },
    KEYBOARD_EVENT: {
        KEY_DOWN: 'keydown',
        KEY_PRESS: 'keypress',
        KEY_UP: 'keyup'
    },
    MOBILE_EVENT: {
        TOUCH_START: 'touchstart',
        TOUCH_END: 'touchend',
        TOUCH_MOVE: 'touchmove',
        TOUCH_CANCEL: 'touchcancel'
    },
    MOUSE_EVENT: {
        CLICK: 'click',
        DBL_CLICK: 'dblclick',
        DRAG: 'drag',
        DRAG_END: 'dragend',
        DRAG_ENTER: 'dragenter',
        DRAG_LEAVE: 'dragleave',
        DRAG_OVER: 'dragover',
        DRAG_START: 'dragstart',
        DROP: 'drop',
        MOUSE_DOWN: 'mousedown',
        MOUSE_MOVE: 'mousemove',
        MOUSE_OUT: 'mouseout',
        MOUSE_OVER: 'mouseover',
        MOUSE_UP: 'mouseup',
        MOUSE_WHEEL: 'mousewheel',
        SCROLL: 'scroll'
    },
    FORM_EVENT: {
        BLUR: 'blur',
        CHANGE: 'change',
        CTEXT_MENU: 'ctextmenu',
        FOCUS: 'focus',
        FORM_CHANGE: 'formchange',
        FORM_INPUT: 'forminput',
        INPUT: 'input',
        INVALID: 'invalid',
        RESET: 'reset',
        SELECT: 'select',
        SUBMIT: 'submit'
    },
    MEDIA_EVENT: {
        ABOUT: 'abort',
        CAN_PLAY: 'canplay',
        CAN_PLAY_THROUGH: 'canplaythrough',
        DURATI_CHANGE: 'duratichange',
        EMPTIED: 'emptied',
        ENDED: 'ended',
        ERROR: 'error',
        LOADED_DATA: 'loadeddata',
        LOADED_META_DATA: 'loadedmetadata',
        LOAD_START: 'loadstart',
        PAUSE: 'pause',
        PLAY: 'play',
        PLAYING: 'playing',
        PROGRESS: 'progress',
        RATE_CHANGE: 'ratechange',
        READY_STATE_CHANGE: 'readystatechange',
        SEEKED: 'seeked',
        SEEKING: 'seeking',
        STALLED: 'stalled',
        SUSPEND: 'suspend',
        TIME_UPDATE: 'timeupdate',
        VOLUME_CHANGE: 'volumechange',
        WATING: 'waiting'
    }
};
})