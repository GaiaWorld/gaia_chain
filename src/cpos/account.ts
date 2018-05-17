/**
 * 账户
 */

import {H160, Int64} from './util'

export class Account {
    public address: H160;   // 地址
    public nonce:   number; // 32位整数，表示 该账户已经发送过的交易数
    public balance: Int64;  // 余额，拥有多少yGaia
}