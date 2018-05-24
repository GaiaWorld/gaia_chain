_$define("pi/util/canvas", function (require, exports, module){
"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

Object.defineProperty(exports, "__esModule", { value: true });
/*
 * 画布工具库
 * 图像滤镜 imgfilter
 * 支持多种滤镜，可以连续滤镜处理，包括 灰度-色相饱和度亮度-亮度对比度-腐蚀-锐化-高斯模糊
 * [["gray"], ["hsl", 180?, 1?, 1?], ["brightnessContrast", 0.5, 0?], ["corrode", 3?], ["sharp", 3?], ["gaussBlur", 3?]]
 * 图像文字 imgtext
 * 只支持单行文字，不支持继承的font属性，不支持line-height属性
 * 	如果支持继承的font属性，则需要在div放入节点后，获取font属性
 * 	如果支持多行文本，需要支持line-height属性，并处理对齐问题
 * 要求参数为ImgTextCfg, 如果cfg中有show字段，表示按字符显示，渐变也是单字符计算的
 */
// ============================== 导入
var mod_1 = require("../lang/mod");
var math_1 = require("../util/math");
var res_mgr_1 = require("../util/res_mgr");
var client_1 = require("../worker/client");
var task_mgr_1 = require("./task_mgr");
var util_1 = require("./util");
// ============================== 导出
// imgtext的资源类型
exports.RES_TYPE_IMGTEXT = 'imgtext';
// imgfliter的资源类型
exports.RES_TYPE_IMGFILTER = 'imgfilter';
// 销毁图片文字
exports.destroyImgText = function (cfg) {
    cfg.key = '';
    cfg.chars = cfg.charUV = null;
    // tslint:disable:max-line-length
    cfg.width = cfg.height = cfg.textWidth = cfg.textHeight = cfg.offsetX = cfg.offsetY = cfg.textWidth = cfg.offsetHeight = cfg.offsetY = cfg.offsetY = 0;
};
// 获得对应的字符串键
// tslint:disable:no-reserved-keywords
exports.getImgTextKey = function (cfg, type) {
    // let key = cfg.key;
    var key = void 0;
    type = type || exports.RES_TYPE_IMGTEXT;
    // if (key)
    // 	return type + ":" +key;
    if (!cfg.fontCfg) {
        cfg.fontCfg = exports.parseFont(cfg.font);
    }
    // tslint:disable:prefer-template
    cfg.key = key = cfg.text + '| ' + cfg.fontCfg.font + '| ' + colorString(cfg.color) + '| ' + shadowString(cfg.shadow) + '| ' + (cfg.strokeWidth || 1) + '| ' + colorString(cfg.strokeColor) + '| ' + colorString(cfg.background) + '|' + (cfg.isPowerOfTwo ? true : false);
    return type + ':' + key;
};
/**
 * @description 解析字体配置，同css font的字体简写， 字体字符串中必须有size和family属性
 * @example
 */
exports.parseFont = function (str) {
    var arr = str.split(' ');
    var i = arr.length - 1;
    var cfg = {
        style: 'normal',
        weight: 400,
        size: 24,
        face: 'arial,serif',
        font: ''
    };
    if (i >= 0) {
        cfg.face = arr[i--];
    }
    if (i >= 0) {
        var size = parseInt(arr[i--], 10);
        if (size) {
            cfg.size = size;
        }
    }
    if (i >= 0) {
        var s = arr[i--];
        var weight = parseInt(s, 10);
        if (!weight) {
            weight = WeightNumber[s];
        }
        if (weight) {
            cfg.weight = weight;
        }
    }
    if (i >= 0) {
        cfg.style = arr[i];
    }
    cfg.font = cfg.style + ' ' + cfg.weight + ' ' + cfg.size + 'px ' + cfg.face;
    return cfg;
};
/**
 * @description 计算绘制文字的参数，宽度、偏移量
 * @example
 */
exports.calcText = function (cfg) {
    if (cfg.isPowerOfTwo === true && cfg.width !== undefined && !math_1.isPowerOfTwo(cfg.width)) {
        throw new Error('Not a power of 2, width: ' + cfg.width);
    }
    var ctx = initWidth(cfg);
    var arr = cfg.text.split('');
    var v = cfg.lineHeight;
    var u = 0;
    var h = 0;
    var uv = {};
    var totalW = 0;
    var currW = 0;
    var halfSpace = cfg.space;
    exports.calcOffset(cfg); // 计算描边阴影的像素
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

        var _v = _ref;

        totalW += ctx.measureText(_v).width * cfg.factor + cfg.offsetWidth + cfg.space;
    }
    totalW -= cfg.space;
    if (cfg.width === undefined) {
        var tw = cfg.isPowerOfTwo ? math_1.nextPowerOfTwo(Math.ceil(totalW)) : Math.ceil(totalW);
        cfg.width = Math.min(tw, imgLimitWidth);
    }
    // 每次换行时，重置u
    var resetStart = function resetStart() {
        if (cfg.isCommon || totalW - currW >= cfg.width || !cfg.textAlign || cfg.textAlign === 'left') {
            u = 0;
        } else if (cfg.textAlign === 'center') {
            u = (cfg.width - (totalW - currW)) / 2;
        } else if (cfg.textAlign === 'right') {
            u = cfg.width - (totalW - currW) - 1;
        }
        v += h;
    };
    resetStart();
    // 计算uv
    var calc = function calc() {
        var w = void 0;
        var index = 0;
        h = (cfg.fontCfg.size + cfg.offsetHeight) * cfg.hfactor + cfg.lineHeight;
        v = 0;
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

            var c = _ref2;

            w = ctx.measureText(c).width * cfg.factor + cfg.offsetWidth + cfg.space;
            if (u + w - halfSpace > cfg.width) {
                resetStart();
            }
            if (cfg.isCommon) {
                if (uv[c]) {
                    continue;
                }
                uv[c] = { u1: u, v1: v, u2: u + w, v2: v + h };
            } else {
                uv[index] = { u1: u, v1: v, u2: u + w, v2: v + h };
            }
            u += w;
            currW += w;
            index++;
        }
    };
    calc();
    cfg.textHeight = Math.ceil(v + h - cfg.lineHeight);
    cfg.textWidth = v ? cfg.width : totalW;
    cfg.totalW = totalW;
    if (isErgodicDraw(cfg)) {
        cfg.chars = arr;
        cfg.charUV = uv;
    }
    if (cfg.isPowerOfTwo) {
        cfg.height = math_1.nextPowerOfTwo(cfg.textHeight);
        return;
    }
    cfg.height = Math.ceil(cfg.textHeight);
};
/**
 * @description 计算勾边宽度和阴影设置所影响的偏移量和宽高
 * @example
 */
exports.calcOffset = function (cfg) {
    cfg.offsetX = 0;
    cfg.offsetY = 0;
    cfg.offsetWidth = 0;
    cfg.offsetHeight = 0;
    if (cfg.strokeColor) {
        var width = cfg.strokeWidth;
        cfg.offsetX += width;
        cfg.offsetWidth += width + width;
        cfg.offsetY += width;
        cfg.offsetHeight += width + width;
    }
    var shadow = cfg.shadow;
    if (shadow) {
        var blur = shadow.blur > cfg.maxBlur ? cfg.maxBlur : shadow.blur;
        cfg.offsetX += Math.max(0, blur - shadow.offsetX);
        cfg.offsetWidth += blur * 2;
        cfg.offsetY += Math.max(0, blur - shadow.offsetY);
        cfg.offsetHeight += blur * 2;
    }
};
/**
 * @description 初始化字体配置
 * @example
 */
exports.initTextCfg = function (cfg) {
    var zoomfactor = cfg.zoomfactor ? cfg.zoomfactor : 1;
    var arr = cfg.font.split(' ');
    var i = arr.length - 2;
    if (i >= 0) {
        var size = parseInt(arr[i], 10);
        if (arr[i]) {
            arr[i] = (size * zoomfactor).toString() + 'px';
        }
    }
    var font = arr.join(' ');
    var shadow = cfg.shadow;
    var textcfg = {
        text: cfg.text,
        font: font,
        color: cfg.color,
        shadow: shadow ? {
            offsetX: cfg.shadow.offsetX ? cfg.shadow.offsetX * zoomfactor : cfg.shadow.offsetX,
            offsetY: cfg.shadow.offsetY ? cfg.shadow.offsetY * zoomfactor : cfg.shadow.offsetY,
            blur: cfg.shadow.blur ? cfg.shadow.blur * zoomfactor : cfg.shadow.blur,
            color: cfg.shadow.color
        } : undefined,
        strokeWidth: cfg.strokeWidth ? cfg.strokeWidth * zoomfactor : 1,
        strokeColor: cfg.strokeColor,
        background: cfg.background,
        isCommon: cfg.isCommon,
        space: cfg.space ? cfg.space * zoomfactor : 0,
        lineHeight: cfg.lineHeight ? cfg.lineHeight * zoomfactor : 0,
        textAlign: cfg.textAlign,
        isPowerOfTwo: cfg.isPowerOfTwo,
        factor: cfg.factor ? cfg.factor : 1,
        hfactor: cfg.hfactor ? cfg.hfactor : 1,
        zoomfactor: zoomfactor,
        width: cfg.width ? cfg.width * zoomfactor : cfg.width,
        maxBlur: zoomfactor * 10,
        key: cfg.key
    };
    imgLimitWidth = zoomfactor * 512;
    return textcfg;
};
/**
 * @description 绘制文字
 * @example
 */
exports.drawText = function (textcfg) {
    var cfg = exports.initTextCfg(textcfg);
    var canvas = document.createElement('canvas');
    exports.calcText(cfg);
    canvas.width = cfg.width;
    canvas.height = cfg.height;
    var ctx = canvas.getContext('2d');
    ctx.font = cfg.fontCfg.font;
    ctx.textBaseline = 'top';
    if (cfg.background) {
        ctx.fillStyle = getStyle(ctx, cfg.background, 0, 0, cfg.width, cfg.height);
        ctx.fillRect(0, 0, cfg.width, cfg.height);
    }
    if (cfg.strokeColor) {
        ctx.save();
        setShadow(ctx, cfg.shadow);
        ctx.lineWidth = cfg.strokeWidth;
        ctx.strokeStyle = getStyle(ctx, cfg.strokeColor, 0, 0, cfg.width, cfg.height);
        if (isErgodicDraw(cfg)) {
            var arr = cfg.chars;
            if (util_1.isString(ctx.strokeStyle)) {
                for (var i = 0; i < arr.length; i++) {
                    var uv = cfg.charUV[cfg.isCommon ? arr[i] : i];
                    ctx.strokeText(arr[i], cfg.offsetX + uv.u1, cfg.offsetY + uv.v1);
                }
            } else {
                for (var _i3 = 0; _i3 < arr.length; _i3++) {
                    var _uv = cfg.charUV[cfg.isCommon ? arr[_i3] : _i3];
                    ctx.strokeStyle = getStyle(ctx, cfg.strokeColor, _uv.u1, _uv.v1, _uv.u2 - _uv.u1, _uv.v2 - _uv.v1);
                    ctx.strokeText(arr[_i3], cfg.offsetX + _uv.u1, cfg.offsetY + _uv.v1);
                }
            }
        } else {
            ctx.strokeText(cfg.text, cfg.offsetX, cfg.offsetY);
        }
    }
    if (cfg.color) {
        if (!cfg.strokeColor) {
            setShadow(ctx, cfg.shadow);
        } else {
            ctx.restore();
        }
        ctx.fillStyle = getStyle(ctx, cfg.color, 0, 0, cfg.width, cfg.height);
        if (isErgodicDraw(cfg)) {
            var _arr = cfg.chars;
            if (util_1.isString(ctx.fillStyle)) {
                for (var _i4 = 0; _i4 < _arr.length; _i4++) {
                    var _uv2 = cfg.charUV[cfg.isCommon ? _arr[_i4] : _i4];
                    ctx.fillText(_arr[_i4], cfg.offsetX + _uv2.u1, cfg.offsetY + _uv2.v1);
                }
            } else {
                for (var _i5 = 0; _i5 < _arr.length; _i5++) {
                    var _uv3 = cfg.charUV[cfg.isCommon ? _arr[_i5] : _i5];
                    ctx.fillStyle = getStyle(ctx, cfg.color, _uv3.u1, _uv3.v1, _uv3.u2 - _uv3.u1, _uv3.v2 - _uv3.v1);
                    ctx.fillText(_arr[_i5], cfg.offsetX + _uv3.u1, cfg.offsetY + _uv3.v1);
                }
            }
        } else {
            ctx.fillText(cfg.text, cfg.offsetX, cfg.offsetY);
        }
    }
    return [canvas, ctx.getImageData(0, 0, cfg.width, cfg.height).data.buffer, cfg];
};
// 获得对应的图像键
exports.getImgFilterKey = function (cfg) {
    if (!cfg.file) {
        cfg.file = mod_1.butil.relativePath(cfg.img, cfg.path);
    }
    var key = exports.RES_TYPE_IMGFILTER + ':' + cfg.file;
    for (var _iterator3 = cfg.arr, _isArray3 = Array.isArray(_iterator3), _i6 = 0, _iterator3 = _isArray3 ? _iterator3 : _iterator3[Symbol.iterator]();;) {
        var _ref3;

        if (_isArray3) {
            if (_i6 >= _iterator3.length) break;
            _ref3 = _iterator3[_i6++];
        } else {
            _i6 = _iterator3.next();
            if (_i6.done) break;
            _ref3 = _i6.value;
        }

        var f = _ref3;

        key += '| ' + f.join(':');
    }
    return key;
};
/**
 * @description 绘制图片
 * @example
 */
exports.drawImg = function (img) {
    var canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    var ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    return ctx.getImageData(0, 0, img.width, img.height).data.buffer;
};
// ============================== 本地
// 图像最大宽度
var imgLimitWidth = 512;
// 字体粗细的数值
var WeightNumber = {
    lighter: 100,
    normal: 400,
    bold: 700,
    bolder: 900
};
/**
 * @description ImgTextRes资源
 * @example
 */

var ImgRes = function (_res_mgr_1$Res) {
    _inherits(ImgRes, _res_mgr_1$Res);

    function ImgRes() {
        _classCallCheck(this, ImgRes);

        return _possibleConstructorReturn(this, (ImgRes.__proto__ || Object.getPrototypeOf(ImgRes)).apply(this, arguments));
    }

    _createClass(ImgRes, [{
        key: "create",

        /**
         * @description 创建
         * @example
         */
        value: function create(data) {
            var blob = new Blob([data], { type: res_mgr_1.BlobType.png });
            this.link = URL.createObjectURL(blob);
        }
        /**
         * @description 销毁，需要子类重载
         * @example
         */

    }, {
        key: "destroy",
        value: function destroy() {
            URL.revokeObjectURL(this.link);
        }
    }]);

    return ImgRes;
}(res_mgr_1.Res);
// canvas


var canvas = void 0;
// 图像模块的名称
var imgModName = mod_1.butil.relativePath('./img', module.id);
var isErgodicDraw = function isErgodicDraw(cfg) {
    if (cfg.isCommon || cfg.space !== undefined || !cfg.textAlign && cfg.textAlign !== 'left' || cfg.totalW > cfg.width) {
        return true;
    } else {
        return false;
    }
};
// 初始化canvas方法
var init = function init() {
    if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.width = 16;
        canvas.height = 16;
    }
    return canvas.getContext('2d');
};
// 获得颜色的字符串键
var colorString = function colorString(color) {
    if (!color) {
        return '';
    }
    if (util_1.isString(color)) {
        return color;
    }
    var cfg = color;
    return cfg.x1 + 'x' + cfg.y1 + 'x' + (cfg.r1 ? cfg.r1 : '') + ' ' + cfg.x2 + 'x' + cfg.y2 + 'x' + (cfg.r2 ? cfg.r1 : '') + ' [' + cfg.steps.join() + ']';
};
// 获得阴影的字符串键
var shadowString = function shadowString(shadow) {
    if (!shadow) {
        return '';
    }
    return shadow.offsetX + 'x' + shadow.offsetY + 'x' + shadow.blur + 'x' + shadow.color;
};
// 初始化计算宽度方法
var initWidth = function initWidth(cfg) {
    var ctx = init();
    if (!cfg.fontCfg) {
        cfg.fontCfg = exports.parseFont(cfg.font);
    }
    ctx.font = cfg.fontCfg.font;
    return ctx;
};
// 获取颜色或渐变颜色
var getStyle = function getStyle(ctx, cfg, x, y, width, height) {
    if (util_1.isString(cfg)) {
        return cfg;
    }
    var x1 = cfg.x1;
    if (!Number.isInteger(x1)) {
        x1 = parseFloat(x1) * width / 100;
    }
    var y1 = cfg.y1;
    if (!Number.isInteger(y1)) {
        y1 = parseFloat(y1) * height / 100;
    }
    var x2 = cfg.x2;
    if (!Number.isInteger(x2)) {
        x2 = parseFloat(x2) * width / 100;
    }
    var y2 = cfg.y2;
    if (!Number.isInteger(y2)) {
        y2 = parseFloat(y2) * height / 100;
    }
    var g = cfg.r1 ? ctx.createRadialGradient(x + x1, y + y1, cfg.r1, x + x2, y + y2, x + cfg.r2) : ctx.createLinearGradient(x + x1, y + y1, x + x2, y + y2);
    for (var i = 0, arr = cfg.steps, n = arr.length; i < n; i += 2) {
        g.addColorStop(arr[i], arr[i + 1]);
    }
    return g;
};
// 设置阴影
var setShadow = function setShadow(ctx, cfg) {
    if (!cfg) {
        return;
    }
    ctx.shadowOffsetX = cfg.offsetX;
    ctx.shadowOffsetY = cfg.offsetY;
    ctx.shadowBlur = cfg.blur;
    ctx.shadowColor = cfg.color;
};
// 创建ImgTextRes资源
var createImgTextRes = function createImgTextRes(name, type, args, funcArgs) {
    task_mgr_1.set(function () {
        var text = exports.drawText(args);
        var ab = text[1];
        var cfg = text[2];
        client_1.request('calc', imgModName, 'png', [ab, cfg.width, cfg.height], [ab], 900, 0, function (r) {
            res_mgr_1.loadOK(name, type, cfg, ImgRes, r);
        }, function (err) {
            res_mgr_1.loadError(name, err);
        });
    }, undefined, 900, 0);
};
// 创建ImgFilterRes资源
var createImgFilterRes = function createImgFilterRes(name, type, args, resTab) {
    var file = args.file || mod_1.butil.relativePath(args.img, args.path);
    resTab.load(res_mgr_1.RES_TYPE_BLOB + ':' + file, res_mgr_1.RES_TYPE_BLOB, file, undefined, function (r) {
        var img = new Image();
        img.onload = function () {
            if (img.width < 1 || img.height < 1) {
                return res_mgr_1.loadError(name, {
                    error: 'INVALID_IMAGE',
                    reason: 'createImgFilterRes fail: ' + file
                });
            }
            task_mgr_1.set(function () {
                var ab = exports.drawImg(img);
                client_1.request('calc', imgModName, 'filter', [ab, img.width, img.height, args.arr], [ab], 900, 0, function (r) {
                    res_mgr_1.loadOK(name, type, args, ImgRes, r);
                }, function (err) {
                    res_mgr_1.loadError(name, err);
                });
            }, undefined, 900, 0);
        };
        img.src = r.link;
    });
};
// ============================== 立即执行
res_mgr_1.register(exports.RES_TYPE_IMGTEXT, createImgTextRes);
res_mgr_1.register(exports.RES_TYPE_IMGFILTER, createImgFilterRes);
})