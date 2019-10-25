import { Tr as Txn } from '../pi/db/mgr';
import { initBestForkChain, initCommitteeConfig, initForkChain, initGenesisAccounts, initGenesisBlock, initGenesisForgers, initLocalMiners, initNextForkChainId } from './init';

export const newChain = (txn: Txn): void => {
    initForkChain(txn);
    initBestForkChain(txn);
    initNextForkChainId(txn);
    initLocalMiners(txn);
    initCommitteeConfig(txn);
    initGenesisForgers(txn);
    initGenesisBlock(txn);
    initGenesisAccounts(txn);
};