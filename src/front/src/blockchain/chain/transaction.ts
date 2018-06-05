/*
 * transaction
 */

// ============================== import 

import { U8, U64, U160, U256, U520 } from "../util/number"
import { CDB, CSession } from "../../pi/db/client"
import * as db from "../../pi/db/db"
import { TransactionStruct } from "./transaction.s"
// import { getDataHash } from "../crypto/crypto"

// ============================== export

export enum TransactionType {
    Default = 1,     // common
    AddForge = 2,    // add forge
    RemoveForge = 3, // remove forge
}

export class Transaction extends TransactionStruct {

    count: U64;    // current transaction count
    fee: U64;      // the fee of transaction given the forge
    to: U160;      // the address of receiver
    value: U64;    // receiver's value
    sign: U520;    // sender's signature

    txType: U8;    // type, value in the TransactionType
    userData: Uint8Array;    // userData

    // use for index
    txHash: U256;   // the hash of above data
    from: U160;     // the address of sender

    computeHash() {
        // this.txHash = getDataHash(this);
    }
}

/**
 * connect txx and db
 */
export class TxDB {
    db: CDB;
    session: CSession;

    constructor() {
        this.db = new CDB();
        this.session = new CSession();

        this.session.open(this.db);
    }

    write(data: Transaction) {
        const readCB = (tx: db.Transaction) => {
            let item = {
                tab: TRANSACTION_TABLE_NAME,
                key: data.txHash.toHex(),
                value: data,
	            time: 0,
            } as db.Item;

            return tx.upsert([item], DEFAULT_TIMEOUT);
        };

        this.session.write(readCB, DEFAULT_TIMEOUT);
    }

    read(hash: U256): TxDB {
        const readCB = (tx: db.Transaction) => {
            let item = {
                tab: TRANSACTION_TABLE_NAME,
                key: hash.toString(),
            } as db.Item;

            return tx.query([item], DEFAULT_TIMEOUT);
        };

        return this.session.read(readCB, DEFAULT_TIMEOUT);
    }
}

// ============================== implementation

const DEFAULT_TIMEOUT = 10; // 10 ms
const TRANSACTION_TABLE_NAME = "TransactionTable";