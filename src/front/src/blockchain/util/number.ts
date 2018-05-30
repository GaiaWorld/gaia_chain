/**
 * number type
 */

// =================== import 

import { NumberStruct } from "./number_struct.s"

// =================== export 

export type U8 = number;

export type U16 = number;

export type U32 = number;

export type U48 = number;

class NumberType extends NumberStruct {
    fromHex(hex: string) {
        this.data = hex2Buffer(hex);
    }

    toHex() {
        return buffer2Hex(this.data);
    }
}

export class U64 extends NumberType {
    private static BYTES = 8;

    constructor() {
        super();
        this.data = new Uint8Array(U64.BYTES);
    }
}

export class U160 extends NumberType {
    private static BYTES = 20;

    constructor() {
        super();
        this.data = new Uint8Array(U160.BYTES);
    }
}

export class U256 extends NumberType {
    private static BYTES = 32;

    constructor() {
        super();
        this.data = new Uint8Array(U256.BYTES);
    }
}

export class U520 extends NumberType {
    private static BYTES = 65;

    constructor() {
        super();
        this.data = new Uint8Array(U520.BYTES);
    }
}

// =================== impl 

const hex2Buffer = (data: string) => {
    let r = new Uint8Array(data.length / 2);
    for (let i = 0; i < r.length; ++i) {
        r[i] = parseInt(data.substr(2 * i, 2), 16)
    }
    return r;
}

const buffer2Hex = (data: Uint8Array) => {
    let r = [];
    for (let num of data) {
        r.push(('0' + num.toString(16)).slice(-2));
    }
    return r.join("");
}