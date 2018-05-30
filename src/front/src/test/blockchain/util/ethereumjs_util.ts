declare const it, describe;

import {chai} from "../../framework/chai"
import {keccak} from "../../../blockchain/util/ethereumjs_util"

export default () => {
    describe('util/ethereumjs_util', function () {
        describe('keccak', function () {
            it('1', function () {
                var msg = '0x3c9229289a6125f7fdf1885a77bb12c37a8d3b4962d936f7e3084dece32a3ca1'
                var r = '82ff40c0a986c6a5cfad4ddf4c3aa6996f1a7837f9c398e17e5de5cbd5a12b28'
                var hash = keccak(msg);
                chai.assert.equal(hash.toString('hex'), r)
            });
        });
    });
}