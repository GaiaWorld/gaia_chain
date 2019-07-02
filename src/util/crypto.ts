/**
 * crypto utils
 */

import { H256 } from '../pi_pt/rust/hash_value';
import { digest, DigestAlgorithm } from '../pi_pt/rust/pi_crypto/digest';
import { keypair, sign as sign2, verify as verify2 } from '../pi_pt/rust/pi_crypto/ed25519';
import { genSecureRandBytes } from '../pi_pt/rust/pi_crypto/random';

export const pubKeyToAddress = (pubKey: Uint8Array): string => {
    const pubKeyHash = sha256(pubKey);
    const hex = buf2Hex(pubKeyHash);

    return buf2Hex(pubKeyHash).slice(hex.length - 40);
};

export const sha256 = (data: Uint8Array): Uint8Array => {
    return digest(DigestAlgorithm.SHA256, data).asSliceU8();
};

export const sign = (privKey: Uint8Array, msgHash: Uint8Array): Uint8Array => {
    return sign2(msgHash, privKey).take();
};

export const verify = (sig: Uint8Array, pubKey: Uint8Array, msgHash: Uint8Array): boolean => {
    return verify2(msgHash, pubKey, sig);
};

export const genKeyPairFromSeed = (seed: Uint8Array): [Uint8Array, Uint8Array] => {
    const [privKey, pubKey] = keypair(seed);

    return [privKey.take(), pubKey.take()];
};

export const blsRand = (): H256 => {
    return;
};

export const getRand = (len: number): Uint8Array => {
    return genSecureRandBytes(len).asSliceU8();
};

export const buf2Hex = (buf: Uint8Array, lowercase: boolean = true): string => {
    const H = '0123456789ABCDEF';
    const h = '0123456789abcdef';
    let s = '';
    if (lowercase) {
        // tslint:disable-next-line:no-bitwise
        buf.forEach((v: number) => { s += h[v >> 4] + h[v & 15]; });
    } else {
        // tslint:disable-next-line:no-bitwise
        buf.forEach((v: number) => { s += H[v >> 4] + H[v & 15]; });
    }

    return s;
};

export const hex2Buf = (hex: string): Uint8Array => {
    if (hex.length % 2 !== 0) {
        throw new Error('Not a hex string');
    }

    const buf = [];
    for (let i = 0; i < hex.length; i += 2) {
        const segment = hex.slice(i, i + 2);
        buf.push(parseInt(segment[0], 16) * 16 + parseInt(segment[1], 16));
    }
    
    return new Uint8Array(buf);
};

const testSignVerify = (): void => {
    const msg = 'hello';
    const msgHash = sha256(new TextEncoder().encode(msg));
    const [privKey, pubKey] = genKeyPairFromSeed(getRand(32));
    const sig = sign(privKey, msgHash);
    console.log('verify result: ', verify(sig, pubKey, msgHash));
};