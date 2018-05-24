/**
 * 滚动组件
 */
// ====================================== 导入
import { notify } from '../../widget/event';
import { cancelFrame, requestFrame } from '../../widget/frame_mgr';
import { getRealNode, paintCmd3 } from '../../widget/painter';
import { Widget } from '../../widget/widget';
import {
	addEvent,
	click,
	eventType,
	getRect,
	hasPerspective,
	hasTouch,
	hasTransform,
	hasTransition,
	offset,
	prepend,
	preventDefaultException,
	removeEvent,
	style,
	tap
} from './dom';
import { ease } from './ease';
import { isBadAndroid, momentum } from './util';

// ====================================== 常量声明
const TOUCH_EVENT = 1;
// ====================================== 导出
export class BScroll extends Widget {
	public wrapper: HTMLElement;
	public scroller: HTMLElement;
	public translateZ: string;
	public wrapperWidth: number;
	public wrapperHeight: number;
	public scrollerWidth: number;
	public scrollerHeight: number;
	public maxScrollX: number;
	public maxScrollY: number;
	public snapThresholdX: number;
	public snapThresholdY: number;
	public x: number = 0;
	public y: number = 0;
	public directionX: number = 0;
	public directionY: number = 0;
	public startX: number;
	public startY: number;
	// tslint:disable:typedef
	// tslint:disable:no-object-literal-type-assertion
	public currentPage = <PagePos>{};
	public pages = [];
	public isInTransition: number | boolean;
	public selectedIndex: number;
	public items: any;
	public itemHeight: number;
	public hasHorizontalScroll: boolean;
	public hasVerticalScroll: boolean;
	public probeTimer: any;
	public enabled: boolean;
	public wrapperOffset: { left: number; top: number };
	public destroyed: boolean;
	public initiated: boolean;
	public moved: boolean;
	public distX: number;
	public distY: number;
	public endTime: number;
	public startTime: number;
	public directionLocked: any;
	public target: any;
	public absStartX: number;
	public absStartY: number;
	public pointX: number;
	public pointY: number;
	public resizeTimeout: number;

	// tslint:disable:variable-name
	public _events = {};

	public props: Props = {
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
	// ============================================================== 公共函数
	public setProps(props: any, oldProps?: any) {
		super.updateProps(props, oldProps);
		this.translateZ = this.props.options.HWCompositing && hasPerspective ? ' translateZ(0)' : '';

		this.props.options.useTransition = this.props.options.useTransition && hasTransition;
		this.props.options.useTransform = this.props.options.useTransform && hasTransform;

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

	public firstPaint() {
		this.wrapper = <HTMLElement>getRealNode(this.tree);
		this.scroller = <HTMLElement>this.wrapper.children[0];
		this._init();
		if (this.props.options.snap) {
			this._initSnap();
		}
		this.refresh();
		if (!this.props.options.snap) {
			this.scrollTo(this.props.options.startX, this.props.options.startY);
		}
		this.enable();
		for (const key in this.props.options.scrollerStyle) {
			paintCmd3(this.scroller.style, key, this.props.options.scrollerStyle[key]);
		}
	}

	public refresh() {
		const rf = this.wrapper.offsetHeight;
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
		this.wrapperOffset = offset(this.wrapper);
		notify(this.parentNode, 'ev-scroller-refresh', { id: this.props.id });

		this.resetPosition();
	}

	public enable() {
		this.enabled = true;
	}

	public disable() {
		this.enabled = false;
	}

	public goToPage(x, y, time, easing = ease.bounce) {
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

		const posX = this.pages[x][y].x;
		const posY = this.pages[x][y].y;

		time = time === undefined ? this.props.options.snapSpeed || Math.max(
			Math.max(
				Math.min(Math.abs(posX - this.x), 1000),
				Math.min(Math.abs(posY - this.y), 1000)
			), 300) : time;

		this.currentPage = {
			x: posX,
			y: posY,
			pageX: x,
			pageY: y
		};
		this.scrollTo(posX, posY, time, easing);
	}

	public resetPosition(time = 0, easeing = ease.bounce) {
		let x: number = this.x;
		if (!this.hasHorizontalScroll || x > 0) {
			x = 0;
		} else if (x < this.maxScrollX) {
			x = this.maxScrollX;
		}

		let y: number = this.y;
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

	public getComputedPosition() {
		let matrix: any = window.getComputedStyle(this.scroller, null);
		let x;
		let y;

		if (this.props.options.useTransform) {
			matrix = matrix[style.transform].split(')')[0].split(', ');
			x = +(matrix[12] || matrix[4]);
			y = +(matrix[13] || matrix[5]);
		} else {
			x = +matrix.left.replace(/[^-\d.]/g, '');
			y = +matrix.top.replace(/[^-\d.]/g, '');
		}

		return {
			x,
			y
		};
	}

	public scrollTo(x, y, time?, easing?) {
		if (!easing) {
			easing = ease.bounce;
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

	public scrollToElement(el, time, offsetX, offsetY, easing) {
		if (!el) {
			return;
		}
		el = el.nodeType ? el : this.scroller.querySelector(el);

		if (this.props.options.wheel && el.className !== 'wheel-item') {
			return;
		}

		const pos = offset(el);
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
	public _init() {
		this._addEvents();
	}

	// tslint:disable-next-line:max-func-body-length
	public _initSnap() {
		this.currentPage = <PagePos>{};
		if (this.props.options.snapLoop) {
			const children = this.scroller.children;
			if (children.length > 0) {
				prepend(children[children.length - 1].cloneNode(true), this.scroller);
				this.scroller.appendChild(children[1].cloneNode(true));
			}
		}

		if (typeof this.props.options.snap === 'string') {
			this.props.options.snap = <any>this.scroller.querySelectorAll(this.props.options.snap);
		}

		this.on('refresh', () => {
			this.pages = [];

			if (!this.wrapperWidth || !this.wrapperHeight || !this.scrollerWidth || !this.scrollerHeight) {
				return;
			}

			const stepX = this.props.options.snapStepX || this.wrapperWidth;
			const stepY = this.props.options.snapStepY || this.wrapperHeight;

			let x = 0;
			let y;
			let cx;
			let cy;
			let i = 0;
			let l;
			let m = 0;
			let n;
			let el;
			let rect;
			if (this.props.options.snap === true) {
				cx = Math.round(stepX / 2);
				cy = Math.round(stepY / 2);

				while (x > -this.scrollerWidth) {
					this.pages[i] = [];
					l = 0;
					y = 0;

					while (y > -this.scrollerHeight) {
						this.pages[i][l] = {
							x: Math.max(x, this.maxScrollX),
							y: Math.max(y, this.maxScrollY),
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
				el = this.props.options.snap;
				l = el.length;
				n = -1;

				for (; i < l; i++) {
					rect = getRect(el[i]);
					if (i === 0 || rect.left <= getRect(el[i - 1]).left) {
						m = 0;
						n++;
					}

					if (!this.pages[m]) {
						this.pages[m] = [];
					}

					x = Math.max(-rect.left, this.maxScrollX);
					y = Math.max(-rect.top, this.maxScrollY);
					cx = x - Math.round(rect.width / 2);
					cy = y - Math.round(rect.height / 2);

					this.pages[m][n] = {
						x: x,
						y: y,
						width: rect.width,
						height: rect.height,
						cx: cx,
						cy: cy
					};

					if (x > this.maxScrollX) {
						m++;
					}
				}
			}

			const initPage = this.props.options.snapLoop ? 1 : 0;
			this.goToPage(this.currentPage.pageX || initPage, this.currentPage.pageY || 0, 0);

			// Update snap threshold if needed
			if (this.props.options.snapThreshold % 1 === 0) {
				this.snapThresholdX = this.props.options.snapThreshold;
				this.snapThresholdY = this.props.options.snapThreshold;
			} else {
				this.snapThresholdX = Math.round(this.pages[this.currentPage.pageX][this.currentPage.pageY].width * this.props.options.snapThreshold);
				this.snapThresholdY = Math.round(this.pages[this.currentPage.pageX][this.currentPage.pageY].height * this.props.options.snapThreshold);
			}
		});

		this.on('scrollEnd', () => {
			if (this.props.options.snapLoop) {
				if (this.currentPage.pageX === 0) {
					this.goToPage(this.pages.length - 2, this.currentPage.pageY, 0);
				}
				if (this.currentPage.pageX === this.pages.length - 1) {
					this.goToPage(1, this.currentPage.pageY, 0);
				}
			}
		});

		this.on('flick', () => {
			const time = this.props.options.snapSpeed || Math.max(
				Math.max(
					Math.min(Math.abs(this.x - this.startX), 1000),
					Math.min(Math.abs(this.y - this.startY), 1000)
				), 300);

			this.goToPage(
				this.currentPage.pageX + this.directionX,
				this.currentPage.pageY + this.directionY,
				time
			);
		});
	}

	public _transitionTimingFunction(easing) {
		this.props.options.scrollerStyle[style.transitionTimingFunction] = easing;
		paintCmd3(this.scroller.style, style.transitionTimingFunction, this.props.options.scrollerStyle[style.transitionTimingFunction]);
		// paintCmd3(this.scroller, "style" , this.props.options.scrollerStyle);

		if (this.props.options.wheel && !isBadAndroid) {
			for (let i = 0; i < this.items.length; i++) {
				this.items[i].style[style.transitionTimingFunction] = easing;
				paintCmd3(this.items[i].style, style.transitionTimingFunction, this.items[i].style[style.transitionTimingFunction]);
			}
		}
	}

	public _transitionEnd(e) {
		if (e.target !== this.scroller || !this.isInTransition) {
			return;
		}
		this._transitionTime();
		if (!this.resetPosition(this.props.options.bounceTime, ease.bounce)) {
			this.isInTransition = false;
			notify(this.parentNode, 'ev-scroller-scrollend', { id: this.props.id, x: this.x, y: this.y });
		}
	}

	public _transitionTime(time = 0) {
		// paintCmd3(this.scroller, "style" , this.props.options.scrollerStyle);
		// tslint:disable:prefer-template
		this.props.options.scrollerStyle[style.transitionDuration] = time + 'ms';
		paintCmd3(this.scroller.style, style.transitionDuration, this.props.options.scrollerStyle[style.transitionDuration]);
		// paintCmd3(this.scroller, "style" , this.props.options.scrollerStyle);

		if (this.props.options.wheel && !isBadAndroid) {
			for (let i = 0; i < this.items.length; i++) {
				this.items[i].style[style.transitionDuration] = time + 'ms';
				paintCmd3(this.items[i].style, style.transitionDuration, this.items[i].style[style.transitionDuration]);
			}
		}

		if (!time && isBadAndroid) {
			this.props.options.scrollerStyle[style.transitionDuration] = '0.001s';
			paintCmd3(this.scroller.style, style.transitionDuration, this.props.options.scrollerStyle[style.transitionDuration]);

			requestAnimationFrame(() => {
				if (this.props.options.scrollerStyle[style.transitionDuration] === '0.0001ms') {
					this.props.options.scrollerStyle[style.transitionDuration] = '0s';
					paintCmd3(this.scroller.style, style.transitionDuration, this.props.options.scrollerStyle[style.transitionDuration]);
				}
			});
		}
	}
	public _translate(x, y) {
		if (this.props.options.useTransform) {
			console.log(`this.props.options.scrollerStyle[style.transform] : ${this.props.options.scrollerStyle[style.transform]}`);
			this.props.options.scrollerStyle[style.transform] = 'translate(' + x + 'px,' + y + 'px)' + this.translateZ;
			paintCmd3(this.scroller.style, style.transform, this.props.options.scrollerStyle[style.transform]);
		} else {
			x = Math.round(x);
			y = Math.round(y);
			this.props.options.scrollerStyle.left = x + 'px';
			paintCmd3(this.scroller.style, 'left', this.props.options.scrollerStyle.left);
			this.props.options.scrollerStyle.top = y + 'px';
			paintCmd3(this.scroller.style, 'top', this.props.options.scrollerStyle.top);
		}

		if (this.props.options.wheel && !isBadAndroid) {
			for (let i = 0; i < this.items.length; i++) {
				const deg = this.props.options.rotate * (y / this.itemHeight + i);
				this.items[i].style[style.transform] = 'rotateX(' + deg + 'deg)';
				paintCmd3(this.items[i].style, style.transform, this.items[i].style[style.transform]);
			}
		}
		this.x = x;
		this.y = y;
	}

	public _startProbe() {
		cancelAnimationFrame(this.probeTimer);
		this.probeTimer = requestAnimationFrame(probe);
		// tslint:disable:no-this-assignment
		const me = this;
		function probe() {
			const pos = me.getComputedPosition();
			notify(me.parentNode, 'ev-scroller-scroll', { id: this.props.id, x: pos.x, y: pos.y });
			if (me.isInTransition) {
				me.probeTimer = requestAnimationFrame(probe);
			}
		}
	}

	public _addEvents() {
		this._handleEvents(addEvent);
	}

	public _removeEvents() {
		this._handleEvents(addEvent);
	}

	public _handleEvents(eventOperation) {
		const target = this.props.options.bindToWrapper ? this.wrapper : window;
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

		if (hasTouch && !this.props.options.disableTouch) {
			eventOperation(this.wrapper, 'touchstart', this);
			eventOperation(target, 'touchmove', this);
			eventOperation(target, 'touchcancel', this);
			eventOperation(target, 'touchend', this);
		}

		eventOperation(this.scroller, style.transitionEnd, this);
	}

	public _start(e) {
		const _eventType = eventType[e.type];
		if (_eventType !== TOUCH_EVENT) {
			if (e.button !== 0) {
				return;
			}
		}
		if (!this.enabled || this.destroyed || (this.initiated && this.initiated !== _eventType)) {
			return;
		}
		this.initiated = _eventType;

		if (this.props.options.preventDefault && !isBadAndroid &&
			!preventDefaultException(e.target, this.props.options.preventDefaultException)) {
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
			const pos = this.getComputedPosition();
			this._translate(pos.x, pos.y);
			console.log('_start');
			if (this.props.options.wheel) {
				this.target = this.items[Math.round(-pos.y / this.itemHeight)];
			} else {
				notify(this.parentNode, 'ev-scroller-scrollend', { id: this.props.id, x: this.x, y: this.y });
			}
		}

		const point = e.touches ? e.touches[0] : e;

		this.startX = this.x;
		this.startY = this.y;
		this.absStartX = this.x;
		this.absStartY = this.y;
		this.pointX = point.pageX;
		this.pointY = point.pageY;
		notify(this.parentNode, 'ev-scroller-beforescrollstart', { id: this.props.id });
	}

	// tslint:disable:cyclomatic-complexity
	// tslint:disable-next-line:max-func-body-length
	public _move(e) {
		if (!this.enabled || this.destroyed || eventType[e.type] !== this.initiated) {
			return;
		}

		if (this.props.options.preventDefault) {
			e.preventDefault();
		}

		const point = e.touches ? e.touches[0] : e;
		let deltaX = point.pageX - this.pointX;
		let deltaY = point.pageY - this.pointY;

		this.pointX = point.pageX;
		this.pointY = point.pageY;

		this.distX += deltaX;
		this.distY += deltaY;

		const absDistX = Math.abs(this.distX);
		const absDistY = Math.abs(this.distY);

		const timestamp = +new Date();

		// We need to move at least 15 pixels for the scrolling to initiate
		// tslint:disable:max-line-length
		if (timestamp - this.endTime > this.props.options.momentumLimitTime && (absDistY < this.props.options.momentumLimitDistance && absDistX < this.props.options.momentumLimitDistance)) {
			return;
		}

		// If you are scrolling in one direction lock the other
		if (!this.directionLocked && !this.props.options.freeScroll) {
			if (absDistX > absDistY + this.props.options.directionLockThreshold) {
				this.directionLocked = 'h';		// lock horizontally
			} else if (absDistY >= absDistX + this.props.options.directionLockThreshold) {
				this.directionLocked = 'v';		// lock vertically
			} else {
				this.directionLocked = 'n';		// no lock
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

		let newX = this.x + deltaX;
		let newY = this.y + deltaY;

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
			notify(this.parentNode, 'ev-scroller-scrollstart', { id: this.props.id });
		}

		this._translate(newX, newY);
		console.log('_move');

		if (timestamp - this.startTime > this.props.options.momentumLimitTime) {
			this.startTime = timestamp;
			this.startX = this.x;
			this.startY = this.y;

			if (this.props.options.probeType === 1) {
				notify(this.parentNode, 'ev-scroller-scroll', { id: this.props.id, x: this.x, y: this.y });
			}
		}

		if (this.props.options.probeType > 1) {
			notify(this.parentNode, 'ev-scroller-scroll', { id: this.props.id, x: this.x, y: this.y });
		}

		const scrollLeft = document.documentElement.scrollLeft || window.pageXOffset || document.body.scrollLeft;
		const scrollTop = document.documentElement.scrollTop || window.pageYOffset || document.body.scrollTop;

		const pX = this.pointX - scrollLeft;
		const pY = this.pointY - scrollTop;

		if (pX > document.documentElement.clientWidth - this.props.options.momentumLimitDistance || pX < this.props.options.momentumLimitDistance || pY < this.props.options.momentumLimitDistance || pY > document.documentElement.clientHeight - this.props.options.momentumLimitDistance
		) {
			this._end(e);
		}
	}

	// tslint:disable-next-line:max-func-body-length
	public _end(e) {
		if (!this.enabled || this.destroyed || eventType[e.type] !== this.initiated) {
			return;
		}
		this.initiated = false;

		if (this.props.options.preventDefault && !preventDefaultException(e.target, this.props.options.preventDefaultException)) {
			e.preventDefault();
		}
		notify(this.parentNode, 'ev-scroller-touchend', { id: this.props.id, x: this.x, y: this.y });

		// reset if we are outside of the boundaries
		if (this.resetPosition(this.props.options.bounceTime, ease.bounce)) {
			return;
		}
		this.isInTransition = false;
		// ensures that the last position is rounded
		let newX = Math.round(this.x);
		let newY = Math.round(this.y);

		// we scrolled less than 15 pixels
		if (!this.moved) {
			if (this.props.options.wheel) {
				if (this.target && this.target.className === 'wheel-scroll') {
					const index = Math.abs(Math.round(newY / this.itemHeight));
					const _offset = Math.round((this.pointY + offset(this.target).top - this.itemHeight / 2) / this.itemHeight);
					this.target = this.items[index + _offset];
				}
				this.scrollToElement(this.target, this.props.options.adjustTime, true, true, ease.swipe);
			} else {
				if (this.props.options.tap) {
					tap(e, this.props.options.tap);
				}

				if (this.props.options.click) {
					click(e);
				}
			}
			notify(this.parentNode, 'ev-scroller-scrollcancel', { id: this.props.id });

			return;
		}

		this.scrollTo(newX, newY);

		const deltaX = newX - this.absStartX;
		const deltaY = newY - this.absStartY;
		this.directionX = deltaX > 0 ? -1 : deltaX < 0 ? 1 : 0;
		this.directionY = deltaY > 0 ? -1 : deltaY < 0 ? 1 : 0;

		this.endTime = +new Date();

		const duration = this.endTime - this.startTime;
		const absDistX = Math.abs(newX - this.startX);
		const absDistY = Math.abs(newY - this.startY);

		// fastclick
		if ((<any>this._events).flick && duration < this.props.options.momentumLimitTime && absDistX < this.props.options.momentumLimitDistance && absDistY < this.props.options.momentumLimitDistance) {
			notify(this.parentNode, 'ev-scroller-flick', { id: this.props.id });

			return;
		}

		let time = 0;
		// start momentum animation if needed
		if (this.props.options.momentum && duration < this.props.options.momentumLimitTime && (absDistY > this.props.options.momentumLimitDistance || absDistX > this.props.options.momentumLimitDistance)) {
			const momentumX = this.hasHorizontalScroll ? momentum(this.x, this.startX, duration, this.maxScrollX, this.props.options.bounce ? this.wrapperWidth : 0, this.props.options)
				: { destination: newX, duration: 0 };
			const momentumY = this.hasVerticalScroll ? momentum(this.y, this.startY, duration, this.maxScrollY, this.props.options.bounce ? this.wrapperHeight : 0, this.props.options)
				: { destination: newY, duration: 0 };
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

		let easing = ease.swipe;
		if (this.props.options.snap) {
			const snap = this._nearestSnap(newX, newY);
			this.currentPage = snap;
			time = this.props.options.snapSpeed || Math.max(
				Math.max(
					Math.min(Math.abs(newX - snap.x), 1000),
					Math.min(Math.abs(newY - snap.y), 1000)
				), 300);
			newX = snap.x;
			newY = snap.y;

			this.directionX = 0;
			this.directionY = 0;
			easing = ease.bounce;
		}

		if (newX !== this.x || newY !== this.y) {
			// change easing function when scroller goes out of the boundaries
			if (newX > 0 || newX < this.maxScrollX || newY > 0 || newY < this.maxScrollY) {
				easing = ease.swipeBounce;
			}
			this.scrollTo(newX, newY, time, easing);

			return;
		}

		if (this.props.options.wheel) {
			this.selectedIndex = Math.abs(this.y / this.itemHeight) | 0;
		}
		notify(this.parentNode, 'ev-scroller-scrollend', { id: this.props.id, x: this.x, y: this.y });
	}

	public _nearestSnap(x, y) {
		if (!this.pages.length) {
			return { x: 0, y: 0, pageX: 0, pageY: 0 };
		}

		let i = 0;
		// Check if we exceeded the snap threshold
		if (Math.abs(x - this.absStartX) <= this.snapThresholdX &&
			Math.abs(y - this.absStartY) <= this.snapThresholdY) {
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

		let l = this.pages.length;
		for (; i < l; i++) {
			if (x >= this.pages[i][0].cx) {
				x = this.pages[i][0].x;
				break;
			}
		}

		l = this.pages[i].length;

		let m = 0;
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
			x,
			y,
			pageX: i,
			pageY: m
		};
	}

	public _resize() {
		if (!this.enabled) {
			return;
		}

		clearTimeout(this.resizeTimeout);
		this.resizeTimeout = setTimeout(() => {
			this.refresh();
		}, this.props.options.resizePolling);
	}

	// ============================================================== 事件处理
	// tslint:disable:no-reserved-keywords
	public on(type, fn, context = this) {
		if (!this._events[type]) {
			this._events[type] = [];
		}
		this._events[type].push([fn, context]);
	}

	public once(type, fn, context = this) {
		let fired = false;

		function magic() {
			this.off(type, magic);

			if (!fired) {
				fired = true;
				fn.apply(context, arguments);
			}
		}

		this.on(type, magic);
	}

	public off(type, fn) {
		const _events = this._events[type];
		if (!_events) {
			return;
		}

		let count = _events.length;
		while (count--) {
			if (_events[count][0] === fn) {
				_events[count][0] = undefined;
			}
		}
	}

	public trigger(type, ...args) {
		const events = this._events[type];
		if (!events) {
			return;
		}

		const len = events.length;
		const eventsCopy = [...events];
		for (let i = 0; i < len; i++) {
			const event = eventsCopy[i];
			const [fn, context] = event;
			if (fn) {
				fn.apply(context, [].slice.call(arguments, 1));
			}
		}
	}

	public handleEvent(e) {
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
				if (this.enabled && !e._constructed && !(/(SELECT|INPUT|TEXTAREA)/i).test(e.target.tagName)) {
					e.preventDefault();
					e.stopPropagation();
				}
				break;
			default:
		}
	}
}

// ====================================== 本地
interface Props {
	id?: string;
	child: string;
	childProps?: any;
	options?: {
		startX?: number;
		startY?: number;
		scrollX?: boolean;
		scrollY?: boolean;
		directionLockThreshold?: number;
		momentum?: boolean;
		bounce?: boolean;
		selectedIndex?: number;
		rotate?: number;
		wheel?: boolean;
		snap?: boolean;
		snapLoop?: boolean;
		snapThreshold?: number;
		swipeTime?: number;
		bounceTime?: number;
		adjustTime?: number;
		swipeBounceTime?: number;
		deceleration?: number;
		momentumLimitTime?: number;
		momentumLimitDistance?: number;
		resizePolling?: number;
		preventDefault?: boolean;
		preventDefaultException?: {
			tagName: RegExp;
		};
		HWCompositing?: boolean;
		useTransition?: boolean;
		useTransform?: boolean;
		eventPassthrough?: boolean | string;
		freeScroll?: boolean;
		bindToWrapper?: HTMLElement;
		click?: boolean;
		disableMouse?: boolean;
		disableTouch?: boolean;
		tap?: boolean | string;
		snapStepX?: number;
		snapStepY?: number;
		snapSpeed?: number;
		probeType?: number;
		itemHeight?: number;
		scrollerStyle: any;
	};
}

interface PagePos {
	x: number;
	y: number;
	pageX: number;
	pageY: number;
}