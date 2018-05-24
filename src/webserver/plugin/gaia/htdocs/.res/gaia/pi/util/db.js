_$define("pi/util/db", function (require, exports, module){
"use strict";
/*
 * 类型数据库模块
 * 提供查询和操作
 */
/**
 * 匹配规则， 大小规则，上家下家规则（回环规则-内置），
 * 场景：玩家，牌，当前牌，当前玩家，
 * 牌：分数，颜色，所有权，显示，
 * 相同： equal(field, count), (X, X.color == X1.color,
 * 顺序： seq(field, count)
 * 顺序回环： seqR(field, count)
 * 过滤： filter(""
 * 组合：equal(field, count) + seq(field, count)
 *
 * ok : ? filter, "owner, show", {{it.curPlayer}}, false ? -> {word} + jiang;
 * word: | ? equal, "color, score", 4 ? , ? equal, "color, score", 3 ? , ? seq, "color, score", 3 ? |;
 * jiang: ? equal, "score", 2 ?;
 *
 *
 * 将整个场景设为一个通用集合，支持filter, equal, seq, seqCircle,
 * 前端听牌、胡牌的多匹配的怎么描述？还需要告诉玩家胡牌的张数
 * all函数匹配所有路径，返回所有成功的匹配
 * 后端掉线后的自动处理，前端的自动处理，
 *
 * 还是提供几个接口定义，和很多通用函数。由外部配置定义闭包函数来完成。
 * 参考一下响应式编程。
 *
 * 数据查找是一个需求，另一个是数据的组合关系的匹配。
 *
 */

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

Object.defineProperty(exports, "__esModule", { value: true });
/**
 * 负责存储数据库
 * 提供匹配查找和修改插入和删除
 * 初始化时需要设置索引，支持多组合键的索引
 * 索引的优先级遵循设置的次序，前面的优先级高
 * 如果一个查询可以有多个可索引的，则按照最大联合索引加索引优先级来决定查询那个索引
 * 一个查询只能有最多一个范围查询，只有定值查询和范围查询可以利用索引加速
 * 范围查询：{K, order, V1, V2, Limit}, V1,V2是闭区间，V1 > V2 表示降序，否则为升序，Limit表示最多取多少
 * 范围查询只能用单索引或该键为联合索引的最后一个
 *
 * -type query_info() ::
 * {key_info(), string()} |
 * {'$key', 'has', key_info()} |
 * {'$key', 'not', key_info()} |
 * {'$id', 'in' | 'out', list()} |
 * {key_info(), 'in' | 'out' | '>' | '>=' | '<' | '<=' | '!' | 'member' | 'notmember', any()} |
 * {key_info(), '-' | '!', any(), any()} |
 * {key_info(), 'order', any(), any(), integer()} |
 * {fun(), any()} |
 * {key_info(), fun(), any()}.
 *
 * -type modify_info() ::
 * {key_info(), string()} |
 * {'$key', 'del', key_info()} |
 * {key_info(), '-' | '+' | '*' | '/' | 'div', any()} |
 * {key_info(), fun(), any()}.
 *
 *
 */
// ============================== 导入
var util_1 = require("../util/util");
/**
 * @description 行集
 * @example
 * 行的集合，包含指定排序的行数组,
 */

var RowSet = function RowSet() {
    _classCallCheck(this, RowSet);

    this.arr = [];
    this.sortFields = [];
    this.sortDesc = false;
};

exports.RowSet = RowSet;
// tslint:disable:no-empty no-reserved-keywords
exports.initMetadata = function (tableName, metadata) {};
exports.getMetadata = function (tableName) {
    return null;
};
exports.getTable = function (name) {
    return null;
};
exports.setTable = function (name, set) {};
exports.get = function (tableName, prikey) {};
exports.set = function (tableName, prikey, fieldsName, value) {};
exports.insert = function (tableName, el) {
    return true;
};
exports.query = function (tableName, matchs, one) {
    return [];
};
exports.update = function (tableName, matchs, el, one) {
    return 0;
};
exports.remove = function (tableName, matchs, one) {
    return 0;
};
exports.replace = function (tableName, matchs, el) {
    return true;
};
/**
 * @description 创建一个多匹配函数， 可以当作过滤函数使用
 * {key_info(), any()} |
 * {'$key', 'has' | 'out', key_info()} |
 * {key_info(), 'in' | 'out' | '>' | '>=' | '<' | '=<' | '!' | 'member' | 'notmember', any()} |
 * {key_info(), '-' | '!', any(), any()} |
 * {fun(), any()} |
 * {key_info(), fun(), any()}.
 * @example
 */
exports.createMatchs = function (matchs) {
    var arr = [];
    arr.length = matchs.length;
    for (var i = 0, len = arr.length; i < len; i++) {
        arr[i] = createMatch(matchs[i]);
    }
    return function (el) {
        for (var _i = 0, _len = arr.length; _i < _len; _i++) {
            if (arr[_i]) {
                return true;
            }
        }
        return false;
    };
};
/**
 * @description 创建一个多字段排序函数
 * @example
 */
exports.createSort = function (fields, desc) {
    var r = desc ? 1 : -1;
    return function (a, b) {
        var v1 = void 0;
        // tslint:disable-next-line:prefer-const
        var v2 = void 0;
        for (var i = 0, len = fields.length; i < len; i++) {
            v1 = a[fields[i]];
            if (v1 < v2) {
                return r;
            }
            if (v2 < v1) {
                return -r;
            }
        }
        return r;
    };
};
/**
 * @description 生成排序并取前N条的行集函数
 * @example
 */
exports.orderLimit = function (set, fields, desc, limit) {
    desc = desc || false;
    limit = limit || Number.MAX_SAFE_INTEGER;
    var ss = void 0;
    if (!util_1.arrayEqual(set.sortFields, fields)) {
        ss = new RowSet();
        ss.sortFields = fields;
        ss.sortDesc = desc;
        ss.arr = set.arr.slice();
        ss.arr.sort(exports.createSort(fields, desc));
    } else if (set.sortDesc !== desc) {
        ss = new RowSet();
        ss.sortFields = fields;
        ss.sortDesc = desc;
        ss.arr = set.arr.slice().reverse();
    }
    if (ss) {
        if (ss.arr.length > limit) {
            ss.arr.length = limit;
        }
    } else if (set.arr.length > limit) {
        ss.sortFields = fields;
        ss.arr = set.arr.slice(0, limit);
    }
    return ss || set;
};
/**
 * @description 生成对指定字段进行分组的行集函数
 * @example
 */
exports.groupBy = function (set, field) {
    var result = [];
    var arr = set.arr;
    for (var i = 0, len = arr.length; i < len; i++) {
        var ss = result[arr[i][field]];
        if (!ss) {
            ss = new RowSet();
            ss.sortFields = set.sortFields;
            ss.sortDesc = set.sortDesc;
            ss.arr = [arr[i]];
        } else {
            ss.arr.push(arr[i]);
        }
    }
    return result;
};
/**
 * @description 多字段比较相同，劈分行集的函数
 * @example
 */
exports.fieldsEqual = function (set, fields, count) {
    set = adjustSort(set, fields);
    var arr = set.arr;
    var index = 0;
    var c = 1;
    var last = arr[0];
    for (var i = 1, len = arr.length; i < len; i++) {
        c++;
        var cur = arr[i];
        for (var j = fields.length - 1; j >= 0; j--) {
            if (cur[fields[j]] !== last[fields[j]]) {
                index = i;
                c = 1;
                break;
            }
        }
        if (c >= count) {
            return [slice(set, 0, index), slice(set, index, index + count), slice(set, index + count)];
        }
        last = cur;
    }
    return [set, null, null];
};
/**
 * @description 多字段比较相同，指定字段顺序增加，劈分行集的函数
 * @example
 */
exports.fieldsSeq = function (set, fields, seqField, count) {
    set = adjustSort(set, fields.concat(seqField));
    var arr = set.arr;
    var index = 0;
    var c = 1;
    var last = arr[0];
    for (var i = 1, len = arr.length; i < len; i++) {
        c++;
        var cur = arr[i];
        if (cur[seqField] === last[seqField] + 1) {
            for (var j = fields.length - 1; j >= 0; j--) {
                if (cur[fields[j]] !== last[fields[j]]) {
                    index = i;
                    c = 1;
                    break;
                }
            }
        } else {
            index = i;
            c = 1;
        }
        if (c >= count) {
            return [slice(set, 0, index), slice(set, index, index + count), slice(set, index + count)];
        }
        last = cur;
    }
    return [set, null, null];
};
/**
 * @description 模式分解
 * @example
 */
exports.decompose = function (set) {
    return [];
};
/**
 * @description 创建所有字段枚举的对象
 * @example
 */
exports.make = function (construct, fieldsEnum, result) {
    var len = fieldsEnum.length;
    var arr = Array(len).fill(0);
    result = result || [];
    // tslint:disable-next-line:no-constant-condition
    while (true) {
        var obj = new construct();
        result.push(obj);
        var carry = len - 1; // 当前进位的位置
        for (var i = len - 1; i >= 0; i--) {
            var e = fieldsEnum[i][1];
            obj[fieldsEnum[i][0]] = e[arr[i]];
            if (carry !== i) {
                continue;
            }
            arr[i]++;
            // 当前进位溢出， 则下一个进位需要增加1
            if (arr[i] < e.length) {
                continue;
            }
            arr[i] = 0;
            carry--;
        }
        // 最大进位溢出了，表示所有的枚举都被遍历了
        if (carry < 0) {
            break;
        }
    }
    return result;
};
// ============================== 本地
// 匹配函数表
var matchMap = {
    match: function match(key, value) {
        return function (el) {
            return el[key] === value;
        };
    },
    keyhas: function keyhas(key) {
        return function (el) {
            return el[key] === undefined;
        };
    },
    keynot: function keynot(key) {
        return function (el) {
            return el[key] !== undefined;
        };
    },
    in: function _in(key, value) {
        return function (el) {
            return value.indexOf(el[key]) >= 0;
        };
    },
    out: function out(key, value) {
        return function (el) {
            return value.indexOf(el[key]) < 0;
        };
    },
    '>': function _(key, value) {
        return function (el) {
            return el[key] > value;
        };
    },
    '>=': function _(key, value) {
        return function (el) {
            return el[key] >= value;
        };
    },
    '<': function _(key, value) {
        return function (el) {
            return el[key] < value;
        };
    },
    '<=': function _(key, value) {
        return function (el) {
            return el[key] <= value;
        };
    },
    member: function member(key, value) {
        return function (el) {
            var arr = el[key];
            return arr ? arr.indexOf(value) >= 0 : false;
        };
    },
    notmember: function notmember(key, value) {
        return function (el) {
            var arr = el[key];
            return arr ? arr.indexOf(value) < 0 : true;
        };
    },
    '-': function _(key, min, max) {
        return function (el) {
            var v = el[key];
            return v >= min && v <= max;
        };
    },
    '!': function _(key, min, max) {
        return function (el) {
            var v = el[key];
            return v < min || v > max;
        };
    },
    fun: function fun(func, args) {
        return function (el) {
            return func(args, el);
        };
    },
    keyfun: function keyfun(key, func, args) {
        return function (el) {
            return func(args, el[key]);
        };
    }
};
// 根据匹配条件，创建对应的匹配函数
var createMatch = function createMatch(match) {
    var key = match[0];
    var oper = match[1];
    if (match.length === 2) {
        return typeof key === 'string' ? matchMap.match(key, oper) : matchMap.fun(key, oper);
    }
    if (match.length === 3) {
        if (key === '$key') {
            if (oper === 'has') {
                return matchMap.keyhas(match[2]);
            }
            if (oper === 'not') {
                return matchMap.keynot(match[2]);
            }
        } else if (typeof oper !== 'string') {
            return matchMap.keyfun(key, oper, match[2]);
        } else {
            return matchMap[oper](key, match[2]);
        }
    }
    if (match.length === 4) {
        return matchMap[oper](key, match[2], match[3]);
    }
};
/**
 * @description 多字段比较相同，指定字段顺序增加，劈分行集的函数
 * @example
 */
var adjustSort = function adjustSort(set, fields) {
    var resort = fields.length > set.sortFields.length;
    if (!resort) {
        // 如果排序的顺序和多字段比较的顺序一致， 则不需要重新排序
        for (var i = 0, len = fields.length; i < len; i++) {
            if (fields[i] !== set.sortFields[i]) {
                resort = true;
                break;
            }
        }
    }
    if (!resort) {
        return set;
    }
    var ss = new RowSet();
    ss.sortFields = util_1.unique(fields.concat(set.sortFields));
    ss.sortDesc = set.sortDesc;
    var sort = exports.createSort(ss.sortFields, ss.sortDesc);
    ss.arr = set.arr.slice();
    ss.arr.sort(sort);
    return ss;
};
// 合并行集
var concat = function concat(set1, set2) {
    if (!util_1.arrayEqual(set1.sortFields, set2.sortFields)) {
        throw new Error('invalid sortFields');
    }
    if (set1.sortDesc !== set2.sortDesc) {
        throw new Error('invalid sortDesc');
    }
    var ss = new RowSet();
    ss.sortFields = set1.sortFields;
    ss.sortDesc = set1.sortDesc;
    ss.arr = set1.arr.concat(set2.arr);
    return ss;
};
// 切分的行集
var slice = function slice(set, start, end) {
    var ss = new RowSet();
    ss.sortFields = set.sortFields;
    ss.sortDesc = set.sortDesc;
    ss.arr = set.arr.slice(start, end);
    return ss;
};
})