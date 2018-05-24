_$define("pi/util/cfg", function (require, exports, module){
"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

Object.defineProperty(exports, "__esModule", { value: true });

var Cfg = function () {
    function Cfg() {
        _classCallCheck(this, Cfg);

        this.map = new Map();
    }
    // tslint:disable:no-reserved-keywords


    _createClass(Cfg, [{
        key: "set",
        value: function set(key, value) {
            var _this = this;

            this.map.set(key, value);
            var annotate = value.get(0).constructor._$info.annotate;
            if (annotate && annotate.primary) {
                (function () {
                    var primarys = annotate.primary.split('-');

                    var _loop = function _loop(i) {
                        var primaryMap = new Map();
                        value.forEach(function (v, k) {
                            primaryMap.set(v[primarys[i]], v);
                        });
                        _this.map.set(key + "#" + primarys[i], primaryMap);
                    };

                    for (var i = 0; i < primarys.length; i++) {
                        _loop(i);
                    }
                })();
            }
        }
    }, {
        key: "get",
        value: function get(key) {
            return this.map.get(key);
        }
    }]);

    return Cfg;
}();

exports.Cfg = Cfg;
exports.cfgMgr = new Cfg();
})