/*
 * transaction
 */

// ============================== import 

import {U8, U64, U160, U256, U520} from "../util/number"
import { CDB, CSession } from "../../pi/db/client"
import { Item, Transaction as DBTransaction, DB } from "../../pi/db/db"
import { TransactionStruct } from "./transaction.s"

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
}
