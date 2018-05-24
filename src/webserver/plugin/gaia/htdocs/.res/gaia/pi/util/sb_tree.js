_$define("pi/util/sb_tree", function (require, exports, module){
"use strict";
/*
 * Size Balanced Tree（SBT）平衡二叉树，写时复制(COW)
 */
// ============================== 导入

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

Object.defineProperty(exports, "__esModule", { value: true });
// ============================== 导出
/**
 * Size Balanced Tree（SBT）平衡二叉树
 */

var Tree = function () {
    function Tree(cmp) {
        _classCallCheck(this, Tree);

        this.cmp = cmp;
    }
    /**
     * 判空
     */


    _createClass(Tree, [{
        key: "empty",
        value: function empty() {
            return !this.root;
        }
        /**
         * 获取指定树的大小
         */

    }, {
        key: "size",
        value: function size() {
            return this.root ? this.root.size : 0;
        }
        /**
         * 检查指定的Key在树中是否存在
         */

    }, {
        key: "has",
        value: function has(key) {
            var node = this.root;
            while (node) {
                var r = this.cmp(key, node.key);
                if (r > 0) {
                    node = node.right;
                } else if (r < 0) {
                    node = node.left;
                } else return true;
            }
            return false;
        }
        /**
         * 获取指定Key在树中的值
         */

    }, {
        key: "get",
        value: function get(key) {
            var node = this.root;
            while (node) {
                var r = this.cmp(key, node.key);
                if (r > 0) {
                    node = node.right;
                } else if (r < 0) {
                    node = node.left;
                } else return node.value;
            }
        }
        /**
         * 获取树中最小的键值对
         */

    }, {
        key: "smallest",
        value: function smallest() {
            var node = this.root;
            while (node) {
                if (!node.left) return { key: node.key, value: node.value };
                node = node.left;
            }
        }
        /**
         * 获取树中最小的键值对
         */

    }, {
        key: "largest",
        value: function largest() {
            var node = this.root;
            while (true) {
                if (!node.right) return { key: node.key, value: node.value };
                node = node.right;
            }
        }
        /**
         * 获取指定Key在树中的排名，1表示第一名，负数表示没有该key，排名比该排名小
         */

    }, {
        key: "rank",
        value: function rank(key) {
            var c = 1;
            var node = this.root;
            while (node) {
                var r = this.cmp(key, node.key);
                if (r > 0) {
                    c += node.left ? node.left.size + 1 : 1;
                    node = node.right;
                } else if (r < 0) {
                    node = node.left;
                } else return node.left ? c + node.left.size : c;
            }
            return -c;
        }
        /**
         * 获取指定排名的键值，必须从1开始
         */

    }, {
        key: "byRank",
        value: function byRank(rank) {
            rank--;
            var node = this.root;
            while (node) {
                var c = node.left ? node.left.size : 0;
                if (rank > c) {
                    if (node.right) break;
                    rank -= c + 1;
                    node = node.right;
                } else if (rank < c) {
                    if (node.left) break;
                    node = node.left;
                } else break;
            }
            return { key: node.key, value: node.value };
        }
        /**
         *  插入一个新的键值对(不允许插入存在的key)
         */

    }, {
        key: "insert",
        value: function insert(key, value) {
            var arr = cache;
            var node = this.root;
            while (node) {
                var r = this.cmp(key, node.key);
                if (r > 0) {
                    arr.push(new Item(null, node));
                    node = node.right;
                } else if (r < 0) {
                    arr.push(new Item(node, null));
                    node = node.left;
                } else throw new Error("key_exists:" + key);
            }
            var tree = new Tree(this.cmp);
            tree.root = nodeInsert(arr, new Node(key, value, 1, null, null));
            arr.length = 0;
            return tree;
        }
        /**
         *  更新一个已存在键值对(更新值)(不允许更新不存在的key)
         */

    }, {
        key: "update",
        value: function update(key, value) {
            var arr = cache;
            var node = this.root;
            while (node) {
                var r = this.cmp(key, node.key);
                if (r > 0) {
                    arr.push(new Item(null, node));
                    node = node.right;
                } else if (r < 0) {
                    arr.push(new Item(node, null));
                    node = node.left;
                } else {
                    if (value === node.value) {
                        arr.length = 0;
                        return this;
                    }
                    var tree = new Tree(this.cmp);
                    tree.root = nodeUpdate(arr, new Node(key, value, node.size, node.left, node.right));
                    arr.length = 0;
                    return tree;
                }
            }
            throw new Error("key_not_found:" + key);
        }
        /**
         *  放入指定的键值对
         */

    }, {
        key: "set",
        value: function set(key, value) {
            var arr = cache;
            var node = this.root;
            while (node) {
                var r = this.cmp(key, node.key);
                if (r > 0) {
                    arr.push(new Item(null, node));
                    node = node.right;
                } else if (r < 0) {
                    arr.push(new Item(node, null));
                    node = node.left;
                } else {
                    if (value === node.value) {
                        arr.length = 0;
                        return this;
                    }
                    var _tree = new Tree(this.cmp);
                    _tree.root = nodeUpdate(arr, new Node(key, value, node.size, node.left, node.right));
                    arr.length = 0;
                    return _tree;
                }
            }
            var tree = new Tree(this.cmp);
            tree.root = nodeInsert(arr, new Node(key, value, 1, null, null));
            arr.length = 0;
            return tree;
        }
        /**
         * 删除一个键值对(有指定key则删除)
         */

    }, {
        key: "delete",
        value: function _delete(key) {
            var arr = cache;
            var node = this.root;
            while (node) {
                var r = this.cmp(key, node.key);
                if (r > 0) {
                    arr.push(new Item(null, node));
                    node = node.right;
                } else if (r < 0) {
                    arr.push(new Item(node, null));
                    node = node.left;
                } else {
                    var tree = new Tree(this.cmp);
                    tree.root = nodeDelete(arr, deleteNode(node.size - 1, node.left, node.right));
                    arr.length = 0;
                    return tree;
                }
            }
            arr.length = 0;
            return this;
        }
        /**
         * 删除一个键, 并返回该键的值
         */

    }, {
        key: "remove",
        value: function remove(key) {
            var arr = cache;
            var node = this.root;
            while (node) {
                var r = this.cmp(key, node.key);
                if (r > 0) {
                    arr.push(new Item(null, node));
                    node = node.right;
                } else if (r < 0) {
                    arr.push(new Item(node, null));
                    node = node.left;
                } else {
                    var tree = new Tree(this.cmp);
                    tree.root = nodeDelete(arr, deleteNode(node.size - 1, node.left, node.right));
                    arr.length = 0;
                    return { key: key, value: node.value, tree: tree };
                }
            }
            arr.length = 0;
        }
        /**
         * 对指定的键用指定的函数进行操作，函数返回0表示放弃，1表示删除，否则为更新或插入值
         */

    }, {
        key: "action",
        value: function action(key, func, args) {
            var arr = cache;
            var node = this.root;
            while (node) {
                var r = this.cmp(key, node.key);
                if (r > 0) {
                    arr.push(new Item(null, node));
                    node = node.right;
                } else if (r < 0) {
                    arr.push(new Item(node, null));
                    node = node.left;
                } else {
                    var _result = func(args, node.key, node.value);
                    if (_result === 0) {
                        arr.length = 0;
                        return { result: _result, tree: this };
                    } else if (_result === 1) {
                        var _tree2 = new Tree(this.cmp);
                        _tree2.root = nodeDelete(arr, deleteNode(node.size - 1, node.left, node.right));
                        arr.length = 0;
                        return { result: _result, tree: _tree2 };
                    } else {
                        var _tree3 = new Tree(this.cmp);
                        _tree3.root = nodeUpdate(arr, new Node(key, _result.value, node.size, node.left, node.right));
                        arr.length = 0;
                        return { result: _result, tree: _tree3 };
                    }
                }
            }
            var result = func(args, node.key, node.value);
            if (result === 0 || result === 1) {
                arr.length = 0;
                return { result: result, tree: this };
            }
            var tree = new Tree(this.cmp);
            tree.root = nodeInsert(arr, new Node(key, result.value, 1, null, null));
            arr.length = 0;
            return { result: result, tree: tree };
        }
        /**
         * 返回从指定键开始的键迭代器，如果不指定键，则从最小键开始
         */

    }, {
        key: "keys",
        value: regeneratorRuntime.mark(function keys(key) {
            return regeneratorRuntime.wrap(function keys$(_context) {
                while (1) {
                    switch (_context.prev = _context.next) {
                        case 0:
                            return _context.delegateYield(key ? iterKey(this.root, this.cmp, key, getKey) : iter(this.root, getKey), "t0", 1);

                        case 1:
                        case "end":
                            return _context.stop();
                    }
                }
            }, keys, this);
        })
        /**
         * 返回从指定键开始的值迭代器，如果不指定键，则从最小键开始
         */

    }, {
        key: "values",
        value: regeneratorRuntime.mark(function values(key) {
            return regeneratorRuntime.wrap(function values$(_context2) {
                while (1) {
                    switch (_context2.prev = _context2.next) {
                        case 0:
                            return _context2.delegateYield(key ? iterKey(this.root, this.cmp, key, getValue) : iter(this.root, getValue), "t0", 1);

                        case 1:
                        case "end":
                            return _context2.stop();
                    }
                }
            }, values, this);
        })
        /**
         * 返回从指定键开始的条目迭代器，如果不指定键，则从最小键开始
         */

    }, {
        key: "items",
        value: regeneratorRuntime.mark(function items(key) {
            return regeneratorRuntime.wrap(function items$(_context3) {
                while (1) {
                    switch (_context3.prev = _context3.next) {
                        case 0:
                            return _context3.delegateYield(key ? iterKey(this.root, this.cmp, key, getItem) : iter(this.root, getItem), "t0", 1);

                        case 1:
                        case "end":
                            return _context3.stop();
                    }
                }
            }, items, this);
        })
    }]);

    return Tree;
}();

exports.Tree = Tree;
// ============================== 本地
// 节点

var Node = function Node(k, v, s, l, r) {
    _classCallCheck(this, Node);

    this.key = k;
    this.value = v;
    this.size = s;
    this.left = l;
    this.right = r;
};
// 更新条目


var Item = function Item(l, r) {
    _classCallCheck(this, Item);

    this.left = l;
    this.right = r;
};
// 缓冲数组


var cache = [];
// 节点左旋
var leftRatote = function leftRatote(key, value, size, left, right) {
    var lsize = left ? left.size : 0;
    var rsize = right.left ? right.left.size : 0;
    return new Node(right.key, right.value, size, new Node(key, value, lsize + rsize + 1, left, right.left), right.right);
};
// 节点右旋
var rightRatote = function rightRatote(key, value, size, left, right) {
    var lsize = left.right ? left.right.size : 0;
    var rsize = right ? right.size : 0;
    return new Node(left.key, left.value, size, left.left, new Node(key, value, lsize + rsize + 1, left.right, right));
};
// Maintain操作，Maintain(T)用于修复以T为根的 SBT。调用Maintain(T)的前提条件是T的子树都已经是SBT。
// 左节点增加大小，Maintain操作
var maintainLeft = function maintainLeft(key, value, size, left, right) {
    if (right) {
        if (!left) return new Node(key, value, size, left, right);
        if (left.left && left.left.size > right.size) return rightRatote(key, value, size, left, right);
        if (left.right && left.right.size > right.size) return rightRatote(key, value, size, leftRatote(left.key, left.value, left.size, left.left, left.right), right);
    } else if (left && left.size > 1) {
        return rightRatote(key, value, size, left, null);
    }
    return new Node(key, value, size, left, right);
};
// 右节点增加大小，Maintain操作
var maintainRight = function maintainRight(key, value, size, left, right) {
    if (left) {
        if (!right) return new Node(key, value, size, left, right);
        if (right.right && right.right.size > left.size) return leftRatote(key, value, size, left, right);
        if (right.left && right.left.size > left.size) return leftRatote(key, value, size, left, rightRatote(right.key, right.value, right.size, right.left, right.right));
    } else if (right && right.size > 1) {
        return leftRatote(key, value, size, null, right);
    }
    return new Node(key, value, size, left, right);
};
// 节点插入操作
var nodeInsert = function nodeInsert(arr, node) {
    for (var i = arr.length - 1; i >= 0; i--) {
        var n = arr[i].left;
        if (n) {
            node = maintainLeft(n.key, n.value, n.size + 1, node, n.right);
        } else {
            n = arr[i].right;
            node = maintainRight(n.key, n.value, n.size + 1, n.left, node);
        }
    }
    return node;
};
// 节点更新操作
var nodeUpdate = function nodeUpdate(arr, node) {
    for (var i = arr.length - 1; i >= 0; i--) {
        var n = arr[i].left;
        if (n) {
            node = new Node(n.key, n.value, n.size, node, n.right);
        } else {
            n = arr[i].right;
            node = new Node(n.key, n.value, n.size, n.left, node);
        }
    }
    return node;
};
// 节点删除操作
var nodeDelete = function nodeDelete(arr, node) {
    for (var i = arr.length - 1; i >= 0; i--) {
        var n = arr[i].left;
        if (n) {
            node = maintainRight(n.key, n.value, n.size - 1, node, n.right);
        } else {
            n = arr[i].right;
            node = maintainLeft(n.key, n.value, n.size - 1, n.left, node);
        }
    }
    return node;
};
// 节点删除操作，选Size大的子树旋转，旋转到叶子节点，然后删除
var deleteNode = function deleteNode(size, left, right) {
    if (left) {
        if (right) {
            if (left.size > right.size) {
                var lsize = left.right ? left.right.size : 0;
                return maintainRight(left.key, left.value, size, left.left, deleteNode(lsize + right.size, left.right, right));
            }
            var rsize = right.left ? right.left.size : 0;
            return maintainLeft(right.key, right.value, size, deleteNode(rsize + left.size, left, right.left), right.right);
        }
        return left;
    }
    return right;
};
// 获得键
var getKey = function getKey(node) {
    return node.key;
};
// 获得键
var getValue = function getValue(node) {
    return node.value;
};
// 获得键
var getItem = function getItem(node) {
    return { key: node.key, value: node.value };
};
// 从指定的键开始迭代
var iterKey = regeneratorRuntime.mark(function iterKey(node, cmp, key, get) {
    var r;
    return regeneratorRuntime.wrap(function iterKey$(_context4) {
        while (1) {
            switch (_context4.prev = _context4.next) {
                case 0:
                    r = cmp(key, node.key);

                    if (!(r > 0)) {
                        _context4.next = 6;
                        break;
                    }

                    if (!node.right) {
                        _context4.next = 4;
                        break;
                    }

                    return _context4.delegateYield(iterKey(node.right, cmp, key, get), "t0", 4);

                case 4:
                    _context4.next = 19;
                    break;

                case 6:
                    if (!(r < 0)) {
                        _context4.next = 15;
                        break;
                    }

                    if (!node.left) {
                        _context4.next = 9;
                        break;
                    }

                    return _context4.delegateYield(iterKey(node.left, cmp, key, get), "t1", 9);

                case 9:
                    _context4.next = 11;
                    return get(node);

                case 11:
                    if (!node.right) {
                        _context4.next = 13;
                        break;
                    }

                    return _context4.delegateYield(iter(node.right, get), "t2", 13);

                case 13:
                    _context4.next = 19;
                    break;

                case 15:
                    _context4.next = 17;
                    return get(node);

                case 17:
                    if (!node.right) {
                        _context4.next = 19;
                        break;
                    }

                    return _context4.delegateYield(iter(node.right, get), "t3", 19);

                case 19:
                case "end":
                    return _context4.stop();
            }
        }
    }, iterKey, this);
});
// 迭代指定节点
var iter = regeneratorRuntime.mark(function iter(node, get) {
    return regeneratorRuntime.wrap(function iter$(_context5) {
        while (1) {
            switch (_context5.prev = _context5.next) {
                case 0:
                    if (!node.left) {
                        _context5.next = 2;
                        break;
                    }

                    return _context5.delegateYield(iter(node.left, get), "t0", 2);

                case 2:
                    _context5.next = 4;
                    return get(node);

                case 4:
                    if (!node.right) {
                        _context5.next = 6;
                        break;
                    }

                    return _context5.delegateYield(iter(node.right, get), "t1", 6);

                case 6:
                case "end":
                    return _context5.stop();
            }
        }
    }, iter, this);
});
})