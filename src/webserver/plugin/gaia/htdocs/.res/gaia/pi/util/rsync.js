_$define("pi/util/rsync", function (require, exports, module){
"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

Object.defineProperty(exports, "__esModule", { value: true });
var Hash = require("./hash");
var md5_1 = require("./md5");

var RSync = function () {
    function RSync(blockSize) {
        _classCallCheck(this, RSync);

        this.size = blockSize || 64;
    }
    // 计算校验和


    _createClass(RSync, [{
        key: "checksum",
        value: function checksum(data) {
            var length = data.length;
            var incr = this.size;
            var start = 0;
            var end = incr > length ? length : incr;
            var blockIndex = 0;
            var results = [];
            var result = void 0;
            while (start < length) {
                var chunk = data.slice(start, end);
                var weak = Hash.weak32(chunk).sum;
                var strong = md5_1.str_md5(chunk);
                result = { weak: weak, strong: strong, index: blockIndex };
                results.push(result);
                start += incr;
                end = end + incr > length ? length : end + incr;
                blockIndex++;
            }
            return results;
        }
        // 计算差异

    }, {
        key: "diff",
        value: function diff(newData, oldChecksums) {
            var results = [];
            var length = newData.length;
            var start = 0;
            var end = this.size > length ? length : this.size;
            var lastMatchedEnd = 0;
            var prevRollingWeak = null;
            var hashtable = createHashtable(oldChecksums);
            var weak = void 0;
            var weak16 = void 0;
            var match = void 0;
            for (; end <= length;) {
                weak = Hash.weak32(newData, prevRollingWeak, start, end);
                weak16 = Hash.weak16(weak.sum);
                var checkSums = hashtable.get(weak16);
                if (checkSums) {
                    for (var i = 0; i < checkSums.length; i++) {
                        if (checkSums[i].weak === weak.sum) {
                            var mightMatch = checkSums[i];
                            var chunk = newData.slice(start, end);
                            var strong = md5_1.str_md5(chunk);
                            if (mightMatch.strong === strong) {
                                match = mightMatch;
                                break;
                            }
                        }
                    }
                }
                if (match) {
                    var d = void 0;
                    if (start > lastMatchedEnd) {
                        d = newData.slice(lastMatchedEnd, start);
                    }
                    results.push({ index: match.index, data: d });
                    start = end;
                    lastMatchedEnd = end;
                    end += this.size;
                    prevRollingWeak = null;
                } else {
                    start++;
                    end++;
                    prevRollingWeak = weak;
                }
            }
            if (lastMatchedEnd < length) {
                results.push({
                    data: newData.slice(lastMatchedEnd, length)
                });
            }
            return results;
        }
        // 同步数据

    }, {
        key: "sync",
        value: function sync(oldData, diffs) {
            if (oldData === undefined) {
                throw new Error('\'must do checksum() first\'');
            }
            var len = diffs.length;
            var synced = new Uint8Array(0);
            for (var i = 0; i < len; i++) {
                var chunk = diffs[i];
                if (chunk.data === undefined) {
                    synced = concatU8(synced, rawslice(oldData, chunk.index, this.size));
                } else {
                    synced = concatU8(synced, chunk.data);
                    if (chunk.index !== undefined) {
                        synced = concatU8(synced, rawslice(oldData, chunk.index, this.size));
                    }
                }
            }
            return synced;
        }
    }]);

    return RSync;
}();

exports.RSync = RSync;
// 序列化差异数据
exports.encodeDiffs = function (diffs, bb) {
    var diff = void 0;
    for (var i = 0; i < diffs.length; i++) {
        diff = diffs[i];
        if (diff.data) {
            bb.writeBin(diff.data);
        }
        if (diff.index !== undefined) {
            bb.writeInt(diff.index);
        }
    }
};
// 反序列化差异数据
exports.decodeDiffs = function (bb) {
    var arr = [];
    while (bb.head < bb.tail) {
        var r = bb.read();
        if (typeof r === 'number') {
            arr.push({ index: r });
        } else if (ArrayBuffer.isView(r)) {
            arr.push({ data: r });
        }
    }
    return arr;
};
// 以校验和的弱校验值为key，创建映射表
var createHashtable = function createHashtable(checksums) {
    var map = new Map();
    for (var i = 0; i < checksums.length; i++) {
        var checksum = checksums[i];
        var weak16 = Hash.weak16(checksum.weak);
        var cs = map.get(weak16);
        if (cs) {
            cs.push(checksum);
        } else {
            map.set(weak16, [checksum]);
        }
    }
    return map;
};
// 合并Uint8Array
var concatU8 = function concatU8(data1, data2) {
    var len1 = data1.length;
    var len2 = data2.length;
    var u8 = new Uint8Array(len1 + len2);
    u8.set(data1, 0);
    u8.set(data2, len1);
    return u8;
};
var rawslice = function rawslice(raw, index, chunkSize) {
    var start = index * chunkSize;
    var end = start + chunkSize > raw.length ? raw.length : start + chunkSize;
    return raw.slice(start, end);
};
})