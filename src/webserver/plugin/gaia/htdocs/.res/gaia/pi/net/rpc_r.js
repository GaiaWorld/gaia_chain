_$define("pi/net/rpc_r", function (require, exports, module){
"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

Object.defineProperty(exports, "__esModule", { value: true });
var struct_mgr_1 = require("../../../pi/struct/struct_mgr");

var OK = function (_struct_mgr_1$Struct) {
    _inherits(OK, _struct_mgr_1$Struct);

    function OK() {
        _classCallCheck(this, OK);

        return _possibleConstructorReturn(this, (OK.__proto__ || Object.getPrototypeOf(OK)).apply(this, arguments));
    }

    _createClass(OK, [{
        key: "addMeta",
        value: function addMeta(mgr) {
            if (this._$meta) return;
            struct_mgr_1.addToMeta(mgr, this);
        }
    }, {
        key: "removeMeta",
        value: function removeMeta() {
            struct_mgr_1.removeFromMeta(this);
        }
    }, {
        key: "copy",
        value: function copy(o) {
            return this;
        }
    }, {
        key: "clone",
        value: function clone() {
            return new OK().copy(this);
        }
    }, {
        key: "binDecode",
        value: function binDecode(bb, next) {}
    }, {
        key: "binEncode",
        value: function binEncode(bb, next) {
            var temp = void 0;
        }
    }]);

    return OK;
}(struct_mgr_1.Struct);

exports.OK = OK;
OK._$info = {
    nameHash: 2103275166,
    annotate: { "type": "rpc" },
    fields: {}
};

var OK_I = function (_struct_mgr_1$Struct2) {
    _inherits(OK_I, _struct_mgr_1$Struct2);

    function OK_I() {
        _classCallCheck(this, OK_I);

        return _possibleConstructorReturn(this, (OK_I.__proto__ || Object.getPrototypeOf(OK_I)).apply(this, arguments));
    }

    _createClass(OK_I, [{
        key: "addMeta",
        value: function addMeta(mgr) {
            if (this._$meta) return;
            struct_mgr_1.addToMeta(mgr, this);
        }
    }, {
        key: "removeMeta",
        value: function removeMeta() {
            struct_mgr_1.removeFromMeta(this);
        }
    }, {
        key: "setValue",
        value: function setValue(value) {
            var old = this.value;
            this.value = value;
        }
    }, {
        key: "copy",
        value: function copy(o) {
            this.value = o.value;
            return this;
        }
    }, {
        key: "clone",
        value: function clone() {
            return new OK_I().copy(this);
        }
    }, {
        key: "binDecode",
        value: function binDecode(bb, next) {
            this.value = bb.read();
        }
    }, {
        key: "binEncode",
        value: function binEncode(bb, next) {
            var temp = void 0;
            if (this.value === null || this.value === undefined) bb.writeNil();else {
                bb.writeInt(this.value);
            }
        }
    }]);

    return OK_I;
}(struct_mgr_1.Struct);

exports.OK_I = OK_I;
OK_I._$info = {
    nameHash: 3598563122,
    annotate: { "type": "rpc" },
    fields: { value: { "name": "value", "type": { "type": "i32" } } }
};

var OK_S = function (_struct_mgr_1$Struct3) {
    _inherits(OK_S, _struct_mgr_1$Struct3);

    function OK_S() {
        _classCallCheck(this, OK_S);

        return _possibleConstructorReturn(this, (OK_S.__proto__ || Object.getPrototypeOf(OK_S)).apply(this, arguments));
    }

    _createClass(OK_S, [{
        key: "addMeta",
        value: function addMeta(mgr) {
            if (this._$meta) return;
            struct_mgr_1.addToMeta(mgr, this);
        }
    }, {
        key: "removeMeta",
        value: function removeMeta() {
            struct_mgr_1.removeFromMeta(this);
        }
    }, {
        key: "setValue",
        value: function setValue(value) {
            var old = this.value;
            this.value = value;
        }
    }, {
        key: "copy",
        value: function copy(o) {
            this.value = o.value;
            return this;
        }
    }, {
        key: "clone",
        value: function clone() {
            return new OK_S().copy(this);
        }
    }, {
        key: "binDecode",
        value: function binDecode(bb, next) {
            this.value = bb.read();
        }
    }, {
        key: "binEncode",
        value: function binEncode(bb, next) {
            var temp = void 0;
            if (this.value === null || this.value === undefined) bb.writeNil();else {
                bb.writeUtf8(this.value);
            }
        }
    }]);

    return OK_S;
}(struct_mgr_1.Struct);

exports.OK_S = OK_S;
OK_S._$info = {
    nameHash: 2852573932,
    annotate: { "type": "rpc" },
    fields: { value: { "name": "value", "type": { "type": "str" } } }
};

var Error = function (_struct_mgr_1$Struct4) {
    _inherits(Error, _struct_mgr_1$Struct4);

    function Error() {
        _classCallCheck(this, Error);

        return _possibleConstructorReturn(this, (Error.__proto__ || Object.getPrototypeOf(Error)).apply(this, arguments));
    }

    _createClass(Error, [{
        key: "addMeta",
        value: function addMeta(mgr) {
            if (this._$meta) return;
            struct_mgr_1.addToMeta(mgr, this);
        }
    }, {
        key: "removeMeta",
        value: function removeMeta() {
            struct_mgr_1.removeFromMeta(this);
        }
    }, {
        key: "setCode",
        value: function setCode(value) {
            var old = this.code;
            this.code = value;
        }
    }, {
        key: "setInfo",
        value: function setInfo(value) {
            var old = this.info;
            this.info = value;
        }
    }, {
        key: "copy",
        value: function copy(o) {
            this.code = o.code;
            this.info = o.info;
            return this;
        }
    }, {
        key: "clone",
        value: function clone() {
            return new Error().copy(this);
        }
    }, {
        key: "binDecode",
        value: function binDecode(bb, next) {
            this.code = bb.read();
            this.info = bb.read();
        }
    }, {
        key: "binEncode",
        value: function binEncode(bb, next) {
            var temp = void 0;
            if (this.code === null || this.code === undefined) bb.writeNil();else {
                bb.writeInt(this.code);
            }
            if (this.info === null || this.info === undefined) bb.writeNil();else {
                bb.writeUtf8(this.info);
            }
        }
    }]);

    return Error;
}(struct_mgr_1.Struct);

exports.Error = Error;
Error._$info = {
    nameHash: 79074689,
    annotate: { "type": "rpc" },
    fields: { code: { "name": "code", "type": { "type": "i32" } }, info: { "name": "info", "type": { "type": "str" } } }
};

var Req = function (_struct_mgr_1$Struct5) {
    _inherits(Req, _struct_mgr_1$Struct5);

    function Req() {
        _classCallCheck(this, Req);

        return _possibleConstructorReturn(this, (Req.__proto__ || Object.getPrototypeOf(Req)).apply(this, arguments));
    }

    _createClass(Req, [{
        key: "addMeta",
        value: function addMeta(mgr) {
            if (this._$meta) return;
            struct_mgr_1.addToMeta(mgr, this);
        }
    }, {
        key: "removeMeta",
        value: function removeMeta() {
            struct_mgr_1.removeFromMeta(this);
        }
    }, {
        key: "setPath",
        value: function setPath(value) {
            var old = this.path;
            this.path = value;
        }
    }, {
        key: "copy",
        value: function copy(o) {
            this.path = o.path;
            return this;
        }
    }, {
        key: "clone",
        value: function clone() {
            return new Req().copy(this);
        }
    }, {
        key: "binDecode",
        value: function binDecode(bb, next) {
            this.path = bb.read();
        }
    }, {
        key: "binEncode",
        value: function binEncode(bb, next) {
            var temp = void 0;
            if (this.path === null || this.path === undefined) bb.writeNil();else {
                bb.writeUtf8(this.path);
            }
        }
    }]);

    return Req;
}(struct_mgr_1.Struct);

exports.Req = Req;
Req._$info = {
    nameHash: 2040004017,
    annotate: { "type": "rpc" },
    fields: { path: { "name": "path", "type": { "type": "str" } } }
};
})