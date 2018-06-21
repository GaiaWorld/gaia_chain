/*
 * transaction
 */

// ============================== import 

import { BonBuffer } from "../../pi/util/bon"

import { BN } from "../util/bn"
import { Buffer } from "../util/buffer"
import { hash256 } from "../util/crypto"
import { U8, U64, U160, U256, U520 } from "../util/number"

import { Struct } from "../../pi/struct/struct_mgr"

// ============================== export

export enum TransactionType {
    Default = 1,     // common
    AddForge = 2,    // add forge
    RemoveForge = 3, // remove forge
}

export class Transaction extends Struct {

    count: U64;    // current transaction count
    fee: U64;      // the fee of transaction given the forge
    to: U160;      // the address of receiver
    value: U64;    // receiver's value

    txType: U8;      // type, value in the TransactionType
    blsPubKey: U256; // the blsPubKey is valid only when type is AddForge 

    sign: U520;    // sender's signature, don't use for hash

    // use for index
    txHash: U256;   // the hash of above data
    from: U160;     // the address of sender

    constructor() {
        super();
        this.count = new BN(0, 16, "le");
        this.fee = new BN(0, 16, "le");
        this.to = new BN(0, 16, "le");
        this.value = new BN(0, 16, "le");
        this.txType = new BN(0, 16, "le");
        this.blsPubKey = new BN(0, 16, "le");
        this.sign = new BN(0, 16, "le");
        this.txHash = new BN(0, 16, "le");
        this.from = new BN(0, 16, "le");
    }

    computeHash() {

        let buf = new BonBuffer();

        buf.writeBin(this.count.toBuffer("le"));
        buf.writeBin(this.fee.toBuffer("le"));
        buf.writeBin(this.to.toBuffer("le"));
        buf.writeBin(this.value.toBuffer("le"));
        buf.writeBin(this.txType.toBuffer("le"));
        buf.writeBin(this.blsPubKey.toBuffer("le"));
        let hashBuf = hash256(new Buffer(buf.getBuffer()));
        this.txHash = new BN(hashBuf);

        return this.txHash;
    }

    bonDecode(bb: BonBuffer) {
        let u8 = bb.readBin();
        this.count = new BN(u8, 16, "le");
        u8 = bb.readBin();
        this.fee = new BN(u8, 16, "le");
        u8 = bb.readBin();
        this.to = new BN(u8, 16, "le");
        u8 = bb.readBin();
        this.value = new BN(u8, 16, "le");
        u8 = bb.readBin();
        this.txType = new BN(u8, 16, "le");
        u8 = bb.readBin();
        this.blsPubKey = new BN(u8, 16, "le");

        u8 = bb.readBin();
        this.sign = new BN(u8, 16, "le");
        u8 = bb.readBin();
        this.txHash = new BN(u8, 16, "le");
        u8 = bb.readBin();
        this.from = new BN(u8, 16, "le");
    }

    bonEncode(bb: BonBuffer) {
        bb.writeBin(this.count.toBuffer("le"));
        bb.writeBin(this.fee.toBuffer("le"));
        bb.writeBin(this.to.toBuffer("le"));
        bb.writeBin(this.value.toBuffer("le"));
        bb.writeBin(this.txType.toBuffer("le"));
        bb.writeBin(this.blsPubKey.toBuffer("le"));

        bb.writeBin(this.sign.toBuffer("le"));
        bb.writeBin(this.txHash.toBuffer("le"));
        bb.writeBin(this.from.toBuffer("le"));

        return new Buffer(bb.getBuffer());
    }
}