/*
 * account
 */

// ============================== import 

import {U32, U64, U160} from "../util/number"

// ============================== export

export class Account {
    address: U160;   // the address of account
    count: U32;      // the count of transactions from the account
    balance: U64;    // the current uGaia of the account
}