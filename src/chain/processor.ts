// block processor
import { Tr as Txn } from '../pi/db/mgr';
import { Block } from './blockchain';
import { Transaction } from './schema.s';

// process a block
export const processBlock = (txn: Txn, block: Block): boolean => {
    // how to get chain id ?
    return true;
};

// process a transaction
export const applyTransaction = (txn: Txn, tx: Transaction): boolean => {
    return true;    
};