/**
 * account
 */

import { Transaction } from '../chain/transaction';

export interface MemPool {
    txs(): Transaction[];
}