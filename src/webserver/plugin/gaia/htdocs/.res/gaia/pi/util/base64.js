_$define("pi/util/base64", function (require, exports, module){
"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
/**
 * base64字符串转ArrayBuffer
 * @param base64 base64格式的字符串
 * @return ArrayBuffer
 */
exports.base64ToArrayBuffer = function (base64) {
    // tslint:disable-next-line:no-reserved-keywords
    var string = window.atob(base64);
    var bytes = new Uint8Array(string.length);
    for (var i = 0; i < string.length; i++) {
        bytes[i] = string.charCodeAt(i);
    }
    return bytes.buffer;
};
/**
 * ArrayBuffer转base64字符串
 * @return string base64格式的字符串
 */
exports.arrayBufferToBase64 = function (buffer) {
    var binary = '';
    var bytes = new Uint8Array(buffer);
    var len = bytes.length;
    for (var i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
};
})