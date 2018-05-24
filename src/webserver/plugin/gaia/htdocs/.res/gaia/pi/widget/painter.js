_$define("pi/widget/painter", function (require, exports, module){
"use strict";
/**
 * vdom和组件的渲染器，提供全局的命令列表，将真实dom操作延迟到帧渲染时调用
 * 新建DOM节点及子节点时，不发送渲染命令，直接调用方法
 * 注意：如果父组件修改子组件属性，并且子组件也更改根节点的属性，则以最后修改的为准
 * 注意：如果父组件定义了子组件w-class样式，并且子组件也定义了根节点的w-class样式，则以子组件的优先
 */

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

Object.defineProperty(exports, "__esModule", { value: true });
// ============================== 导入
var mod_1 = require("../lang/mod");
var log_1 = require("../util/log");
var res_mgr_1 = require("../util/res_mgr");
var util_1 = require("../util/util");
var event = require("./event");
var frame_mgr_1 = require("./frame_mgr");
var style_1 = require("./style");
var virtual_node_1 = require("./virtual_node");
var widget_1 = require("./widget");
// ============================== 导出
exports.level = mod_1.commonjs.debug ? log_1.logLevel : log_1.LogLevel.info;
/**
 * @description 是否忽略hash相同，强制比较和替换
 * @example
 */
exports.forceReplace = false;
/**
 * @description 是否显示w-前缀的属性
 * @example
 */
exports.showWAttr = false;
/**
 * @description 创建节点后的处理函数，一般给扩展方调用
 * @example
 */
exports.createHandler = null;
/**
 * @description 是否显示w-前缀的属性
 * @example
 */
exports.setShowWAttr = function (value) {
    exports.showWAttr = value;
};
/**
 * @description 是否显示w-前缀的属性
 * @example
 */
exports.setCreateHandler = function (func) {
    exports.createHandler = func;
};
/**
 * @description 获得真实的dom节点
 * @example
 */
exports.getRealNode = function (node) {
    var n = void 0;
    while (node) {
        n = virtual_node_1.isVirtualWidgetNode(node);
        if (!n) {
            return node.link;
        }
        node = n.link.tree;
    }
};
/**
 * @description 替换节点，只替换了当前节点的link ext, 其他属性和子节点均没有替换
 * @example
 */
exports.replaceNode = function (oldNode, newNode) {
    newNode.link = oldNode.link;
    var n = virtual_node_1.isVirtualWidgetNode(newNode);
    if (n) {
        n.link.parentNode = n;
    }
    newNode.ext = oldNode.ext;
    event.rebindEventMap(oldNode, newNode);
};
/**
 * @description 添加节点的属性，并没有真正的添加，只是传了一个命令
 * @example
 */
exports.addAttr = function (node, key, value) {
    exports.setAttr(node, key, value);
};
/**
 * @description 修改节点的属性
 * @example
 */
exports.modifyAttr = function (node, key, newValue, oldValue) {
    exports.setAttr(node, key, newValue);
};
/**
 * @description 删除节点的属性
 * @example
 */
exports.delAttr = function (node, key) {
    exports.setAttr(node, key);
};
/**
 * @description 添加节点的属性，并没有真正的添加，只是传了一个命令
 * @example
 */
// tslint:disable-next-line:cyclomatic-complexity
exports.setAttr = function (node, key, value, immediately) {
    if (key === 'class') {
        cmdSet(exports.getRealNode(node), 'className', value, immediately);
        return;
    }
    if (key === 'style') {
        return setAttrStyle(node, key, value, immediately);
    }
    if (setAttrEventListener(node, key, value) && !exports.showWAttr) {
        return;
    }
    if (key.charCodeAt(0) === 119 && key.charCodeAt(1) === 45) {
        if (key === 'w-class') {
            setAttrClazz(node, key, value, immediately);
        } else if (key === 'w-plugin') {
            setAttrPlugin(node, value ? JSON.parse(value) : undefined);
        } else if (key === 'w-props') {
            if (virtual_node_1.isVirtualWidgetNode(node)) {
                node.ext.propsUpdate = value === 'update';
            }
        } else if (key.charCodeAt(2) === 101 && key.charCodeAt(3) === 118 && key.charCodeAt(4) === 45) {
            // "w-ev-***"
            var attr = node.ext.eventAttr;
            if (!attr) {
                node.ext.eventAttr = attr = {};
            }
            attr[key.slice(5)] = value ? JSON.parse(value) : undefined;
        }
        if (!exports.showWAttr) {
            return;
        }
    }
    var el = exports.getRealNode(node);
    // 匹配img src
    if (key === 'src' && node.tagName === 'img') {
        if (value) {
            if (value.indexOf(':') < 0) {
                value = mod_1.butil.relativePath(value, node.widget.tpl.path);
                loadSrc(el, node.widget, value, immediately);
            } else {
                cmdSet(el, 'src', value, immediately);
            }
        } else {
            cmdSet(el, 'src', '', immediately);
        }
    } else if (key === 'value' && (node.tagName === 'INPUT' || node.tagName === 'TEXTAREA')) {
        cmdSet(el, 'value', value, immediately);
    } else if (value) {
        cmdObjCall(el, 'setAttribute', key, value, immediately);
    } else {
        cmdObjCall(el, 'removeAttribute', key, '', immediately);
    }
};
/**
 * @description 创建组件
 * @example
 */
exports.createWidget = function (node) {
    // 处理相对tpl路径的组件
    var s = node.widget.tpl.wpath;
    if (!s) {
        node.widget.tpl.wpath = s = node.widget.tpl.path.replace(/\//g, '-');
    }
    var w = widget_1.factory(widget_1.relative(node.tagName, s));
    if (!w) {
        throw new Error("widget not found, name: " + node.tagName);
    }
    node.link = w;
    node.widget.children.push(w);
    w.parentNode = node;
    if (node.hasChild || node.child) {
        if (virtual_node_1.getAttribute(node.attrs, 'w-props')) {
            w.updateProps(node.child);
        } else {
            w.setProps(node.child);
        }
    }
    w.paint();
    if (node.widget.inDomTree) {
        attachList.push(w);
    }
    if (node.attrSize) {
        node.ext = {};
    }
    var obj = node.attrs;
    for (var k in obj) {
        exports.setAttr(node, k, obj[k], true);
    }
    exports.createHandler && exports.createHandler(node);
};
/**
 * @description 创建真实节点
 * @example
 */
exports.createNode = function (node) {
    node.link = document.createElement(node.tagName);
    if (node.attrSize) {
        node.ext = {};
    }
    var obj = node.attrs;
    for (var k in obj) {
        exports.setAttr(node, k, obj[k], true);
    }
    exports.createHandler && exports.createHandler(node);
};
/**
 * @description 创建文本节点
 * @example
 */
exports.createTextNode = function (node) {
    node.link = document.createTextNode(node.text);
};
/**
 * @description 插入节点
 * @example
 */
exports.insertNode = function (parent, node, offset) {
    cmdList.push([insertBefore, [parent, exports.getRealNode(node), offset]]);
};
/**
 * @description 添加节点
 *
 * @example
 */
exports.addNode = function (parent, node, immediately) {
    if (immediately) {
        parent.appendChild(exports.getRealNode(node));
    } else {
        cmdList.push([parent, 'appendChild', [exports.getRealNode(node)]]);
    }
};
/**
 * @description 删除节点，不仅要删除节点还要删除其下widget
 * @example
 */
exports.delNode = function (node) {
    var r = node.link;
    if (virtual_node_1.isVirtualNode(node)) {
        delChilds(node);
    } else if (virtual_node_1.isVirtualWidgetNode(node)) {
        util_1.arrDrop(node.widget.children, r);
        var w = r;
        exports.delWidget(w);
        r = exports.getRealNode(w.tree);
    }
    cmdList.push([r, 'remove', []]);
};
/**
 * @description 修改组件节点的数据
 * @example
 */
exports.modifyWidget = function (node, newValue, oldValue) {
    var w = node.link;
    if (node.ext && node.ext.propsUpdate) {
        w.updateProps(newValue, oldValue);
    } else {
        w.setProps(newValue, oldValue);
    }
    w.paint();
};
/**
 * @description 修改文本节点的文本
 * @example
 */
exports.modifyText = function (node, newValue, oldValue) {
    cmdList.push([node.link, 'nodeValue', newValue]);
};
/**
 * @description 删除widget及其子widgets
 * @example
 */
exports.delWidget = function (w) {
    if (!w.destroy()) {
        return;
    }
    if (w.inDomTree) {
        detachList.push(w);
    }
    delWidgetChildren(w.children);
};
/**
 * @description 获得显示在真实的dom节点的组件名称
 * @example
 */
exports.getShowWidgetName = function (node, name) {
    var n = virtual_node_1.isVirtualWidgetNode(node);
    // tslint:disable:prefer-template
    return n ? exports.getShowWidgetName(n.link.tree, name + ' ' + n.link.name) : name;
};
/**
 * @description 渲染Widget方法，如果当前正在渲染，则缓冲，渲染完成后会继续渲染该数据
 * @example
 */
exports.paintWidget = function (w, reset) {
    var tpl = w.tpl;
    if (!tpl) {
        return;
    }
    var frameMgr = frame_mgr_1.getGlobal();
    if (cmdList.length === 0) {
        frameMgr.setBefore(paint1);
    }
    var tree = tpl.value(w.getConfig() || empty, w.getProps(), w.getState(), w);
    var old = w.tree;
    tree.widget = w;
    if (old) {
        if (reset) {
            try {
                w.beforeUpdate();
                var arr = w.children;
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

                    var _w = _ref;

                    exports.delWidget(_w);
                }
                w.children = [];
                virtual_node_1.create(tree);
                var node = exports.getRealNode(tree);
                node.setAttribute('w-tag', exports.getShowWidgetName(tree, w.name));
                cmdList.push([replaceTree, [node, exports.getRealNode(old)]]);
                cmdList.push([w, 'afterUpdate', []]);
                w.tree = tree;
            } catch (e) {
                log_1.warn(exports.level, 'paint reset fail, ', w, e);
            }
        } else {
            var b = old.attrHash !== tree.attrHash || old.childHash !== tree.childHash || exports.forceReplace;
            if (b) {
                try {
                    w.beforeUpdate();
                    old = w.tree;
                    virtual_node_1.replace(old, tree);
                    cmdList.push([w, 'afterUpdate', []]);
                    w.tree = tree;
                } catch (e) {
                    log_1.warn(exports.level, 'paint replace fail, ', w, e);
                    if (old.offset < 0) {
                        fixOld(virtual_node_1.isVirtualNode(old));
                    }
                }
            }
        }
    } else {
        try {
            virtual_node_1.create(tree);
            exports.getRealNode(tree).setAttribute('w-tag', exports.getShowWidgetName(tree, w.name));
            w.tree = tree;
            w.firstPaint();
        } catch (e) {
            log_1.warn(exports.level, 'paint create fail, ', w, e);
        }
    }
};
/**
 * @description 渲染命令2方法
 * @example
 */
exports.paintCmd = function (func, args) {
    var frameMgr = frame_mgr_1.getGlobal();
    if (cmdList.length === 0) {
        frameMgr.setBefore(paint1);
    }
    cmdList.push([func, args]);
};
/**
 * @description 渲染命令3方法
 * @example
 */
exports.paintCmd3 = function (obj, funcOrAttr, args) {
    var frameMgr = frame_mgr_1.getGlobal();
    if (cmdList.length === 0) {
        frameMgr.setBefore(paint1);
    }
    cmdList.push([obj, funcOrAttr, args]);
};
/**
 * @description 绘制时，添加组件，调用组件及子组件的attach方法
 * @example
 */
exports.paintAttach = function (w) {
    attachList.push(w);
};
/**
 * @description 绘制时，删除组件，调用组件及子组件的detach方法
 * @example
 */
exports.paintDetach = function (w) {
    detachList.push(w);
};
// ============================== 本地
// 空配置
var empty = {}; // 每个painter的指令都被放入其中
var cmdList = [];
// 每个被添加的widget
var attachList = [];
// 每个被删除的widget
var detachList = [];
// 临时变量
var cmdList1 = [];
var attachList1 = [];
var detachList1 = [];
/**
 * @description 最终的渲染方法，渲染循环时调用，负责实际改变dom
 * @example
 */
var paint1 = function paint1() {
    var arr = detachList;
    detachList = detachList1;
    detachList1 = arr;
    arr = cmdList;
    cmdList = cmdList1;
    cmdList1 = arr;
    arr = attachList;
    attachList = attachList1;
    attachList1 = arr;
    // 先调用所有要删除的widget的detach方法
    arr = detachList1;
    for (var _iterator2 = arr, _isArray2 = Array.isArray(_iterator2), _i2 = 0, _iterator2 = _isArray2 ? _iterator2 : _iterator2[Symbol.iterator]();;) {
        var _ref2;

        if (_isArray2) {
            if (_i2 >= _iterator2.length) break;
            _ref2 = _iterator2[_i2++];
        } else {
            _i2 = _iterator2.next();
            if (_i2.done) break;
            _ref2 = _i2.value;
        }

        var w = _ref2;

        paintDetach1(w);
    }
    arr.length = 0;
    arr = cmdList1;
    for (var _iterator3 = arr, _isArray3 = Array.isArray(_iterator3), _i3 = 0, _iterator3 = _isArray3 ? _iterator3 : _iterator3[Symbol.iterator]();;) {
        var _ref3;

        if (_isArray3) {
            if (_i3 >= _iterator3.length) break;
            _ref3 = _iterator3[_i3++];
        } else {
            _i3 = _iterator3.next();
            if (_i3.done) break;
            _ref3 = _i3.value;
        }

        var cmd = _ref3;

        if (cmd.length === 3) {
            var args = cmd[2];
            if (Array.isArray(args)) {
                util_1.objCall(cmd[0], cmd[1], args);
            } else {
                cmd[0][cmd[1]] = args;
            }
        } else if (cmd.length === 2) {
            util_1.call(cmd[0], cmd[1]);
        }
    }
    // arr.length > 3 && level <= LogLevel.debug && debug(level, "painter cmd: ", arr.concat([]));
    arr.length = 0;
    // 调用所有本次添加上的widget的attach方法
    arr = attachList1;
    for (var _iterator4 = arr, _isArray4 = Array.isArray(_iterator4), _i4 = 0, _iterator4 = _isArray4 ? _iterator4 : _iterator4[Symbol.iterator]();;) {
        var _ref4;

        if (_isArray4) {
            if (_i4 >= _iterator4.length) break;
            _ref4 = _iterator4[_i4++];
        } else {
            _i4 = _iterator4.next();
            if (_i4.done) break;
            _ref4 = _i4.value;
        }

        var _w2 = _ref4;

        paintAttach1(_w2);
    }
    arr.length = 0;
};
/**
 * @description 删除子组件
 * @example
 */
var delWidgetChildren = function delWidgetChildren(arr) {
    for (var _iterator5 = arr, _isArray5 = Array.isArray(_iterator5), _i5 = 0, _iterator5 = _isArray5 ? _iterator5 : _iterator5[Symbol.iterator]();;) {
        var _ref5;

        if (_isArray5) {
            if (_i5 >= _iterator5.length) break;
            _ref5 = _iterator5[_i5++];
        } else {
            _i5 = _iterator5.next();
            if (_i5.done) break;
            _ref5 = _i5.value;
        }

        var w = _ref5;

        if (w.destroy()) {
            delWidgetChildren(w.children);
        }
    }
};
/**
 * @description 绘制时，添加组件，调用组件及子组件的attach方法
 * @example
 */
var paintAttach1 = function paintAttach1(w) {
    if (w.inDomTree) {
        return;
    }
    w.inDomTree = true;
    w.attach();
    for (var _iterator6 = w.children, _isArray6 = Array.isArray(_iterator6), _i6 = 0, _iterator6 = _isArray6 ? _iterator6 : _iterator6[Symbol.iterator]();;) {
        var _ref6;

        if (_isArray6) {
            if (_i6 >= _iterator6.length) break;
            _ref6 = _iterator6[_i6++];
        } else {
            _i6 = _iterator6.next();
            if (_i6.done) break;
            _ref6 = _i6.value;
        }

        var c = _ref6;

        paintAttach1(c);
    }
};
/**
 * @description 绘制时，删除组件，调用组件及子组件的detach方法
 * @example
 */
var paintDetach1 = function paintDetach1(w) {
    if (!w.inDomTree) {
        return;
    }
    w.inDomTree = false;
    for (var _iterator7 = w.children, _isArray7 = Array.isArray(_iterator7), _i7 = 0, _iterator7 = _isArray7 ? _iterator7 : _iterator7[Symbol.iterator]();;) {
        var _ref7;

        if (_isArray7) {
            if (_i7 >= _iterator7.length) break;
            _ref7 = _iterator7[_i7++];
        } else {
            _i7 = _iterator7.next();
            if (_i7.done) break;
            _ref7 = _i7.value;
        }

        var c = _ref7;

        paintDetach1(c);
    }
    w.detach();
};
/**
 * @description 设置节点的style
 * @example
 */
var setAttrStyle = function setAttrStyle(node, key, value, immediately) {
    node.ext.innerStyle = value ? style_1.parseEffect(value, node.widget.tpl.path) : null;
    setDiffStyle(node, immediately);
};
/**
 * @description 设置节点的clazz
 * @example
 */
var setAttrClazz = function setAttrClazz(node, key, value, immediately) {
    if (value) {
        var clazz = value.trim().split(/\s+/);
        if (clazz[0].length > 0) {
            node.ext.clazzStyle = style_1.calc(node.widget, clazz, clazz.join(' '), { map: new Map(), url: null });
        }
    } else {
        node.ext.clazzStyle = null;
    }
    setDiffStyle(node, immediately);
};
/**
 * @description 设置节点的插件
 * @example
 */
var setAttrPlugin = function setAttrPlugin(node, cfg) {
    var mod = void 0;
    var w = node.widget;
    var old = node.ext.plugin;
    node.ext.plugin = cfg;
    if (cfg) {
        mod = mod_1.commonjs.relativeGet(cfg.mod, w.tpl.path);
    } else if (old) {
        var _mod = mod_1.commonjs.relativeGet(old.mod, w.tpl.path);
    }
    mod && mod.exports.pluginBind && mod.exports.pluginBind(w, node, cfg, old);
};
/**
 * @description 设置节点的style
 * @example
 */
var setDiffStyle = function setDiffStyle(node, immediately) {
    var ext = node.ext;
    var style = style_1.merge(ext.innerStyle, ext.clazzStyle);
    var diff = style_1.difference(ext.style, style);
    ext.style = style;
    if (!diff) {
        return;
    }
    var el = getFilterStyleRealNode(node, diff);
    if (!el) {
        return;
    }
    loadURL(el, node.widget, diff);
    cmdCall(exports.setStyle, el, diff, immediately);
};
/**
 * @description 获得过滤样式后的真实的dom节点,如果过滤的样式不存在，则不向下获取dom节点
 * @example
 */
var getFilterStyleRealNode = function getFilterStyleRealNode(node, diff) {
    var n = void 0;
    // tslint:disable-next-line:no-constant-condition
    while (true) {
        n = virtual_node_1.isVirtualWidgetNode(node);
        if (!n) {
            return node.link;
        }
        node = n.link.tree;
        if (!node) {
            return null;
        }
        if (!node.ext) {
            continue;
        }
        style_1.filter(node.ext.clazzStyle, diff);
        style_1.filter(node.ext.innerStyle, diff);
        if (diff.map.size === 0) {
            return null;
        }
    }
};
/**
 * @description 设置节点的事件，因为并不影响显示，所以立即处理，而不是延迟到渲染时。因为vnode已经被改变，如果延迟，也是会有事件不一致的问题
 * @example
 */
var setAttrEventListener = function setAttrEventListener(node, key, value) {
    // tslint:disable:no-reserved-keywords
    var type = event.getEventType(key);
    if (type === event.USER_EVENT_PRE) {
        event.addUserEventListener(node, key, type, value);
        return true;
    }
    if (type) {
        event.addNativeEventListener(node, exports.getRealNode(node), key, type, value);
        return true;
    }
    return false;
};
/**
 * @description 命令属性设置
 * @example
 */
var cmdSet = function cmdSet(obj, key, value, immediately) {
    if (immediately) {
        obj[key] = value;
    } else {
        cmdList.push([obj, key, value]);
    }
};
/**
 * @description 命令方法调用
 * @example
 */
var cmdCall = function cmdCall(func, arg1, arg2, immediately) {
    if (immediately) {
        func(arg1, arg2);
    } else {
        cmdList.push([func, [arg1, arg2]]);
    }
};
/**
 * @description 命令方法调用
 * @example
 */
var cmdObjCall = function cmdObjCall(obj, func, arg1, arg2, immediately) {
    if (immediately) {
        obj[func](arg1, arg2);
    } else {
        cmdList.push([obj, func, [arg1, arg2]]);
    }
};
/**
 * @description 删除节点的子节点，不仅要删除节点还要删除其下widget
 * @example
 */
var delChilds = function delChilds(node) {
    var arr = node.children;
    for (var _iterator8 = arr, _isArray8 = Array.isArray(_iterator8), _i8 = 0, _iterator8 = _isArray8 ? _iterator8 : _iterator8[Symbol.iterator]();;) {
        var _ref8;

        if (_isArray8) {
            if (_i8 >= _iterator8.length) break;
            _ref8 = _iterator8[_i8++];
        } else {
            _i8 = _iterator8.next();
            if (_i8.done) break;
            _ref8 = _i8.value;
        }

        var n = _ref8;

        if (virtual_node_1.isVirtualNode(n)) {
            delChilds(n);
        } else if (virtual_node_1.isVirtualWidgetNode(n)) {
            exports.delWidget(n.link);
        }
    }
};
/**
 * @description 设置元素的样式，跳过指定样式
 * @example
 */
exports.setStyle = function (el, style) {
    var s = el.style;
    var map = style.map;
    for (var _iterator9 = map, _isArray9 = Array.isArray(_iterator9), _i9 = 0, _iterator9 = _isArray9 ? _iterator9 : _iterator9[Symbol.iterator]();;) {
        var _ref9;

        if (_isArray9) {
            if (_i9 >= _iterator9.length) break;
            _ref9 = _iterator9[_i9++];
        } else {
            _i9 = _iterator9.next();
            if (_i9.done) break;
            _ref9 = _i9.value;
        }

        var _ref10 = _ref9,
            _ref11 = _slicedToArray(_ref10, 2),
            k = _ref11[0],
            v = _ref11[1];

        s[k] = v;
    }
};
/**
 * @description 插入节点
 * @example
 */
var insertBefore = function insertBefore(parent, el, offset) {
    parent.insertBefore(el, parent.childNodes[offset]);
};
/**
 * @description 删除树节点
 * @example
 */
var replaceTree = function replaceTree(newEl, oldEl) {
    var parent = oldEl.parentNode;
    parent && parent.replaceChild(newEl, oldEl);
};
/**
 * @description 替换图像的src
 * @example
 */
var loadSrc = function loadSrc(el, widget, src, immediately) {
    var tab = widget.resTab;
    if (!tab) {
        widget.resTab = tab = new res_mgr_1.ResTab();
    }
    var name = res_mgr_1.RES_TYPE_BLOB + ':' + src;
    var res = tab.get(name);
    if (res) {
        cmdSet(el, 'src', res.link, immediately);
    } else {
        tab.load(name, res_mgr_1.RES_TYPE_BLOB, src, undefined, function (res) {
            exports.paintCmd3(el, 'src', res.link);
        });
    }
};
/**
 * @description 替换含URL的样式或图像的src
 * @example
 */
var loadURL = function loadURL(el, widget, style) {
    var tab = widget.resTab;
    var url = style.url;
    if (!url) {
        return;
    }
    if (!tab) {
        widget.resTab = tab = new res_mgr_1.ResTab();
    }
    var arr = url.arr.concat();
    var count = arr.length / 2 | 0;
    for (var i = arr.length - 2; i > 0; i -= 2) {
        var file = arr[i];
        var name = res_mgr_1.RES_TYPE_BLOB + ':' + file;
        var res = tab.get(name);
        if (res) {
            arr[i] = res.link;
            count--;
            if (count <= 0) {
                style.map.set(url.key, arr.join(''));
            }
        } else {
            tab.load(name, res_mgr_1.RES_TYPE_BLOB, file, undefined, urlLoad(arr, i, function () {
                count--;
                if (count <= 0) {
                    exports.paintCmd3(el.style, url.key, arr.join(''));
                }
            }));
        }
    }
};
/**
 * @description 替换含URL的样式或图像的src
 * @example
 */
var urlLoad = function urlLoad(arr, i, callback) {
    return function (res) {
        arr[i] = res.link;
        callback();
    };
};
/**
 * @description 尽量修复旧节点，已经重绑定的事件和发出的渲染指令还是会生效
 * @example
 */
var fixOld = function fixOld(old) {
    if (!old) {
        return;
    }
    var arr = old.children;
    for (var n, i = 0, len = arr.length; i < len; i++) {
        n = arr[i];
        if (n.offset >= 0) {
            continue;
        }
        n.offset = i;
        fixOld(virtual_node_1.isVirtualNode(n));
    }
};
})