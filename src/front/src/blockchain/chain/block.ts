/*
 * block

 */

// ============================== import 

import { U64, U160, U256, U520 } from "../util/number"
import { CDB, CSession } from "../../pi/db/client"
import { Item, Transaction as DBTransaction, DB } from "../../pi/db/db"
import { BlockStruct } from "./block_struct.s"

// ============================== export

export class Block extends BlockStruct {
    key: U256;        // BlockHeader's Hash
    txHashes: U256[]; // array of block's transaction hash
}

/**
 * connect block and db
 */
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
                tab: BLOCK_TABLE_NAME,
                key: block.key.toHex(),
                value: block,
	            time: 0,
            } as Item;

            return tx.upsert([item], DEFAULT_TIMEOUT);
        };

        this.session.write(writeCB, DEFAULT_TIMEOUT);
    }

    read(address: U160): Account {
        const readCB = (tx: DBTransaction) => {
            let item = {
                tab: BLOCK_TABLE_NAME,
                key: address.toString(),
            } as Item;

            return tx.query([item], DEFAULT_TIMEOUT);
        };

        return this.session.read(readCB, DEFAULT_TIMEOUT);
    }
}

// ============================== implementation

const DEFAULT_TIMEOUT = 10; // 10 ms
const BLOCK_TABLE_NAME = "BlockTable";