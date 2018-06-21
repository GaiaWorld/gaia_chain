/*
 * account
 */

// ============================== import 

import { BonBuffer } from "../../pi/util/bon"

import { BN } from "../util/bn"
import { Buffer } from "../util/buffer"
import { U32, U64, U160 } from "../util/number"

import { Struct } from "../../pi/struct/struct_mgr"

// ============================== export

export class Account extends Struct {
    address: U160;   // the address of account
    count: U32;      // the count of transactions from the account
    balance: U64;    // the current uGaia of the account

    constructor(address?: U160, balance?: U64) {
        super();

        this.address = address || new BN(0, 16, "le");
        this.count = new BN(0, 16, "le");
        this.balance = balance || new BN(0, 16, "le");
    }

    bonEncode(bb: BonBuffer) {
        bb.writeBin(this.address.toBuffer("le"));
        bb.writeBin(this.count.toBuffer("le"));
        bb.writeBin(this.balance.toBuffer("le"));

        return new Buffer(bb.getBuffer());
    }

    bonDecode(bb: BonBuffer) {
        let u8 = bb.readBin();
        this.address = new BN(u8, 16, "le");
        u8 = bb.readBin();
        this.count = new BN(u8, 16, "le");
        u8 = bb.readBin();
        this.balance = new BN(u8, 16, "le");
    }
}