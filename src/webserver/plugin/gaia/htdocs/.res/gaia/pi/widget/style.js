_$define("pi/widget/style", function (require, exports, module){
"use strict";
/*
 * 样式模块，提供组件内包含子组件范围内基于clazz的样式匹配，clazz使用内联样式作用到实际节点上。
 * 而内联样式则不支持伪类( :hover)、伪对象( :first-child)和关键帧动画( animation keyframes)。
 * 因此，不能支持伪类和关键帧动画。可以使用全局class来处理。
 * 样式沿组件树上溯，寻找到后就注入，这样优先使用外部定义，如果没有则使用默认。
 */

Object.defineProperty(exports, "__esModule", { value: true });
// ============================== 导入
var mod_1 = require("../lang/mod");
var html_1 = require("../util/html");
var util_1 = require("../util/util");
/**
 * @description 解析字符串，返回样式表
 * @example
 * 只支持class
 */
exports.parse = function (str, path) {
    var r = styleRxp.exec(str);
    if (!r) {
        return null;
    }
    var sheet = new Map();
    while (r) {
        var s = r[1];
        var effect = exports.parseEffect(r[2], path);
        r = styleRxp.exec(str);
        if (!effect) {
            continue;
        }
        var rr = classRxp.exec(s);
        while (rr) {
            sheet.set(rr[1], effect);
            rr = classRxp.exec(s);
        }
    }
    return sheet.size > 0 ? sheet : null;
};
/**
 * @description 分析样式效果，可用于内联样式和外部样式的分析
 * @example
 */
exports.parseEffect = function (str, path) {
    var arr = str.split(';');
    var effect = { map: new Map(), url: null };
    var map = effect.map;
    var n = 0;
    for (var _iterator = arr, _isArray = Array.isArray(_iterator), _i = 0, _iterator = _isArray ? _iterator : _iterator[Symbol.iterator]();;) {
        var _ref;

        if (_isArray) {
            if (_i >= _iterator.length) break;
            _ref = _iterator[_i++];
        } else {
            _i = _iterator.next();
            if (_i.done) break;
            _ref = _i.value;
        }

        var s = _ref;

        var i = s.indexOf(':');
        if (i < 0) {
            continue;
        }
        n++;
        var k = html_1.getSupportedProperty(s.slice(0, i).trim());
        var v = s.slice(i + 1);
        var url = getURL(k, v, path);
        if (!url) {
            map.set(k, v);
        } else {
            effect.url = url;
        }
    }
    return n > 0 ? effect : null;
};
/**
 * @description 计算clazz的样式特效，沿组件树上溯查找定义的clazz
 * @example
 */
exports.calc = function (widget, clazz, clazzStr, result) {
    // 先从本地缓存中寻找
    var effect = widget.styleCache.get(clazzStr);
    if (effect) {
        util_1.mapCopy(effect.map, result.map);
        if (effect.url) {
            result.url = effect.url;
        }
        return result;
    }
    effect = { map: new Map(), url: null };
    var sheet = widget.getSheet();
    if (sheet) {
        // unMatchClazz数组里面存放了还没有匹配到的clazz
        var unMatchClazz = [];
        for (var _iterator2 = clazz, _isArray2 = Array.isArray(_iterator2), _i2 = 0, _iterator2 = _isArray2 ? _iterator2 : _iterator2[Symbol.iterator]();;) {
            var _ref2;

            if (_isArray2) {
                if (_i2 >= _iterator2.length) break;
                _ref2 = _iterator2[_i2++];
            } else {
                _i2 = _iterator2.next();
                if (_i2.done) break;
                _ref2 = _i2.value;
            }

            var name = _ref2;

            var e = sheet.get(name);
            if (e) {
                util_1.mapCopy(e.map, effect.map);
                if (e.url) {
                    effect.url = e.url;
                }
            } else {
                unMatchClazz.push(name);
            }
        }
        if (unMatchClazz.length > 0 && widget.parentNode) {
            exports.calc(widget.parentNode.widget, unMatchClazz, unMatchClazz.join(' '), effect);
        }
    } else if (widget.parentNode) {
        exports.calc(widget.parentNode.widget, clazz, clazzStr, effect);
    }
    widget.styleCache.set(clazzStr, effect);
    util_1.mapCopy(effect.map, result.map);
    result.url = effect.url;
    return result;
};
/**
 * @description 合并内联样式和clazz样式
 * @example
 */
exports.merge = function (innerStyle, clazzStyle) {
    if (!innerStyle) {
        return clazzStyle;
    }
    if (!clazzStyle) {
        return innerStyle;
    }
    var map = new Map();
    util_1.mapCopy(clazzStyle.map, map);
    util_1.mapCopy(innerStyle.map, map);
    return { map: map, url: innerStyle.url ? innerStyle.url : clazzStyle.url };
};
/**
 * @description 计算新旧样式的差异部分
 * @example
 */
exports.difference = function (oldStyle, newStyle) {
    if (!oldStyle) {
        return newStyle;
    }
    var diff = { map: new Map(), url: null };
    var om = oldStyle.map;
    var dm = diff.map;
    if (!newStyle) {
        for (var _iterator3 = om.keys(), _isArray3 = Array.isArray(_iterator3), _i3 = 0, _iterator3 = _isArray3 ? _iterator3 : _iterator3[Symbol.iterator]();;) {
            var _ref3;

            if (_isArray3) {
                if (_i3 >= _iterator3.length) break;
                _ref3 = _iterator3[_i3++];
            } else {
                _i3 = _iterator3.next();
                if (_i3.done) break;
                _ref3 = _i3.value;
            }

            var k = _ref3;

            dm.set(k, '');
        }
        return diff;
    }
    util_1.mapDiff(newStyle.map, om, diffMap, dm);
    if (oldStyle.url) {
        if (newStyle.url) {
            if (oldStyle.url.key !== newStyle.url.key || !util_1.arrayEqual(oldStyle.url.arr, newStyle.url.arr)) {
                diff.url = newStyle.url;
            }
        }
    } else if (newStyle.url) {
        diff.url = newStyle.url;
    }
    return diff;
};
/**
 * @description 在高优先级的样式中过滤指定新样式
 * @example
 */
exports.filter = function (highStyle, style) {
    if (!highStyle) {
        return;
    }
    var map2 = style.map;
    var map1 = highStyle.map;
    for (var _iterator4 = map2.keys(), _isArray4 = Array.isArray(_iterator4), _i4 = 0, _iterator4 = _isArray4 ? _iterator4 : _iterator4[Symbol.iterator]();;) {
        var _ref4;

        if (_isArray4) {
            if (_i4 >= _iterator4.length) break;
            _ref4 = _iterator4[_i4++];
        } else {
            _i4 = _iterator4.next();
            if (_i4.done) break;
            _ref4 = _i4.value;
        }

        var k = _ref4;

        if (!map1.has(k)) {
            continue;
        }
        map2.delete(k);
        if (style.url && style.url.key === k) {
            style.url = null;
        }
    }
};
// ============================== 本地
// 匹配样式
var styleRxp = /\s*([^{]*)\s*{\s*([^}]*)}/g;
// 匹配类选择器
var classRxp = /\s*\.([-_\w]+)\s*,?/g;
// 匹配CSS的effect中的url，不匹配含有:的字符串，所以如果是http:或https:，则不替换
var effectURL = /url\(([^\)"':]*)\)/g;
// 获得路径的url
var getURL = function getURL(k, v, path) {
    // 替换url为全路径
    var rr = effectURL.exec(v);
    if (!rr) {
        return;
    }
    var info = { key: k, arr: [] };
    var suffix = 0;
    var arr = info.arr;
    do {
        // tslint:disable:prefer-template
        arr.push(v.slice(suffix, rr.index) + 'url(');
        arr.push(mod_1.butil.relativePath(rr[1], path));
        suffix = rr.index + rr[0].length - 1;
        rr = effectURL.exec(v);
    } while (rr);
    arr.push(v.slice(suffix));
    return info;
};
// 写入diffMap
var diffMap = function diffMap(dm, key, newv, oldv) {
    dm.set(key, newv || '');
};
})