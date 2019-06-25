/**
 * crypto utils
 */

import { H160, H256, H512 } from '../pi_pt/rust/hash_value';
import { digest, DigestAlgorithm } from '../pi_pt/rust/pi_crypto/digest';
import { sign as sign2, verify as verify2 } from '../pi_pt/rust/pi_crypto/ed25519';

export const pubKeyToAddress = (pubKey: H256): H160 => {
    // mock address
    return H160.fromBuf(new Uint8Array(20));
};

export const privKeyToAddress = (privKey: H512): H160 => {
    // mock address
    return H160.fromBuf(new Uint8Array(20));
};

export const sha256 = (data: string): Uint8Array => {
    return digest(DigestAlgorithm.SHA256, new TextEncoder().encode(data)).asSliceU8();
};

export const sign = (privKey: string, msg: string): string => {
    return sign2(new TextEncoder().encode(msg), new TextEncoder().encode(privKey)).tohex();
};

export const verify = (sig: string, pubKey: string, msg: string): boolean => {
    return verify2(new TextEncoder().encode(msg), new TextEncoder().encode(pubKey), new TextEncoder().encode(sig));
};

export const blsRand = (): H256 => {
    return;
};