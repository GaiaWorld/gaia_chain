/**
 * number type
 */

// ============================== import 

// ============================== export

export type U8 = number;

export type U16 = number;

export type U32 = number;

export type U48 = number;

export class U64 {
    static SIZE = 8;

    buf: Uint8Array;

    constructor() {
        this.buf = new Uint8Array(U64.SIZE);
    }

    toString() {
        
    }
}

export class U160 {
    static SIZE = 20;

    buf: Uint8Array;

    constructor() {
        this.buf = new Uint8Array(U160.SIZE);
    }

    toString() {
        
    }
}

export class U256 {
    static SIZE = 32;

    buf: Uint8Array;

    constructor() {
        this.buf = new Uint8Array(U256.SIZE);
    }

    toString() {

    }
}

export class U520 {
    static SIZE = 65;

    buf: Uint8Array;

    constructor() {
        this.buf = new Uint8Array(U520.SIZE);
    }

    toString() {
        
    }
}