/**
 * main function
 */
import { getCommitteeConfig, getMiningConfig, getTipHeight, isSyncing, newBlockChain } from '../chain/blockchain';
import { startMining } from '../consensus/committee';
import { INV_MSG_TYPE } from '../net/msg';
import { Inv } from '../net/server/rpc.s';
import { notifyNewBlock, notifyNewTx } from '../net/server/subscribe';
import { persistBucket } from '../util/db';
import { setTimer } from '../util/task';
import { ChainHead, CommitteeConfig } from './schema.s';

const start = (): void => {
    newBlockChain();
    const commitCfgBkt = persistBucket(CommitteeConfig._$info.name);
    const commitCfg = commitCfgBkt.get<string, [CommitteeConfig]>('CC')[0];
    console.log('commitCfg: ', commitCfg);
    const chainHeadBkt = persistBucket(ChainHead._$info.name);
    if (!isSyncing()) {
        setTimer(() => {
            console.log('commitCfg2: ', commitCfg);
            startMining(getMiningConfig(), commitCfg);

            const chainHead = chainHeadBkt.get<string, [ChainHead]>('CH')[0];
            chainHead.height += 1;
            chainHeadBkt.put('CH', chainHead);
        }, null, 2000);
    }
    
    console.log('starting gaia ......');
};

start();
