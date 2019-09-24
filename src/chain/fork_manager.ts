// fork manager
import { Tr as Txn } from '../pi/db/mgr';
import { ChainHead } from './schema.s';

export const getForkChainId = (txn: Txn, height: number, hash: string): number => {
    // read forger in forger committee
    return 0;
};

export const getChainHeadForChainId = (txn: Txn, height: number, hash: string): ChainHead => {
    return;
};

// canonical chain is the highest voting power chain
export const getCanonicalChain = (txn: Txn): ChainHead => {
    return;
};