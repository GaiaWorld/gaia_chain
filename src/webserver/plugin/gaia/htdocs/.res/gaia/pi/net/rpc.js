_$define("pi/net/rpc", function (require, exports, module){
"use strict";
/**
 * RPC， 远程方法调用
 * 采用 mqtt上定义的每会话的$req和$resp主题，来发送请求和接受响应
 */

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

Object.defineProperty(exports, "__esModule", { value: true });
var util_1 = require("../struct/util");
var bin_1 = require("../util/bin");
/**
 * 创建一个RPC函数
 * @example
 */
exports.create = function (client, mgr) {
    var mqttRpc = new MqttRpc(client, mgr);
    client.subscribe('$resp/#');
    client.onMessage(function (topic, payload) {
        if (topic.indexOf('$resp/') >= 0) {
            var bb = new bin_1.BinBuffer(payload, 0, payload.length);
            var rid = bb.readU32(); // 消息开始表示此次请求的id
            if (mqttRpc.wait[rid]) {
                mqttRpc.wait[rid](bb.read(util_1.getAllReadNext(mgr)));
                delete mqttRpc.wait[rid];
            }
        }
    });
    return function (req, callback) {
        mqttRpc.call(req, callback);
    };
};

var MqttRpc = function () {
    function MqttRpc(client, mgr) {
        _classCallCheck(this, MqttRpc);

        this.rid = 1;
        this.wait = {};
        this.client = client;
        this.mgr = mgr;
    }
    // 远程调用


    _createClass(MqttRpc, [{
        key: "call",
        value: function call(req, callback) {
            var bb = new bin_1.BinBuffer();
            this.wait[this.rid] = callback;
            bb.writeU32(this.rid++);
            this.rid >= 0xffffffff && (this.rid = 1);
            bb.writeCt(req, util_1.allWrite);
            this.client.publish("$req/" + req.constructor._$info.name, bb.getBuffer(), null);
        }
    }]);

    return MqttRpc;
}();
})