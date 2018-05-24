_$define("pi/util/task_pool", function (require, exports, module){
"use strict";
/**
 * 任务池
 */

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

Object.defineProperty(exports, "__esModule", { value: true });
// ============================== 导入
var math_1 = require("./math");
// ============================== 导出
/**
 * @description 任务类型
 */
var TaskType;
(function (TaskType) {
    TaskType[TaskType["ASYNC"] = 0] = "ASYNC";
    TaskType[TaskType["SYNC"] = 1] = "SYNC";
    TaskType[TaskType["IMMEDIATELY"] = 2] = "IMMEDIATELY"; // 同步立即
})(TaskType = exports.TaskType || (exports.TaskType = {}));
/**
 * @description 用于临时获取pop值
 * @example
 */
exports.temp = { func: undefined, args: undefined, priority: 0, type: 0 };
/**
 * @description 任务池
 * @example
 */

var TaskPool = function () {
    function TaskPool() {
        _classCallCheck(this, TaskPool);

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


    _createClass(TaskPool, [{
        key: "size",
        value: function size() {
            return this.syncSize + this.syncZero.size + this.async.size + this.asyncZero.size;
        }
        /**
         * @description 设置任务，任务的调用函数和参数（参数必须为数组或undefined），任务的优先级和类型（异步0，同步顺序1，同步立即2，立即模式是将任务加到队列头部，如果加2个立即任务，则后加入的会先执行）
         * @example
         */

    }, {
        key: "push",
        value: function push(func, args, priority, type) {
            var t = taskCache.pop();
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
                var queue = this.sync.get(priority);
                if (!queue) {
                    queue = queueCache.pop();
                    if (!queue) {
                        queue = new Queue();
                    }
                    this.sync.set(priority, queue);
                }
                return type === 1 ? qtail(queue, t) : qhead(queue, t);
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

    }, {
        key: "pop",
        value: function pop(r) {
            var i = void 0;
            var w = this.syncWeight;
            if (w + this.asyncWeight > 0) {
                i = math_1.randomInt(0, w + this.asyncWeight - 1);
                return i < w ? weightMap(this, this.sync, i, r) : weightQueue(this, this.async, i - w, r);
            }
            w = this.syncZero.size;
            if (w) {
                if (this.asyncZero.size) {
                    i = math_1.randomInt(0, w + this.asyncZero.size - 1);
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

    }, {
        key: "getPrioritySize",
        value: function getPrioritySize(priority, type) {
            var queue = this.sync.get(priority);
            return queue ? queue.size : 0;
        }
        /**
         * @description 清除指定的优先级和类型的任务列表， 返回清除的数量
         * @example
         */

    }, {
        key: "clear",
        value: function clear(priority, type) {
            var queue = this.sync.get(priority);
            if (!queue) {
                return 0;
            }
            var size = queue.size;
            this.syncSize -= size;
            this.syncWeight -= size * priority;
            this.sync.delete(priority);
            return size;
        }
    }]);

    return TaskPool;
}();

exports.TaskPool = TaskPool;
// 队列

var Queue = function Queue() {
    _classCallCheck(this, Queue);

    this.size = 0;
};
// 任务缓存


var taskCache = [];
// 队列缓存
var queueCache = [];
// 队列放入尾部
var qtail = function qtail(queue, t) {
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
var qhead = function qhead(queue, t) {
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
var qfree = function qfree(queue, node, r) {
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
var qpop = function qpop(queue, r) {
    var head = queue.head;
    queue.head = head.next;
    return qfree(queue, head, r);
};
// 计算队列中的每个异步任务权重
var weightQueue = function weightQueue(pool, queue, w, r) {
    var head = queue.head;
    if (w < head.priority) {
        queue.head = head.next;
        pool.asyncWeight -= head.priority;
        return qfree(queue, head, r);
    }
    var parent = void 0;
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
var weightMap = function weightMap(pool, map, w, r) {
    var queue = void 0;
    for (var _iterator = map.keys(), _isArray = Array.isArray(_iterator), _i = 0, _iterator = _isArray ? _iterator : _iterator[Symbol.iterator]();;) {
        var _ref;

        if (_isArray) {
            if (_i >= _iterator.length) break;
            _ref = _iterator[_i++];
        } else {
            _i = _iterator.next();
            if (_i.done) break;
            _ref = _i.value;
        }

        var priority = _ref;

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
})