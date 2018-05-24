_$define("pi/util/html", function (require, exports, module){
"use strict";
/*
 * html模块
 */

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

Object.defineProperty(exports, "__esModule", { value: true });
// ============================== 导入
var hash_1 = require("../util/hash");
// ============================== 导出
/**
 * @description 浏览器网络类型
 * @example
 */
exports.ConnectionType = ['unknown', 'ethernet', 'wifi', '2g', '3g', '4g', 'none', 'other'];
/**
 * @description 获取浏览器网络类型
 * @example
 */
exports.getConnectionType = function () {
    var nav = window.navigator;
    var connection = nav.connection || nav.mozConnection || nav.webkitConnection;
    return connection ? connection.type : 7;
};
/**
 * @description 获得指定节点元素相对根元素的坐标
 * @param  el 指定元素
 * @param  root 根元素
 * @param  pos 位置
 * @return pos或undefined
 */
exports.offsetPos = function (el, root, pos) {
    while (el) {
        pos.x += el.offsetLeft;
        pos.y += el.offsetTop;
        el = el.offsetParent;
        if (el === root) {
            return pos;
        }
    }
};
/**
 * @description 获得指定元素的样式
 * @param  el 指定元素
 */
exports.getStyle = function (el) {
    if (window.getComputedStyle) {
        return window.getComputedStyle(el);
    }
    // if (el.currentStyle) //IE
    // return el.currentStyle[cssProp];
    // finally try and get inline style
    return el.style;
};
/**
 * @description 设置Cookie
 * @param name 必选项，cookie名称
 * @param value 必选项，cookie值
 * @param seconds 生存时间，可选项，单位：秒；默认时间是315360000秒（10年）。false表示生存期为浏览器关闭后
 * @param path cookie存放路径，可选项
 * @param domain cookie域，可选项
 * @param secure 安全性，指定Cookie是否只能通过https协议访问，一般的Cookie使用HTTP协议既可访问，如果设置了Secure（没有值），则只有当使用https协议连接时cookie才可以被页面访问
 * @example
 */
exports.setCookie = function (name, value, seconds, path, domain, secure) {
    var expires = void 0;
    if (!navigator.cookieEnabled) {
        throw new Error('sorry! cookie can\'t use!');
    }
    if (seconds !== undefined) {
        expires = new Date();
        seconds = seconds || 315360000;
        expires.setTime(expires.getTime() + seconds * 1000);
    }
    // tslint:disable:prefer-template
    document.cookie = encodeURIComponent(name) + '=' + encodeURIComponent(value) + (expires ? ';expires=' + expires.toUTCString() : '') + (path ? ';path=' + path : '/') + (domain ? ';domain=' + domain : '') + (secure ? ';secure' : '');
};
/**
 * @description 清除所有Cookie
 * @example
 */
exports.clearCookie = function () {
    var i = void 0;
    var zero = '=0;expires=Thu, 01 Jan 1970 00:00:00 GMT';
    var keys = document.cookie.match(/[^ =;]+(?=\=)/g) || [];
    for (i = keys.length - 1; i >= 0; i--) {
        document.cookie = keys[i] + zero;
    }
};
/**
 * @description 获取Cookie，name为cookie名称
 * @example
 */
exports.getCookie = function (name) {
    var str = void 0;
    var start = void 0;
    var end = void 0;
    name = decodeURIComponent(name);
    str = document.cookie;
    start = str.indexOf(name);
    if (start >= 0) {
        end = str.indexOf(';', start);
        return decodeURIComponent(str.substring(start + name.length + 1, end > start ? end : str.length));
    }
};
/**
 * @description 删除或清空Cookie，name为cookie名称
 * @example
 */
exports.delCookie = function (name) {
    document.cookie = encodeURIComponent(name) + '=0;expires=Thu, 01 Jan 1970 00:00:00 GMT';
};
/**
 * @description 指纹识别
 * @example
 */
exports.fingerPrint = function () {
    var win = window;
    var nav = window.navigator;
    var keys = [];
    keys.push(nav.userAgent);
    keys.push(nav.language);
    keys.push(screen.colorDepth);
    keys.push(screen.height > screen.width ? [screen.height + 'x' + screen.width] : [screen.width + 'x' + screen.height]);
    keys.push(new Date().getTimezoneOffset());
    // SecurityError when referencing it means it exists
    keys.push(!!win.sessionStorage);
    keys.push(!!win.localStorage);
    keys.push(!!win.indexedDB);
    keys.push(_typeof(win.openDatabase));
    keys.push(nav.cpuClass);
    keys.push(nav.platform);
    keys.push(nav.doNotTrack);
    return hash_1.murmurhash3_32s(keys.join('###'), 0);
};
/**
 * @description canvas指纹识别
 * @example
 */
exports.canvasFingerPrint = function () {
    var text = '0123456789_abcdefghijklmnopqrstuvwxwz';
    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d');
    ctx.textBaseline = 'top';
    ctx.font = '14px \'Arial\'';
    ctx.fillStyle = '#f60';
    ctx.fillRect(1, 1, 100, 20);
    ctx.fillStyle = '#069';
    ctx.fillText(text, 2, 2);
    ctx.strokeStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.strokeText(text, 2, 17);
    return canvas.toDataURL().slice('data:image/png;base64,'.length);
};
/**
 * @description 获得浏览器的userAgent
 * @example
 */
// tslint:disable-next-line:cyclomatic-complexity
exports.userAgent = function (r) {
    var ua = navigator.userAgent.toLowerCase();
    r = r || {};
    var nameVersion = function nameVersion(obj, name, rxp) {
        var arr = ua.match(rxp);
        if (!arr) {
            return;
        }
        obj.version = arr[1];
        obj.name = name;
        return true;
    };
    var cfg = {
        chrome: null,
        msie: 'ie',
        firefox: null,
        opr: 'opera',
        micromessenger: null,
        mqqbrowser: null,
        ucbrowser: null
    };
    // 解析ua中的browser信息
    r.browser = { name: 'unknown', version: '0.0' };
    if (ua.indexOf('safari') > -1) {
        if (ua.indexOf('mobile') > -1) {
            if (nameVersion(r.browser, 'safari', /version\/([\d.]+)/)) {
                r.browser.safari = r.browser.version;
            }
        } else {
            if (nameVersion(r.browser, 'safari', /safari\/([\d.]+)/)) {
                r.browser.safari = r.browser.version;
            }
        }
    }
    for (var k in cfg) {
        if (!cfg.hasOwnProperty(k)) {
            continue;
        }
        var i = ua.indexOf(k);
        if (i < 0) {
            continue;
        }
        var name = cfg[k];
        name = name || k;
        if (nameVersion(r.browser, name, new RegExp(k + '\/([\\d.]+)'))) {
            r.browser[name] = r.browser.version;
        }
    }
    // 解析ua中的engine信息
    r.engine = { name: 'unknown', version: '0.0' };
    if (ua.indexOf('trident') > -1) {
        nameVersion(r.engine, 'trident', /trident\/([\d.]+)/);
    } else if (ua.indexOf('applewebkit') > -1) {
        nameVersion(r.engine, 'webkit', /applewebkit\/([\d.]+)/);
    } else if (ua.indexOf('gecko') > -1) {
        nameVersion(r.engine, 'gecko', /gecko\/([\d.]+)/);
    }
    // 解析ua中的os信息
    r.os = r.os || { name: 'unknown', version: '0.0' };
    if (ua.indexOf('windows nt') > -1) {
        nameVersion(r.os, 'windows', /windows nt ([\d.]+)/);
        if (r.os.version === '6.1') {
            r.os.version = '7';
        } else if (r.os.version === '6.2') {
            r.os.version = '8';
        }
    } else if (ua.indexOf('iphone os') > -1) {
        nameVersion(r.os, 'ios', /iphone os ([\d_]+)/);
        r.os.version = r.os.version.split('_').join('.');
    } else if (ua.indexOf('android') > -1) {
        nameVersion(r.os, 'android', /android ([\d.]+)/);
    }
    r.screen = { colorDepth: screen.colorDepth };
    if (screen.height > screen.width) {
        r.screen.height = screen.height;
        r.screen.width = screen.width;
    } else {
        r.screen.height = screen.width;
        r.screen.width = screen.height;
    }
    r.timezone_offset = new Date().getTimezoneOffset();
    r.language = navigator.language;
    r.device = { type: ua.indexOf('mobile') > -1 ? 'mobile' : 'pc', platform: navigator.platform };
    // 标签化
    if (r.mobile === undefined) {
        r.mobile = r.device.type === 'mobile';
    }
    return r;
};
/**
 * @description 创建css节点
 * @example
 */
exports.addCssNode = function (str) {
    var node = document.createElement('style');
    node.type = 'text/css';
    try {
        node.appendChild(document.createTextNode(str));
    } catch (ex) {
        // ie
        node.styleSheet.cssText = str;
    }
    document.head.appendChild(node);
    return node;
};
/**
 * @description 创建css节点
 * @example
 */
exports.loadCssNode = function (url, callback) {
    var node = document.createElement('link');
    node.charset = 'utf8';
    node.rel = 'stylesheet';
    node.href = url;
    node.onerror = function () {
        node.onload = node.onerror = undefined;
        document.head.removeChild(node);
        callback && callback(node);
    };
    node.onload = function () {
        node.onload = node.onerror = undefined;
        callback && callback(node);
    };
    document.head.appendChild(node);
    return node;
};
/**
 * @description 检查webp的兼容性
 * @example
 */
exports.checkWebpFeature = function (cb) {
    // webp特性支持
    var webpFeature = {};
    var c = 0;
    // webp测试图片
    var webpTestImages = {
        lossy: 'UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA',
        lossless: 'UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==',
        alpha: 'UklGRkoAAABXRUJQVlA4WAoAAAAQAAAAAAAAAAAAQUxQSAwAAAARBxAR/Q9ERP8DAABWUDggGAAAABQBAJ0BKgEAAQAAAP4AAA3AAP7mtQAAAA==',
        animation: 'UklGRlIAAABXRUJQVlA4WAoAAAASAAAAAAAAAAAAQU5JTQYAAAD/////AABBTk1GJgAAAAAAAAAAAAAAAAAAAGQAAABWUDhMDQAAAC8AAAAQBxAREYiI/gcA'
    };
    var check = function check(feature) {
        var img = new Image();
        img.onload = function () {
            webpFeature[feature] = img.width > 0 && img.height > 0;
            if (! --c) {
                cb(webpFeature);
            }
        };
        img.onerror = function () {
            webpFeature[feature] = false;
            if (! --c) {
                cb(webpFeature);
            }
        };
        img.src = 'data:image/webp;base64,' + webpTestImages[feature];
        c++;
    };
    for (var k in webpTestImages) {
        if (webpTestImages.hasOwnProperty(k)) {
            check(k);
        }
    }
};
/**
 * @description 获得兼容支持的属性名称，返回""表示该属性名称不支持
 * @example
 * 只支持class
 */
exports.getSupportedProperty = function (property) {
    var p = propertySupportedMap.get(property);
    if (p !== undefined) {
        return p;
    }
    p = property.replace(propertyUpperRxp, propertyUpperFunc);
    if (p in bodyStyle) {
        propertySupportedMap.set(property, p);
        return p;
    }
    var s = p;
    for (var _iterator = propertyPrefixes, _isArray = Array.isArray(_iterator), _i = 0, _iterator = _isArray ? _iterator : _iterator[Symbol.iterator]();;) {
        var _ref;

        if (_isArray) {
            if (_i >= _iterator.length) break;
            _ref = _iterator[_i++];
        } else {
            _i = _iterator.next();
            if (_i.done) break;
            _ref = _i.value;
        }

        var prefix = _ref;

        p = prefix + s;
        if (p in bodyStyle) {
            propertySupportedMap.set(property, p);
            return p;
        }
    }
    propertySupportedMap.set(property, '');
    return '';
};
/**
 * @description 获得指定类名的css动画的持续时间，单位为毫秒
 * @example
 */
exports.getAniDuration = function (className) {
    if (!aniDurationMap) {
        aniDurationMap = new Map();
        var arr = document.styleSheets;
        for (var sheet, rules, i = arr.length - 1; i >= 0; i--) {
            sheet = arr[i];
            rules = sheet && sheet.cssRules;
            if (!rules) {
                continue;
            }
            for (var rule, r, t, j = rules.length - 1; j >= 0; j--) {
                rule = rules[i];
                r = durationRxp.exec(rule.cssText);
                if (!r) {
                    continue;
                }
                t = parseDuration(r[1]);
                r = classRxp.exec(rule.selectorText);
                while (r) {
                    aniDurationMap.set(r[1], t);
                    classRxp.exec(rule.selectorText);
                }
            }
        }
    }
    var clazz = className.split(' ');
    for (var _t, _i2 = clazz.length - 1; _i2 >= 0; _i2--) {
        _t = aniDurationMap.get(clazz[_i2]);
        if (_t !== undefined) {
            return _t;
        }
    }
};
// ============================== 本地
// 样式兼容支持
var propertySupportedMap = new Map();
var bodyStyle = document.body.style;
var propertyPrefixes = ['khtml', 'o', 'ms', 'moz', 'webkit'];
var propertyUpperRxp = /(-)([a-z])/g;
var propertyUpperFunc = function propertyUpperFunc(matchStr, match1, match2, loc, srcStr) {
    return match2.toUpperCase();
};
// 动画时间表
var aniDurationMap = null;
var durationRxp = /\-duration\s:\s*(\d+m?)s/i;
var classRxp = /\.([_a-zA-Z0-9\-]+)/g;
// 分析持续时间的字符串，返回毫秒数
var parseDuration = function parseDuration(s) {
    var len = s.length - 1;
    if (s.charCodeAt(len) === 109 || s.charCodeAt(len) === 77) {
        return parseInt(s, 10) * 1000;
    }
    return parseFloat(s) * 1000 | 0;
};
// ============================== 立即执行
})