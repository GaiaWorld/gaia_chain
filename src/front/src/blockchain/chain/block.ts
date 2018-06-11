/*
 * block
 */

// ============================== import 

import { BonBuffer } from "../../pi/util/bon"

import { BN } from "../util/bn"
import { Buffer } from "../util/buffer"
import { U64, U256 } from "../util/number"

import { Struct } from "../../pi/struct/struct_mgr"

import { CDB, CSession } from "../../pi/db/client"
import { Item, Transaction as DBTransaction } from "../../pi/db/db"

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

        this.headerHash = new BN(0, 10, "le");
        this.txHashes = [];
    }

    bonDecode(bb: BonBuffer) {
        let u8 = bb.readBin();
        this.headerHash = new BN(u8, 10, "le");
    }

    bonEncode(bb: BonBuffer) {
        bb.writeBin(this.headerHash.toBuffer("le"));
        bb.writeArray(this.txHashes, elem => {
            bb.writeBin(elem.toBuffer("le"));
        });

        return new Buffer(bb.getBuffer());
    }
}

export class BlockDB {
    db: CDB;
    session: CSession;

    constructor() {
        this.db = new CDB();
        this.session = new CSession();

        this.session.open(this.db);
    }

    write(block: Block) {
        const writeCB = (tx: DBTransaction) => {
            let item = {
                tab: TABLE_NAME,
                key: block.headerHash.toString(),
                value: block,
                time: 0,
            } as Item;

            return tx.upsert([item], DEFAULT_TIMEOUT);
        };

        this.session.write(writeCB, DEFAULT_TIMEOUT);
    }

    read(hash: U256): Block {
        const readCB = (tx: DBTransaction) => {
            let item = {
                tab: TABLE_NAME,
                key: hash.toString(),
            } as Item;

            return tx.query([item], DEFAULT_TIMEOUT);
        };

        return this.session.read(readCB, DEFAULT_TIMEOUT);
    }
}

// ============================== implementation

const DEFAULT_TIMEOUT = 10; // 10 ms
const TABLE_NAME = "BlockTable";