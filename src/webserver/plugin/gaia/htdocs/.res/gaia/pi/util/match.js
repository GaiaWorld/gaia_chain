_$define("pi/util/match", function (require, exports, module){
"use strict";
/**
 *
 */

Object.defineProperty(exports, "__esModule", { value: true });
// ============================== 导出
/**
 * @description 获得元素i在arr中的位置
 * @example
 */
exports.eleIndex = function (i, arr, start, end, equal) {
    for (; start < end; start++) {
        if (equal(i, arr[start])) {
            return start;
        }
    }
    return -1;
};
/**
 * @description 匹配2个数组是否相等
 * @example
 */
exports.matchEqual = function (arr1, offset1, arr2, offset2, len, equal) {
    while (len-- > 0 && equal(arr1[offset1++], arr2[offset2++])) {}
    return len < 0;
};
/**
 * @description 获得arr1数组在arr2中的位置，Rabin-Karp 算法，hash函数必须返回正数
 * @example
 */
exports.arrayIndex = function (arr1, start1, end1, arr2, start2, end2, equal, hash) {
    // d是进制，m是防止溢出的素数，不同语言应该保证(d * (m + m) +d) 不应该溢出
    var i = void 0;
    var h1 = void 0;
    var h2 = void 0;
    var pow = 1;
    var d = 65537;
    var m = 4294967291;
    var len = end1 - start1;
    if (len > end2 - start2) {
        return -1;
    } else if (len === end2 - start2) {
        return exports.matchEqual(arr1, start1, arr2, start2, end2 - start2, equal) ? 0 : -1;
    } else if (len === 1) {
        return exports.eleIndex(arr1[start1], arr2, start2, end2, equal);
    }
    h1 = hash(0, arr1[start1]) % d;
    h2 = hash(0, arr2[start2]) % d;
    for (i = 1; i < len; i++) {
        h1 = (d * h1 + hash(0, arr1[i + start1]) % d) % m;
        h2 = (d * h2 + hash(0, arr2[i + start2]) % d) % m;
        // 预运算d的len-1次方的余数
        pow = d * pow % m;
    }
    if (h1 === h2 && exports.matchEqual(arr1, start1, arr2, start2, len, equal)) {
        return start2;
    }
    for (i += start2; i < end2;) {
        h2 = (d * (h2 - pow * (hash(0, arr2[i - len]) % d) % m + m) + hash(0, arr2[i++]) % d) % m;
        if (h1 === h2 && exports.matchEqual(arr1, start1, arr2, i - len, len, equal)) {
            return i - len;
        }
    }
    return -1;
};
/**
 * @description 匹配2个数组是否有相同的前缀，二分查找，返回值为 前缀长度
 * @example
 */
exports.matchPrefix = function (arr1, start1, end1, arr2, start2, end2, equal) {
    var min = void 0;
    var max = void 0;
    var mid = void 0;
    var offset = void 0;
    if (!equal(arr1[start1], arr2[start2])) {
        return 0;
    }
    min = 0;
    max = Math.min(end1 - start1, end2 - start2);
    mid = max;
    offset = 0;
    while (min < mid) {
        if (exports.matchEqual(arr1, start1 + offset, arr2, start2 + offset, mid - offset, equal)) {
            min = mid;
            offset = min;
        } else {
            max = mid;
        }
        mid = Math.floor((max - min) / 2 + min);
    }
    return mid;
};
/**
 * @description 匹配2个数组是否有相同的后缀，二分查找，返回值为 后缀长度
 * @example
 */
exports.matchSuffix = function (arr1, start1, end1, arr2, start2, end2, equal) {
    var min = void 0;
    var max = void 0;
    var mid = void 0;
    var offset = void 0;
    if (!equal(arr1[end1 - 1], arr2[end2 - 1])) {
        return 0;
    }
    min = 0;
    max = Math.min(end1 - start1, end2 - start2);
    mid = max;
    offset = 0;
    while (min < mid) {
        if (exports.matchEqual(arr1, end1 - mid, arr2, end2 - mid, mid - offset, equal)) {
            min = mid;
            offset = min;
        } else {
            max = mid;
        }
        mid = Math.floor((max - min) / 2 + min);
    }
    return mid;
};
/**
 * @description 确定一个短串中的子串是否存在在长串中，并且该子串至少有长串的一半以上的长度
 * 返回值为 将长串和短串中匹配出来的子串位置记录到结果集中，返回结果集的长度
 * @example
 */
var halfMatch1 = function halfMatch1(arr1, start1, end1, arr2, start2, end2, equal, hash, i, result, ri) {
    // 从指定的位置i开始，截取1/4的长度作为查询种子
    var prefixLen = void 0;
    var suffixLen = void 0;
    var s1 = void 0;
    var e1 = void 0;
    var s2 = void 0;
    var e2 = void 0;
    var bestLen = 0;
    var end = i + Math.floor((end1 - start1) / 4);
    var j = start2 - 1;
    // tslint:disable:no-conditional-assignment
    while ((j = exports.arrayIndex(arr1, i, end, arr2, j + 1, end2, equal, hash)) !== -1) {
        prefixLen = exports.matchPrefix(arr1, i, end1, arr2, j, end2, equal);
        suffixLen = exports.matchSuffix(arr1, start1, i, arr2, start2, j, equal);
        if (bestLen < suffixLen + prefixLen) {
            bestLen = suffixLen + prefixLen;
            s1 = i - suffixLen;
            e1 = i + prefixLen;
            s2 = j - suffixLen;
            e2 = j + prefixLen;
        }
    }
    if (bestLen + bestLen < end1 - start1) {
        return ri;
    }
    result[ri] = s1;
    result[ri + 1] = e1;
    result[ri + 2] = s2;
    result[ri + 3] = e2;
    return ri + 4;
};
/**
 * @description 判断2个数组是否共享同一个子串，并且这个子串的长度大于最长数组长度的一半
 * 这个快速算法不能保证获得最小的差异
 * 返回值为 将长串和短串中匹配出来的子串位置记录到结果集中，返回是否有匹配
 * @example
 */
exports.halfMatch = function (arr1, start1, end1, arr2, start2, end2, equal, hash, result) {
    var j = void 0;
    var len1 = end1 - start1;
    var len2 = end2 - start2;
    if (len1 >= len2) {
        j = exports.arrayIndex(arr2, start2, end2, arr1, start1, end1, equal, hash);
        if (j >= 0) {
            result[0] = j;
            result[1] = j + end2 - start2;
            result[2] = start2;
            result[3] = end2;
            return true;
        }
        if (len1 < 4 || len2 + len2 < len1) {
            return false;
        }
        j = halfMatch1(arr1, start1, end1, arr2, start2, end2, equal, hash, start1 + Math.ceil(len1 / 4), result, 0);
        j = halfMatch1(arr1, start1, end1, arr2, start2, end2, equal, hash, start1 + Math.ceil(len1 / 2), result, j);
        if (j === 0) {
            return false;
        }
        if (j > 7) {
            if (result[5] - result[4] > result[1] - result[0]) {
                result[0] = result[4];
                result[1] = result[5];
                result[2] = result[6];
                result[3] = result[7];
            }
        }
    } else {
        j = exports.arrayIndex(arr1, start1, end1, arr2, start2, end2, equal, hash);
        if (j >= 0) {
            result[0] = start1;
            result[1] = end1;
            result[2] = j;
            result[3] = j + end1 - start1;
            return true;
        }
        if (len2 < 4 || len1 + len1 < len2) {
            return false;
        }
        j = halfMatch1(arr2, start2, end2, arr1, start1, end1, equal, hash, start2 + Math.ceil(len2 / 4), result, 0);
        j = halfMatch1(arr2, start2, end2, arr1, start1, end1, equal, hash, start2 + Math.ceil(len2 / 2), result, j);
        if (j === 0) {
            return false;
        }
        if (j > 7) {
            if (result[5] - result[4] > result[1] - result[0]) {
                result[0] = result[6];
                result[1] = result[7];
                result[2] = result[4];
                result[3] = result[5];
            }
        } else {
            j = result[0];
            result[0] = result[2];
            result[2] = j;
            j = result[1];
            result[1] = result[3];
            result[3] = j;
        }
    }
    return true;
};
// 定义的中间计算结果
// tslint:disable:variable-name
var temp_r = [0, 0, 0, 0, 0, 0, 0, 0];
var temp_v1 = [];
var temp_v2 = [];
/**
 * @description 用'Shortest Middle Snake'获得位置, 批分差异到前后两个部分并继续迭代
 * @example
 */
var bisectSplit = function bisectSplit(arr1, start1, end1, arr2, start2, end2, equal, hash, result, x, y) {
    temp_v1.length = 0;
    temp_v2.length = 0;
    exports.matchMain(arr1, start1, start1 + x, arr2, start2, start2 + y, equal, hash, result);
    exports.matchMain(arr1, start1 + x, end1, arr2, start2 + y, end2, equal, hash, result);
};
/**
 * @description 采用 'Shortest Middle Snake' 算法, 将问题一分为二，递归调用
 * See Myers 1986 paper: An O(ND) Difference Algorithm and Its Variations.
 * https://code.google.com/p/google-diff-match-patch/
 * @example
 */
// tslint:disable:cyclomatic-complexity
var matchBisect = function matchBisect(arr1, start1, end1, arr2, start2, end2, equal, hash, result) {
    var x1 = void 0;
    var y1 = void 0;
    var x2 = void 0;
    var y2 = void 0;
    var k1_offset = void 0;
    var k2_offset = void 0;
    // 缓冲长度以备多次调用
    var len1 = end1 - start1;
    var len2 = end2 - start2;
    var max_d = Math.ceil((len1 + len2) / 2);
    var v_offset = max_d;
    var v_length = max_d * 2;
    var v1 = temp_v1;
    var v2 = temp_v2;
    var delta = len1 - len2;
    // 如果数组长度差为奇数，则在前面的路径将会碰撞到反向路径。
    var front = delta % 2 !== 0;
    // k loop 的 start end.
    // 防止超出网格空间的映射
    var k1start = 0;
    var k1end = 0;
    var k2start = 0;
    var k2end = 0;
    v1.length = v_length;
    v2.length = v_length;
    // 在Chrome & Firefox 中将数组初始化为-1，比混合使用integers 和 undefined更快.
    for (var x = 0; x < v_length; x++) {
        v1[x] = -1;
        v2[x] = -1;
    }
    v1[v_offset + 1] = 0;
    v2[v_offset + 1] = 0;
    for (var d = 0; d < max_d; d++) {
        // 在前面的路径中走一步
        for (var k1 = -d + k1start; k1 <= d - k1end; k1 += 2) {
            k1_offset = v_offset + k1;
            if (k1 === -d || k1 !== d && v1[k1_offset - 1] < v1[k1_offset + 1]) {
                x1 = v1[k1_offset + 1];
            } else {
                x1 = v1[k1_offset - 1] + 1;
            }
            y1 = x1 - k1;
            while (x1 < len1 && y1 < len2 && equal(arr1[start1 + x1], arr2[start2 + y1])) {
                x1++;
                y1++;
            }
            v1[k1_offset] = x1;
            if (x1 > len1) {
                // 到达图形的右侧
                k1end += 2;
            } else if (y1 > len2) {
                // 到达图形的底部
                k1start += 2;
            } else if (front) {
                k2_offset = v_offset + delta - k1;
                if (k2_offset >= 0 && k2_offset < v_length && v2[k2_offset] !== -1) {
                    // 镜像x2到左上坐标系
                    x2 = len1 - v2[k2_offset];
                    if (x1 >= x2) {
                        // 重叠检测
                        return bisectSplit(arr1, start1, end1, arr2, start2, end2, equal, hash, result, x1, y1);
                    }
                }
            }
        }
        // 反向路径走一步
        for (var k2 = -d + k2start; k2 <= d - k2end; k2 += 2) {
            k2_offset = v_offset + k2;
            if (k2 === -d || k2 !== d && v2[k2_offset - 1] < v2[k2_offset + 1]) {
                x2 = v2[k2_offset + 1];
            } else {
                x2 = v2[k2_offset - 1] + 1;
            }
            y2 = x2 - k2;
            while (x2 < len1 && y2 < len2 && equal(arr1[end1 - x2 - 1], arr2[end2 - y2 - 1])) {
                x2++;
                y2++;
            }
            v2[k2_offset] = x2;
            if (x2 > len1) {
                // 到达图形的左侧
                k2end += 2;
            } else if (y2 > len2) {
                // 到达图形的上部
                k2start += 2;
            } else if (!front) {
                k1_offset = v_offset + delta - k2;
                if (k1_offset >= 0 && k1_offset < v_length && v1[k1_offset] !== -1) {
                    x1 = v1[k1_offset];
                    y1 = v_offset + x1 - k1_offset;
                    // 镜像x2到左上坐标系
                    x2 = len1 - x2;
                    if (x1 >= x2) {
                        // 重叠检测
                        return bisectSplit(arr1, start1, end1, arr2, start2, end2, equal, hash, result, x1, y1);
                    }
                }
            }
        }
    }
};
/**
 * @description 寻找2个数组中相同的子串. 必须确保2个数组没有相同的前缀和后缀
 * @example
 */
var matchCompute = function matchCompute(arr1, start1, end1, arr2, start2, end2, equal, hash, result) {
    var s1 = void 0;
    var e1 = void 0;
    var s2 = void 0;
    var e2 = void 0;
    if (!exports.halfMatch(arr1, start1, end1, arr2, start2, end2, equal, hash, temp_r)) {
        return matchBisect(arr1, start1, end1, arr2, start2, end2, equal, hash, result);
    }
    s1 = temp_r[0];
    e1 = temp_r[1];
    s2 = temp_r[2];
    e2 = temp_r[3];
    // 递归调用
    exports.matchMain(arr1, start1, s1, arr2, start2, s2, equal, hash, result);
    result.push(s1, e1, s2, e2);
    exports.matchMain(arr1, e1, end1, arr2, e2, end2, equal, hash, result);
};
/**
 * @description 匹配主算法
 * @example
 */
exports.matchMain = function (arr1, start1, end1, arr2, start2, end2, equal, hash, result) {
    if (start1 >= end1 || start2 >= end2) return;
    var len = exports.matchPrefix(arr1, start1, end1, arr2, start2, end2, equal);
    if (len > 0) {
        result.push(start1, start1 + len, start2, start2 + len);
        start1 += len;
        start2 += len;
        if (start1 >= end1 || start2 >= end2) return;
    }
    len = exports.matchSuffix(arr1, start1, end1, arr2, start2, end2, equal);
    if (len > 0) {
        if (start1 + len < end1 && start2 + len < end2) {
            matchCompute(arr1, start1, end1 - len, arr2, start2, end2 - len, equal, hash, result);
        }
        result.push(end1 - len, end1, end2 - len, end2);
    } else {
        matchCompute(arr1, start1, end1, arr2, start2, end2, equal, hash, result);
    }
};
/**
 * @description 匹配两个数组相同的部分. 算法切分后并试图剥离共同的前缀和后缀来简化问题
 * 结果为4个一组表示相同的数组，依次为arr1的开始,结束位置, arr2的开始,结束位置
 * @example
 */
exports.match = function (arr1, arr2, equal, hash, result) {
    if (!arr1) {
        throw new Error('invalid arr1');
    }
    if (!arr2) {
        throw new Error('invalid arr2');
    }
    if (!result) {
        throw new Error('invalid result');
    }
    var len1 = arr1.length;
    var len2 = arr1.length;
    if (len1 === len2 && exports.matchEqual(arr1, 0, arr2, 0, len1, equal)) {
        if (len1 > 0) result.push(0, len1, 0, len1);
        return;
    }
    exports.matchMain(arr1, 0, len1, arr2, 0, len2, equal, hash, result);
};
/**
 * @description 路径匹配， 用增强Ant的路径模式匹配语法。/为路径符，? 匹配一个任意字符，* 匹配零或多个字符，** 匹配零或多级目录。 支持： &为与，|为或，!为非，()为优先级，\为转义符
 * @example
 */
exports.pathMatch = function (pattern) {};
/**
 * @description 结构匹配， 单层的键值结构，键只能是字符串，值只能是基本类型。
 * 对该键值结构的模式匹配语法，支持与或非。如果值是数字字符串，则需要""引起来。值如果是字符串，支持用路径模式匹配语法来匹配。//以后可以支持变量提取，如果一个键值是需要匹配提取出来的，用[]，其他地方引用按照在$1来应用。还可以支持四则运算
 * @example
 * (id!=1)&(!(name=/*path*)|(attr>=2&attr<10))
 */
exports.structMatch = function (pattern) {};
// ============================== 立即执行
})