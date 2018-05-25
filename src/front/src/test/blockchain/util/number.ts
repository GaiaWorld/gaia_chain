declare const it, describe;

import {chai} from "../../framework/chai"

export default () => {
    describe('util/number', function () {
        describe('U32()', function () {
            it('test', function () {
                chai.assert.equal([1, 2, 3].indexOf(4), -1);
            });
        });
    });
}