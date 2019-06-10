
import {H160, H256} from "./util"

/**
 * transaction types
 */
export enum TxType {
    // normal spend transaction
    SpendTx,
    // user asks to enter forge group
    AddForgerGroupTx,
    // user exits forger group
    ExitForgerGroupTx,
    // penalty
    PenaltyTx,
}

/**
 * 
 */
export class Transaction {
    public nonce: number;
    public gas: number;
    public price: number;
    public to: H160;
    public value: number;

    public lastOutputValue: number;

    // transaction type
    public type: TxType;
    // two use cases for this field:
    // 1. as normal account, it will be used as a transactoin note
    // 2. as contract account, it contains call code for this transaction
    public payload: Uint8Array;

    // transaction signature
    public v: number;
    public r: number;
    public s: number;
}

export class Receipt {
    // transaction success or fail
    status: boolean;
    // tx gas used
    gasUsed: number;
    // transaction hash
    txHash: H256;
    // block hash
    blockHash: H256;
    // block number
    blockNumber: number;
    // transaction index in Transaction[] array
    txIndex: number;
    // tx result log
    log: Log[];
}

export class TxPool {
    poolConfig: TxPoolConfig;
    // // All currently processable transactions
    // pending: Map<H160, Transaction[]>;
    // // Queued but non-processable transactions
    // queue: Map<H160, Transaction[]>;
    // All transactions sorted by price
    priced: Transaction[];
}

interface TxPoolConfig {
    // minimum gas price this tx pool could accept
    readonly priceLimit: number;
    // // Maximum number of executable transaction slots for all accounts
    // readonly maxExecutableTxs: number;
    // // Maximum number of non-executable transaction slots permitted per account
    // readonly maxNonExecutableTxs: number;
    // life time of an non executable txs
    readonly expire: number;
    // unconfirmed tx size
    readonly maxSize: number;
}
