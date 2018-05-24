_$define("pi/db/db", function (require, exports, module){
"use strict";
/*
 * KV数据库，及事务
 */

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

Object.defineProperty(exports, "__esModule", { value: true });
var event_1 = require("../util/event");
// ============================== 导出
/**
 * 数据库系统提供的表的前缀
 * @example
 */
exports.SUFFIX = {
    mq: '_$mq/',
    rt: '_$rt/',
    db: '_$db/',
    cfg: '_$cfg/',
    code: '_$code/',
    node: '_$node/',
    cache: '_$cache/',
    connect: '_$connect/',
    action: '_$action/' // 表示每操作的表前缀，操作结束后会自动清理
};
/**
 * 事务
 * @example
 */

var Transaction = function () {
    function Transaction() {
        _classCallCheck(this, Transaction);

        // 是否为写事务
        this.writable = false;
        // 事务的超时时间
        this.timeout = 5000;
    }
    // 开始本地事务
    /* tslint:disable:no-empty */


    _createClass(Transaction, [{
        key: "start",
        value: function start(s) {}
        // 结束本地事务。

    }, {
        key: "end",
        value: function end() {}
        // 提交一个本地事务。

    }, {
        key: "commit",
        value: function commit() {}
        // 回滚一个本地事务。

    }, {
        key: "rollback",
        value: function rollback() {}
        // 预提交一个本地事务。

    }, {
        key: "prepare",
        value: function prepare() {}
        // 回滚一个已进行预提交的事务。

    }, {
        key: "recover",
        value: function recover() {}
        // 锁

    }, {
        key: "lock",
        value: function lock(arr, lockTime) {}
        // 查询

    }, {
        key: "query",
        value: function query(arr, lockTime) {
            return [];
        }
        // 插入或更新

    }, {
        key: "upsert",
        value: function upsert(arr, lockTime) {}
        // 删除
        /* tslint:disable:no-reserved-keywords */

    }, {
        key: "delete",
        value: function _delete(arr, lockTime) {}
        // 迭代

    }, {
        key: "iter",
        value: function iter(tab, filter) {}
        // 新增 修改 删除 表

    }, {
        key: "alter",
        value: function alter(tab, meta) {}
    }]);

    return Transaction;
}();

exports.Transaction = Transaction;
/**
 * @description 数据库会话
 * @example
 */

var Session = function () {
    function Session() {
        _classCallCheck(this, Session);
    }

    _createClass(Session, [{
        key: "open",

        // 打开与数据库的会话。
        value: function open(db) {}
        // 关闭与数据库的会话。

    }, {
        key: "close",
        value: function close() {}
        // 读事务，无限尝试直到超时，默认10秒

    }, {
        key: "read",
        value: function read(tx, timeout) {}
        // 写事务，无限尝试直到超时，默认10秒

    }, {
        key: "write",
        value: function write(tx, timeout) {}
    }]);

    return Session;
}();

exports.Session = Session;
/**
 * @description 数据库会话
 * @example
 */

var DB = function () {
    function DB() {
        _classCallCheck(this, DB);

        /* tslint:disable:typedef */
        this.listeners = new event_1.ListenerList();
        this.tabListeners = new Map();
    }
    // 打开数据库


    _createClass(DB, [{
        key: "open",
        value: function open() {}
        // 关闭数据库

    }, {
        key: "close",
        value: function close() {}
        // 复制一个数据库，在复制的数据库上做的所有操作都不会影响主库，主要用于前端做模拟计算使用

    }, {
        key: "clone",
        value: function clone() {
            return null;
        }
    }]);

    return DB;
}();

exports.DB = DB;
})