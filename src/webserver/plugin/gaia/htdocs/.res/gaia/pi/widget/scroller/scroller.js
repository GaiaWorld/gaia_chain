_$define("pi/widget/scroller/scroller", function (require, exports, module){
"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

Object.defineProperty(exports, "__esModule", { value: true });
/**
 *
 *
 * ev-scroller-beforescrollstart - 滚动开始之前触发
 * ev-scroller-scrollstart - 滚动开始时触发
 * ev-scroller-scroll - 滚动时触发
 * ev-scroller-scrollcancel - 取消滚动时触发
 * ev-scroller-scrollend - 滚动结束时触发
 * ev-scroller-touchend - 手指移开屏幕时触发
 * ev-scroller-flick - 轻拂时触发
 * ev-scroller-refresh - 当 better-scroll 刷新时触发
 * ev-scroller-destroy - 销毁 better-scroll 实例时触发
 */
// ====================================== 导入
var event_1 = require("../../widget/event");
var frame_mgr_1 = require("../../widget/frame_mgr");
var painter_1 = require("../../widget/painter");
var dom_1 = require("./dom");
var ease_1 = require("./ease");
var util_1 = require("./util");
// ====================================== 常量声明
var TOUCH_EVENT = 1;
var scrollerInstanceMap = new Map();
// ====================================== 导出
exports.pluginBind = function (w, vNode, args, oldArgs) {
    var scrollerInstance = scrollerInstanceMap.get(args.options.id);
    if (!scrollerInstance) {
        var bScroller = new BScroll(w, vNode, args.options);
        scrollerInstanceMap.set(args.options.id, bScroller);
    } else {
        scrollerInstance.update(args.options, vNode);
        console.log("id : " + args.options.id + "\u5DF2\u7ECF\u5B58\u5728, \u76F4\u63A5\u53EF\u7528");
    }
};

var BScroll = function () {
    function BScroll(w, vNode, options) {
        var _this = this;

        _classCallCheck(this, BScroll);

        this.x = 0;
        this.y = 0;
        this.directionX = 0;
        this.directionY = 0;
        this.parentWidget = w;
        var tempAttach = w.attach;
        w.attach = function () {
            tempAttach();
            _this.update(options, vNode);
        };
        var tempAfterupdate = w.afterUpdate;
        w.afterUpdate = function () {
            tempAfterupdate();
            _this.refresh();
        };
        // cache style for better performance    
    }
    // tslint:disable:typedef no-object-literal-type-assertion


    _createClass(BScroll, [{
        key: "update",
        value: function update(options, vNode) {
            this.wrapper = painter_1.getRealNode(vNode);
            this.scroller = painter_1.getRealNode(vNode).children[0];
            this.options = {
                startX: 0,
                startY: 0,
                scrollX: false,
                scrollY: true,
                directionLockThreshold: 5,
                momentum: true,
                bounce: true,
                swipeTime: 2500,
                bounceTime: 700,
                swipeBounceTime: 1200,
                deceleration: 0.001,
                momentumLimitTime: 300,
                momentumLimitDistance: 15,
                resizePolling: 60,
                preventDefault: true,
                preventDefaultException: {
                    tagName: /^(INPUT|TEXTAREA|BUTTON|SELECT)$/
                },
                bindToWrapper: true,
                HWCompositing: true,
                useTransition: true,
                useTransform: true,
                probeType: 3
            };
            util_1.extend(this.options, options);
            this.translateZ = this.options.HWCompositing && dom_1.hasPerspective ? ' translateZ(0)' : '';
            this.options.useTransition = this.options.useTransition && dom_1.hasTransition;
            this.options.useTransform = this.options.useTransform && dom_1.hasTransform;
            this.options.eventPassthrough = this.options.eventPassthrough === true ? 'vertical' : this.options.eventPassthrough;
            this.options.preventDefault = !this.options.eventPassthrough && this.options.preventDefault;
            // If you want eventPassthrough I have to lock one of the axes
            this.options.scrollX = this.options.eventPassthrough === 'horizontal' ? false : this.options.scrollX;
            this.options.scrollY = this.options.eventPassthrough === 'vertical' ? false : this.options.scrollY;
            // With eventPassthrough we also need lockDirection mechanism
            this.options.freeScroll = this.options.freeScroll && !this.options.eventPassthrough;
            this.options.directionLockThreshold = this.options.eventPassthrough ? 0 : this.options.directionLockThreshold;
            if (this.options.tap === true) {
                this.options.tap = 'tap';
            }
            this._init();
            this.refresh();
            this.scrollTo(this.options.startX, this.options.startY);
            this.enable();
        }
        // tslint:disable:function-name

    }, {
        key: "_init",
        value: function _init() {
            this.x = 0;
            this.y = 0;
            this.directionX = 0;
            this.directionY = 0;
            this._addEvents();
        }
    }, {
        key: "_addEvents",
        value: function _addEvents() {
            var eventOperation = dom_1.addEvent;
            this._handleEvents(eventOperation);
        }
    }, {
        key: "_removeEvents",
        value: function _removeEvents() {
            var eventOperation = dom_1.removeEvent;
            this._handleEvents(eventOperation);
        }
    }, {
        key: "_handleEvents",
        value: function _handleEvents(eventOperation) {
            var target = this.options.bindToWrapper ? this.wrapper : window;
            eventOperation(window, 'orientationchange', this);
            eventOperation(window, 'resize', this);
            if (this.options.click) {
                eventOperation(this.wrapper, 'click', this);
            }
            if (!this.options.disableMouse) {
                eventOperation(this.wrapper, 'mousedown', this);
                eventOperation(target, 'mousemove', this);
                eventOperation(target, 'mousecancel', this);
                eventOperation(target, 'mouseup', this);
            }
            if (dom_1.hasTouch && !this.options.disableTouch) {
                eventOperation(this.wrapper, 'touchstart', this);
                eventOperation(target, 'touchmove', this);
                eventOperation(target, 'touchcancel', this);
                eventOperation(target, 'touchend', this);
            }
            eventOperation(this.scroller, dom_1.style.transitionEnd, this);
        }
    }, {
        key: "_start",
        value: function _start(e) {
            // tslint:disable:variable-name
            var _eventType = dom_1.eventType[e.type];
            if (_eventType !== TOUCH_EVENT) {
                if (e.button !== 0) {
                    return;
                }
            }
            if (!this.enabled || this.destroyed || this.initiated && this.initiated !== _eventType) {
                return;
            }
            this.initiated = _eventType;
            if (this.options.preventDefault && !util_1.isBadAndroid && !dom_1.preventDefaultException(e.target, this.options.preventDefaultException)) {
                e.preventDefault();
            }
            this.moved = false;
            this.distX = 0;
            this.distY = 0;
            this.directionX = 0;
            this.directionY = 0;
            this.directionLocked = 0;
            this._transitionTime();
            this.startTime = +new Date();
            if (this.options.useTransition && this.isInTransition) {
                this.isInTransition = false;
                var pos = this.getComputedPosition();
                this._translate(pos.x, pos.y);
                if (this.parentWidget.tree) {
                    event_1.notify(this.parentWidget.tree, 'ev-scroller-scrollend', { id: this.options.id, x: this.x, y: this.y, instance: this });
                }
            }
            var point = e.touches ? e.touches[0] : e;
            this.startX = this.x;
            this.startY = this.y;
            this.absStartX = this.x;
            this.absStartY = this.y;
            this.pointX = point.pageX;
            this.pointY = point.pageY;
            if (this.parentWidget.tree) {
                event_1.notify(this.parentWidget.tree, 'ev-scroller-beforescrollstart', { id: this.options.id, x: this.x, y: this.y, instance: this });
            }
        }
        // tslint:disable-next-line:cyclomatic-complexity

    }, {
        key: "_move",
        value: function _move(e) {
            if (!this.enabled || this.destroyed || dom_1.eventType[e.type] !== this.initiated) {
                return;
            }
            if (this.options.preventDefault) {
                e.preventDefault();
            }
            var point = e.touches ? e.touches[0] : e;
            var deltaX = point.pageX - this.pointX;
            var deltaY = point.pageY - this.pointY;
            this.pointX = point.pageX;
            this.pointY = point.pageY;
            this.distX += deltaX;
            this.distY += deltaY;
            var absDistX = Math.abs(this.distX);
            var absDistY = Math.abs(this.distY);
            var timestamp = +new Date();
            // We need to move at least 15 pixels for the scrolling to initiate
            if (timestamp - this.endTime > this.options.momentumLimitTime && absDistY < this.options.momentumLimitDistance && absDistX < this.options.momentumLimitDistance) {
                return;
            }
            // If you are scrolling in one direction lock the other
            if (!this.directionLocked && !this.options.freeScroll) {
                if (absDistX > absDistY + this.options.directionLockThreshold) {
                    this.directionLocked = 'h'; // lock horizontally
                } else if (absDistY >= absDistX + this.options.directionLockThreshold) {
                    this.directionLocked = 'v'; // lock vertically
                } else {
                    this.directionLocked = 'n'; // no lock
                }
            }
            if (this.directionLocked === 'h') {
                if (this.options.eventPassthrough === 'vertical') {
                    e.preventDefault();
                } else if (this.options.eventPassthrough === 'horizontal') {
                    this.initiated = false;
                    return;
                }
                deltaY = 0;
            } else if (this.directionLocked === 'v') {
                if (this.options.eventPassthrough === 'horizontal') {
                    e.preventDefault();
                } else if (this.options.eventPassthrough === 'vertical') {
                    this.initiated = false;
                    return;
                }
                deltaX = 0;
            }
            deltaX = this.hasHorizontalScroll ? deltaX : 0;
            deltaY = this.hasVerticalScroll ? deltaY : 0;
            var newX = this.x + deltaX;
            var newY = this.y + deltaY;
            // Slow down or stop if outside of the boundaries
            if (newX > 0 || newX < this.maxScrollX) {
                if (this.options.bounce) {
                    newX = this.x + deltaX / 3;
                } else {
                    newX = newX > 0 ? 0 : this.maxScrollX;
                }
            }
            if (newY > 0 || newY < this.maxScrollY) {
                if (this.options.bounce) {
                    newY = this.y + deltaY / 3;
                } else {
                    newY = newY > 0 ? 0 : this.maxScrollY;
                }
            }
            // this.directionX = deltaX > 0 ? -1 : deltaX < 0 ? 1 : 0;
            // this.directionY = deltaY > 0 ? -1 : deltaY < 0 ? 1 : 0;
            this._move1(e, newX, newY, timestamp);
        }
    }, {
        key: "_move1",
        value: function _move1(e, newX, newY, timestamp) {
            if (!this.moved) {
                this.moved = true;
                if (this.parentWidget.tree) {
                    event_1.notify(this.parentWidget.tree, 'ev-scroller-scrollstart', { id: this.options.id, x: this.x, y: this.y, instance: this });
                }
            }
            this._translate(newX, newY);
            if (timestamp - this.startTime > this.options.momentumLimitTime) {
                this.startTime = timestamp;
                this.startX = this.x;
                this.startY = this.y;
                if (this.options.probeType === 1) {
                    event_1.notify(this.parentWidget.tree, 'ev-scroller-scroll', { id: this.options.id, x: this.x, y: this.y, instance: this });
                }
            }
            if (this.options.probeType > 1) {
                event_1.notify(this.parentWidget.tree, 'ev-scroller-scroll', { id: this.options.id, x: this.x, y: this.y, instance: this });
            }
            var scrollLeft = document.documentElement.scrollLeft || window.pageXOffset || document.body.scrollLeft;
            var scrollTop = document.documentElement.scrollTop || window.pageYOffset || document.body.scrollTop;
            var pX = this.pointX - scrollLeft;
            var pY = this.pointY - scrollTop;
            if (pX > document.documentElement.clientWidth - this.options.momentumLimitDistance || pX < this.options.momentumLimitDistance || pY < this.options.momentumLimitDistance || pY > document.documentElement.clientHeight - this.options.momentumLimitDistance) {
                this._end(e);
            }
        }
        // tslint:disable-next-line:cyclomatic-complexity

    }, {
        key: "_end",
        value: function _end(e) {
            if (!this.enabled || this.destroyed || dom_1.eventType[e.type] !== this.initiated) {
                return;
            }
            this.initiated = false;
            if (this.options.preventDefault && !dom_1.preventDefaultException(e.target, this.options.preventDefaultException)) {
                e.preventDefault();
            }
            if (this.parentWidget.tree) {
                event_1.notify(this.parentWidget.tree, 'ev-scroller-touchend', { id: this.options.id, x: this.x, y: this.y, instance: this });
            }
            // reset if we are outside of the boundaries
            if (this.resetPosition(this.options.bounceTime, ease_1.ease.bounce)) {
                return;
            }
            this.isInTransition = false;
            // ensures that the last position is rounded
            var newX = Math.round(this.x);
            var newY = Math.round(this.y);
            // we scrolled less than 15 pixels
            if (!this.moved) {
                if (this.options.tap) {
                    dom_1.tap(e, this.options.tap);
                }
                if (this.options.click) {
                    dom_1.click(e);
                }
                if (this.parentWidget.tree) {
                    event_1.notify(this.parentWidget.tree, 'ev-scroller-scrollcancel', { id: this.options.id, x: this.x, y: this.y, instance: this });
                }
                return;
            }
            this.scrollTo(newX, newY);
            var deltaX = newX - this.absStartX;
            var deltaY = newY - this.absStartY;
            this.directionX = deltaX > 0 ? -1 : deltaX < 0 ? 1 : 0;
            this.directionY = deltaY > 0 ? -1 : deltaY < 0 ? 1 : 0;
            this.endTime = +new Date();
            var duration = this.endTime - this.startTime;
            var absDistX = Math.abs(newX - this.startX);
            var absDistY = Math.abs(newY - this.startY);
            // fastclick
            if (duration < this.options.momentumLimitTime && absDistX < this.options.momentumLimitDistance && absDistY < this.options.momentumLimitDistance) {
                if (this.parentWidget.tree) {
                    event_1.notify(this.parentWidget.tree, 'ev-scroller-flick', { id: this.options.id, x: this.x, y: this.y, instance: this });
                }
                return;
            }
            var time = 0;
            // start momentum animation if needed
            if (this.options.momentum && duration < this.options.momentumLimitTime && (absDistY > this.options.momentumLimitDistance || absDistX > this.options.momentumLimitDistance)) {
                var momentumX = this.hasHorizontalScroll ? util_1.momentum(this.x, this.startX, duration, this.maxScrollX, this.options.bounce ? this.wrapperWidth : 0, this.options) : { destination: newX, duration: 0 };
                var momentumY = this.hasVerticalScroll ? util_1.momentum(this.y, this.startY, duration, this.maxScrollY, this.options.bounce ? this.wrapperHeight : 0, this.options) : { destination: newY, duration: 0 };
                newX = momentumX.destination;
                newY = momentumY.destination;
                time = Math.max(momentumX.duration, momentumY.duration);
                this.isInTransition = 1;
            }
            var easing = ease_1.ease.swipe;
            if (newX !== this.x || newY !== this.y) {
                // change easing function when scroller goes out of the boundaries
                if (newX > 0 || newX < this.maxScrollX || newY > 0 || newY < this.maxScrollY) {
                    easing = ease_1.ease.swipeBounce;
                }
                this.scrollTo(newX, newY, time, easing);
                return;
            }
            if (this.parentWidget.tree) {
                event_1.notify(this.parentWidget.tree, 'ev-scroller-scrollend', { id: this.options.id, x: this.x, y: this.y, instance: this });
            }
        }
    }, {
        key: "_resize",
        value: function _resize() {
            var _this2 = this;

            if (!this.enabled) {
                return;
            }
            clearTimeout(this.resizeTimeout);
            this.resizeTimeout = setTimeout(function () {
                _this2.refresh();
            }, this.options.resizePolling);
        }
    }, {
        key: "_startProbe",
        value: function _startProbe() {
            frame_mgr_1.cancelFrame(this.probeTimer);
            this.probeTimer = frame_mgr_1.requestFrame(probe);
            // tslint:disable:no-this-assignment
            var me = this;
            // tslint:disable:only-arrow-functions
            function probe() {
                var pos = me.getComputedPosition();
                if (me.parentWidget.tree) {
                    event_1.notify(me.parentWidget.tree, 'ev-scroller-scroll', { id: me.options.id, x: pos.x, y: pos.y, instance: me });
                }
                if (me.isInTransition) {
                    me.probeTimer = frame_mgr_1.requestFrame(probe);
                }
            }
        }
    }, {
        key: "_transitionTime",
        value: function _transitionTime() {
            var _this3 = this;

            var time = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;

            // tslint:disable:prefer-template
            painter_1.paintCmd3(this.scroller.style, dom_1.style.transitionDuration, time + 'ms');
            // this.scroller.style[style.transitionDuration] = time + 'ms';
            if (!time && util_1.isBadAndroid) {
                painter_1.paintCmd3(this.scroller.style, dom_1.style.transitionDuration, '0.001s');
                // this.scroller.style[style.transitionDuration] = '0.001s';					
                frame_mgr_1.requestFrame(function () {
                    if (_this3.scroller.style[dom_1.style.transitionDuration] === '0.0001ms') {
                        painter_1.paintCmd3(_this3.scroller.style, dom_1.style.transitionDuration, '0s');
                        // this.scroller.style[style.transitionDuration] = '0s';
                    }
                });
            }
        }
    }, {
        key: "_transitionTimingFunction",
        value: function _transitionTimingFunction(easing) {
            console.log("easing is " + easing);
            painter_1.paintCmd3(this.scroller.style, dom_1.style.transitionTimingFunction, easing);
            // this.scroller.style[style.transitionTimingFunction] = easing;
        }
    }, {
        key: "_transitionEnd",
        value: function _transitionEnd(e) {
            if (e.target !== this.scroller || !this.isInTransition) {
                return;
            }
            this._transitionTime();
            if (!this.resetPosition(this.options.bounceTime, ease_1.ease.bounce)) {
                this.isInTransition = false;
                if (this.parentWidget.tree) {
                    event_1.notify(this.parentWidget.tree, 'ev-scroller-scrollend', { id: this.options.id, x: this.x, y: this.y, instance: this });
                }
            }
        }
    }, {
        key: "_translate",
        value: function _translate(x, y) {
            if (this.options.useTransform) {
                painter_1.paintCmd3(this.scroller.style, dom_1.style.transform, 'translate(' + x + 'px,' + y + 'px)' + this.translateZ);
                // this.scroller.style[style.transform] = 'translate(' + x + 'px,' + y + 'px)' + this.translateZ;
            } else {
                x = Math.round(x);
                y = Math.round(y);
                painter_1.paintCmd3(this.scroller.style, 'left', x + 'px');
                painter_1.paintCmd3(this.scroller.style, 'top', y + 'px');
                // this.scroller.style.left = x+"px";
                // this.scroller.style.top = y+"px";
            }
            this.x = x;
            this.y = y;
        }
    }, {
        key: "enable",
        value: function enable() {
            this.enabled = true;
        }
    }, {
        key: "disable",
        value: function disable() {
            this.enabled = false;
        }
    }, {
        key: "refresh",
        value: function refresh() {
            var rf = this.wrapper.offsetHeight;
            // tslint:disable:radix
            this.wrapperWidth = parseInt(this.wrapper.style.width) || this.wrapper.clientWidth;
            this.wrapperHeight = parseInt(this.wrapper.style.height) || this.wrapper.clientHeight;
            this.scrollerWidth = parseInt(this.scroller.style.width) || this.scroller.clientWidth;
            this.scrollerHeight = parseInt(this.scroller.style.height) || this.scroller.clientHeight;
            this.maxScrollX = this.wrapperWidth - this.scrollerWidth;
            this.maxScrollY = this.wrapperHeight - this.scrollerHeight;
            this.hasHorizontalScroll = this.options.scrollX && this.maxScrollX < 0;
            this.hasVerticalScroll = this.options.scrollY && this.maxScrollY < 0;
            if (!this.hasHorizontalScroll) {
                this.maxScrollX = 0;
                this.scrollerWidth = this.wrapperWidth;
            }
            if (!this.hasVerticalScroll) {
                this.maxScrollY = 0;
                this.scrollerHeight = this.wrapperHeight;
            }
            this.endTime = 0;
            this.directionX = 0;
            this.directionY = 0;
            this.wrapperOffset = dom_1.offset(this.wrapper);
            if (this.parentWidget.tree) {
                event_1.notify(this.parentWidget.tree, 'ev-scroller-refresh', { id: this.options.id, x: this.x, y: this.y, instance: this });
            }
            this.resetPosition();
        }
    }, {
        key: "resetPosition",
        value: function resetPosition() {
            var time = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;
            var easeing = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : ease_1.ease.bounce;

            var x = this.x;
            if (!this.hasHorizontalScroll || x > 0) {
                x = 0;
            } else if (x < this.maxScrollX) {
                x = this.maxScrollX;
            }
            var y = this.y;
            if (!this.hasVerticalScroll || y > 0) {
                y = 0;
            } else if (y < this.maxScrollY) {
                y = this.maxScrollY;
            }
            if (x === this.x && y === this.y) {
                return false;
            }
            this.scrollTo(x, y, time, easeing);
            return true;
        }
    }, {
        key: "scrollTo",
        value: function scrollTo(x, y, time, easing) {
            if (!easing) {
                // easing = ease.bounce
                easing = ease_1.ease.swipe;
            }
            this.isInTransition = this.options.useTransition && time > 0 && (x !== this.x || y !== this.y);
            if (!time || this.options.useTransition) {
                this._transitionTimingFunction(easing.style);
                this._transitionTime(time);
                this._translate(x, y);
                if (time && this.options.probeType === 3) {
                    this._startProbe();
                }
            }
        }
    }, {
        key: "getComputedPosition",
        value: function getComputedPosition() {
            var matrix = window.getComputedStyle(this.scroller, null);
            var x = void 0;
            var y = void 0;
            if (this.options.useTransform) {
                matrix = matrix[dom_1.style.transform].split(')')[0].split(', ');
                x = +(matrix[12] || matrix[4]);
                y = +(matrix[13] || matrix[5]);
            } else {
                x = +matrix.left.replace(/[^-\d.]/g, '');
                y = +matrix.top.replace(/[^-\d.]/g, '');
            }
            return {
                x: x,
                y: y
            };
        }
    }, {
        key: "destroy",
        value: function destroy() {
            this._removeEvents();
            this.destroyed = true;
            if (this.parentWidget.tree) {
                event_1.notify(this.parentWidget.tree, 'ev-scroller-destroy', { id: this.options.id, x: this.x, y: this.y, instance: this });
            }
        }
    }, {
        key: "handleEvent",
        value: function handleEvent(e) {
            switch (e.type) {
                case 'touchstart':
                case 'mousedown':
                    this._start(e);
                    break;
                case 'touchmove':
                case 'mousemove':
                    this._move(e);
                    break;
                case 'touchend':
                case 'mouseup':
                case 'touchcancel':
                case 'mousecancel':
                    this._end(e);
                    break;
                case 'orientationchange':
                case 'resize':
                    this._resize();
                    break;
                case 'transitionend':
                case 'webkitTransitionEnd':
                case 'oTransitionEnd':
                case 'MSTransitionEnd':
                    this._transitionEnd(e);
                    break;
                case 'click':
                    if (this.enabled && !e._constructed && !/(SELECT|INPUT|TEXTAREA)/i.test(e.target.tagName)) {
                        e.preventDefault();
                        e.stopPropagation();
                    }
                    break;
                default:
            }
        }
    }]);

    return BScroll;
}();

exports.BScroll = BScroll;
})