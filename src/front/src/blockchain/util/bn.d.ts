/**
 * Big Number
 * https://github.com/indutny/bn.js/
 * 
 */

// =================== import 

import { Buffer } from "../util/buffer"

// =================== export 

export type Endianness = 'le' | 'be';

/**
 * BigNumber
 */
export class BN {

    /**
     * 
     * @param num default 0
     * @param base default 10
     * @param endian default "be"
     */
    constructor(num?: number | string, base?: number, endian?: Endianness);

    static isBN(num: BN): boolean;
    static max(left: BN, right: BN): BN;
    static min(left: BN, right: BN): BN;

    copy(dest: BN);
    clone(): BN;

    /**
     * Remove leading `0` from `this`
     * @return {BN} this
     */
    strip(): BN;

    /**
     * @param {number} base default 10
     * @param {number} padding default 0
     */
    toString(base?, padding?): string;

    toNumber(): number;

    /**
     * string base 16
     */
    toJSON(): string;

    toBuffer(endian: Endianness): Buffer;

    bitLength(): number;
    zeroBits(): number;
    byteLength(): number;
    toTwos(width: number): BN;
    fromTwos(width: number): BN;
    isNeg(): boolean;
    neg(): BN;

    /**
     * @return {BN} this
     */
    iuor(num: BN): BN;

    /**
     * @return {BN} this
     */
    ior(num: BN): BN;

    /**
     *
     */
    uor(num: BN): BN;

    /**
     *
     */
    or(num: BN): BN;

    /**
     * @return {BN} this
     */
    iuand(num: BN): BN;

    /**
     * @return {BN} this
     */
    iand(num: BN): BN;

    /**
     *
     */
    and(num: BN): BN;

    /**
     *
     */
    uand(num: BN): BN;

    /**
     * @return {BN} this
     */
    iuxor(num: BN): BN;

    /**
     * @return {BN} this
     */
    ixor(num: BN): BN;

    /**
     *
     */
    xor(num: BN): BN;

    /**
     *
     */
    uxor(num: BN): BN;

    /**
     * Not ``this`` with ``width`` bitwidth
     * @return {BN} this
     */
    inotn(width: number): BN;

    /**
     * Not ``this`` with ``width`` bitwidth
     *
     */
    notn(width: number): BN;

    /**
     * Set `bit` of `this`
     * @return {BN} this
     */
    setn(bit: number, val?: boolean);

    /**
     * @return {BN} this
     */
    iadd(num: BN): BN;

    /**
     * 
     */
    add(num: BN): BN;

    /**
     * @return {BN} this
     */
    isub(num: BN): BN;

    /**
     * 
     */
    sub(num: BN): BN;

    /**
     * @return {BN} out
     */
    mulTo(num: BN, out: BN): BN;

    mul(num: BN): BN;

    /**
     * Multiply employing FFT
     */
    mulf(num: BN): BN;

    /**
     * @return {BN} this
     */
    imul(num: BN): BN;
    imuln(num: BN): BN;

    muln(num: BN): BN;
    sqr(): BN;

    /**
     * @return {BN} this
     */
    isqr(): BN;

    pow(num: BN): BN;

    /**
     * Shift-left in-place
     * @return {BN} this
     */
    iushln(bits: number): BN;
    ishln(bits: number): BN;

    /**
     * Shift-right in-place
     * NOTE: `hint` is a lowest bit before trailing zeroes
     * NOTE: if `extended` is present - it will be filled with destroyed bits
     * @return {BN} this
     */
    iushrn(bits: number, hint: boolean, extended: boolean): BN;
    ishrn(bits: number, hint: boolean, extended: boolean): BN;

    shln(bits: number): BN;
    ushln(bits: number): BN;

    /**
     * Test if n bit is set
     */
    testn(bit: number): boolean;

    /**
     * Return only lowers bits of number (in-place)
     * @return {BN} this
     */
    imaskn(bits: number): BN;

    maskn(bits: number): BN;

    /**
     * @return {BN} this
     */
    iaddn(num: number): BN;
    isubn(num: number): BN;

    addn(num: number): BN;
    subn(num: number): BN;

    /**
     * @return {BN} this
     */
    iabs(): BN;

    abs(): BN;

    /**
     * NOTE: `mode` can be set to `mod` to request mod only,
     *   to `div` to request div only, or be absent to request both div & mod
     * NOTE: `positive` is true if unsigned mod is requested
     */
    divmod(num: BN, mode: "mod" | "div", positive: boolean): { div: BN, mod: BN };

    div(num: BN): { div: BN, mod: BN };
    mod(num: BN): { div: BN, mod: BN };
    umod(num: BN): { div: BN, mod: BN };

    gcd (num: BN): BN;

    isEven(): boolean;
    isOdd(): boolean;

    /**
     * Compare two numbers and return:
     * 1 - if `this` > `num`
     * 0 - if `this` == `num`
     * -1 - if `this` < `num`
     */
    cmp(num: BN): 1 | 0 | -1;
    
    isZero (): boolean;
    
    gtn(num: BN): boolean;
    gt(num: BN): boolean;
    gten(num: BN): boolean;
    gte(num: BN): boolean;
    ltn(num: BN): boolean;
    lt(num: BN): boolean;
    lten(num: BN): boolean;
    lte(num: BN): boolean;
    eqn(num: BN): boolean;
    eq(num: BN): boolean;
}