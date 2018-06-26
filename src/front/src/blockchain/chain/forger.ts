/*
 * forge
 */

// ============================== import 

import { BonBuffer } from "../../pi/util/bon"

import { BN } from "../util/bn"
import { Buffer } from "../util/buffer"
import { U32, U64, U160, U256 } from "../util/number"
import { hash256 } from "../util/crypto"
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
    lastBlockHeight: U64; // the height of block when last modify accWeight

    initWeight: number;
    accWeight: number;     // accumulate weight
    rankWeight: number;     // rank weight
    totalWeight: number;     // rankWeight + accWeight

    constructor(address: U160, deposit: U64, blsPubKey: U256, blockHeight: U64) {
        super();

        this.address = address.clone();
        this.deposit = deposit.clone();
        this.blsPubKey = blsPubKey.clone();
        this.groupNumber = new BN();

        this.addBlockHeight = blockHeight.clone();
        this.exitBlockHeight = new BN();

        this.initWeight = 0;
        this.accWeight = 0;
        this.rankWeight = 0;
        this.totalWeight = 0;
        this.lastBlockHeight = new BN();
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

        this.initWeight = bb.readf();
        this.accWeight = bb.readf();
        this.rankWeight = bb.readf();
        this.totalWeight = bb.readf();

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

        bb.writeF32(this.initWeight);
        bb.writeF32(this.accWeight);
        bb.writeF32(this.rankWeight);
        bb.writeF32(this.totalWeight);
        bb.writeBin(this.lastBlockHeight.toBuffer("le"));

        return new Buffer(bb.getBuffer());
    }

    /**
     * return a number in [1, 4]
     */
    random(blsSign: U256, height: U64, address: U160): number {
        let bb = new BonBuffer();
        bb.writeBin(blsSign.toBuffer("le"));
        bb.writeBin(height.toBuffer("le"));
        bb.writeBin(address.toBuffer("le"));
        let hash = new BN(hash256(new Buffer(bb.getBuffer())), 16, "le");

        // mod is integer in [0, 128)
        let mod = hash.mod(new BN(3, 128, "le")).mod.toNumber();
        return 1 + 3 / 128 * mod;
    }

    computeInitWeight(height: U64, blsRandom: U256) {
        let d = this.deposit.div(new BN(100, 10, "le")).div.toNumber();
        this.initWeight = this.random(blsRandom, height, this.address) * Math.log10(d);
        this.accWeight = this.initWeight;
    }
}