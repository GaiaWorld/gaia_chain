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