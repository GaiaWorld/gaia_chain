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
import { notify } from '../../widget/event';
import { cancelFrame, requestFrame } from '../../widget/frame_mgr';
import { getRealNode, paintCmd3 } from '../../widget/painter';
import { Widget } from '../../widget/widget';
import { VirtualNode } from '../virtual_node';
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
import { extend, isBadAndroid, momentum } from './util';

// ====================================== 常量声明
const TOUCH_EVENT = 1;
const scrollerInstanceMap = new Map();
// ====================================== 导出

export const pluginBind = (w: Widget, vNode, args: any, oldArgs: any) => {
	const scrollerInstance = scrollerInstanceMap.get(args.options.id);
	if (!scrollerInstance) {
		const bScroller = new BScroll(w, vNode, <Options>args.options);
		scrollerInstanceMap.set(args.options.id, bScroller);
	} else {
		scrollerInstance.update(<Options>args.options, vNode);
		console.log(`id : ${args.options.id}已经存在, 直接可用`);
	}
};

export class BScroll {
	public parentWidget: Widget;
	public vNode: VirtualNode;
	public options: Options;
	public wrapper: HTMLElement;
	public scroller: HTMLElement;
	public translateZ: string;
	public wrapperWidth: number;
	public wrapperHeight: number;
	public scrollerWidth: number;
	public scrollerHeight: number;
	public maxScrollX: number;
	public maxScrollY: number;
	public x: number = 0;
	public y: number = 0;
	public directionX: number = 0;
	public directionY: number = 0;
	public startX: number;
	public startY: number;
	public isInTransition: number | boolean;
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

	constructor(w: Widget, vNode: VirtualNode, options: Options) {
		this.parentWidget = w;
		const tempAttach = w.attach;
		w.attach = () => {
			tempAttach();
			this.update(options, vNode);
		};
		const tempAfterupdate = w.afterUpdate;
		w.afterUpdate = () => {
			tempAfterupdate();
			this.refresh();
		};
		// cache style for better performance    
	}

	// tslint:disable:typedef no-object-literal-type-assertion
	public update(options, vNode) {
		this.wrapper = <HTMLElement>getRealNode(vNode);
		this.scroller = <HTMLElement>getRealNode(vNode).children[0];
		this.options = <Options>{
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

		extend(this.options, options);

		this.translateZ = this.options.HWCompositing && hasPerspective ? ' translateZ(0)' : '';

		this.options.useTransition = this.options.useTransition && hasTransition;
		this.options.useTransform = this.options.useTransform && hasTransform;

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
	public _init() {
		this.x = 0;
		this.y = 0;
		this.directionX = 0;
		this.directionY = 0;

		this._addEvents();
	}

	public _addEvents() {
		const eventOperation = addEvent;
		this._handleEvents(eventOperation);
	}

	public _removeEvents() {
		const eventOperation = removeEvent;
		this._handleEvents(eventOperation);
	}

	public _handleEvents(eventOperation) {
		const target = this.options.bindToWrapper ? this.wrapper : window;
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

		if (hasTouch && !this.options.disableTouch) {
			eventOperation(this.wrapper, 'touchstart', this);
			eventOperation(target, 'touchmove', this);
			eventOperation(target, 'touchcancel', this);
			eventOperation(target, 'touchend', this);
		}

		eventOperation(this.scroller, style.transitionEnd, this);
	}

	public _start(e) {
		// tslint:disable:variable-name
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

		if (this.options.preventDefault && !isBadAndroid && !preventDefaultException(e.target, this.options.preventDefaultException)) {
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
			const pos = this.getComputedPosition();
			this._translate(pos.x, pos.y);
			if (this.parentWidget.tree) {
				notify(this.parentWidget.tree, 'ev-scroller-scrollend', { id: this.options.id, x: this.x, y: this.y, instance: this });
			}
		}

		const point = e.touches ? e.touches[0] : e;

		this.startX = this.x;
		this.startY = this.y;
		this.absStartX = this.x;
		this.absStartY = this.y;
		this.pointX = point.pageX;
		this.pointY = point.pageY;
		if (this.parentWidget.tree) {
			notify(this.parentWidget.tree, 'ev-scroller-beforescrollstart', { id: this.options.id, x: this.x, y: this.y, instance: this });
		}
	}

	// tslint:disable-next-line:cyclomatic-complexity
	public _move(e) {
		if (!this.enabled || this.destroyed || eventType[e.type] !== this.initiated) {
			return;
		}
		if (this.options.preventDefault) {
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
		if (timestamp - this.endTime > this.options.momentumLimitTime &&
			(absDistY < this.options.momentumLimitDistance && absDistX < this.options.momentumLimitDistance)) {
			return;
		}
		// If you are scrolling in one direction lock the other
		if (!this.directionLocked && !this.options.freeScroll) {
			if (absDistX > absDistY + this.options.directionLockThreshold) {
				this.directionLocked = 'h';		// lock horizontally
			} else if (absDistY >= absDistX + this.options.directionLockThreshold) {
				this.directionLocked = 'v';		// lock vertically
			} else {
				this.directionLocked = 'n';		// no lock
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
		let newX = this.x + deltaX;
		let newY = this.y + deltaY;
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

	public _move1(e, newX, newY, timestamp) {
		if (!this.moved) {
			this.moved = true;
			if (this.parentWidget.tree) {
				notify(this.parentWidget.tree, 'ev-scroller-scrollstart', { id: this.options.id, x: this.x, y: this.y, instance: this });
			}
		}
		this._translate(newX, newY);

		if (timestamp - this.startTime > this.options.momentumLimitTime) {
			this.startTime = timestamp;
			this.startX = this.x;
			this.startY = this.y;

			if (this.options.probeType === 1) {
				notify(this.parentWidget.tree, 'ev-scroller-scroll', { id: this.options.id, x: this.x, y: this.y, instance: this });
			}
		}

		if (this.options.probeType > 1) {
			notify(this.parentWidget.tree, 'ev-scroller-scroll', { id: this.options.id, x: this.x, y: this.y, instance: this });
		}

		const scrollLeft = document.documentElement.scrollLeft || window.pageXOffset || document.body.scrollLeft;
		const scrollTop = document.documentElement.scrollTop || window.pageYOffset || document.body.scrollTop;

		const pX = this.pointX - scrollLeft;
		const pY = this.pointY - scrollTop;

		if (pX > document.documentElement.clientWidth - this.options.momentumLimitDistance || pX < this.options.momentumLimitDistance ||
			pY < this.options.momentumLimitDistance || pY > document.documentElement.clientHeight - this.options.momentumLimitDistance
		) {
			this._end(e);
		}
	}

	// tslint:disable-next-line:cyclomatic-complexity
	public _end(e) {
		if (!this.enabled || this.destroyed || eventType[e.type] !== this.initiated) {
			return;
		}
		this.initiated = false;

		if (this.options.preventDefault && !preventDefaultException(e.target, this.options.preventDefaultException)) {
			e.preventDefault();
		}
		if (this.parentWidget.tree) {
			notify(this.parentWidget.tree, 'ev-scroller-touchend', { id: this.options.id, x: this.x, y: this.y, instance: this });
		}

		// reset if we are outside of the boundaries
		if (this.resetPosition(this.options.bounceTime, ease.bounce)) {
			return;
		}
		this.isInTransition = false;
		// ensures that the last position is rounded
		let newX = Math.round(this.x);
		let newY = Math.round(this.y);

		// we scrolled less than 15 pixels
		if (!this.moved) {
			if (this.options.tap) {
				tap(e, this.options.tap);
			}

			if (this.options.click) {
				click(e);
			}
			if (this.parentWidget.tree) {
				notify(this.parentWidget.tree, 'ev-scroller-scrollcancel', { id: this.options.id, x: this.x, y: this.y, instance: this });
			}

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
		if (duration < this.options.momentumLimitTime && absDistX < this.options.momentumLimitDistance &&
			absDistY < this.options.momentumLimitDistance) {
			if (this.parentWidget.tree) {
				notify(this.parentWidget.tree, 'ev-scroller-flick', { id: this.options.id, x: this.x, y: this.y, instance: this });
			}

			return;
		}

		let time = 0;
		// start momentum animation if needed
		if (this.options.momentum && duration < this.options.momentumLimitTime &&
			(absDistY > this.options.momentumLimitDistance || absDistX > this.options.momentumLimitDistance)) {
			const momentumX = this.hasHorizontalScroll ? momentum(this.x, this.startX, duration, this.maxScrollX, this.options.bounce ?
				this.wrapperWidth : 0, this.options)
				: { destination: newX, duration: 0 };
			const momentumY = this.hasVerticalScroll ? momentum(this.y, this.startY, duration, this.maxScrollY, this.options.bounce ?
				this.wrapperHeight : 0, this.options)
				: { destination: newY, duration: 0 };
			newX = momentumX.destination;
			newY = momentumY.destination;
			time = Math.max(momentumX.duration, momentumY.duration);
			this.isInTransition = 1;
		}

		let easing = ease.swipe;

		if (newX !== this.x || newY !== this.y) {
			// change easing function when scroller goes out of the boundaries
			if (newX > 0 || newX < this.maxScrollX || newY > 0 || newY < this.maxScrollY) {
				easing = ease.swipeBounce;
			}
			this.scrollTo(newX, newY, time, easing);

			return;
		}
		if (this.parentWidget.tree) {
			notify(this.parentWidget.tree, 'ev-scroller-scrollend', { id: this.options.id, x: this.x, y: this.y, instance: this });
		}
	}

	public _resize() {
		if (!this.enabled) {
			return;
		}

		clearTimeout(this.resizeTimeout);
		this.resizeTimeout = setTimeout(() => {
			this.refresh();
		}, this.options.resizePolling);
	}

	public _startProbe() {
		cancelFrame(this.probeTimer);
		this.probeTimer = requestFrame(probe);

		// tslint:disable:no-this-assignment
		const me = this;

		// tslint:disable:only-arrow-functions
		function probe() {
			const pos = me.getComputedPosition();
			if (me.parentWidget.tree) {
				notify(me.parentWidget.tree, 'ev-scroller-scroll', { id: me.options.id, x: pos.x, y: pos.y, instance: me });
			}
			if (me.isInTransition) {
				me.probeTimer = requestFrame(probe);
			}
		}
	}

	public _transitionTime(time = 0) {

		// tslint:disable:prefer-template
		paintCmd3(this.scroller.style, style.transitionDuration, time + 'ms');
		// this.scroller.style[style.transitionDuration] = time + 'ms';

		if (!time && isBadAndroid) {
			paintCmd3(this.scroller.style, style.transitionDuration, '0.001s');
			// this.scroller.style[style.transitionDuration] = '0.001s';					

			requestFrame(() => {
				if (this.scroller.style[style.transitionDuration] === '0.0001ms') {
					paintCmd3(this.scroller.style, style.transitionDuration, '0s');
					// this.scroller.style[style.transitionDuration] = '0s';
				}
			});
		}
	}

	public _transitionTimingFunction(easing) {
		console.log(`easing is ${easing}`);
		paintCmd3(this.scroller.style, style.transitionTimingFunction, easing);
		// this.scroller.style[style.transitionTimingFunction] = easing;
	}

	public _transitionEnd(e) {
		if (e.target !== this.scroller || !this.isInTransition) {
			return;
		}

		this._transitionTime();
		if (!this.resetPosition(this.options.bounceTime, ease.bounce)) {
			this.isInTransition = false;
			if (this.parentWidget.tree) {
				notify(this.parentWidget.tree, 'ev-scroller-scrollend', { id: this.options.id, x: this.x, y: this.y, instance: this });
			}
		}
	}

	public _translate(x, y) {
		if (this.options.useTransform) {
			paintCmd3(this.scroller.style, style.transform, 'translate(' + x + 'px,' + y + 'px)' + this.translateZ);
			// this.scroller.style[style.transform] = 'translate(' + x + 'px,' + y + 'px)' + this.translateZ;
		} else {
			x = Math.round(x);
			y = Math.round(y);
			paintCmd3(this.scroller.style, 'left', x + 'px');
			paintCmd3(this.scroller.style, 'top', y + 'px');
			// this.scroller.style.left = x+"px";
			// this.scroller.style.top = y+"px";
		}

		this.x = x;
		this.y = y;
	}

	public enable() {
		this.enabled = true;
	}

	public disable() {
		this.enabled = false;
	}

	public refresh() {
		const rf = this.wrapper.offsetHeight;

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
		this.wrapperOffset = offset(this.wrapper);
		if (this.parentWidget.tree) {
			notify(this.parentWidget.tree, 'ev-scroller-refresh', { id: this.options.id, x: this.x, y: this.y, instance: this });
		}
		this.resetPosition();
	}

	public resetPosition(time = 0, easeing = ease.bounce) {
		let x = this.x;
		if (!this.hasHorizontalScroll || x > 0) {
			x = 0;
		} else if (x < this.maxScrollX) {
			x = this.maxScrollX;
		}

		let y = this.y;
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

	public scrollTo(x, y, time?, easing?) {
		if (!easing) {
			// easing = ease.bounce
			easing = ease.swipe;
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

	public getComputedPosition() {
		let matrix: any = window.getComputedStyle(this.scroller, null);
		let x;
		let y;

		if (this.options.useTransform) {
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

	public destroy() {
		this._removeEvents();

		this.destroyed = true;
		if (this.parentWidget.tree) {
			notify(this.parentWidget.tree, 'ev-scroller-destroy', { id: this.options.id, x: this.x, y: this.y, instance: this });
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

/**
 * 所有可设置的参数
 */
interface Options {
	id?: string | number;// 主键
	startX?: number;// 开始的X轴位置
	startY?: number;// 开始的Y轴位置
	scrollX?: boolean;// 滚动方向为 X 轴
	scrollY?: boolean;// 滚动方向为 Y 轴
	directionLockThreshold?: number;// X轴和Y轴滚动的临界值,X - Y >directionLockThreshold则沿X轴滚动
	momentum?: boolean;// 当快速滑动时是否开启滑动惯性
	bounce?: boolean;// 是否启用回弹动画效果
	swipeTime?: number;// swipe动画持续时间
	swipeBounceTime?: number;// swipe回弹持续时间
	bounceTime?: number;// 弹力动画持续时间		
	deceleration?: number;// 滚动动量减速越大越快，建议不大于0.01
	momentumLimitTime?: number;// 符合惯性拖动的最大时间
	momentumLimitDistance?: number;// 符合惯性拖动的最小拖动距离
	resizePolling?: number;// 重新调整窗口大小时，重新计算better-scroll的时间间隔
	preventDefault?: boolean;// 是否阻止默认事件
	preventDefaultException?: {
		tagName: RegExp;// 阻止默认事件的例外配置
	};
	HWCompositing?: boolean;// 是否启用硬件加速
	useTransition?: boolean;// 是否使用CSS3的Transition属性
	useTransform?: boolean;// 是否使用CSS3的Transform属性	
	/**
	 * 1会截流,只有在滚动结束的时候派发一个 scroll 事件。
	 * 2在手指 move 的时候也会实时派发 scroll 事件，不会截流。 
	 * 3除了手指 move 的时候派发scroll事件，在 swipe（手指迅速滑动一小段距离）的情况下，列表会有一个长距离的滚动动画，这个滚动的动画过程中也会实时派发滚动事件
	 */
	probeType?: number;
	eventPassthrough?: boolean | string;// 是否在单方向上阻止原生事件冒泡
	freeScroll?: boolean;// 可以同时沿两个方向滚动
	bindToWrapper?: boolean;// 事件是在wrapper上触发还是在window上触发
	click?: boolean;// 是否允许click事件
	disableMouse?: boolean;// 是否允许mouse事件
	disableTouch?: boolean;// 是否允许touch事件
	tap?: boolean | string;// 是否允许tap事件
}