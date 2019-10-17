import { Tr as Txn } from '../pi/db/mgr';
import { DEFAULT_WARE } from '../pi_pt/constant';
import { Logger, LogLevel } from '../util/logger';
import { Transaction, TxPool } from './schema.s';

const logger = new Logger('TXPOOL', LogLevel.DEBUG);

export const addTx2Pool = (txn: Txn, tx:Transaction): void => {
    const txPool = new TxPool();
    txn.modify(
        [{ ware: DEFAULT_WARE, tab: TxPool._$info.name, key: `${txPool.txHash}`, value: txPool }]
        , 1000
        , false
    );
    logger.info(`add tx ${JSON.stringify(tx.txHash)} to txpool`);
};

export const getTxsFromPool = (txn: Txn): Transaction[] => {
    const txList = [];
    const txs = txn.iter<string, TxPool>(DEFAULT_WARE, TxPool._$info.name, undefined, true, '');
    for (const tx of txs) {
        txList.push(tx[1].tx);
    }

    return txList;
};

export const removeMinedTxFromPool = (txn: Txn, txs: Transaction[]): void => {
    for (const tx of txs) {
        txn.modify(
            [{ ware: DEFAULT_WARE, tab: TxPool._$info.name, key: tx.txHash }]
            , 1000
            , false
        );
    }

    logger.info(`Minded tx removed`);
};

export const txPoolHasTx = (txn: Txn, txHash: string): boolean => {
    const tx = txn.query(
        [{ ware: DEFAULT_WARE, tab: TxPool._$info.name, key: txHash }]
        , 1000
        , false
    );

    if (tx) {
        return true;
    }

    return false;
};