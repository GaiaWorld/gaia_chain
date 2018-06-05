/*
 * blocker header
 */

// ============================== import 

import { U32, U64, U160, U256, U520 } from "../util/number"
import { CDB, CSession } from "../../pi/db/client"
import { Item, Transaction as DBTransaction, DB } from "../../pi/db/db"
import { BlockHeaderStruct } from "./blockheader_struct.s"
// import { getDataHash } from "../crypto/crypto"

// ============================== export

export class BlockHeader extends BlockHeaderStruct {
    headerSign: U520;  // Forge's signature for the headers
    parentHash: U256;  // hash of parent's header

    version: U32;      // version of the block
    timestamp: U64;    // unix time stamp

    forgeAddr: U160;   // the address of forge

    blsRandom: U256;   // bls random ?
    blsPubkey: U256;   // bls public key ?
    txMerkle: U256;    // merkle hash of the block's transparents

    // the follow feild is use for index

    height: U64;       // hegiht of block
    totalWeight: U64;  // total weight from generic to this block
    groupNumber: U32;  // the group number of the forge which generate the block
    headerHash: U256;  // the header's hash

    computeHash() {
       // this.headerHash = getDataHash(this);
    }
}

/**
 * connect header and db
 */
export class HeaderDB {
    db: CDB;
    session: CSession;

    constructor() {
        this.db = new CDB();
        this.session = new CSession();

        this.session.open(this.db);
    }

    write(header: BlockHeader) {
        const readCB = (tx: DBTransaction) => {
            let item = {
                tab: BLOCK_HEADER_TABLE_NAME,
                key: header.headerHash.toHex(),
                value: header,
	            time: 0,
            } as Item;

            return tx.upsert([item], DEFAULT_TIMEOUT);
        };

        this.session.write(readCB, DEFAULT_TIMEOUT);
    }

    read(hash: U256): BlockHeader {
        const readCB = (tx: DBTransaction) => {
            let item = {
                tab: BLOCK_HEADER_TABLE_NAME,
                key: hash.toString(),
            } as Item;

            return tx.query([item], DEFAULT_TIMEOUT);
        };

        return this.session.read(readCB, DEFAULT_TIMEOUT);
    }
}

// ============================== implementation

const DEFAULT_TIMEOUT = 10; // 10 ms
const BLOCK_HEADER_TABLE_NAME = "BlockHeaderTable";