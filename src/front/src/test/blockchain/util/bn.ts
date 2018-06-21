declare const it, describe;

import { chai } from "../../framework/chai"
import { BN } from "../../../blockchain/util/bn"

export default () => {
    describe('util/bn', function () {
        describe('add', function () {
            it('1', function () {
                let a = new BN(14);
                let b = new BN(26);
                let c = a.add(b)
                chai.assert.equal(c.toString(16), '28');
            })

            it('2', function () {
                var k = new BN(0x1234);
                var r = k;
                for (var i = 0; i < 257; i++) {
                    r = r.add(k);
                }
                chai.assert.equal(r.toString(16), '125868');
            })
        });

        describe('pow()', function () {
            it('1', function () {
              var a = new BN('ab', 16);
              var b = new BN('13', 10);
              var c = a.pow(b);
              chai.assert.equal(c.toString(16), '15963da06977df51909c9ba5b');
            });
          });
    });
}