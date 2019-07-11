/**
 * main function
 */
import { getCommitteeConfig, getMiningConfig, getTipHeight, isSyncing, newBlockChain } from '../chain/blockchain';
import { setMiningCfg, startMining } from '../consensus/committee';
import { INV_MSG_TYPE } from '../net/msg';
import { Inv } from '../net/server/rpc.s';
import { notifyNewBlock, notifyNewTx } from '../net/server/subscribe';
import { persistBucket } from '../util/db';
import { setTimer } from '../util/task';
import { ChainHead, CommitteeConfig } from './schema.s';

const start = (): void => {
    newBlockChain();

    // setup mining config
    const pubKey = '4c113bf96822ea63eea2cd3441a2c2059ad6be3590a71f0fea7021b786dba9b4';
    const privKey = '71fef143755bc71b58cb44d7339f9dadab256cbb00e431e79796d631622103b94c113bf96822ea63eea2cd3441a2c2059ad6be3590a71f0fea7021b786dba9b4';
    const blockRandom = 'cc6c85a369f741fd6f409627a0f73fd166f7dba6ba1b5be6c55703bb5243e013';
    const heigt = getTipHeight();
    setMiningCfg(pubKey, privKey, blockRandom, heigt, 2);

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
