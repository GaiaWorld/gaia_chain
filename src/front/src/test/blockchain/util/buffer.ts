declare const it, describe;

import {chai} from "../../framework/chai"
import { Buffer } from "../../../blockchain/util/buffer"

export default () => {
    describe('util/buffer', function () {
        describe('string', function () {
            it('1', function () {
                var text = 'abc';
                var buf = new Buffer(text);
                chai.assert.equal(text, buf.toString());
            });
        });
    });
}