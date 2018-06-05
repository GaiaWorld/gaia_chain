/*
 * account
 */

// ============================== import 

import { U32, U64, U160 } from "../util/number"
import { CDB, CSession } from "../../pi/db/client"
import { Item, Transaction as DBTransaction, DB } from "../../pi/db/db"
import { AccountStruct } from "./account_struct.s"

// ============================== export

export class Account extends AccountStruct {
    address: U160;   // the address of account
    count: U32;      // the count of transactions from the account
    balance: U64;    // the current uGaia of the account
}

/**
 * connect account and db
 */
export class AccountDB {
    db: CDB;
    session: CSession;

    constructor() {
        this.db = new CDB();
        this.session = new CSession();

        this.session.open(this.db);
    }

    write(account: Account) {
        const writeDB = (tx: DBTransaction) => {
            let item = {
                tab: ACCOUNT_TABLE_NAME,
                key: account.address.toHex(),
                value: account,
	            time: 0,
            } as Item;

            return tx.upsert([item], DEFAULT_TIMEOUT);
        };

        this.session.write(writeDB, DEFAULT_TIMEOUT);
    }

    read(address: U160): Account {
        const readCB = (tx: DBTransaction) => {
            let item = {
                tab: ACCOUNT_TABLE_NAME,
                key: address.toString(),
            } as Item;

            return tx.query([item], DEFAULT_TIMEOUT);
        };

        return this.session.read(readCB, DEFAULT_TIMEOUT);
    }
}

// ============================== implementation

const DEFAULT_TIMEOUT = 10; // 10 ms
const ACCOUNT_TABLE_NAME = "AccountTable";