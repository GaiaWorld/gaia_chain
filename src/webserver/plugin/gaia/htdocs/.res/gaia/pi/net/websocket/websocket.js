_$define("pi/net/websocket/websocket", function (require, exports, module){
"use strict";
/**
 * websocket通信
 */

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

Object.defineProperty(exports, "__esModule", { value: true });
var protocol_block_1 = require("./protocol_block");
var util_1 = require("./util");
var WEB_CONNECT_STATE = {
    SEND_TYPE: 'send',
    RETURN_OK_TYPE: 'r_ok',
    VERIFY_TYPE: 'verify',
    CLOSE_STATE: 'close',
    READY_STATE: 'ready',
    OPEN_STATE: 'open'
};
var swapBigLittle32 = function swapBigLittle32(i) {
    return (i & 0xff000000) >>> 24 | (i & 0xff0000) >> 8 | (i & 0xff00) << 8 | (i & 0xff) << 24;
};
var timeoutFunc = function timeoutFunc(rwait, rid, callback, con) {
    return function () {
        delete rwait[rid];
        callback({
            error: -69,
            reason: 'timeout',
            con: con
        });
    };
};
var send = function send(ws, msg, rId, sendType, cfg) {
    // 判定2进制数据
    var conMsg = void 0;
    var key = void 0;
    var temp = {};
    var encryption = void 0;
    if (sendType === 'string') {
        // tslint:disable:prefer-template
        conMsg = msg.type + '?=' + rId;
        for (key in msg.param) {
            if (msg.param.hasOwnProperty(key)) {
                conMsg += '&' + key + '=' + msg.param[key];
            }
        }
    } else {
        msg.param[''] = rId;
        temp.encode = cfg.encode; // 加密
        temp.verify = cfg.verify; // 校验
        temp.encodeNum = cfg.encodeNum || 6;
        temp.deflate = cfg.deflate; // 压缩
        if (temp.xxtea) {
            encryption = ws.getEncodeEncryption();
            conMsg = protocol_block_1.encode(msg, encryption, temp);
            if (conMsg !== false) {
                ws.setEncodeEncryption(encryption);
            }
        } else {
            conMsg = protocol_block_1.encode(msg, null, temp);
        }
    }
    ws.sendMsg(conMsg);
};

var PiWebSocket = function () {
    function PiWebSocket() {
        _classCallCheck(this, PiWebSocket);

        this.mStatus = WEB_CONNECT_STATE.CLOSE_STATE;
    }

    _createClass(PiWebSocket, [{
        key: "setReceiveCB",
        value: function setReceiveCB(cb) {
            this.mReceiveCB = cb;
        }
        // tslint:disable-next-line:typedef

    }, {
        key: "open",
        value: function open(url, cfg, timeout) {
            var _this = this;

            var domain = void 0;
            var con = {};
            var rid = 1;
            var rwait = {};
            var ws = void 0;
            var isActive = false;
            con.getUrl = function () {
                return url;
            };
            // 判断连接是否活动
            con.setActive = function (iIsActive) {
                isActive = iIsActive;
            };
            // 判断连接是否活动
            con.isActive = function () {
                return isActive;
            };
            // 获得连接的活动时间（最后一次的接收时间）
            con.getActiveTime = function () {
                // TODO
                return con.activeTime;
            };
            // 发送请求，等待回应
            con.request = function (msg, callback, timeout, sendType) {
                if (isActive) {
                    // tslint:disable-next-line:no-string-based-set-timeout
                    rwait[rid] = [callback, setTimeout(timeoutFunc(rwait, rid, callback, con), timeout)];
                    return send(ws, msg, rid++, sendType, cfg);
                }
            };
            con.fireRequest = function (msg) {
                var rid = void 0;
                var arr = void 0;
                var param = msg.param;
                rid = param[''];
                if (rid) {
                    arr = rwait[rid];
                    if (arr) {
                        if (msg.type === 'r_err') {
                            param.error = 'r_err';
                        }
                        clearTimeout(arr[1]);
                        delete rwait[rid];
                        arr[0](msg.param);
                        return;
                    }
                }
                console.log('invalid msg, rid not found! ' + rid + ', param:' + param);
            };
            // 发送数据
            // todo 目前传输的结果是尽量采用同步发送，异步发送可能导致数据错误
            // todo chrome浏览器只支持一次发送65000byte以内的数据，而Firefox则支持921600byte以内的数据
            con.send = function (msg, sendType) {
                if (isActive) {
                    return send(ws, msg, rid++, sendType, cfg);
                }
            };
            // 发送数据
            con.close = function (reason) {
                ws.close();
            };
            con.getStatus = function () {
                return ws.getStatus();
            };
            con.openTimeout = setTimeout(function () {
                con.openTimeout = undefined;
                con.close();
                _this.mReceiveCB({
                    type: 'open',
                    url: url,
                    con: {
                        error: -69,
                        reason: 'timeout url:' + url
                    }
                });
            }, timeout);
            domain = util_1.parseUrl(url)[0];
            // 无效的url
            // 创建连接对象失败
            // 连接失败
            // 创建一个连接内部对象
            ws = this.create(url, con, cfg);
        }
        // tslint:disable-next-line:typedef
        // tslint:disable-next-line:max-func-body-length

    }, {
        key: "create",
        value: function create(url, con, cfg) {
            var _this2 = this;

            var ws = new WebSocket(url);
            var openOk = void 0;
            if (cfg.encode !== undefined) {
                this.mEncode = cfg.encode;
            }
            openOk = function openOk() {
                _this2.mReceiveCB({
                    type: 'open',
                    url: url,
                    con: con
                });
            };
            ws.binaryType = 'arraybuffer';
            ws.onopen = function () {
                console.log('websocket connected');
                var r = con.openTimeout;
                if (r) {
                    con.openTimeout = undefined;
                    clearTimeout(r);
                }
                con.setActive(true);
                if (_this2.mEncode) {
                    _this2.mStatus = WEB_CONNECT_STATE.READY_STATE;
                } else {
                    _this2.mStatus = WEB_CONNECT_STATE.OPEN_STATE;
                    openOk();
                }
            };
            /**
             * 后台发送(回调)的方法
             * 参数 evt.data：
             *  r_ok--回调成功
             *  send--后台主动发送的
             */
            ws.onmessage = function (evt) {
                var msg = void 0;
                var b = void 0;
                var preEncode = void 0;
                var preDecode = void 0;
                var newEncryption = void 0;
                var checkMsg = function checkMsg(iData) {
                    var iData1 = void 0;
                    var iData2 = void 0;
                    var rm = void 0;
                    var i = void 0;
                    var iData3 = void 0;
                    iData1 = iData.split('?');
                    iData2 = iData1[1].split('&');
                    rm = {};
                    for (i = 0; i < iData2.length; i++) {
                        iData3 = iData2[i].split('=');
                        if (iData3.length === 2) {
                            rm[iData3[0]] = iData3[1];
                        }
                    }
                    console.log(iData);
                    return {
                        type: iData1[0],
                        param: rm
                    };
                };
                if (util_1.isString(evt.data)) {
                    msg = checkMsg(evt.data);
                } else if (_this2.mStatus === WEB_CONNECT_STATE.READY_STATE) {
                    msg = {};
                    msg.type = WEB_CONNECT_STATE.VERIFY_TYPE;
                    b = new Uint32Array(evt.data);
                    preEncode = swapBigLittle32(b[0]);
                    preDecode = swapBigLittle32(b[1]);
                    _this2.encodeEncryption = protocol_block_1.getEncryption(preEncode);
                    _this2.decodeEncryption = protocol_block_1.getEncryption(preDecode);
                } else if (_this2.mStatus === WEB_CONNECT_STATE.OPEN_STATE) {
                    msg = {};
                    // b = new Uint8Array(evt.data);
                    // console.log(b)
                    if (_this2.mEncode) {
                        newEncryption = protocol_block_1.nextEncryption(_this2.decodeEncryption);
                    }
                    msg = protocol_block_1.decode(evt.data, newEncryption, cfg.encodeNum || 6);
                    if (msg !== false) {
                        _this2.decodeEncryption = newEncryption;
                    }
                }
                if (msg.type === WEB_CONNECT_STATE.SEND_TYPE) {
                    console.log(msg.param);
                    // TODO 后台向前台推数据
                } else if (msg.type === WEB_CONNECT_STATE.VERIFY_TYPE) {
                    _this2.mStatus = WEB_CONNECT_STATE.OPEN_STATE;
                    openOk();
                    console.log('preEncode=' + preEncode + ',preDecode=' + preDecode);
                } else if (msg.type === 'r_ok' || msg.type === 'r_err') {
                    con.fireRequest(msg);
                } else {
                    _this2.mReceiveCB({
                        type: 'read',
                        con: con,
                        msg: msg
                    });
                }
            };
            ws.onclose = function (evt) {
                console.log('websocket closed');
                _this2.mStatus = WEB_CONNECT_STATE.CLOSE_STATE;
                _this2.mReceiveCB({
                    type: 'closed',
                    reason: evt,
                    url: url,
                    con: con
                });
            };
            ws.onerror = function (error) {
                console.log('websocket error : ' + JSON.stringify(error));
            };
            ws.getEncodeEncryption = function () {
                return protocol_block_1.nextEncryption(_this2.encodeEncryption);
            };
            ws.setEncodeEncryption = function (encryption) {
                _this2.encodeEncryption = encryption;
            };
            ws.sendMsg = function (conMsg) {
                if (_this2.mStatus !== WEB_CONNECT_STATE.CLOSE_STATE) {
                    ws.send(conMsg);
                }
            };
            ws.getStatus = function () {
                return _this2.mStatus;
            };
            return ws;
        }
    }]);

    return PiWebSocket;
}();

exports.PiWebSocket = PiWebSocket;
})