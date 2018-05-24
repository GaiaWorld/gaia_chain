_$define("pi/util/img", function (require, exports, module){
"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
/*
 * 图像处理，一般在worker中调用
 * 提供转成png格式的ArrayBuffer的方法
 * 1、获取Image，画到画布canvas上，用getImageData 获取图像数据 RGBA 格式
 * 2、PNG存储用的RGBA格式，为了能提前扫描，png约定每行开始加一个字节的0
 * 4、用LZ77方法将RGBA格式的数组压缩，使用无压缩的LZ77压缩方法
 * 5、附加正确格式PNG24文件头输出即可包括IHEAD IHDR IDAT IEND外壳
 */
// ============================== 导入
var hash_1 = require("./hash");
// ============================== 导出
/**
 * @description 计算png图像的宽度和高度
 * @param  data 字节数组
 * @example
 */
exports.getPngSize = function (data) {
    var view = new DataView(data);
    return [view.getUint32(HEADChunk.byteLength + 8), view.getUint32(HEADChunk.byteLength + 12)];
};
/**
 * @description 转成png格式的ArrayBuffer
 * @param   data rgba格式的像素数组
 * @param   width 图片的宽度
 * @param   height 图片的高度
 * @example
 */
exports.png = function (data, width, height) {
    return toPng(new Uint8ClampedArray(data), width, height);
};
/**
 * @description 将图像按参数进行滤镜处理
 * @param   data rgba格式的像素数组
 * @param   width 图片的宽度
 * @param   height 图片的高度
 * @param   args 滤镜参数数组，每个元素都是一个数组[滤镜算法名称, 滤镜参数1, 滤镜参数2, 滤镜参数3]
 * @example
 */
exports.filter = function (data, width, height, args) {
    var u8 = new Uint8ClampedArray(data);
    for (var _iterator = args, _isArray = Array.isArray(_iterator), _i = 0, _iterator = _isArray ? _iterator : _iterator[Symbol.iterator]();;) {
        var _ref;

        if (_isArray) {
            if (_i >= _iterator.length) break;
            _ref = _iterator[_i++];
        } else {
            _i = _iterator.next();
            if (_i.done) break;
            _ref = _i.value;
        }

        var f = _ref;

        exports[f[0]](u8, width, height, f[1], f[2], f[3]);
    }
    return toPng(u8, width, height);
};
/**
 * @description 将图像gray, 灰度算法-加权平均值 (r 0.299, g 0.578, b 0.114)
 * @param   data rgba格式的像素数组
 * @param   width 图片的宽度
 * @param   height 图片的高度
 * @example
 */
exports.gray = function (data, width, height) {
    for (var i = 0, n = data.length; i < n; i += 4) {
        // tslint:disable:binary-expression-operand-order
        var gray = Math.round(0.299 * data[i] + 0.578 * data[i + 1] + 0.114 * data[i + 2]);
        data[i + 2] = data[i + 1] = data[i] = gray;
    }
};
/**
 * @description 将图像转换成hsl格式，调整色相 饱和度 亮度
 * @param   data rgba格式的像素数组
 * @param   width 图片的宽度
 * @param   height 图片的高度
 * @param   hue 色相, [0, 360]之间, 可选, 默认为 180
 * @param   saturate 饱和度, 正数, 可选, 默认为 1
 * @param   lightness 亮度, 正数, 可选, 默认为 1
 * @example
 */
exports.hsl = function (data, width, height, hue, saturate, lightness) {
    hue = hue || 180;
    saturate = saturate || 1;
    lightness = lightness || 1;
    for (var i = 0, n = data.length; i < n; i += 4) {
        var r = data[i] / 255;
        var g = data[i + 1] / 255;
        var b = data[i + 2] / 255;
        var max = Math.max(r, g, b);
        var min = Math.min(r, g, b);
        var h = void 0;
        var s = void 0;
        var l = (max + min) / 2; // h, s, l 范围在 [0, 1].
        if (max > min) {
            var d = max - min;
            // tslint:disable-next-line:no-constant-condition
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r:
                    h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
                    break;
                case g:
                    h = ((b - r) / d + 2) / 6;
                    break;
                case b:
                    h = ((r - g) / d + 4) / 6;
                    break;
                default:
            }
        } else {
            h = s = 0;
        }
        h += hue / 360;
        if (h > 1) {
            h -= 1;
        }
        s *= saturate;
        l *= lightness;
        if (s > 0) {
            var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            var p = 2 * l - q;
            data[i] = hueToRGB(p, q, h + 1 / 3) * 255;
            data[i + 1] = hueToRGB(p, q, h) * 255;
            data[i + 2] = hueToRGB(p, q, h - 1 / 3) * 255;
        } else {
            data[i + 2] = data[i + 1] = data[i] = l * 255;
        }
    }
};
/**
 * @description 调整亮度对比度
 * @param   data rgba格式的像素数组
 * @param   width 图片的宽度
 * @param   height 图片的高度
 * @param   brightness 亮度, [-1, 1]之间, 可选, 默认为 0
 * @param   contrast 对比度, [-1, 1]之间, 可选, 默认为 0
 * @example
 */
exports.brightnessContrast = function (data, width, height, brightness, contrast) {
    brightness = brightness || 0;
    var k = contrast ? Math.tan((45 + 44 * contrast) * Math.PI / 180) : 1;
    for (var i = 0, n = data.length; i < n; i += 4) {
        for (var j = 0; j < 3; j++) {
            data[i + j] = (data[i + j] - 127.5 * (1 - brightness)) * k + 127.5 * (1 + brightness);
        }
    }
};
/**
 * @description 腐蚀 https://github.com/AlloyTeam/AlloyImage/tree/master/src/module/filter
 * @param   data rgba格式的像素数组
 * @param   width 图片的宽度
 * @param   height 图片的高度
 * @param   radius 取样区域半径, 正数, 可选, 默认为 3.0
 * @example
 */
exports.corrode = function (data, width, height, radius) {
    radius = Math.floor(radius) || 3;
    var xLength = radius * 2 + 1;
    // 区块
    for (var x = 0; x < width; x++) {
        for (var y = 0; y < height; y++) {
            var randomI = Math.floor(Math.random() * radius * 2) - radius; // 区块随机代表
            var randomJ = Math.floor(Math.random() * radius * 2) - radius; // 区块随机代表
            var realI = y * width + x;
            var realJ = (y + randomI) * width + x + randomJ;
            for (var j = 0; j < 3; j++) {
                data[realI * 4 + j] = data[realJ * 4 + j];
            }
        }
    }
};
/**
 * @description 锐化 https://github.com/AlloyTeam/AlloyImage/tree/master/src/module/filter
 * @param   data rgba格式的像素数组
 * @param   width 图片的宽度
 * @param   height 图片的高度
 * @param   lamta 锐化值, 正数, 可选, 默认为 3.0
 * @example
 */
exports.sharp = function (data, width, height, lamta) {
    lamta = lamta || 3;
    for (var i = 0, n = data.length; i < n; i += 4) {
        var ii = i / 4;
        var row = Math.floor(ii / width);
        var col = ii % width;
        if (row === 0 || col === 0) {
            continue;
        }
        var A = ((row - 1) * width + (col - 1)) * 4;
        var B = ((row - 1) * width + col) * 4;
        var E = (ii - 1) * 4;
        for (var j = 0; j < 3; j++) {
            var delta = data[i + j] - (data[B + j] + data[E + j] + data[A + j]) / 3;
            data[i + j] += delta * lamta;
        }
    }
};
/**
 * @description 高斯模糊 https://github.com/AlloyTeam/AlloyImage/tree/master/src/module/filter
 * @param   data rgba格式的像素数组
 * @param   width 图片的宽度
 * @param   height 图片的高度
 * @param   radius 取样区域半径, 正数, 可选, 默认为 3.0
 * @param   sigma 标准方差, 可选, 默认取值为 radius / 3
 * @example
 */
exports.gaussBlur = function (data, width, height, radius, sigma) {
    var gaussMatrix = [];
    var gaussSum = 0;
    var x = void 0;
    var y = void 0;
    var r = void 0;
    var g = void 0;
    var b = void 0;
    var a = void 0;
    var i = void 0;
    var j = void 0;
    var k = void 0;
    var len = void 0;
    radius = Math.floor(radius) || 3;
    sigma = sigma || radius / 3;
    a = 1 / (Math.sqrt(2 * Math.PI) * sigma);
    b = -1 / (2 * sigma * sigma);
    gaussMatrix.length = radius + radius + 1;
    // 生成高斯矩阵
    // tslint:disable:ban-comma-operator
    for (i = 0, x = -radius; x <= radius; x++, i++) {
        g = a * Math.exp(b * x * x);
        gaussMatrix[i] = g;
        gaussSum += g;
    }
    // 归一化, 保证高斯矩阵的值在[0,1]之间
    for (i = 0, len = gaussMatrix.length; i < len; i++) {
        gaussMatrix[i] /= gaussSum;
    }
    // x 方向一维高斯运算
    for (y = 0; y < height; y++) {
        for (x = 0; x < width; x++) {
            r = g = b = a = 0;
            gaussSum = 0;
            for (j = -radius; j <= radius; j++) {
                k = x + j;
                if (k >= 0 && k < width) {
                    // r,g,b,a 四个一组
                    i = (y * width + k) * 4;
                    r += data[i] * gaussMatrix[j + radius];
                    g += data[i + 1] * gaussMatrix[j + radius];
                    b += data[i + 2] * gaussMatrix[j + radius];
                    gaussSum += gaussMatrix[j + radius];
                }
            }
            i = (y * width + x) * 4;
            // 除以 gaussSum 是为了消除处于边缘的像素, 高斯运算不足的问题
            data[i] = r / gaussSum;
            data[i + 1] = g / gaussSum;
            data[i + 2] = b / gaussSum;
        }
    }
    // y 方向一维高斯运算
    for (x = 0; x < width; x++) {
        for (y = 0; y < height; y++) {
            r = g = b = a = 0;
            gaussSum = 0;
            for (j = -radius; j <= radius; j++) {
                k = y + j;
                if (k >= 0 && k < height) {
                    i = (k * width + x) * 4;
                    r += data[i] * gaussMatrix[j + radius];
                    g += data[i + 1] * gaussMatrix[j + radius];
                    b += data[i + 2] * gaussMatrix[j + radius];
                    gaussSum += gaussMatrix[j + radius];
                }
            }
            i = (y * width + x) * 4;
            data[i] = r / gaussSum;
            data[i + 1] = g / gaussSum;
            data[i + 2] = b / gaussSum;
        }
    }
};
/**
 * @description 将图像转换成hsl格式，调整色相 饱和度 亮度
 * @param   hue 色相, [0, 360]之间, 可选, 默认为 180
 * @param   saturate 饱和度, [0, 100]之间, 正数, 可选, 默认为 100
 * @param   lightness 亮度, [0, 100]之间, 正数, 可选, 默认为 100
 * @example
 */
exports.hsl2rgb = function (h, s, l, r) {
    l = l / 100;
    if (s > 0) {
        h = h / 360;
        s = s / 100;
        var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        var p = 2 * l - q;
        r[0] = hueToRGB(p, q, h + 1 / 3) * 255;
        r[1] = hueToRGB(p, q, h) * 255;
        r[2] = hueToRGB(p, q, h - 1 / 3) * 255;
    } else {
        r[2] = r[1] = r[0] = l * 255;
    }
};
// ============================== 本地
// png Chunk信息
var HEADChunk = new Uint8ClampedArray([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
// 4字节的长度-总是13，4字节的IHDR标识，4字节的宽，4字节的高，1字节的色深Bitdepth，
// 1字节的颜色类型ColorType，1字节的压缩方法(LZ77派生算法)PNG Spec规定此处总为0（非0值为将来使用更好的压缩方法预留），1字节的过滤算法Filter，1字节的扫描算法Interlace，4字节的crc32校验码
var IHDRChunk = new Uint8ClampedArray([0, 0, 0, 0x0D, 0x49, 0x48, 0x44, 0x52, 0, 0, 0, 0, 0, 0, 0, 0, 0x08, 0x06, 0, 0, 0, 0, 0, 0, 0]);
var IDATChunkType = new Uint8ClampedArray([0x49, 0x44, 0x41, 0x54]);
var IENDChunk = new Uint8ClampedArray([0, 0, 0, 0, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82]);
/**
 * @description 转成png格式的Uint8ClampedArray
 * @param   data rgba格式的像素数组
 * @param   width 图片的宽度
 * @param   height 图片的高度
 * @example
 */
var toPng = function toPng(data, width, height) {
    var BLOCK = 32506;
    var len = height * (width * 4 + 1);
    // tslint:disable-next-line:no-constant-condition
    var blockCount = (len % BLOCK === 0 ? len / BLOCK : len / BLOCK + 1) | 0;
    var IDATChunkLength = len + 6 + blockCount * 5;
    var ab = new ArrayBuffer(HEADChunk.byteLength + IHDRChunk.byteLength + IDATChunkLength + 12 + IENDChunk.byteLength);
    var u8 = new Uint8ClampedArray(ab);
    // 写 HEAD
    u8.set(HEADChunk, 0);
    var view = new DataView(ab);
    var offset = HEADChunk.byteLength;
    // 写 IHDR
    u8.set(IHDRChunk, offset);
    view.setUint32(offset + 8, width); // 写宽度
    view.setUint32(offset + 12, height); // 写高度
    offset += IHDRChunk.byteLength;
    var crc = hash_1.getCrc32(u8, HEADChunk.byteLength + 4, offset - 4); // IHDR crc
    view.setUint32(offset - 4, crc);
    // 写 IDAT
    view.setUint32(offset, IDATChunkLength); // 写IDATChunk的长度
    u8.set(IDATChunkType, offset + 4); // 写IDATChunk的类型
    offset += 8;
    view.setUint16(offset, 0x78da); // 78da
    var result = { offset: 0, start: offset + 2, adler: 1, upStep: false };
    for (var i = 0; i < blockCount; i++) {
        var off = i * BLOCK;
        var len1 = len - off;
        if (len1 > BLOCK) {
            len1 = BLOCK;
            u8[result.start++] = 0;
        } else {
            u8[result.start++] = 1;
        }
        // 压缩块的LEN和NLEN信息
        var msb = len1 & 0xff;
        var lsb = len1 >>> 8;
        u8[result.start++] = msb;
        u8[result.start++] = lsb;
        u8[result.start++] = msb ^ 0xff;
        u8[result.start++] = lsb ^ 0xff;
        writePngData(data, u8, len1, width, result);
    }
    offset += IDATChunkLength;
    view.setUint32(offset - 4, result.adler); // IDAT adler
    crc = hash_1.getCrc32(u8, offset - IDATChunkLength - 4, offset); // IHDR crc
    view.setUint32(offset, crc);
    // 写 IEND
    u8.set(IENDChunk, offset + 4);
    return ab;
};
// Converts from the hue color space back to RGB.
var hueToRGB = function hueToRGB(p, q, t) {
    if (t < 0) {
        t += 1;
    } else if (t > 1) {
        t -= 1;
    }
    if (t < 1 / 6) {
        return p + (q - p) * 6 * t;
    }
    if (t < 1 / 2) {
        return q;
    }
    if (t < 2 / 3) {
        return p + (q - p) * (2 / 3 - t) * 6;
    }
    return p;
};
// 将imageData的数据写入png IDAT里，每行开始加一个byte 0 
var writePngData = function writePngData(src, dest, len, width, result) {
    var offset = result.offset;
    var start = result.start;
    var end = start + len;
    var w = width * 4;
    if (result.upStep) {
        dest[start++] = src[offset++];
        result.upStep = false;
    }
    while (start < end) {
        if (offset % w === 0) {
            start++;
            if (start === end) {
                result.upStep = true;
                break;
            }
        }
        dest[start++] = src[offset++];
    }
    result.adler = hash_1.adler32(dest, result.start, end, result.adler);
    result.offset = offset;
    result.start = start;
};
// ============================== 立即执行
})