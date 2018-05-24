/**
 * 任务池
 */

// ============================== 导入
import { randomInt } from './math';

// ============================== 导出
/**
 * @description 任务类型
 */
export enum TaskType {
	ASYNC = 0, // 异步
	SYNC, // 同步
	IMMEDIATELY // 同步立即
}
/**
 * @description 任务信息
 * @example
 */
export interface TaskInfo {
	func: any; // 任务的调用函数
	args: any[]; // 调用函数的参数（参数必须为数组或undefined）
	priority: number; // 任务的优先级
	// tslint:disable:no-reserved-keywords
	type: TaskType; // 任务的类型
}
/**
 * @description 用于临时获取pop值
 * @example
 */
export let temp: TaskInfo = { func: undefined, args: undefined, priority: 0, type: 0 };

/**
 * @description 任务池
 * @example
 */

export class TaskPool {
	public sync: Map<number, Queue>;// 同步表，键为优先级
	public syncSize: number;
	public syncWeight: number;
	public syncZero: Queue;
	public async: Queue;
	public asyncWeight: number;
	public asyncZero: Queue;

	constructor() {
		this.sync = new Map();
		this.syncSize = 0;
		this.syncWeight = 0;
		this.syncZero = new Queue();
		this.async = new Queue();
		this.asyncWeight = 0;
		this.asyncZero = new Queue();
	}
	/**
	 * @description 获取任务池的任务数量
	 * @example
	 */
	public size(): number {
		return this.syncSize + this.syncZero.size + this.async.size + this.asyncZero.size;
	}
	/**
	 * @description 设置任务，任务的调用函数和参数（参数必须为数组或undefined），任务的优先级和类型（异步0，同步顺序1，同步立即2，立即模式是将任务加到队列头部，如果加2个立即任务，则后加入的会先执行）
	 * @example
	 */
	public push(func: any, args: any[], priority?: number, type?: TaskType): void {
		let t = taskCache.pop();
		if (t) {
			t.func = func;
			t.args = args;
			t.priority = priority || 0;
			t.type = type || TaskType.ASYNC;
		} else {
			t = { func: func, args: args, priority: priority, type: type, next: undefined };
		}
		if (priority > 0) {
			if (type === 0) {
				this.asyncWeight += priority;

				return qtail(this.async, t);
			}
			this.syncSize++;
			this.syncWeight += priority;
			let queue = this.sync.get(priority);
			if (!queue) {
				queue = queueCache.pop();
				if (!queue) {
					queue = new Queue();
				}
				this.sync.set(priority, queue);
			}

			return (type === 1) ? qtail(queue, t) : qhead(queue, t);
		} else if (type === 0) {
			qtail(this.asyncZero, t);
		} else if (type === 1) {
			qtail(this.syncZero, t);
		} else {
			qhead(this.syncZero, t);
		}
	}

	/**
	 * @description 取出当前最合适的任务，复制到参数r上
	 * @example
	 */
	public pop(r: TaskInfo): boolean {
		let i;
		let w = this.syncWeight;
		if (w + this.asyncWeight > 0) {
			i = randomInt(0, w + this.asyncWeight - 1);

			return i < w ? weightMap(this, this.sync, i, r) : weightQueue(this, this.async, i - w, r);
		}
		w = this.syncZero.size;
		if (w) {
			if (this.asyncZero.size) {
				i = randomInt(0, w + this.asyncZero.size - 1);

				return qpop(i < w ? this.syncZero : this.asyncZero, r);
			} else {
				return qpop(this.syncZero, r);
			}
		} else if (this.asyncZero.size) {
			return qpop(this.asyncZero, r);
		}

		return false;
	}
	/**
	 * @description 获取指定的优先级和类型的任务数量
	 * @example
	 */
	public getPrioritySize(priority: number, type?: TaskType): number {
		const queue = this.sync.get(priority);

		return queue ? queue.size : 0;
	}
	/**
	 * @description 清除指定的优先级和类型的任务列表， 返回清除的数量
	 * @example
	 */
	public clear(priority: number, type?: TaskType): number {
		const queue = this.sync.get(priority);
		if (!queue) {
			return 0;
		}
		const size = queue.size;
		this.syncSize -= size;
		this.syncWeight -= size * priority;
		this.sync.delete(priority);

		return size;
	}

}

// ============================== 本地
/**
 * @description 任务信息
 * @example
 */
interface TaskInfoEntry extends TaskInfo {
	next: TaskInfoEntry;
}

// 队列
class Queue {
	public head: TaskInfoEntry;
	public tail: TaskInfoEntry;
	public size: number;
	constructor() {
		this.size = 0;
	}
}

// 任务缓存
const taskCache = [];
// 队列缓存
const queueCache = [];

// 队列放入尾部
const qtail = (queue: Queue, t: TaskInfoEntry): void => {
	if (queue.size) {
		queue.tail.next = t;
		queue.tail = t;
		queue.size++;
	} else {
		queue.head = t;
		queue.tail = t;
		queue.size = 1;
	}
};
// 队列放入头部
const qhead = (queue: Queue, t: TaskInfoEntry): void => {
	if (queue.size) {
		t.next = queue.head;
		queue.head = t;
		queue.size++;
	} else {
		queue.head = t;
		queue.tail = t;
		queue.size = 1;
	}
};
// 队列释放该节点
const qfree = (queue: Queue, node: TaskInfoEntry, r: TaskInfo): boolean => {
	r.func = node.func;
	r.args = node.args;
	r.priority = node.priority;
	r.type = node.type;
	queue.size--;
	node.func = undefined;
	node.args = undefined;
	node.next = undefined;
	taskCache.push(node);
	if (!queue.size) {
		queue.tail = undefined;
	}

	return true;
};
// 队列弹出
const qpop = (queue: Queue, r: TaskInfo): boolean => {
	const head = queue.head;
	queue.head = head.next;

	return qfree(queue, head, r);
};

// 计算队列中的每个异步任务权重
const weightQueue = (pool, queue: Queue, w: number, r: TaskInfo): boolean => {
	let head = queue.head;
	if (w < head.priority) {
		queue.head = head.next;
		pool.asyncWeight -= head.priority;

		return qfree(queue, head, r);
	}
	let parent;
	do {
		w -= head.priority;
		parent = head;
		head = head.next;
	} while (w >= head.priority);
	parent.next = head.next;
	if (head === queue.tail) {
		queue.tail = parent;
	}
	pool.asyncWeight -= head.priority;

	return qfree(queue, head, r);
};

// 计算Map中的每个同步队列的权重
const weightMap = (pool: TaskPool, map: Map<number, Queue>, w: number, r: TaskInfo): boolean => {
	let queue: Queue;
	for (const priority of map.keys()) {
		queue = map.get(priority);
		w -= priority * queue.size;
		if (w < 0) {
			pool.syncSize--;
			pool.syncWeight -= priority;
			if (queue.size === 1) {
				map.delete(priority);
				queueCache.push(queue);
			}

			return qpop(queue, r);
		}
	}
};

// TODO 补充：需要在放入任务后获得一个数字引用，这样可以取消、查询状态、更新权重。

// TODO 增加缓存管理, n次计算，任务数量+缓存数量小于最大缓存长度的一半，减半释放

// TODO 如果任务优先级很多，而且任务在池中大量堆积，需要优化权重算法，用SBTree树结构解决权重的快速命中。
// 同步任务表可以用SBTree的修改版增加weight来使用，异步任务可以将SBTree改为WeightTree节点的key就是权重，size就是权重累加，根据权重累加来旋转

// TODO 增加容许外部设置一个优先级的配置，可以在取任务时动态计算异步-同步权重组的权重，支持优先级根据外部的动态场景可以变动的情况，比如：用户操作时，事件及渲染更优先。用户不操作，下载、预处理和垃圾回收更优先。
