declare const it, describe;

import { chai } from "../../framework/chai"
import { Buffer } from "../../../blockchain/util/buffer"
import * as crypto from "../../../blockchain/util/crypto"
import { BN } from "../../../blockchain/util/bn";

let ecc = crypto.secp256k1;

export default () => {
    describe('util/crypto/random', function () {
        describe('randomBytes', function () {
            it('1', function () {
                let r = crypto.randomBytes(100);
                chai.assert.equal(r.length, 100);
            });
        });

        describe('randomInt', function () {
            it('1', function () {
                let r = crypto.randomInt();
                chai.assert.equal(typeof r, "number");
            });
        });

        describe('randomRange', function () {
            it('1', function () {
                for (let i = 0; i < 10; ++i) {
                    let num = crypto.randomRange(12, 16);
                    let r = (num >= 12 && num < 16);
                    chai.assert.equal(r, true);
                }
            });
        });
    });

    describe('util/crypto/digest', function () {
        describe('ripemd160', function () {
            it('1', function () {
                let msg = "3c9229289a6125f7fdf1885a77bb12c37a8d3b4962d936f7e3084dece32a3ca1";
                let data = new BN(msg, 16);
                let buf = data.toBuffer('be');
                let hash = crypto.ripemd160(buf);

                let r = '4bb0246cbfdfddbe605a374f1187204c896fabfd'
                chai.assert.equal(hash.toString('hex'), r)
            });
        });

        describe('keccak', function () {
            it('1', function () {
                let msg = "3c9229289a6125f7fdf1885a77bb12c37a8d3b4962d936f7e3084dece32a3ca1";
                let data = new BN(msg, 16);
                let buf = data.toBuffer('be');
                let hash = crypto.keccak(buf);

                let r = '82ff40c0a986c6a5cfad4ddf4c3aa6996f1a7837f9c398e17e5de5cbd5a12b28'
                chai.assert.equal(hash.toString('hex'), r)
            });
        });

        describe('sha256', function () {
            it('1', function () {
                let msg = "3c9229289a6125f7fdf1885a77bb12c37a8d3b4962d936f7e3084dece32a3ca1";
                let data = new BN(msg, 16);
                let buf = data.toBuffer('be');
                let hash = crypto.sha256(buf);

                let r = "58bbda5e10bc11a32d808e40f9da2161a64f00b5557762a161626afe19137445";

                chai.assert.equal(hash.toString('hex'), r);
            });
        });
    });

    describe('util/crypto/secp256k1', function () {
        describe('PrivateKey', function () {
            it('1', function () {
                let pkey = ecc.generatePrivateKey();
                chai.assert.equal(ecc.privateKeyVerify(pkey), true);
            });
        });

        describe('PublicKey', function () {
            it('1', function () {
                let priv = ecc.generatePrivateKey();
                let pub = ecc.publicKeyCreate(priv);
                chai.assert.equal(ecc.publicKeyVerify(pub), true);
                
                let pubUn = ecc.publicKeyCreate(priv, false);
                let uncompress = ecc.publicKeyConvert(pub, false);
                chai.assert.equal(uncompress.toString("hex"), pubUn.toString("hex"));

                let compress = ecc.publicKeyConvert(pubUn, true);
                chai.assert.equal(compress.toString("hex"), pub.toString("hex"));
            });
        });

        describe('sign', function () {
            it('1', function () {
                let priv = ecc.generatePrivateKey();
                let pub = ecc.publicKeyCreate(priv);

                let msg = Buffer.from("abcdefg");
                let hash = crypto.hash256(msg);
                let sign = ecc.sign(hash, priv);

                let r = ecc.verify(hash, sign, pub);
                chai.assert.equal(r, true);

                let cmp = false;
                for (let i = 0; i < 2; ++i) {
                    let recover = ecc.recover(hash, sign, i, true);
                    cmp = recover.toString("hex") == pub.toString("hex");
                    if (cmp) {
                        console.log("RS: " + i);
                        break;
                    }
                }
                chai.assert.equal(cmp, true);
            });

            it('2', function () {
                let priv = ecc.generatePrivateKey();
                let pub = ecc.publicKeyCreate(priv);

                let msg = Buffer.from("abcdefg");
                let hash = crypto.hash256(msg);
                
                let sign = ecc.signDER(hash, priv);

                let r = ecc.verifyDER(hash, sign, pub);
                chai.assert.equal(r, true);

                let cmp = false;
                for (let i = 0; i < 2; ++i) {
                    let recover = ecc.recoverDER(hash, sign, i, true);
                    cmp = recover.toString("hex") == pub.toString("hex");
                    if (cmp) {
                        console.log("DER: " + i);
                        break;
                    }
                }
                chai.assert.equal(cmp, true);
            });
        });

    });
}