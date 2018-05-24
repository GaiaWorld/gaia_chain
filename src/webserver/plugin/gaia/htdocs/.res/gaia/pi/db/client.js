_$define("pi/db/client", function (require, exports, module){
"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

Object.defineProperty(exports, "__esModule", { value: true });
var event_1 = require("../util/event");
var sb_tree_1 = require("../util/sb_tree");
var util_1 = require("../util/util");
var db_1 = require("./db");

var CSession = function (_db_1$Session) {
    _inherits(CSession, _db_1$Session);

    function CSession() {
        _classCallCheck(this, CSession);

        return _possibleConstructorReturn(this, (CSession.__proto__ || Object.getPrototypeOf(CSession)).apply(this, arguments));
    }

    _createClass(CSession, [{
        key: "open",

        // 打开与数据库的会话。
        value: function open(db) {
            if (this.db) {
                return new DBError('the session is connecting the other', ErrorType.DB_CONNECT, '');
            }
            db.open();
            this.db = db;
        }
        // 关闭与数据库的会话。

    }, {
        key: "close",
        value: function close() {
            if (this.tempTabs) {
                return new DBError('the session has transaction is going on, connection cannot be closed', ErrorType.DB_CONNECT, '');
            }
            this.db.close();
            delete this.db;
        }
        // 读事务，无限尝试直到超时，默认10秒

    }, {
        key: "read",
        value: function read(tx, timeout) {
            return visitDB(this, tx, handlerRead, timeout);
        }
        // 写事务，无限尝试直到超时，默认10秒

    }, {
        key: "write",
        value: function write(tx, timeout) {
            return visitDB(this, tx, handlerWrite, timeout);
        }
    }]);

    return CSession;
}(db_1.Session);

exports.CSession = CSession;

var CTransaction = function (_db_1$Transaction) {
    _inherits(CTransaction, _db_1$Transaction);

    function CTransaction() {
        _classCallCheck(this, CTransaction);

        // 是否为写事务
        var _this2 = _possibleConstructorReturn(this, (CTransaction.__proto__ || Object.getPrototypeOf(CTransaction)).apply(this, arguments));

        _this2.writable = false;
        return _this2;
    }
    // 开始本地事务


    _createClass(CTransaction, [{
        key: "start",
        value: function start(s) {
            if (s.tempTabs) {
                throw new DBError('a transaction is going on! you can\'t start the next transaction', ErrorType.START, null);
            }
            this.session = s;
            s.tempTabs = new Map();
        }
        // 结束本地事务，清理临时表及session（在开始事务时被创建）。

    }, {
        key: "end",
        value: function end() {
            delete this.session.tempTabs;
            delete this.session;
        }
        // 提交一个本地事务。

    }, {
        key: "commit",
        value: function commit() {
            var _this3 = this;

            var tabs = this.session.db.tabs;
            this.session.tempTabs.forEach(function (v, k) {
                var tab = tabs.get(k);
                tab.data = v.data;
                tab.lock = false; // 设置为非锁状态
                tab.version++; // 提交后版本加1
                var l = _this3.session.db.tabListeners.get(k);
                if (l) {
                    l.notify(v.modify); // 抛出修改事件
                }
            });
        }
        // 回滚一个本地事务。
        /* tslint:disable:no-empty */

    }, {
        key: "rollback",
        value: function rollback() {}
        // 预提交一个本地事务。

    }, {
        key: "prepare",
        value: function prepare() {
            var tabs = this.session.db.tabs;
            this.session.tempTabs.forEach(function (v, k) {
                if (tabs.get(k).lock === true) {
                    throw new DBError('the table has a lock,prepare fail!', ErrorType.PREPARE, k);
                } else if (tabs.get(k).version !== v.version) {
                    throw new DBError('the data has changed,prepare fail!', ErrorType.PREPARE, k);
                }
            });
            this.session.tempTabs.forEach(function (v, k) {
                tabs.get(k).lock = true; // 预提交条件达成，给每一个表上锁，防止其他线程在此线程提交结束前修改表
            });
        }
        // 回滚一个已进行预提交的事务。

    }, {
        key: "recover",
        value: function recover() {
            this.session.tempTabs = new Map();
        }
        // 查询

    }, {
        key: "query",
        value: function query(arr, lockTime) {
            var tabs = this.session.db.tabs;
            var items = [];
            for (var i = 0; i < arr.length; i++) {
                var item = arr[i];
                var tab = tabs.get(item.tab);
                if (!tab) {
                    throw new DBError('The table is not exist, query fail!', ErrorType.NOT_TABLE, item.tab);
                }
                if (tab.data) {
                    items[i] = tab.data.get(item.key);
                }
            }
            return items;
        }
        // 插入或更新

    }, {
        key: "upsert",
        value: function upsert(arr, lockTime) {
            if (!this.writable) {
                throw new DBError('you can not write, this is a read transaction', ErrorType.ILLEGAL_WRITE, '');
            }
            /* tslint:disable:prefer-const */
            var struct = void 0;
            var item = void 0;
            var tab = void 0;
            var modifys = void 0;
            var tempTab = void 0;
            var tempTabs = void 0;
            var tabs = void 0;
            tempTabs = this.session.tempTabs;
            tabs = this.session.db.tabs;
            for (var i = 0; i < arr.length; i++) {
                item = arr[i];
                if (!item) continue;
                var keyCompare = compareNumber;
                if (typeof item.key === 'string') {
                    keyCompare = compareString;
                } else if (typeof item.key !== 'number') {
                    throw new Error('数据库不支持除number, string以外的主键！');
                }
                tab = tabs.get(item.tab);
                if (!tab) {
                    throw new DBError('The table is not exist,upsert fail!', ErrorType.NOT_TABLE, item.tab);
                }
                tempTab = tempTabs.get(item.tab);
                if (!tempTab) {
                    tempTab = new TempModify(tab.version, tab.data, []);
                    tempTabs.set(item.tab, tempTab);
                }
                if (item.time >= 0) {
                    !tempTab.data && (tempTab.data = new sb_tree_1.Tree(keyCompare));
                    tempTab.data = tempTab.data.set(item.key, item.value);
                } else if (item.time < 0) {
                    tempTab.data = tempTab.data.delete(item.key);
                }
                tempTab.modify.push(item);
            }
        }
        // 删除
        /* tslint:disable:no-reserved-keywords */

    }, {
        key: "delete",
        value: function _delete(arr, lockTime) {
            if (!this.writable) {
                throw new DBError('you can not write, this is a read transaction', ErrorType.ILLEGAL_WRITE, '');
            }
            var tempTabs = this.session.tempTabs;
            var tab = void 0;
            var item = void 0;
            var tabs = this.session.db.tabs;
            var tempTab = void 0;
            for (var i = 0; i < arr.length; i++) {
                item = arr[i];
                if (!item) continue;
                tab = tabs.get(item.tab);
                if (!tab) {
                    throw new DBError('The table is not exist, delete fail!', ErrorType.NOT_TABLE, item.tab);
                }
                tempTab = tempTabs.get(item.tab);
                if (!tempTab) {
                    tempTab = new TempModify(tab.version, tab.data, []);
                    tempTabs.set(item.tab, tempTab);
                }
                if (!tempTab.data) {
                    throw new DBError('The table is null, delete fail!', ErrorType.NOT_TABLE, item.tab);
                }
                tempTab.data = tempTab.data.delete(item.key);
                tempTab.modify.push(item);
            }
        }
        // 迭代

    }, {
        key: "iter",
        value: function iter(tab, filter) {
            var tabs = this.session.db.tabs;
            var t = tabs.get(tab);
            if (!t) {
                throw new DBError('The table is not exist', ErrorType.NOT_TABLE, tab);
            }
            if (!t.data) {
                return;
            }
            return t.data.values();
        }
        // 新增 修改 删除 表

    }, {
        key: "alter",
        value: function alter(tabName, meta) {
            var tabs = this.session.db.tabs;
            var tab = void 0;
            if (!meta) {
                tab = tabs.get(tabName);
                if (!tab) {
                    throw new DBError('the table is not exist, delete table fail！', ErrorType.NOT_TABLE, '');
                }
                tabs.delete(tabName);
                this.session.db.metaListeners.notify({ meta: meta, old: tab.meta, tab: tabName });
            } else {
                var old = void 0;
                var _tab = tabs.get(tabName);
                if (!_tab) {
                    _tab = { meta: meta, data: null, version: 0 };
                    tabs.set(tabName, _tab);
                } else {
                    old = _tab.meta;
                    _tab.meta = meta;
                }
                this.session.db.metaListeners.notify({ meta: meta, old: old, tab: tabName });
            }
        }
    }]);

    return CTransaction;
}(db_1.Transaction);

exports.CTransaction = CTransaction;
/**
 * @description 数据库会话
 * @example
 */

var CDB = function (_db_1$DB) {
    _inherits(CDB, _db_1$DB);

    function CDB() {
        _classCallCheck(this, CDB);

        /* tslint:disable:typedef */
        var _this4 = _possibleConstructorReturn(this, (CDB.__proto__ || Object.getPrototypeOf(CDB)).apply(this, arguments));

        _this4.metaListeners = new event_1.ListenerList();
        _this4.tabListeners = new Map();
        _this4.tabs = new Map();
        return _this4;
    }
    // 打开数据库


    _createClass(CDB, [{
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
            var db = new CDB();
            util_1.mapCopy(this.tabs, db.tabs);
            return db;
        }
    }, {
        key: "addTabListener",
        value: function addTabListener(tabName, fun) {
            var l = this.tabListeners.get(tabName);
            if (!l) {
                l = new event_1.ListenerList();
                this.tabListeners.set(tabName, l);
            }
            l.add(fun);
        }
    }, {
        key: "addListener",
        value: function addListener(fun) {
            var l = this.metaListeners.add(fun);
        }
    }]);

    return CDB;
}(db_1.DB);

exports.CDB = CDB;
var handlerWrite = function handlerWrite(h, t, timeout) {
    t.writable = true;
    try {
        var r = h(t); // 业务逻辑，对数据库进行增删改查
        t.prepare();
        t.commit();
        t.end(); // 结束事务
        return r;
    } catch (error) {
        if (error.type === ErrorType.NOT_TABLE || error.type === ErrorType.ILLEGAL_WRITE) {
            t.rollback();
        } else if (error.type === ErrorType.PREPARE) {
            t.recover();
        }
        t.end(); // 结束事务
        throw error;
    }
};
var handlerRead = function handlerRead(h, t) {
    var timeout = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 5000;

    var startTime = new Date().getTime();
    while (timeout > 0) {
        try {
            var r = h(t); // 业务逻辑，对数据库进行增删改查
            t.end(); // 结束事务
            return r;
        } catch (error) {
            t.end(); // 结束事务
            throw error;
        }
    }
};
var visitDB = function visitDB(session, tx, handler, timeout) {
    var t = new CTransaction();
    t.start(session);
    return handler(tx, t, timeout);
};
/* tslint:disable:max-classes-per-file */

var DBError = function (_Error) {
    _inherits(DBError, _Error);

    function DBError(message, type, info) {
        _classCallCheck(this, DBError);

        var _this5 = _possibleConstructorReturn(this, (DBError.__proto__ || Object.getPrototypeOf(DBError)).call(this));

        _this5.message = message;
        _this5.type = type;
        _this5.info = info;
        return _this5;
    }

    return DBError;
}(Error);

var ErrorType;
(function (ErrorType) {
    ErrorType[ErrorType["NOT_TABLE"] = 0] = "NOT_TABLE";
    ErrorType[ErrorType["PREPARE"] = 1] = "PREPARE";
    ErrorType[ErrorType["START"] = 2] = "START";
    ErrorType[ErrorType["DB_CONNECT"] = 3] = "DB_CONNECT";
    ErrorType[ErrorType["ILLEGAL_WRITE"] = 4] = "ILLEGAL_WRITE";
})(ErrorType || (ErrorType = {}));

var TempModify = function TempModify(version, data, modify) {
    _classCallCheck(this, TempModify);

    this.version = version;
    this.data = data;
    this.modify = modify;
};

var compareNumber = function compareNumber(a, b) {
    if (a > b) {
        return 1;
    } else if (a < b) {
        return -1;
    } else {
        return 0;
    }
};
var compareString = function compareString(a, b) {
    if (a.length > b.length) {
        return 1;
    } else if (a.length < b.length) {
        return -1;
    }
    for (var i = 0; i < a.length; i++) {
        if (a.charCodeAt(i) > b.charCodeAt(i)) {
            return 1;
        } else if (a.charCodeAt(i) < b.charCodeAt(i)) {
            return -1;
        }
    }
    return 0;
};
})