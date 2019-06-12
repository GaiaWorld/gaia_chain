/**
 * account
 */

import { H160 } from '../pi_pt/rust/hash_value';

export class Account {
    public address: H160;
    // public nonce:   number;
    public inputAmount: number;
    public outputAmount: number;
    public codeHash: H160;
}