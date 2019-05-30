/**
 * account
 */

import {H160} from './util'

export class Account {
    public address: H160;
    public nonce:   number;
    public balance: number;
}