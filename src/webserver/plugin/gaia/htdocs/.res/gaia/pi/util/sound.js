_$define("pi/util/sound", function (require, exports, module){
"use strict";
/*
 * 声音播放
 * 注意，时间单位是秒, 可以使用小数表示毫秒
 */

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

Object.defineProperty(exports, "__esModule", { value: true });
// ============================== 导入
var mod_1 = require("../lang/mod");
var log_1 = require("../util/log");
var util_1 = require("../util/util");
var res_mgr_1 = require("./res_mgr");
// ============================== 导出
exports.level = log_1.logLevel;
/**
 * @description 声音的资源类型
 * @example
 */
exports.RES_TYPE_SOUND = 'sound';
/**
 * @description 声音状态类型
 */
var StateType;
(function (StateType) {
    StateType[StateType["INIT"] = 0] = "INIT";
    StateType[StateType["READY"] = 1] = "READY";
    StateType[StateType["PLAY"] = 2] = "PLAY";
    StateType[StateType["PAUSE"] = 3] = "PAUSE"; // 暂停
})(StateType = exports.StateType || (exports.StateType = {}));
/**
 * @description 声音
 * @example
 */

var Sound = function () {
    function Sound() {
        _classCallCheck(this, Sound);

        this.res = null;
        this.src = null;
        this.volume = null;
        this.playTime = 0;
        this.pauseTime = 0;
        this.onended = null;
    }
    /**
     * @description 暂停
     * @example
     */


    _createClass(Sound, [{
        key: "getState",
        value: function getState() {
            if (!this.res) {
                return StateType.INIT;
            }
            if (this.playTime) {
                return StateType.PLAY;
            }
            if (this.pauseTime) {
                return StateType.PAUSE;
            }
            return StateType.READY;
        }
        /**
         * @description 获取声音时长
         * @example
         */

    }, {
        key: "getDuration",
        value: function getDuration() {
            if (!this.res) {
                return -1;
            }
            return this.res.link.duration;
        }
        /**
         * @description 播放声音
         * @example
         */

    }, {
        key: "play",
        value: function play(volume, delay, offset) {
            var _this = this;

            if (!this.res && this.playTime) {
                return;
            }
            var s = this.src = context.createBufferSource();
            s.buffer = this.res.link;
            this.volume = context.createGain();
            this.volume.gain.value = volume || 1;
            s.connect(this.volume);
            this.volume.connect(context.destination);
            delay = delay ? context.currentTime + delay : 0;
            offset = offset || this.pauseTime;
            s.start(delay, offset);
            this.playTime = context.currentTime + delay - offset;
            this.pauseTime = 0;
            var func = this.onended;
            if (!func) {
                return;
            }
            s.onended = function (ev) {
                _this.playTime = 0;
                if (_this.onended === func) {
                    func(_this, ev);
                }
            };
        }
        /**
         * @description 暂停
         * @example
         */

    }, {
        key: "pause",
        value: function pause() {
            if (!this.src && !this.playTime) {
                return;
            }
            this.src.stop();
            this.pauseTime = context.currentTime - this.playTime;
            if (this.pauseTime < 0) {
                this.pauseTime = 0;
            }
            this.playTime = 0;
        }
        /**
         * @description 停止
         * @example
         */

    }, {
        key: "stop",
        value: function stop() {
            if (!this.src && !this.playTime) {
                return;
            }
            this.src.stop();
            this.playTime = this.pauseTime = 0;
        }
        /**
         * @description 销毁
         * @example
         */

    }, {
        key: "destroy",
        value: function destroy() {
            if (!this.res) {
                return;
            }
            if (this.volume) {
                this.volume.disconnect();
            }
            this.res = null;
        }
    }]);

    return Sound;
}();
/**
 * @description 声音管理器
 * @example
 */


var Mgr = function (_res_mgr_1$ResTab) {
    _inherits(Mgr, _res_mgr_1$ResTab);

    function Mgr() {
        _classCallCheck(this, Mgr);

        // 当前播放的声音数组
        var _this2 = _possibleConstructorReturn(this, (Mgr.__proto__ || Object.getPrototypeOf(Mgr)).apply(this, arguments));

        _this2.arr = [];
        // 音量， 0-1之间
        _this2.volume = 1;
        return _this2;
    }
    /**
     * @description 播放指定的声音
     * @arg src 声音的文件名
     * @example
     */


    _createClass(Mgr, [{
        key: "play",
        value: function play(src, delay, repeat, repeatDelay) {
            var _this3 = this;

            if (!context) {
                return;
            }
            var name = exports.RES_TYPE_SOUND + ":" + src;
            var cfg = new Cfg();
            cfg.mgr = this;
            cfg.startTime = context.currentTime;
            cfg.delay = delay || 0;
            cfg.repeat = repeat || 0;
            cfg.repeatDelay = repeatDelay || 0;
            this.arr.push(cfg);
            return this.load(name, exports.RES_TYPE_SOUND, src, undefined, function (res) {
                if (!cfg.mgr) {
                    return _this3.delete(res);
                }
                _play(cfg, res);
            }, function (error) {
                throw new Error("play failed, src = " + src + ", error = " + error.reason);
            });
        }
        /**
         * @description 设置音量
         * @example
         */

    }, {
        key: "getVolume",
        value: function getVolume() {
            return this.volume;
        }
        /**
         * @description 设置音量
         * @example
         */

    }, {
        key: "setVolume",
        value: function setVolume(v) {
            if (v < 0) {
                v = 0;
            } else if (v > 1) {
                v = 1;
            }
            this.volume = v;
            for (var _iterator = this.arr, _isArray = Array.isArray(_iterator), _i = 0, _iterator = _isArray ? _iterator : _iterator[Symbol.iterator]();;) {
                var _ref;

                if (_isArray) {
                    if (_i >= _iterator.length) break;
                    _ref = _iterator[_i++];
                } else {
                    _i = _iterator.next();
                    if (_i.done) break;
                    _ref = _i.value;
                }

                var c = _ref;

                c.sound.volume.gain.value = v;
            }
        }
        /**
         * @description 暂停或取消暂停所有的声音
         * @example
         */

    }, {
        key: "pause",
        value: function pause(b) {
            if (b) {
                for (var _iterator2 = this.arr, _isArray2 = Array.isArray(_iterator2), _i2 = 0, _iterator2 = _isArray2 ? _iterator2 : _iterator2[Symbol.iterator]();;) {
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

                    c.sound.pause();
                }
            } else {
                for (var _iterator3 = this.arr, _isArray3 = Array.isArray(_iterator3), _i3 = 0, _iterator3 = _isArray3 ? _iterator3 : _iterator3[Symbol.iterator]();;) {
                    var _ref3;

                    if (_isArray3) {
                        if (_i3 >= _iterator3.length) break;
                        _ref3 = _iterator3[_i3++];
                    } else {
                        _i3 = _iterator3.next();
                        if (_i3.done) break;
                        _ref3 = _i3.value;
                    }

                    var _c = _ref3;

                    _c.sound.play(_c.delay);
                }
            }
        }
        /**
         * @description 停止所有的声音
         * @example
         */

    }, {
        key: "stop",
        value: function stop() {
            for (var _iterator4 = this.arr, _isArray4 = Array.isArray(_iterator4), _i4 = 0, _iterator4 = _isArray4 ? _iterator4 : _iterator4[Symbol.iterator]();;) {
                var _ref4;

                if (_isArray4) {
                    if (_i4 >= _iterator4.length) break;
                    _ref4 = _iterator4[_i4++];
                } else {
                    _i4 = _iterator4.next();
                    if (_i4.done) break;
                    _ref4 = _i4.value;
                }

                var c = _ref4;

                c.mgr = null;
                if (!c.sound) {
                    continue;
                }
                this.delete(c.sound.res);
                c.sound.destroy();
            }
            this.arr.length = 0;
        }
        /**
         * @description 释放资源表
         * @example
         */

    }, {
        key: "release",
        value: function release() {
            if (!_get(Mgr.prototype.__proto__ || Object.getPrototypeOf(Mgr.prototype), "release", this).call(this)) {
                return false;
            }
            this.stop();
            return true;
        }
    }]);

    return Mgr;
}(res_mgr_1.ResTab);

exports.Mgr = Mgr;
/**
 * @description 获得当前的音频环境
 * @example
 */
exports.getContext = function () {
    return context;
};
// ============================== 本地
// 声音配置

var Cfg = function Cfg() {
    _classCallCheck(this, Cfg);

    this.mgr = null; // null 表示被销毁
    this.sound = null;
    this.delay = 0;
    this.repeat = 0;
    this.repeatDelay = 0;
    this.startTime = 0;
};
// 播放声音


var _play = function _play(cfg, res) {
    var s = new Sound();
    s.res = res;
    cfg.sound = s;
    s.onended = function () {
        var mgr = cfg.mgr;
        if (!mgr) {
            return;
        }
        if (cfg.repeat < 1) {
            cfg.mgr = null;
            s.destroy();
            mgr.delete(res);
            return util_1.arrDrop(mgr.arr, cfg);
        }
        cfg.repeat--;
        s.play(mgr.volume, cfg.repeatDelay);
    };
    var d = cfg.delay + cfg.startTime - context.currentTime;
    s.play(cfg.mgr.volume, d > 0 ? d : 0);
};
// 解码音频
// tslint:disable:no-reserved-keywords
var decode = function decode(ab, name, type, file, construct) {
    if (ab.byteLength === 0) {
        return res_mgr_1.loadError(name, {
            error: 'SOUND_ZERO_SIZE',
            reason: "decode fail: " + file
        });
    }
    context.decodeAudioData(ab, function (buffer) {
        res_mgr_1.loadOK(name, type, file, construct, buffer);
    }, function (e) {
        res_mgr_1.loadError(name, {
            error: 'SOUND_DECODE_ERROR',
            reason: "decode fail: " + e
        });
    });
};
/**
 * @description 创建声音资源
 * @example
 */
var createSoundRes = function createSoundRes(name, type, file, fileMap, construct) {
    if (!context) {
        return res_mgr_1.loadError(name, {
            error: 'not support web audio api',
            reason: "createSoundRes fail: " + file
        });
    }
    if (fileMap) {
        var data = fileMap[file];
        if (data) {
            return decode(data, name, type, file, construct);
        }
    }
    var info = mod_1.depend.get(file);
    if (!info) {
        return res_mgr_1.loadError(name, {
            error: 'FILE_NOT_FOUND',
            reason: "createSoundRes fail: " + file
        });
    }
    var down = mod_1.load.create([info], function (r) {
        return decode(r[file], name, type, file, construct);
    }, function (err) {
        res_mgr_1.loadError(name, err);
    });
    mod_1.load.start(down);
};
// ============================== 立即执行
// 创建音频环境
var context = function () {
    var c = window.AudioContext || window.webkitAudioContext;
    if (c) {
        return new c();
    }
    console.log('not support web audio api');
}();
res_mgr_1.register(exports.RES_TYPE_SOUND, function (name, type, args, fileMap) {
    createSoundRes(name, type, args, fileMap, res_mgr_1.Res);
});
})