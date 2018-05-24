_$define("pi/widget/util", function (require, exports, module){
"use strict";
/*
 * 组件工具模块
 */

Object.defineProperty(exports, "__esModule", { value: true });
// ============================== 导入
var mod_1 = require("../lang/mod");
var html_1 = require("../util/html");
var log_1 = require("../util/log");
var res_mgr_1 = require("../util/res_mgr");
var task_mgr_1 = require("../util/task_mgr");
var tpl_1 = require("../util/tpl");
var util_1 = require("../util/util");
var style_1 = require("../widget/style");
var forelet_1 = require("./forelet");
var painter_1 = require("./painter");
var widget_1 = require("./widget");
// ============================== 导出
exports.level = log_1.logLevel;
/**
 * @description 将指定名称的组件，加入到el元素的第一个元素前，会延迟到帧调用时添加
 * @example
 */
exports.addWidget = function (el, name, props) {
    var w = widget_1.factory(name);
    if (!w) {
        return;
    }
    if (props) {
        w.setProps(props);
    }
    w.paint();
    painter_1.paintCmd3(el, 'appendChild', [w.tree.link]);
    return w;
};
/**
 * @description 标签匹配， 判断模式字符串，是否和标签匹配，标签可以多级
 * @example
 * not($b1) or($b1,$b2) and(or($b1=c1,$b2!=c2), not($b3)
 * 	$b1、$b2表示flag是否含有此键， $b2!=c2表示flag的b2键的值要不等于c2
 */
exports.flagMatch = function (pattern, flags) {
    return exports.parseMatch({ str: pattern.trim() }, flags);
};
/**
 * @description 列出目录及子目录下所有的文件，跳过重复文件
 * 如果一个目录中含有 .exclude.<文件后缀>.<标签匹配语句> 文件，则表示该目录指定后缀（没有后缀表示所有文件）需要进行排除匹配，如果匹配成功，则该目录及子目录的指定后缀的文件被排除。
 * @example
 */
exports.listDir = function (info, flags, fileList, suffixMap, without, suffixCfg) {
    if (without[info.path]) {
        return;
    }
    var scfg = void 0;
    var children = info.children;
    var files = [];
    var dirs = [];
    for (var name in children) {
        if (!children.hasOwnProperty(name)) {
            continue;
        }
        var _info = children[name];
        if (_info.children) {
            dirs.push(_info);
            continue;
        }
        if (!name.startsWith(exclude)) {
            files.push(_info);
            continue;
        }
        var i = name.indexOf('.', exclude.length);
        if (!exports.flagMatch(name.slice(i + 1), flags)) {
            continue;
        }
        var suf = name.slice(exclude.length, i);
        if (!suf) {
            return;
        }
        if (!scfg) {
            scfg = Object.assign({}, suffixCfg);
        }
        scfg[suf] = 'none';
    }
    for (var _i = files.length - 1; _i > -1; _i--) {
        listFile(files[_i], flags, fileList, suffixMap, without, scfg || suffixCfg);
    }
    for (var _iterator = dirs, _isArray = Array.isArray(_iterator), _i2 = 0, _iterator = _isArray ? _iterator : _iterator[Symbol.iterator]();;) {
        var _ref;

        if (_isArray) {
            if (_i2 >= _iterator.length) break;
            _ref = _iterator[_i2++];
        } else {
            _i2 = _iterator.next();
            if (_i2.done) break;
            _ref = _i2.value;
        }

        var d = _ref;

        exports.listDir(d, flags, fileList, suffixMap, without, scfg || suffixCfg);
    }
};
/**
 * @description 加载并注册指定目录及子目录下的所有模块、组件和资源（图片、声音、字体……）
 * 次序是按照目录逐层加载，目录按序深度遍历加载
 * 精确下载，如果目录含匹配定义文件，如果和当前标签不匹配，则该目录及子目录不下载和加载
 * 先加载所有的模块及其依赖模块，然后加载所有的组件，最后执行所有模块内的loadDirCompleted方法
 * 前端的三种兼容（compat）： 1、模块（B模块修饰A模块） 2、组件（B组件修饰A组件） 3、资源（文字-构建系统预处理 css图片及字体-构建系统预处理），统一通过loadDirCompleted方法来处理兼容问题
 *
 * 组件可以是<组件名>.widget，也可以是<组件名>.wcss, <组件名>.tpl, <组件名>.js，如果有tpl就算一个组件，会默认同名的css和js构成组件，如果js模块内导出了一个forelet，则认为是这个组件的forelet。
 * .widget、*.wcss、*.js可以引用到dirs以外的文件，该文件又可能引用新的文件，会需要多次碎片加载，所以都不支持引用外部目录的文件。
 * @example
 */
exports.loadDir = function (dirs, flags, without, suffixCfg, successCallback, errorCallback, processCallback) {
    var fileList = [];
    var dirSuffixCfg = {};
    var suffixMap = { js: [], tpl: [], widget: [] };
    without = without || {};
    if (suffixCfg) {
        for (var k in suffix_cfg) {
            if (!suffixCfg[k]) {
                suffixCfg[k] = suffix_cfg[k];
            }
        }
    } else {
        suffixCfg = suffix_cfg;
    }
    for (var _iterator2 = dirs, _isArray2 = Array.isArray(_iterator2), _i3 = 0, _iterator2 = _isArray2 ? _iterator2 : _iterator2[Symbol.iterator]();;) {
        var _ref2;

        if (_isArray2) {
            if (_i3 >= _iterator2.length) break;
            _ref2 = _iterator2[_i3++];
        } else {
            _i3 = _iterator2.next();
            if (_i3.done) break;
            _ref2 = _i3.value;
        }

        var dir = _ref2;

        var info = mod_1.depend.get(dir);
        if (!info) {
            continue;
        }
        if (info.children) {
            exports.listDir(info, flags, fileList, suffixMap, without, findExclude(getParentInfo(info.path), flags, suffixCfg, dirSuffixCfg));
        } else {
            listFile(info, flags, fileList, suffixMap, without, suffixCfg);
        }
    }
    // fileList 去除所有的模块文件
    for (var f, i = fileList.length - 1; i >= 0; i--) {
        f = fileList[i].path;
        // 跳过后缀不为".js"的文件
        if (f.charCodeAt(f.length - 1) !== 115 || f.charCodeAt(f.length - 2) !== 106 || f.charCodeAt(f.length - 3) !== 46) {
            continue;
        }
        if (i < fileList.length - 1) {
            fileList[i] = fileList[fileList.length - 1];
        }
        fileList.length--;
    }
    // modNames 去除已经加载的模块文件
    var modNames = suffixMap.js;
    for (var _f, j, _i4 = modNames.length - 1; _i4 >= 0; _i4--) {
        _f = modNames[_i4];
        modNames[_i4] = _f.slice(0, _f.length - 3);
        if (mod_1.commonjs.check(modNames[_i4]) !== true) {
            continue;
        }
        if (_i4 < modNames.length - 1) {
            modNames[_i4] = modNames[modNames.length - 1];
        }
        modNames.length--;
    }
    // 获得包括依赖模块在内的等待加载的模块文件
    // tslint:disable:no-reserved-keywords
    var set = mod_1.commonjs.depend(modNames);
    modNames.length = 0;
    // fileList 加上模块依赖的文件，合并下载
    for (var _i5 = set.length - 1; _i5 >= 0; _i5--) {
        var m = set[_i5];
        if (m.loaded) {
            continue;
        }
        fileList.push(m.info);
        modNames.push(m.id);
    }
    processCallback && processCallback({
        type: 'requireStart', total: modNames.length,
        download: modNames.length, fileList: fileList, modNames: modNames
    });
    var down = mod_1.load.create(fileList, function (fileMap) {
        // 加载所有的模块
        // tslint:disable:non-literal-require
        mod_1.commonjs.require(modNames, fileMap, function (mods) {
            loadNext(suffixMap, fileMap, mods, successCallback, processCallback);
        }, errorCallback, processCallback);
    }, errorCallback, processCallback);
    down.fileTab = without;
    mod_1.load.start(down);
    return down;
};
/**
 * @description 加载全局css，并自动加载css上的图片和字体，并加载fileMap的BlobURL资源
 * @example
 */
exports.loadCssRes = function (fileMap, callback) {
    // 从fileMap中，提前将全部的BlobURL资源载入资源管理器上
    var tab = new res_mgr_1.ResTab();
    var cssArr = [];
    var rcssArr = [];
    for (var k in fileMap) {
        var type = mod_1.butil.fileSuffix(k);
        if (res_mgr_1.BlobType[type]) {
            // tslint:disable:prefer-template
            tab.load(res_mgr_1.RES_TYPE_BLOB + ':' + (type === 'webp' ? getWebpSrc(k) : k), res_mgr_1.RES_TYPE_BLOB, k, fileMap);
        } else if (type === 'css') {
            cssArr.push(k);
        } else if (type === 'rcss') {
            rcssArr.push(k);
        }
    }
    // 加载不包含资源的全局样式和应用全局样式，应该是完全的兼容样式
    for (var _iterator3 = cssArr, _isArray3 = Array.isArray(_iterator3), _i6 = 0, _iterator3 = _isArray3 ? _iterator3 : _iterator3[Symbol.iterator]();;) {
        var _ref3;

        if (_isArray3) {
            if (_i6 >= _iterator3.length) break;
            _ref3 = _iterator3[_i6++];
        } else {
            _i6 = _iterator3.next();
            if (_i6.done) break;
            _ref3 = _i6.value;
        }

        var _k = _ref3;

        loadCss(fileMap[_k]);
    }
    // 加载包含资源的全局样式和应用全局样式，并自动加载css上的资源，应该是完全的兼容样式
    var count = 1;
    var cb = function cb(s) {
        s && html_1.addCssNode(s);
        count--;
        count === 0 && callback && callback();
    };
    for (var _iterator4 = rcssArr, _isArray4 = Array.isArray(_iterator4), _i7 = 0, _iterator4 = _isArray4 ? _iterator4 : _iterator4[Symbol.iterator]();;) {
        var _ref4;

        if (_isArray4) {
            if (_i7 >= _iterator4.length) break;
            _ref4 = _iterator4[_i7++];
        } else {
            _i7 = _iterator4.next();
            if (_i7.done) break;
            _ref4 = _i7.value;
        }

        var _k2 = _ref4;

        count++;
        replaceURL(mod_1.butil.utf8Decode(fileMap[_k2]), _k2, fileMap, cb);
    }
    cb('');
    return tab;
};
/**
 * @description 设置tpl模板加载函数
 * @example
 */
exports.setTplFun = function (func) {
    tplFun = func;
};
// ============================== 本地
// 排除前缀
var exclude = '.exclude.';
// 标签匹配的正则表达式
// tslint:disable:variable-name
var var_reg = /^\$([a-zA-Z0-9\.\_]+)\s*/;
var str_reg = /^([a-zA-Z][a-zA-Z0-9\.\_]*)\s*/;
var number_reg = /^([0-9\.]+)\s*/;
// 样式中匹配URL的正则表达式，不匹配含有:的字符串，所以如果是http:或https:，则不替换
var CSS_URL = /url\(([^\)"':]*)\)/g;
// 默认的后缀配置处理, "downonly"表示仅下载，如果本地有则不加载， "none"表示不下载不加载
var suffix_cfg = {
    png: 'downonly', jpg: 'downonly', jpeg: 'downonly',
    webp: 'downonly', gif: 'downonly', svg: 'downonly', mp3: 'downonly', ogg: 'downonly', aac: 'downonly'
};
// tpl模板加载函数
var tplFun = function tplFun(tplStr, filename) {
    return { value: tpl_1.toFun(tplStr, filename), path: filename, wpath: null };
};
/**
 * @description 获得webp文件的源文件
 * @example
 */
var getWebpSrc = function getWebpSrc(path) {
    var s = path.slice(0, path.length - 5);
    var s1 = s + '.png';
    if (mod_1.depend.get(s1)) {
        return s1;
    }
    s1 = s + '.jpg';
    if (mod_1.depend.get(s1)) {
        return s1;
    }
    s1 = s + '.jpeg';
    if (mod_1.depend.get(s1)) {
        return s1;
    }
    return path;
};
/**
 * @description 寻找父目录的文件信息
 * @example
 */
var getParentInfo = function getParentInfo(path) {
    var i = path.lastIndexOf('/');
    return i > 0 ? mod_1.depend.get(path.slice(0, i + 1)) : undefined;
};
/**
 * @description 寻找父目录下的排除文件
 * @example
 */
var findExclude = function findExclude(parent, flags, suffixCfg, cache) {
    var scfg = void 0;
    while (parent) {
        var c = cache[parent.path];
        if (c === undefined) {
            var children = parent.children;
            for (var name in children) {
                if (!children.hasOwnProperty(name)) {
                    continue;
                }
                if (children[name].children) {
                    continue;
                }
                if (!name.startsWith(exclude)) {
                    continue;
                }
                var i = name.indexOf('.', exclude.length);
                if (!exports.flagMatch(name.slice(i + 1), flags)) {
                    continue;
                }
                var suf = name.slice(exclude.length, i);
                if (!suf) {
                    continue;
                }
                if (!c) {
                    c = {};
                }
                c[suf] = 'none';
            }
            cache[parent.path] = c || null;
        }
        if (c) {
            if (!scfg) {
                scfg = Object.assign({}, suffixCfg);
            }
            Object.assign(scfg, c);
        }
        parent = getParentInfo(parent.path);
    }
    return scfg || suffixCfg;
};
/**
 * @description 列出文件
 * @example
 */
var listFile = function listFile(info, flags, fileList, suffixMap, without, suffixCfg) {
    var path = info.path;
    if (without[path]) {
        return;
    }
    var suffix = mod_1.butil.fileSuffix(path);
    var type = suffixCfg[suffix];
    if (type === 'none') {
        return;
    }
    if (type === 'downonly') {
        if (mod_1.load.isLocal(path)) {
            return;
        }
    }
    fileList && fileList.push(info);
    if (!suffixMap) {
        return;
    }
    var arr = suffixMap[suffix];
    if (arr) {
        arr.push(path);
    }
};
/**
 * @description 用BlobURL方式加载css
 * @example
 */
var loadCss = function loadCss(data) {
    var url = URL.createObjectURL(new Blob([data], { type: 'text/css' }));
    return html_1.loadCssNode(url, function () {
        URL.revokeObjectURL(url);
    });
};
/**
 * @description 替换样式字符串中的url，并增加资源的引用计数
 * @example
 */
var replaceURL = function replaceURL(css, path, fileMap, callback) {
    var tab = new res_mgr_1.ResTab();
    var count = 1;
    var cb = function cb() {
        count--;
        count === 0 && callback(css.replace(CSS_URL, function (str, s) {
            s = mod_1.butil.relativePath(s, path);
            var res = tab.get(res_mgr_1.RES_TYPE_BLOB + ':' + s);
            if (!res) {
                return '';
            }
            res.use();
            return 'url(' + res.link + ')';
        }));
    };
    css.replace(CSS_URL, function (str, s) {
        count++;
        s = mod_1.butil.relativePath(s, path);
        tab.load(res_mgr_1.RES_TYPE_BLOB + ':' + s, res_mgr_1.RES_TYPE_BLOB, s, fileMap, cb, cb);
        return '';
    });
    cb();
};
/**
 * @description 目录加载的下一步，分析和创建*.tpl和*.widget对应的组件，执行脚本
 * @example
 */
var loadNext = function loadNext(suffixMap, fileMap, mods, successCallback, processCallback) {
    task_mgr_1.set(function () {
        processCallback && processCallback({ type: 'loadTpl' });
        var arr = suffixMap.tpl;
        for (var _iterator5 = arr, _isArray5 = Array.isArray(_iterator5), _i8 = 0, _iterator5 = _isArray5 ? _iterator5 : _iterator5[Symbol.iterator]();;) {
            var _ref5;

            if (_isArray5) {
                if (_i8 >= _iterator5.length) break;
                _ref5 = _iterator5[_i8++];
            } else {
                _i8 = _iterator5.next();
                if (_i8.done) break;
                _ref5 = _i8.value;
            }

            var f = _ref5;

            loadTpl(f, fileMap);
        }
    }, undefined, 3000000, 1);
    task_mgr_1.set(function () {
        processCallback && processCallback({ type: 'loadWidget' });
        var arr = suffixMap.widget;
        for (var _iterator6 = arr, _isArray6 = Array.isArray(_iterator6), _i9 = 0, _iterator6 = _isArray6 ? _iterator6 : _iterator6[Symbol.iterator]();;) {
            var _ref6;

            if (_isArray6) {
                if (_i9 >= _iterator6.length) break;
                _ref6 = _iterator6[_i9++];
            } else {
                _i9 = _iterator6.next();
                if (_i9.done) break;
                _ref6 = _i9.value;
            }

            var f = _ref6;

            loadWidget(f, fileMap);
        }
    }, undefined, 3000000, 1);
    task_mgr_1.set(function () {
        processCallback && processCallback({ type: 'loadDirCompleted' });
        for (var _iterator7 = mods, _isArray7 = Array.isArray(_iterator7), _i10 = 0, _iterator7 = _isArray7 ? _iterator7 : _iterator7[Symbol.iterator]();;) {
            var _ref7;

            if (_isArray7) {
                if (_i10 >= _iterator7.length) break;
                _ref7 = _iterator7[_i10++];
            } else {
                _i10 = _iterator7.next();
                if (_i10.done) break;
                _ref7 = _i10.value;
            }

            var m = _ref7;

            loadDirCompleted(m, fileMap);
        }
        successCallback && successCallback(fileMap, mods);
    }, undefined, 3000000, 1);
};
/**
 * @description 创建组件
 * @example
 */
var loadTpl = function loadTpl(filename, fileMap) {
    var widget = void 0;
    var forelet = void 0;
    var name = filename.slice(0, filename.length - 4);
    var s = name + '.widget'; // 忽略有widget配置的组件
    if (fileMap[s]) {
        return;
    }
    var mod = mod_1.commonjs.relativeGet(name);
    if (mod) {
        widget = util_1.getExportFunc(mod, util_1.checkType, widget_1.Widget);
        forelet = util_1.getExportFunc(mod, util_1.checkInstance, forelet_1.Forelet);
    }
    var config = loadCfg(name + '.cfg', fileMap, name);
    var tpl = loadTpl1(filename, fileMap, name);
    var css = loadWcss(name + '.wcss', fileMap, name);
    widget_1.register(name.replace(/\//g, '-'), widget, tpl, css, config, forelet);
};
/**
 * @description 创建组件
 * @example
 */
var loadWidget = function loadWidget(filename, fileMap) {
    var widget = void 0;
    var config = void 0;
    var tpl = void 0;
    var css = void 0;
    var forelet = void 0;
    var name = filename.slice(0, filename.length - 7);
    var cfg = JSON.parse(mod_1.butil.utf8Decode(fileMap[filename]));
    if (cfg.js || cfg.widget) {
        var mod = mod_1.commonjs.relativeGet(mod_1.commonjs.modName(cfg.js || cfg.widget), name);
        if (!mod) {
            log_1.warn(exports.level, 'widget not found, name:', name, cfg.js || cfg.widget);
            return;
        }
        widget = util_1.getExportFunc(mod, util_1.checkType, widget_1.Widget);
    }
    if (cfg.cfg) {
        config = loadCfg(cfg.cfg, fileMap, name);
        if (!config) {
            log_1.warn(exports.level, 'widget cfg not found, name:', name, cfg.cfg);
        }
    }
    if (cfg.css) {
        css = loadWcss(cfg.css, fileMap, name);
        if (!css) {
            log_1.warn(exports.level, 'widget css not found, name:', name, cfg.css);
        }
    }
    if (cfg.tpl) {
        tpl = loadTpl1(cfg.tpl, fileMap, name);
    }
    if (cfg.forelet) {
        var _mod = mod_1.commonjs.relativeGet(mod_1.commonjs.modName(cfg.forelet), name);
        if (!_mod) {
            log_1.warn(exports.level, 'widget forelet not found, name:', name, cfg.forelet);
            return;
        }
        forelet = util_1.getExportFunc(_mod, util_1.checkInstance, forelet_1.Forelet);
    }
    widget_1.register(name.replace(/\//g, '-'), widget, tpl, css, config, forelet);
};
/**
 * @description 加载模板
 * @example
 */
var loadTpl1 = function loadTpl1(file, fileMap, widget) {
    var s = mod_1.butil.relativePath(file, widget);
    var tpl = widget_1.getCache(s);
    if (!tpl) {
        var data = fileMap[s];
        if (!data) {
            log_1.warn(exports.level, 'widget tpl not found, name:', widget, file);
            return;
        }
        tpl = tplFun(mod_1.butil.utf8Decode(data), s);
        widget_1.setCache(s, tpl);
    } else if (!tpl.value) {
        tpl.value = tpl_1.toFun(mod_1.butil.utf8Decode(fileMap[s]), s);
    }
    return tpl;
};
/**
 * @description 加载配置
 * @example
 */
var loadCfg = function loadCfg(cfg, fileMap, widget) {
    if (Array.isArray(cfg)) {
        var c = void 0;
        for (var _iterator8 = cfg, _isArray8 = Array.isArray(_iterator8), _i11 = 0, _iterator8 = _isArray8 ? _iterator8 : _iterator8[Symbol.iterator]();;) {
            var _ref8;

            if (_isArray8) {
                if (_i11 >= _iterator8.length) break;
                _ref8 = _iterator8[_i11++];
            } else {
                _i11 = _iterator8.next();
                if (_i11.done) break;
                _ref8 = _i11.value;
            }

            var f = _ref8;

            var config = loadCfg1(f, fileMap, widget);
            if (!config) {
                continue;
            }
            config = config.value;
            if (!config) {
                continue;
            }
            if (!c) {
                c = {};
            }
            for (var k in config) {
                c[k] = config[k];
            }
        }
        return c ? { value: c } : null;
    } else {
        return loadCfg1(cfg, fileMap, widget);
    }
};
/**
 * @description 加载配置
 * @example
 */
var loadCfg1 = function loadCfg1(cfg, fileMap, widget) {
    var s = mod_1.butil.relativePath(cfg, widget);
    var config = widget_1.getCache(s);
    if (!config) {
        var data = fileMap[s];
        if (!data) {
            return;
        }
        config = { value: JSON.parse(mod_1.butil.utf8Decode(data)) };
        widget_1.setCache(s, config);
    } else if (!config.value) {
        config.value = style_1.parse(mod_1.butil.utf8Decode(fileMap[s]), s);
    }
    return config;
};
/**
 * @description 加载配置
 * @example
 */
var loadWcss = function loadWcss(wcss, fileMap, widget) {
    if (Array.isArray(wcss)) {
        var sheet = void 0;
        for (var _iterator9 = wcss, _isArray9 = Array.isArray(_iterator9), _i12 = 0, _iterator9 = _isArray9 ? _iterator9 : _iterator9[Symbol.iterator]();;) {
            var _ref9;

            if (_isArray9) {
                if (_i12 >= _iterator9.length) break;
                _ref9 = _iterator9[_i12++];
            } else {
                _i12 = _iterator9.next();
                if (_i12.done) break;
                _ref9 = _i12.value;
            }

            var f = _ref9;

            var css = loadWcss1(f, fileMap, widget);
            if (!css) {
                continue;
            }
            css = css.value;
            if (!css) {
                continue;
            }
            if (!sheet) {
                sheet = new Map();
            }
            util_1.mapCopy(css, sheet);
        }
        return { value: sheet };
    } else {
        return loadWcss1(wcss, fileMap, widget);
    }
};
/**
 * @description 加载样式
 * @example
 */
var loadWcss1 = function loadWcss1(wcss, fileMap, widget) {
    var s = mod_1.butil.relativePath(wcss, widget);
    var css = widget_1.getCache(s);
    if (!css) {
        var data = fileMap[s];
        if (!data) {
            return;
        }
        css = { value: style_1.parse(mod_1.butil.utf8Decode(data), s) };
        widget_1.setCache(s, css);
    } else if (!css.value) {
        css.value = style_1.parse(mod_1.butil.utf8Decode(fileMap[s]), s);
    }
    return css;
};
/**
 * @description 调用模块的loadDirCompleted方法
 * @example
 */
var loadDirCompleted = function loadDirCompleted(mod, fileMap) {
    var func = mod.loadDirCompleted;
    func && func(fileMap);
};
/**
 * @description 标签匹配， 判断模式字符串，是否和标签匹配，标签可以多级
 * @example
 * not($b1) or($b1,$b2) and(or($b1=c1,$b2!=c2), not($b3)) ($b2)
 * 	$b1、$b2表示flag是否含有此键， $b2!=c2表示flag的b2键的值要不等于c2
 */
exports.parseMatch = function (pattern, flags) {
    var s = pattern.str;
    if (s.startsWith('and(')) {
        pattern.str = s.slice(4).trim();
        return parseAnd(pattern, flags);
    }
    if (s.startsWith('or(')) {
        pattern.str = s.slice(3).trim();
        return parseOr(pattern, flags);
    }
    if (s.startsWith('not(')) {
        pattern.str = s.slice(4).trim();
        return parseNot(pattern, flags);
    }
    if (s.startsWith('(')) {
        pattern.str = s.slice(1).trim();
        var r = exports.parseMatch(pattern, flags);
        s = pattern.str;
        if (s.charCodeAt(0) !== 41) {
            throw new Error('parse error, invalid pattern:' + pattern.str);
        }
        return r;
    }
    return parseEqual(pattern, flags);
};
/**
 * @description 分析not， ")"结束
 * @example
 */
var parseNot = function parseNot(pattern, flags) {
    var r = exports.parseMatch(pattern, flags);
    var s = pattern.str;
    if (s.charCodeAt(0) !== 41) {
        throw new Error('parse error, invalid pattern:' + pattern.str);
    }
    pattern.str = s.slice(1).trim();
    return !r;
};
/**
 * @description 分析or， ","分隔， ")"结束
 * @example
 */
var parseOr = function parseOr(pattern, flags) {
    var rr = false;
    // tslint:disable-next-line:no-constant-condition
    while (true) {
        var r = exports.parseMatch(pattern, flags);
        var s = pattern.str;
        if (s.charCodeAt(0) === 44) {
            pattern.str = s.slice(1).trim();
        } else if (s.charCodeAt(0) === 41) {
            pattern.str = s.slice(1).trim();
            return rr || r;
        } else {
            throw new Error('parse error, invalid pattern:' + pattern.str);
        }
        rr = rr || r;
    }
};
/**
 * @description 分析and， ","分隔， ")"结束
 * @example
 */
var parseAnd = function parseAnd(pattern, flags) {
    var rr = true;
    // tslint:disable-next-line:no-constant-condition
    while (true) {
        var r = exports.parseMatch(pattern, flags);
        var s = pattern.str;
        if (s.charCodeAt(0) === 44) {
            pattern.str = s.slice(1).trim();
        } else if (s.charCodeAt(0) === 41) {
            pattern.str = s.slice(1).trim();
            return rr && r;
        } else {
            throw new Error('parse error, invalid pattern:' + pattern.str);
        }
        rr = rr && r;
    }
};
/**
 * @description 分析变量， 判断 = != 3种情况
 * @example
 */
var parseEqual = function parseEqual(pattern, flags) {
    var v1 = parseValue(pattern, flags);
    var s = pattern.str;
    if (s.charCodeAt(0) === 41) {
        return v1 !== false && v1 !== undefined;
    }
    if (s.charCodeAt(0) === 44) {
        return v1 !== false && v1 !== undefined;
    }
    if (s.charCodeAt(0) === 61) {
        pattern.str = s.slice(1).trim();
        var v2 = parseValue(pattern, flags);
        return v1 === v2;
    }
    if (s.charCodeAt(0) === 33 && s.charCodeAt(1) === 61) {
        pattern.str = s.slice(2).trim();
        var _v = parseValue(pattern, flags);
        return v1 !== _v;
    }
    throw new Error('parse error, invalid pattern:' + pattern.str);
};
/**
 * @description 分析值，要么是变量，要么是字面量
 * @example
 */
var parseValue = function parseValue(pattern, flags) {
    var s = pattern.str;
    if (s.charCodeAt(0) === 36) {
        var _arr = var_reg.exec(s);
        if (!_arr) {
            throw new Error('parse error, invalid pattern:' + pattern.str);
        }
        pattern.str = s.slice(_arr[0].length);
        return util_1.getValue(flags, _arr[1]);
    }
    var arr = str_reg.exec(s);
    if (arr) {
        pattern.str = s.slice(arr[0].length);
        return arr[1];
    }
    arr = number_reg.exec(s);
    if (!arr) {
        throw new Error('parse error, invalid pattern:' + pattern.str);
    }
    pattern.str = s.slice(arr[0].length);
    return parseFloat(arr[1]);
};
// ============================== 立即执行
})