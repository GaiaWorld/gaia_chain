/*
 * BLS 签名
 */

// ============================== import 

import { BN } from "../util/bn"
import { Buffer } from "../util/buffer"
import { U32, U64, U160, U256 } from "../util/number"
import { secp256k1 } from "../util/crypto"

// ============================== export

/**
 * TODO: 这是用ECDCSA来模拟bls签名，之后会用rust的bls签名库
 */
export class Bls {

    static genKeyParis(): [U256, U256] {
        let sk = secp256k1.generatePrivateKey();
        let pk = secp256k1.publicKeyCreate(sk, true);
        return [new BN(sk, 16, "le"), new BN(pk, 16, "le")];
    }

    static sign(msgHash: U256, publicKey: U256): U256 {
        let hashBuf = msgHash.toBuffer("le");
        let pubBuf = publicKey.toBuffer("le");
        let sign = secp256k1.sign(hashBuf, pubBuf);
        return new BN(sign);
    }

    static verify(msgHash: U256, publicKey: U256, sign: U256) {
        let hashBuf = msgHash.toBuffer("le");
        let pubBuf = publicKey.toBuffer("le");
        let signBuf = sign.toBuffer("le");
        return secp256k1.verify(hashBuf, signBuf, pubBuf);
    }
}