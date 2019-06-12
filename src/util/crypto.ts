/**
 * crypto utils
 */

import { H160, H256, H512 } from '../pi_pt/rust/hash_value';

export const pubKeyToAddress = (pubKey: H256): H160 => {
    // mock address
    return H160.fromBuf(new Uint8Array(20));
};

export const privKeyToAddress = (privKey: H512): H160 => {
    // mock address
    return H160.fromBuf(new Uint8Array(20));
};

export const sha256 = (data: string): H256 => {
    // mock
    return H256.fromBuf(new Uint8Array(32));
};

export const sign = (privKey: H256, msg: string): H256 => {
    return;
};

export const verify = (pubKey: H512, msg: string): boolean => {
    return true;
};