/*
 * block
 */

// ============================== import 

import { BonBuffer } from "../../pi/util/bon"

import { BN } from "../util/bn"
import { Buffer } from "../util/buffer"
import { U64, U256 } from "../util/number"

import { Struct } from "../../pi/struct/struct_mgr"

// ============================== export

/**
 * max cash count, unit uGAIA
 */
export const MAX_UGAYA_COUNT: U64 = new BN(10).pow(new BN(18));

export class Block extends Struct {
    headerHash: U256;        // BlockHeader's Hash
    txHashes: U256[]; // array of block's transaction hash

    constructor() {
        super();

        this.headerHash = new BN(0, 16, "le");
        this.txHashes = [];
    }

    bonDecode(bb: BonBuffer) {
        let u8 = bb.readBin();
        this.headerHash = new BN(u8, 16, "le");
    }

    bonEncode(bb: BonBuffer) {
        bb.writeBin(this.headerHash.toBuffer("le"));
        bb.writeArray(this.txHashes, elem => {
            bb.writeBin(elem.toBuffer("le"));
        });

        return new Buffer(bb.getBuffer());
    }
}