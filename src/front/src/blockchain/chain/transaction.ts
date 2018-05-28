/*
 * transaction
 */

// ============================== import 

import {U64, U160, U256, U520} from "../util/number"

// ============================== export

export enum TransactionType {
    Default,     // common
    AddForge,    // add forge
    RemoveForge, // remove forge
}

export class Transaction {

    count: U64;    // current transaction count
    fee: U64;      // the fee of transaction given the forge
    to: U160;      // the address of receiver
    value: U64;    // receiver's value
    sign: U520;    // sender's signature
    
    type: TransactionType; // type
    userData: Uint8Array;  // userData
    
    // use for index
    txHash: U256;   // the hash of above data
    from: U160;     // the address of sender
}
