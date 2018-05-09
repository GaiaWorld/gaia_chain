/**
 * 账户
 */

import {H160, Int64} from "./util"

export class Account {
    address: H160;   // 地址
    nonce:   number; // 32位整数，表示 该账户已经发送过的交易数
    balance: Int64;  // 余额，拥有多少yGaia

    constructor(address: H160, nonce: number, balance: Int64) {
        this.address = address;
        this.nonce = nonce;
        this.balance = balance;
    }
}