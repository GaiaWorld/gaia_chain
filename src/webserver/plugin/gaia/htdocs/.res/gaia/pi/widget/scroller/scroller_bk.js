_$define("pi/widget/scroller/scroller_bk", function (require, exports, module){
"use strict";

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

Object.defineProperty(exports, "__esModule", { value: true });
/**
 * 滚动组件
 */
// ====================================== 导入
var event_1 = require("../../widget/event");
var painter_1 = require("../../widget/painter");
var widget_1 = require("../../widget/widget");
var dom_1 = require("./dom");
var ease_1 = require("./ease");
var util_1 = require("./util");
// ====================================== 常量声明
var TOUCH_EVENT = 1;
// ====================================== 导出

var BScroll = function (_widget_1$Widget) {
    _inherits(BScroll, _widget_1$Widget);

    function BScroll() {
        _classCallCheck(this, BScroll);

        var _this = _possibleConstructorReturn(this, (BScroll.__proto__ || Object.getPrototypeOf(BScroll)).apply(this, arguments));

        _this.x = 0;
        _this.y = 0;
        _this.directionX = 0;
        _this.directionY = 0;
        // tslint:disable:typedef
        // tslint:disable:no-object-literal-type-assertion
        _this.currentPage = {};
        _this.pages = [];
        // tslint:disable:variable-name
        _this._events = {};
        _this.props = {
            id: null,
            child: null,
            childProps: null,
            options: {
                startX: 0,
                startY: 0,
                scrollX: false,
                scrollY: true,
                directionLockThreshold: 5,
                momentum: true,
                bounce: true,
                selectedIndex: 0,
                rotate: 25,
                wheel: false,
                snap: false,
                snapLoop: false,
                snapThreshold: 0.1,
                swipeTime: 2500,
                bounceTime: 700,
                adjustTime: 400,
                swipeBounceTime: 1200,
                deceleration: 0.001,
                momentumLimitTime: 300,
                momentumLimitDistance: 15,
                resizePolling: 60,
                preventDefault: true,
                preventDefaultException: {
                    tagName: /^(INPUT|TEXTAREA|BUTTON|SELECT)$/
                },
                HWCompositing: true,
                useTransition: true,
                useTransform: true,
                eventPassthrough: null,
                tap: null,
                bindToWrapper: null,
                click: null,
                disableMouse: null,
                disableTouch: null,
                scrollerStyle: [],
                snapStepX: null,
                snapStepY: null,
                probeType: null,
                snapSpeed: null,
                itemHeight: null
            }
        };
        return _this;
    }
    // ============================================================== 公共函数


    _createClass(BScroll, [{
        key: "setProps",
        value: function setProps(props, oldProps) {
            _get(BScroll.prototype.__proto__ || Object.getPrototypeOf(BScroll.prototype), "updateProps", this).call(this, props, oldProps);
            this.translateZ = this.props.options.HWCompositing && dom_1.hasPerspective ? ' translateZ(0)' : '';
            this.props.options.useTransition = this.props.options.useTransition && dom_1.hasTransition;
            this.props.options.useTransform = this.props.options.useTransform && dom_1.hasTransform;
            this.props.options.eventPassthrough = this.props.options.eventPassthrough === true ? 'vertical' : this.props.options.eventPassthrough;
            this.props.options.preventDefault = !this.props.options.eventPassthrough && this.props.options.preventDefault;
            // If you want eventPassthrough I have to lock one of the axes
            this.props.options.scrollX = this.props.options.eventPassthrough === 'horizontal' ? false : this.props.options.scrollX;
            this.props.options.scrollY = this.props.options.eventPassthrough === 'vertical' ? false : this.props.options.scrollY;
            // With eventPassthrough we also need lockDirection mechanism
            this.props.options.freeScroll = this.props.options.freeScroll && !this.props.options.eventPassthrough;
            this.props.options.directionLockThreshold = this.props.options.eventPassthrough ? 0 : this.props.options.directionLockThreshold;
            if (this.props.options.tap === true) {
                this.props.options.tap = 'tap';
            }
        }
    }, {
        key: "firstPaint",
        value: function firstPaint() {
            this.wrapper = painter_1.getRealNode(this.tree);
            this.scroller = this.wrapper.children[0];
            this._init();
            if (this.props.options.snap) {
                this._initSnap();
            }
            this.refresh();
            if (!this.props.options.snap) {
                this.scrollTo(this.props.options.startX, this.props.options.startY);
            }
            this.enable();
            for (var key in this.props.options.scrollerStyle) {
                painter_1.paintCmd3(this.scroller.style, key, this.props.options.scrollerStyle[key]);
            }
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
            if (this.props.options.wheel) {
                this.items = this.scroller.children;
                this.props.options.itemHeight = this.itemHeight = this.items.length ? this.items[0].clientHeight : 0;
                if (this.selectedIndex === undefined) {
                    this.selectedIndex = this.props.options.selectedIndex;
                }
                this.props.options.startY = -this.selectedIndex * this.itemHeight;
                this.maxScrollX = 0;
                this.maxScrollY = -this.itemHeight * (this.items.length - 1);
            } else {
                this.maxScrollX = this.wrapperWidth - this.scrollerWidth;
                this.maxScrollY = this.wrapperHeight - this.scrollerHeight;
            }
            this.hasHorizontalScroll = this.props.options.scrollX && this.maxScrollX < 0;
            this.hasVerticalScroll = this.props.options.scrollY && this.maxScrollY < 0;
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
            event_1.notify(this.parentNode, 'ev-scroller-refresh', { id: this.props.id });
            this.resetPosition();
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
        key: "goToPage",
        value: function goToPage(x, y, time) {
            var easing = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : ease_1.ease.bounce;

            if (x >= this.pages.length) {
                x = this.pages.length - 1;
            } else if (x < 0) {
                x = 0;
            }
            if (y >= this.pages[x].length) {
                y = this.pages[x].length - 1;
            } else if (y < 0) {
                y = 0;
            }
            var posX = this.pages[x][y].x;
            var posY = this.pages[x][y].y;
            time = time === undefined ? this.props.options.snapSpeed || Math.max(Math.max(Math.min(Math.abs(posX - this.x), 1000), Math.min(Math.abs(posY - this.y), 1000)), 300) : time;
            this.currentPage = {
                x: posX,
                y: posY,
                pageX: x,
                pageY: y
            };
            this.scrollTo(posX, posY, time, easing);
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
        key: "getComputedPosition",
        value: function getComputedPosition() {
            var matrix = window.getComputedStyle(this.scroller, null);
            var x = void 0;
            var y = void 0;
            if (this.props.options.useTransform) {
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
        key: "scrollTo",
        value: function scrollTo(x, y, time, easing) {
            if (!easing) {
                easing = ease_1.ease.bounce;
            }
            this.isInTransition = this.props.options.useTransition && time > 0 && (x !== this.x || y !== this.y);
            if (!time || this.props.options.useTransition) {
                this._transitionTimingFunction(easing.style);
                this._transitionTime(time);
                this._translate(x, y);
                console.log('scrollTo');
                if (time && this.props.options.probeType === 3) {
                    this._startProbe();
                }
                if (this.props.options.wheel) {
                    if (y > 0) {
                        this.selectedIndex = 0;
                    } else if (y < this.maxScrollY) {
                        this.selectedIndex = this.items.length - 1;
                    } else {
                        this.selectedIndex = Math.abs(y / this.itemHeight) | 0;
                    }
                }
            }
        }
    }, {
        key: "scrollToElement",
        value: function scrollToElement(el, time, offsetX, offsetY, easing) {
            if (!el) {
                return;
            }
            el = el.nodeType ? el : this.scroller.querySelector(el);
            if (this.props.options.wheel && el.className !== 'wheel-item') {
                return;
            }
            var pos = dom_1.offset(el);
            pos.left -= this.wrapperOffset.left;
            pos.top -= this.wrapperOffset.top;
            // if offsetX/Y are true we center the element to the screen
            if (offsetX === true) {
                offsetX = Math.round(el.offsetWidth / 2 - this.wrapper.offsetWidth / 2);
            }
            if (offsetY === true) {
                offsetY = Math.round(el.offsetHeight / 2 - this.wrapper.offsetHeight / 2);
            }
            pos.left -= offsetX || 0;
            pos.top -= offsetY || 0;
            pos.left = pos.left > 0 ? 0 : pos.left < this.maxScrollX ? this.maxScrollX : pos.left;
            pos.top = pos.top > 0 ? 0 : pos.top < this.maxScrollY ? this.maxScrollY : pos.top;
            if (this.props.options.wheel) {
                pos.top = Math.round(pos.top / this.itemHeight) * this.itemHeight;
            }
            time = time === undefined || time === null || time === 'auto' ? Math.max(Math.abs(this.x - pos.left), Math.abs(this.y - pos.top)) : time;
            this.scrollTo(pos.left, pos.top, time, easing);
        }
        // ============================================================== 私有函数
        // tslint:disable:function-name

    }, {
        key: "_init",
        value: function _init() {
            this._addEvents();
        }
        // tslint:disable-next-line:max-func-body-length

    }, {
        key: "_initSnap",
        value: function _initSnap() {
            var _this2 = this;

            this.currentPage = {};
            if (this.props.options.snapLoop) {
                var children = this.scroller.children;
                if (children.length > 0) {
                    dom_1.prepend(children[children.length - 1].cloneNode(true), this.scroller);
                    this.scroller.appendChild(children[1].cloneNode(true));
                }
            }
            if (typeof this.props.options.snap === 'string') {
                this.props.options.snap = this.scroller.querySelectorAll(this.props.options.snap);
            }
            this.on('refresh', function () {
                _this2.pages = [];
                if (!_this2.wrapperWidth || !_this2.wrapperHeight || !_this2.scrollerWidth || !_this2.scrollerHeight) {
                    return;
                }
                var stepX = _this2.props.options.snapStepX || _this2.wrapperWidth;
                var stepY = _this2.props.options.snapStepY || _this2.wrapperHeight;
                var x = 0;
                var y = void 0;
                var cx = void 0;
                var cy = void 0;
                var i = 0;
                var l = void 0;
                var m = 0;
                var n = void 0;
                var el = void 0;
                var rect = void 0;
                if (_this2.props.options.snap === true) {
                    cx = Math.round(stepX / 2);
                    cy = Math.round(stepY / 2);
                    while (x > -_this2.scrollerWidth) {
                        _this2.pages[i] = [];
                        l = 0;
                        y = 0;
                        while (y > -_this2.scrollerHeight) {
                            _this2.pages[i][l] = {
                                x: Math.max(x, _this2.maxScrollX),
                                y: Math.max(y, _this2.maxScrollY),
                                width: stepX,
                                height: stepY,
                                cx: x - cx,
                                cy: y - cy
                            };
                            y -= stepY;
                            l++;
                        }
                        x -= stepX;
                        i++;
                    }
                } else {
                    el = _this2.props.options.snap;
                    l = el.length;
                    n = -1;
                    for (; i < l; i++) {
                        rect = dom_1.getRect(el[i]);
                        if (i === 0 || rect.left <= dom_1.getRect(el[i - 1]).left) {
                            m = 0;
                            n++;
                        }
                        if (!_this2.pages[m]) {
                            _this2.pages[m] = [];
                        }
                        x = Math.max(-rect.left, _this2.maxScrollX);
                        y = Math.max(-rect.top, _this2.maxScrollY);
                        cx = x - Math.round(rect.width / 2);
                        cy = y - Math.round(rect.height / 2);
                        _this2.pages[m][n] = {
                            x: x,
                            y: y,
                            width: rect.width,
                            height: rect.height,
                            cx: cx,
                            cy: cy
                        };
                        if (x > _this2.maxScrollX) {
                            m++;
                        }
                    }
                }
                var initPage = _this2.props.options.snapLoop ? 1 : 0;
                _this2.goToPage(_this2.currentPage.pageX || initPage, _this2.currentPage.pageY || 0, 0);
                // Update snap threshold if needed
                if (_this2.props.options.snapThreshold % 1 === 0) {
                    _this2.snapThresholdX = _this2.props.options.snapThreshold;
                    _this2.snapThresholdY = _this2.props.options.snapThreshold;
                } else {
                    _this2.snapThresholdX = Math.round(_this2.pages[_this2.currentPage.pageX][_this2.currentPage.pageY].width * _this2.props.options.snapThreshold);
                    _this2.snapThresholdY = Math.round(_this2.pages[_this2.currentPage.pageX][_this2.currentPage.pageY].height * _this2.props.options.snapThreshold);
                }
            });
            this.on('scrollEnd', function () {
                if (_this2.props.options.snapLoop) {
                    if (_this2.currentPage.pageX === 0) {
                        _this2.goToPage(_this2.pages.length - 2, _this2.currentPage.pageY, 0);
                    }
                    if (_this2.currentPage.pageX === _this2.pages.length - 1) {
                        _this2.goToPage(1, _this2.currentPage.pageY, 0);
                    }
                }
            });
            this.on('flick', function () {
                var time = _this2.props.options.snapSpeed || Math.max(Math.max(Math.min(Math.abs(_this2.x - _this2.startX), 1000), Math.min(Math.abs(_this2.y - _this2.startY), 1000)), 300);
                _this2.goToPage(_this2.currentPage.pageX + _this2.directionX, _this2.currentPage.pageY + _this2.directionY, time);
            });
        }
    }, {
        key: "_transitionTimingFunction",
        value: function _transitionTimingFunction(easing) {
            this.props.options.scrollerStyle[dom_1.style.transitionTimingFunction] = easing;
            painter_1.paintCmd3(this.scroller.style, dom_1.style.transitionTimingFunction, this.props.options.scrollerStyle[dom_1.style.transitionTimingFunction]);
            // paintCmd3(this.scroller, "style" , this.props.options.scrollerStyle);
            if (this.props.options.wheel && !util_1.isBadAndroid) {
                for (var i = 0; i < this.items.length; i++) {
                    this.items[i].style[dom_1.style.transitionTimingFunction] = easing;
                    painter_1.paintCmd3(this.items[i].style, dom_1.style.transitionTimingFunction, this.items[i].style[dom_1.style.transitionTimingFunction]);
                }
            }
        }
    }, {
        key: "_transitionEnd",
        value: function _transitionEnd(e) {
            if (e.target !== this.scroller || !this.isInTransition) {
                return;
            }
            this._transitionTime();
            if (!this.resetPosition(this.props.options.bounceTime, ease_1.ease.bounce)) {
                this.isInTransition = false;
                event_1.notify(this.parentNode, 'ev-scroller-scrollend', { id: this.props.id, x: this.x, y: this.y });
            }
        }
    }, {
        key: "_transitionTime",
        value: function _transitionTime() {
            var _this3 = this;

            var time = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;

            // paintCmd3(this.scroller, "style" , this.props.options.scrollerStyle);
            // tslint:disable:prefer-template
            this.props.options.scrollerStyle[dom_1.style.transitionDuration] = time + 'ms';
            painter_1.paintCmd3(this.scroller.style, dom_1.style.transitionDuration, this.props.options.scrollerStyle[dom_1.style.transitionDuration]);
            // paintCmd3(this.scroller, "style" , this.props.options.scrollerStyle);
            if (this.props.options.wheel && !util_1.isBadAndroid) {
                for (var i = 0; i < this.items.length; i++) {
                    this.items[i].style[dom_1.style.transitionDuration] = time + 'ms';
                    painter_1.paintCmd3(this.items[i].style, dom_1.style.transitionDuration, this.items[i].style[dom_1.style.transitionDuration]);
                }
            }
            if (!time && util_1.isBadAndroid) {
                this.props.options.scrollerStyle[dom_1.style.transitionDuration] = '0.001s';
                painter_1.paintCmd3(this.scroller.style, dom_1.style.transitionDuration, this.props.options.scrollerStyle[dom_1.style.transitionDuration]);
                requestAnimationFrame(function () {
                    if (_this3.props.options.scrollerStyle[dom_1.style.transitionDuration] === '0.0001ms') {
                        _this3.props.options.scrollerStyle[dom_1.style.transitionDuration] = '0s';
                        painter_1.paintCmd3(_this3.scroller.style, dom_1.style.transitionDuration, _this3.props.options.scrollerStyle[dom_1.style.transitionDuration]);
                    }
                });
            }
        }
    }, {
        key: "_translate",
        value: function _translate(x, y) {
            if (this.props.options.useTransform) {
                console.log("this.props.options.scrollerStyle[style.transform] : " + this.props.options.scrollerStyle[dom_1.style.transform]);
                this.props.options.scrollerStyle[dom_1.style.transform] = 'translate(' + x + 'px,' + y + 'px)' + this.translateZ;
                painter_1.paintCmd3(this.scroller.style, dom_1.style.transform, this.props.options.scrollerStyle[dom_1.style.transform]);
            } else {
                x = Math.round(x);
                y = Math.round(y);
                this.props.options.scrollerStyle.left = x + 'px';
                painter_1.paintCmd3(this.scroller.style, 'left', this.props.options.scrollerStyle.left);
                this.props.options.scrollerStyle.top = y + 'px';
                painter_1.paintCmd3(this.scroller.style, 'top', this.props.options.scrollerStyle.top);
            }
            if (this.props.options.wheel && !util_1.isBadAndroid) {
                for (var i = 0; i < this.items.length; i++) {
                    var deg = this.props.options.rotate * (y / this.itemHeight + i);
                    this.items[i].style[dom_1.style.transform] = 'rotateX(' + deg + 'deg)';
                    painter_1.paintCmd3(this.items[i].style, dom_1.style.transform, this.items[i].style[dom_1.style.transform]);
                }
            }
            this.x = x;
            this.y = y;
        }
    }, {
        key: "_startProbe",
        value: function _startProbe() {
            cancelAnimationFrame(this.probeTimer);
            this.probeTimer = requestAnimationFrame(probe);
            // tslint:disable:no-this-assignment
            var me = this;
            function probe() {
                var pos = me.getComputedPosition();
                event_1.notify(me.parentNode, 'ev-scroller-scroll', { id: this.props.id, x: pos.x, y: pos.y });
                if (me.isInTransition) {
                    me.probeTimer = requestAnimationFrame(probe);
                }
            }
        }
    }, {
        key: "_addEvents",
        value: function _addEvents() {
            this._handleEvents(dom_1.addEvent);
        }
    }, {
        key: "_removeEvents",
        value: function _removeEvents() {
            this._handleEvents(dom_1.addEvent);
        }
    }, {
        key: "_handleEvents",
        value: function _handleEvents(eventOperation) {
            var target = this.props.options.bindToWrapper ? this.wrapper : window;
            eventOperation(window, 'orientationchange', this);
            eventOperation(window, 'resize', this);
            if (this.props.options.click) {
                eventOperation(this.wrapper, 'click', this);
            }
            if (!this.props.options.disableMouse) {
                eventOperation(this.wrapper, 'mousedown', this);
                eventOperation(target, 'mousemove', this);
                eventOperation(target, 'mousecancel', this);
                eventOperation(target, 'mouseup', this);
            }
            if (dom_1.hasTouch && !this.props.options.disableTouch) {
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
            if (this.props.options.preventDefault && !util_1.isBadAndroid && !dom_1.preventDefaultException(e.target, this.props.options.preventDefaultException)) {
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
            if (this.props.options.wheel) {
                this.target = e.target;
            }
            if (this.props.options.useTransition && this.isInTransition) {
                this.isInTransition = false;
                var pos = this.getComputedPosition();
                this._translate(pos.x, pos.y);
                console.log('_start');
                if (this.props.options.wheel) {
                    this.target = this.items[Math.round(-pos.y / this.itemHeight)];
                } else {
                    event_1.notify(this.parentNode, 'ev-scroller-scrollend', { id: this.props.id, x: this.x, y: this.y });
                }
            }
            var point = e.touches ? e.touches[0] : e;
            this.startX = this.x;
            this.startY = this.y;
            this.absStartX = this.x;
            this.absStartY = this.y;
            this.pointX = point.pageX;
            this.pointY = point.pageY;
            event_1.notify(this.parentNode, 'ev-scroller-beforescrollstart', { id: this.props.id });
        }
        // tslint:disable:cyclomatic-complexity
        // tslint:disable-next-line:max-func-body-length

    }, {
        key: "_move",
        value: function _move(e) {
            if (!this.enabled || this.destroyed || dom_1.eventType[e.type] !== this.initiated) {
                return;
            }
            if (this.props.options.preventDefault) {
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
            // tslint:disable:max-line-length
            if (timestamp - this.endTime > this.props.options.momentumLimitTime && absDistY < this.props.options.momentumLimitDistance && absDistX < this.props.options.momentumLimitDistance) {
                return;
            }
            // If you are scrolling in one direction lock the other
            if (!this.directionLocked && !this.props.options.freeScroll) {
                if (absDistX > absDistY + this.props.options.directionLockThreshold) {
                    this.directionLocked = 'h'; // lock horizontally
                } else if (absDistY >= absDistX + this.props.options.directionLockThreshold) {
                    this.directionLocked = 'v'; // lock vertically
                } else {
                    this.directionLocked = 'n'; // no lock
                }
            }
            if (this.directionLocked === 'h') {
                if (this.props.options.eventPassthrough === 'vertical') {
                    e.preventDefault();
                } else if (this.props.options.eventPassthrough === 'horizontal') {
                    this.initiated = false;
                    return;
                }
                deltaY = 0;
            } else if (this.directionLocked === 'v') {
                if (this.props.options.eventPassthrough === 'horizontal') {
                    e.preventDefault();
                } else if (this.props.options.eventPassthrough === 'vertical') {
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
                if (this.props.options.bounce) {
                    newX = this.x + deltaX / 3;
                } else {
                    newX = newX > 0 ? 0 : this.maxScrollX;
                }
            }
            if (newY > 0 || newY < this.maxScrollY) {
                if (this.props.options.bounce) {
                    newY = this.y + deltaY / 3;
                } else {
                    newY = newY > 0 ? 0 : this.maxScrollY;
                }
            }
            // this.directionX = deltaX > 0 ? -1 : deltaX < 0 ? 1 : 0;
            // this.directionY = deltaY > 0 ? -1 : deltaY < 0 ? 1 : 0;
            if (!this.moved) {
                this.moved = true;
                event_1.notify(this.parentNode, 'ev-scroller-scrollstart', { id: this.props.id });
            }
            this._translate(newX, newY);
            console.log('_move');
            if (timestamp - this.startTime > this.props.options.momentumLimitTime) {
                this.startTime = timestamp;
                this.startX = this.x;
                this.startY = this.y;
                if (this.props.options.probeType === 1) {
                    event_1.notify(this.parentNode, 'ev-scroller-scroll', { id: this.props.id, x: this.x, y: this.y });
                }
            }
            if (this.props.options.probeType > 1) {
                event_1.notify(this.parentNode, 'ev-scroller-scroll', { id: this.props.id, x: this.x, y: this.y });
            }
            var scrollLeft = document.documentElement.scrollLeft || window.pageXOffset || document.body.scrollLeft;
            var scrollTop = document.documentElement.scrollTop || window.pageYOffset || document.body.scrollTop;
            var pX = this.pointX - scrollLeft;
            var pY = this.pointY - scrollTop;
            if (pX > document.documentElement.clientWidth - this.props.options.momentumLimitDistance || pX < this.props.options.momentumLimitDistance || pY < this.props.options.momentumLimitDistance || pY > document.documentElement.clientHeight - this.props.options.momentumLimitDistance) {
                this._end(e);
            }
        }
        // tslint:disable-next-line:max-func-body-length

    }, {
        key: "_end",
        value: function _end(e) {
            if (!this.enabled || this.destroyed || dom_1.eventType[e.type] !== this.initiated) {
                return;
            }
            this.initiated = false;
            if (this.props.options.preventDefault && !dom_1.preventDefaultException(e.target, this.props.options.preventDefaultException)) {
                e.preventDefault();
            }
            event_1.notify(this.parentNode, 'ev-scroller-touchend', { id: this.props.id, x: this.x, y: this.y });
            // reset if we are outside of the boundaries
            if (this.resetPosition(this.props.options.bounceTime, ease_1.ease.bounce)) {
                return;
            }
            this.isInTransition = false;
            // ensures that the last position is rounded
            var newX = Math.round(this.x);
            var newY = Math.round(this.y);
            // we scrolled less than 15 pixels
            if (!this.moved) {
                if (this.props.options.wheel) {
                    if (this.target && this.target.className === 'wheel-scroll') {
                        var index = Math.abs(Math.round(newY / this.itemHeight));
                        var _offset = Math.round((this.pointY + dom_1.offset(this.target).top - this.itemHeight / 2) / this.itemHeight);
                        this.target = this.items[index + _offset];
                    }
                    this.scrollToElement(this.target, this.props.options.adjustTime, true, true, ease_1.ease.swipe);
                } else {
                    if (this.props.options.tap) {
                        dom_1.tap(e, this.props.options.tap);
                    }
                    if (this.props.options.click) {
                        dom_1.click(e);
                    }
                }
                event_1.notify(this.parentNode, 'ev-scroller-scrollcancel', { id: this.props.id });
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
            if (this._events.flick && duration < this.props.options.momentumLimitTime && absDistX < this.props.options.momentumLimitDistance && absDistY < this.props.options.momentumLimitDistance) {
                event_1.notify(this.parentNode, 'ev-scroller-flick', { id: this.props.id });
                return;
            }
            var time = 0;
            // start momentum animation if needed
            if (this.props.options.momentum && duration < this.props.options.momentumLimitTime && (absDistY > this.props.options.momentumLimitDistance || absDistX > this.props.options.momentumLimitDistance)) {
                var momentumX = this.hasHorizontalScroll ? util_1.momentum(this.x, this.startX, duration, this.maxScrollX, this.props.options.bounce ? this.wrapperWidth : 0, this.props.options) : { destination: newX, duration: 0 };
                var momentumY = this.hasVerticalScroll ? util_1.momentum(this.y, this.startY, duration, this.maxScrollY, this.props.options.bounce ? this.wrapperHeight : 0, this.props.options) : { destination: newY, duration: 0 };
                newX = momentumX.destination;
                newY = momentumY.destination;
                time = Math.max(momentumX.duration, momentumY.duration);
                this.isInTransition = 1;
            } else {
                if (this.props.options.wheel) {
                    newY = Math.round(newY / this.itemHeight) * this.itemHeight;
                    time = this.props.options.adjustTime;
                }
            }
            var easing = ease_1.ease.swipe;
            if (this.props.options.snap) {
                var snap = this._nearestSnap(newX, newY);
                this.currentPage = snap;
                time = this.props.options.snapSpeed || Math.max(Math.max(Math.min(Math.abs(newX - snap.x), 1000), Math.min(Math.abs(newY - snap.y), 1000)), 300);
                newX = snap.x;
                newY = snap.y;
                this.directionX = 0;
                this.directionY = 0;
                easing = ease_1.ease.bounce;
            }
            if (newX !== this.x || newY !== this.y) {
                // change easing function when scroller goes out of the boundaries
                if (newX > 0 || newX < this.maxScrollX || newY > 0 || newY < this.maxScrollY) {
                    easing = ease_1.ease.swipeBounce;
                }
                this.scrollTo(newX, newY, time, easing);
                return;
            }
            if (this.props.options.wheel) {
                this.selectedIndex = Math.abs(this.y / this.itemHeight) | 0;
            }
            event_1.notify(this.parentNode, 'ev-scroller-scrollend', { id: this.props.id, x: this.x, y: this.y });
        }
    }, {
        key: "_nearestSnap",
        value: function _nearestSnap(x, y) {
            if (!this.pages.length) {
                return { x: 0, y: 0, pageX: 0, pageY: 0 };
            }
            var i = 0;
            // Check if we exceeded the snap threshold
            if (Math.abs(x - this.absStartX) <= this.snapThresholdX && Math.abs(y - this.absStartY) <= this.snapThresholdY) {
                return this.currentPage;
            }
            if (x > 0) {
                x = 0;
            } else if (x < this.maxScrollX) {
                x = this.maxScrollX;
            }
            if (y > 0) {
                y = 0;
            } else if (y < this.maxScrollY) {
                y = this.maxScrollY;
            }
            var l = this.pages.length;
            for (; i < l; i++) {
                if (x >= this.pages[i][0].cx) {
                    x = this.pages[i][0].x;
                    break;
                }
            }
            l = this.pages[i].length;
            var m = 0;
            for (; m < l; m++) {
                if (y >= this.pages[0][m].cy) {
                    y = this.pages[0][m].y;
                    break;
                }
            }
            if (i === this.currentPage.pageX) {
                i += this.directionX;
                if (i < 0) {
                    i = 0;
                } else if (i >= this.pages.length) {
                    i = this.pages.length - 1;
                }
                x = this.pages[i][0].x;
            }
            if (m === this.currentPage.pageY) {
                m += this.directionY;
                if (m < 0) {
                    m = 0;
                } else if (m >= this.pages[0].length) {
                    m = this.pages[0].length - 1;
                }
                y = this.pages[0][m].y;
            }
            return {
                x: x,
                y: y,
                pageX: i,
                pageY: m
            };
        }
    }, {
        key: "_resize",
        value: function _resize() {
            var _this4 = this;

            if (!this.enabled) {
                return;
            }
            clearTimeout(this.resizeTimeout);
            this.resizeTimeout = setTimeout(function () {
                _this4.refresh();
            }, this.props.options.resizePolling);
        }
        // ============================================================== 事件处理
        // tslint:disable:no-reserved-keywords

    }, {
        key: "on",
        value: function on(type, fn) {
            var context = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : this;

            if (!this._events[type]) {
                this._events[type] = [];
            }
            this._events[type].push([fn, context]);
        }
    }, {
        key: "once",
        value: function once(type, fn) {
            var context = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : this;

            var fired = false;
            function magic() {
                this.off(type, magic);
                if (!fired) {
                    fired = true;
                    fn.apply(context, arguments);
                }
            }
            this.on(type, magic);
        }
    }, {
        key: "off",
        value: function off(type, fn) {
            var _events = this._events[type];
            if (!_events) {
                return;
            }
            var count = _events.length;
            while (count--) {
                if (_events[count][0] === fn) {
                    _events[count][0] = undefined;
                }
            }
        }
    }, {
        key: "trigger",
        value: function trigger(type) {
            for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
                args[_key - 1] = arguments[_key];
            }

            var events = this._events[type];
            if (!events) {
                return;
            }
            var len = events.length;
            var eventsCopy = [].concat(_toConsumableArray(events));
            for (var i = 0; i < len; i++) {
                var event = eventsCopy[i];

                var _event = _slicedToArray(event, 2),
                    fn = _event[0],
                    context = _event[1];

                if (fn) {
                    fn.apply(context, [].slice.call(arguments, 1));
                }
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
}(widget_1.Widget);

exports.BScroll = BScroll;
})