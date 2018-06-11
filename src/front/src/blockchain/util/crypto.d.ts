/**
 * Node's Buffer in Browser
 */

// =================== import 

import { Buffer } from "../util/buffer"

// =================== export 

/**
 * util for crypto
 *    + random: Bytes, Int, Range
 *    + digest: ripemd160, sha1, sha256, hash160, hash256, keccak, ect.
 *    + ECC: secp256k1
 *    + merkle tree
 */

// ================ secp256k1

export class secp256k1 {

    /**
     * Generate a private key.
     * @returns {Buffer} Private key. 32Byte
     */
    static generatePrivateKey(): Buffer;

    /**
     * Create a public key from a private key.
     * @param {Buffer} Private key 32Byte
     * @param {boolean} compress default true
     * @return {Buffer}, if compress is true, then 33Byte, else 65Byte
     */
    static publicKeyCreate(key: Buffer, compress?: boolean): Buffer;

    /**
     * Compress or decompress public key.
     * @param {Buffer} key
     */
    static publicKeyConvert(key: Buffer, compress?: boolean): Buffer;

    /**
     * ((tweak + key) % n)
     * @returns {Buffer} key
     */
    static privateKeyTweakAdd(key: Buffer, tweak: Buffer): Buffer;

    /**
     * ((g * tweak) + key)
     * @returns {Buffer} key
     */
    static publicKeyTweakAdd(key: Buffer, tweak: Buffer, compress?: boolean): Buffer;

    /**
     * Create an ecdh.
     */
    static ecdh(pub: Buffer, priv: Buffer): Buffer;

    /**
     * Validate a public key.
     * @returns {Boolean} True if buffer is a valid public key.
     */
    static publicKeyVerify(key: Buffer): boolean;

    /**
     * Validate a private key.
     * @returns {Boolean} True if buffer is a valid private key.
     */
    static privateKeyVerify(key: Buffer): boolean;

    /**
     * Sign a message.
     * @param {Buffer} msg hashed, hash256(data). 32Byte
     * @param {Buffer} key - Private key. 32Byte
     * @returns {Buffer} R/S-formatted signature. 64Byte
     */
    static sign(msg: Buffer, key: Buffer): Buffer;

    /**
     * Sign a message.
     * @param {Buffer} key - Private key. 32Byte
     * @returns {Buffer} DER-formatted signature. 71Byte
     */
    static signDER(msg: Buffer, key: Buffer): Buffer;

    /**
     * Verify a signature.
     * @param {Buffer} sig - R/S formatted. 64Byte
     * @param {Buffer} key - public key.  32Byte
     */
    static verify(msg: Buffer, sig: Buffer, key: Buffer): boolean;

    /**
     * Verify a signature.
     * @param {Buffer} sig - DER formatted. 71Byte
     */
    static verifyDER(msg: Buffer, sig: Buffer, key: Buffer): boolean;

    /**
     * Recover a public key.
     */
    static recover(msg: Buffer, sig: Buffer, compress?: boolean): Buffer;

    /**
     * Recover a public key.
     */
    static recoverDER(msg: Buffer, sigBuffer, param?: number, compress?: boolean): Buffer;

    /**
     * Convert DER signature to R/S.
     * @returns {Buffer} R/S-formatted signature.
     */
    static fromDER(sig: Buffer): Buffer;

    /**
     * Convert R/S signature to DER.
     * @returns {Buffer} DER-formatted signature.
     */
    static toDER(sig: Buffer): Buffer;

    /**
     * Test whether a signature has a low S value.
     * @param {Buffer} sig
     * @returns {Boolean}
     */
    static isLowS(sig: Buffer): boolean;

    /**
     * Test whether a signature has a low S value.
     */
    static isLowDER(sig: Buffer): boolean;
}

// ================ random

/**
 * Generate pseudo-random bytes.
 */
export declare function randomBytes(size: number): Buffer;

/**
 * Generate a random uint32.
 * Probably more cryptographically sound than Math.random()
 */
export declare function randomInt(): number;

/**
 * Generate a random number within a range.
 * Probably more cryptographically sound than
 * `Math.random()`.
 * @param {Number} min - Inclusive.
 * @param {Number} max - Exclusive.
 * @returns {Number}
 */
export declare function randomRange(min: number, max: number): number;


// ================ digest 

/**
 * Hash with ripemd160.
 */
export declare function ripemd160(data: Buffer): Buffer;

/**
 * Hash with sha1.
 */
export declare function sha1(data: Buffer): Buffer;

/**
 * Hash with sha256.
 */
export declare function sha256(data: Buffer): Buffer;

/**
 * Hash with sha512.
 */
export declare function sha512(data: Buffer): Buffer;

/**
 * Hash with sha256 and ripemd160 (OP_HASH160).
 */
export declare function hash160(data: Buffer): Buffer;

/**
 * Hash with sha256 twice (OP_HASH256).
 */
export declare function hash256(data: Buffer): Buffer;

/**
 * Hash with keccak.
 */
export declare function keccak(data: Buffer, bits?): Buffer;

/**
 * Hash with sha3.
 */
export declare function sha3(data: Buffer, bits?): Buffer;

/**
 * Hash with blake2b.
 */
export declare function blake2b(data: Buffer, bits?, key?: Buffer): Buffer;

/**
 * Hash with chosen algorithm.
 */
export declare function hash(alg: String, ...args: any[]): Buffer;

/**
 * Create an HMAC.
 */
export declare function hmac(alg: String, ...args: any[]): Buffer;


// ================ merkle

/**
 * merkle trees
 */
export class merkle {

    /**
     * Build a merkle tree from leaves.
     * Note that this will mutate the `leaves` array!
     * @returns {Array} [nodes, malleated]
     */
    static createTree(alg: any, leaves: Buffer[]): [Buffer, boolean];

    /**
     * Calculate merkle root from leaves.
     * @returns {Array} [root, malleated]
     */
    static createRoot(alg: any, leaves: Buffer[]): [Buffer, boolean];

    /**
     * Collect a merkle branch from vector index.
     * @returns {Buffer[]} branch
     */
    static createBranch(alg: any, index: number, leaves: Buffer[]): Buffer[];

    /**
     * Derive merkle root from branch.
     * @returns {Buffer} root
     */
    static deriveRoot(alg: any, hash: Buffer, branch: Buffer[], index: number): Buffer;
}
