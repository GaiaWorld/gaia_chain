_$define("pi/struct/util", function (require, exports, module){
"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
var mod_1 = require("../lang/mod");
var bin_1 = require("../util/bin");
var util_1 = require("../util/util");
var struct_mgr_1 = require("./struct_mgr");
// 半序列化ReadNext,bb.read()读到的是数据的索引
exports.getPartReadNext = function (mgr) {
    // tslint:disable:no-reserved-keywords
    return function (bb, type) {
        var meta = mgr.lookup(type);
        return meta.map.get(bb.read());
    };
};
// 全序列化ReadNext，bb中为整个对象容器
exports.getAllReadNext = function (mgr) {
    return function (bb, type) {
        var meta = mgr.lookup(type);
        var bc = new meta.construct();
        bc.binDecode(bb, exports.getAllReadNext(mgr));
        return bc;
    };
};
// 半序列化WriteNext，需要在bb中写入hash和对象的索引 
exports.partWrite = function (bb, o) {
    bb.writeInt(o._$meta.info.nameHash);
    bb.writeInt(o._$index);
};
// 全序列化WriteNext，需要在bb中写入整个对象
exports.allWrite = function (bb, o) {
    bb.writeInt(o._$meta.info.nameHash);
    o.binEncode(bb, exports.allWrite);
};
// =================== 试struct辅助函数，参考========================
exports.registerToMgr = function (fileMap, mgr) {
    var exp = void 0;
    var filePath = void 0;
    for (var k in fileMap) {
        if (k.indexOf('examples/struct') === 0) {
            filePath = k.slice(0, k.length - mod_1.butil.fileSuffix(k).length - 1);
            exp = self.pi_modules[filePath].exports;
            for (var kk in exp) {
                if (struct_mgr_1.MStruct.isPrototypeOf(exp[kk])) {
                    mgr.register(exp[kk]._$info.nameHash, exp[kk], filePath + "." + kk);
                }
            }
        }
    }
};
exports.registerRpc = function (fileMap, mgr) {
    var exp = void 0;
    var filePath = void 0;
    for (var k in fileMap) {
        filePath = k.slice(0, k.length - mod_1.butil.fileSuffix(k).length - 1);
        if (!self.pi_modules[filePath]) {
            continue;
        }
        exp = self.pi_modules[filePath].exports;
        for (var kk in exp) {
            if (exp[kk]._$info && exp[kk]._$info.annotate && exp[kk]._$info.annotate.type === 'rpc') {
                mgr.register(exp[kk]._$info.nameHash, exp[kk], filePath + "." + kk);
            }
        }
    }
};
exports.modifyListner = function (struct, field, value, old, index) {
    var bb = new bin_1.BinBuffer();
    exports.createMOrder(bb, struct, field, index);
};
/**
 * 创建修改指令
 */
exports.createMOrder = function (bb, struct, field, index) {
    var meta = struct._$meta;
    var type = meta.info.fields[field].type;
    var value = struct[field];
    bb.writeInt(meta.info.nameHash); // 写struct的hash
    bb.writeInt(struct._$index); // 写struct的索引
    bb.writeUtf8(field); // 写修改的字段
    if (index) {
        bb.write(index, null); // 写index
    }
    if (struct["encode" + util_1.upperFirst(field)]) {
        struct["encode" + util_1.upperFirst(field)](bb);
    } else {
        struct["encode" + util_1.upperFirst(field) + "_" + index](bb);
    }
};
/**
 * 创建添加指令
 */
exports.createAOrder = function (bb, struct) {
    bb.writeInt(struct._$meta.info.nameHash);
    struct.binEncode(bb, exports.partWrite);
};
/**
 * 解析修改指令
 */
exports.analysisMOrder = function (mgr, bb) {
    var hash = bb.read(); // 读hash
    var index = bb.read(); // 读索引
    var field = bb.read(); // 读字段名
    var struct = mgr.lookup(hash).map.get(index);
    var setFun = "set" + util_1.upperFirst(field);
    if (Array.isArray(struct[field]) || struct[field] instanceof Map) {
        var key = bb.read();
        if (struct[setFun + "_" + key]) {
            struct[setFun + "_" + key](bb.read(exports.getPartReadNext(struct._$meta.mgr)));
        } else {
            struct["" + setFun](exports.getPartReadNext(struct._$meta.mgr), key);
        }
    } else {
        struct["" + setFun](exports.getPartReadNext(struct._$meta.mgr));
    }
};
/**
 * 解析添加指令
 */
exports.analysisAOrder = function (mgr, bb) {
    var construct = mgr.lookup(bb.read()).construct;
    var struct = new construct();
    struct.binDecode(bb, exports.getPartReadNext(mgr));
    struct_mgr_1.addToMeta(mgr, struct); // 添加到元信息
    return struct;
};
/**
 * 解析添加指令
 */
exports.addLisner = function (mgr, rMgr) {
    var ml = function ml(struct, field, value, old, index) {
        var bb = new bin_1.BinBuffer();
        exports.createMOrder(bb, struct, field, index);
        exports.analysisMOrder(rMgr, bb);
    };
    var al = function al(struct) {
        var bb = new bin_1.BinBuffer();
        exports.createAOrder(bb, struct);
        exports.analysisAOrder(rMgr, bb);
    };
    mgr.numberMap.forEach(function (v, k) {
        v.addModifyListener(ml);
        v.addAddListener(al);
    });
};
})