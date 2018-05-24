_$define("pi/util/heap", function (require, exports, module){
"use strict";
/*
 * 小堆
 * 支持删除和更新
 */

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

Object.defineProperty(exports, "__esModule", { value: true });
// ============================== 导出
/**
 * 小堆
 */

var Heap = function () {
    function Heap(cmp) {
        _classCallCheck(this, Heap);

        this.array = []; // 堆的实际数组，用来表示完全二叉树
        this.cmp = cmp;
    }
    /**
     * 判空
     */


    _createClass(Heap, [{
        key: "empty",
        value: function empty() {
            return this.array.length === 0;
        }
        /**
         * 返回内部数组
         */

    }, {
        key: "getImpl",
        value: function getImpl() {
            return this.array;
        }
        /**
         * 插入元素
         */

    }, {
        key: "insert",
        value: function insert(value) {
            this.array.push(value);
            this.up(this.array.length - 1);
        }
        /**
         * 删除元素
         */

    }, {
        key: "remove",
        value: function remove(value) {
            var index = this.array.indexOf(value);
            if (index < 0) return;
            // 把最后的叶子赋值给index位置
            this.array[index] = this.array[this.array.length - 1];
            --this.array.length;
            this.down(index);
        }
        /**
         * 删除堆顶元素并返回
         */

    }, {
        key: "pop",
        value: function pop() {
            var r = this.array[0];
            this.array[0] = this.array[this.array.length - 1];
            --this.array.length;
            this.down(0);
            return r;
        }
        /**
         * 清空
         */

    }, {
        key: "clear",
        value: function clear() {
            this.array.length = 0;
        }
        /**
         * 下沉
         */

    }, {
        key: "down",
        value: function down(index) {
            var arr = this.array;
            if (arr.length <= index) return;
            var element = arr[index];
            var curr = index;
            var child = index;
            var left = curr * 2 + 1;
            var right = left + 1;
            while (left < arr.length) {
                // 选择左右孩子的最小值作为比较
                var _child = left;
                if (right < arr.length && this.cmp(arr[right], arr[left]) < 0) {
                    _child = right;
                }
                // 待选择的值比孩子大，则将孩子移到当前的槽
                if (this.cmp(element, arr[_child]) <= 0) {
                    break;
                } else {
                    arr[curr] = arr[_child];
                    // 往下迭代
                    curr = _child;
                    left = curr * 2 + 1;
                    right = left + 1;
                }
            }
            arr[curr] = element;
        }
        /**
         * 上朔
         */

    }, {
        key: "up",
        value: function up(index) {
            var arr = this.array;
            if (arr.length <= index) return;
            var element = arr[index];
            var curr = index;
            var parent = Math.floor((curr - 1) / 2);
            while (parent >= 0 && this.cmp(element, arr[parent]) < 0) {
                arr[curr] = arr[parent];
                // 往上迭代
                curr = parent;
                parent = Math.floor((curr - 1) / 2);
            }
            arr[curr] = element;
        }
    }]);

    return Heap;
}();

exports.Heap = Heap;
})