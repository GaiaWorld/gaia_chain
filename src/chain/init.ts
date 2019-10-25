/** 
 * initialize some tables
 */
import { GENESIS } from '../params/genesis';
import { Tr as Txn } from '../pi/db/mgr';
import { DEFAULT_FILE_WARE } from '../pi_pt/constant';
import { getGenesisHash } from './blockchain';
import { BestForkChain, ForkChain, NextForkChainId } from './schema.s';

export const initForkChain = (txn: Txn): void => {
    const initialized = txn.iter_raw(DEFAULT_FILE_WARE, ForkChain._$info.name, undefined, true, '');
    if (!initialized.next()) {
        const fork = new ForkChain();
        fork.forkChainId = 1;
        fork.currentHeight = 1;
        fork.genesisHash = getGenesisHash();
        fork.headHash = getGenesisHash();
        fork.prevHash = '';
        fork.totalWeight = 0; // TODO: Genesis weight
        fork.blockRandom = GENESIS.blockRandom;
        fork.createTime = Date.now();

        txn.modify([
            { ware: DEFAULT_FILE_WARE, tab: ForkChain._$info.name, key: fork.forkChainId, value: fork }
        ], 1000, false);
    }
};

export const initBestForkChain = (txn: Txn): void => {
    const initialized = txn.iter_raw(DEFAULT_FILE_WARE, BestForkChain._$info.name, undefined, true, '');
    if (!initialized.next()) {
        const best = new BestForkChain();
        best.forkChainId = 1;
        
        txn.modify([
            { ware: DEFAULT_FILE_WARE, tab: BestForkChain._$info.name, key: best.forkChainId, value: best }
        ], 1000, false);
    }
};

export const initNextForkChainId = (txn: Txn): void => {
    const initialized = txn.iter_raw(DEFAULT_FILE_WARE, NextForkChainId._$info.name, undefined, true, '');
    if (!initialized.next()) {
        const next = new NextForkChainId();
        next.nextId = 2;

        txn.modify([
            { ware: DEFAULT_FILE_WARE, tab: NextForkChainId._$info.name, key: next.nextId, value: next }
        ], 1000, false);
    }
};