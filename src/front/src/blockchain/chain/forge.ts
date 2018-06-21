/*
 * forge
 */

// ============================== import 

import { BonBuffer } from "../../pi/util/bon"

import { BN } from "../util/bn"
import { Buffer } from "../util/buffer"
import { U32, U64, U160, U256 } from "../util/number"

import { Struct } from "../../pi/struct/struct_mgr"

// ============================== export

export const MIN_ADD_FORGE_HEIGHT = new BN(40000, 10, "le");

export const MIN_EXIT_FORGE_HEIGHT = new BN(400000, 10, "le");

export class Forger extends Struct {
    address: U160;          // address
    deposit: U64;           // unit: yGaia
    blsPubKey: U256;        // bls public key
    groupNumber: U32;       // current forge group number

    addBlockHeight: U64;    // the height of block when the forger add
    exitBlockHeight: U64;   // the height of block when the forger remove

    // use for index

    initWeight: U64;
    accWeight: U64;     // accumulate weight
    rankWeight: U64;     // rank weight
    totalWeight: U64;     // rankWeight + accWeight
    lastBlockHeight: U64; // the height of block when last modify accWeight

    constructor() {
        super();
    }

    bonDecode(bb: BonBuffer) {
        let u8 = bb.readBin();
        this.address = new BN(u8, 16, "le");
        u8 = bb.readBin();
        this.deposit = new BN(u8, 16, "le");
        u8 = bb.readBin();
        this.blsPubKey = new BN(u8, 16, "le");
        u8 = bb.readBin();
        this.groupNumber = new BN(u8, 16, "le");
        u8 = bb.readBin();
        this.addBlockHeight = new BN(u8, 16, "le");
        u8 = bb.readBin();
        this.exitBlockHeight = new BN(u8, 16, "le");

        u8 = bb.readBin();
        this.initWeight = new BN(u8, 16, "le");
        u8 = bb.readBin();
        this.accWeight = new BN(u8, 16, "le");
        u8 = bb.readBin();
        this.rankWeight = new BN(u8, 16, "le");
        u8 = bb.readBin();
        this.totalWeight = new BN(u8, 16, "le");
        u8 = bb.readBin();
        this.lastBlockHeight = new BN(u8, 16, "le");
    }

    bonEncode(bb: BonBuffer) {
        bb.writeBin(this.address.toBuffer("le"));
        bb.writeBin(this.deposit.toBuffer("le"));
        bb.writeBin(this.blsPubKey.toBuffer("le"));
        bb.writeBin(this.groupNumber.toBuffer("le"));
        bb.writeBin(this.addBlockHeight.toBuffer("le"));
        bb.writeBin(this.exitBlockHeight.toBuffer("le"));

        bb.writeBin(this.initWeight.toBuffer("le"));
        bb.writeBin(this.accWeight.toBuffer("le"));
        bb.writeBin(this.rankWeight.toBuffer("le"));
        bb.writeBin(this.totalWeight.toBuffer("le"));
        bb.writeBin(this.lastBlockHeight.toBuffer("le"));

        return new Buffer(bb.getBuffer());
    }
}

export class ForgeGroup {
    members: Forger[]; // forger's group
}

export class ForgeCommittee {
    groups: ForgeGroup[];  // groups' array
    addWaits: Forger[];    // wait for forge
    removeWaits: Forger[]; // wait for exit forge
}