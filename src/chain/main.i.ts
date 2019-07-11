/**
 * main function
 */
import { getMiningConfig, getTipHeight, isSyncing, newBlockChain } from '../chain/blockchain';
import { runMining, setMiningCfg } from '../consensus/committee';
import { launch } from '../net/client/launch';
import { INV_MSG_TYPE } from '../net/msg';
import { Inv } from '../net/server/rpc.s';
import { notifyNewBlock, notifyNewTx } from '../net/server/subscribe';
import { persistBucket } from '../util/db';
import { setTimer } from '../util/task';
import { ChainHead, CommitteeConfig } from './schema.s';

const start = (): void => {
    newBlockChain();
    setTimeout(() => {
        launch();
    }, 10000);

    // setup mining config
    const pubKey = '0fff49afad54c8290b0c838d41ee35dcb8b7aa0856f2e5a16f14f4f53b3ecd83';
    const privKey = '61bd92548e50464c94da8c33a076b7956bda74ca1957ec43a7095e92b5a011b80fff49afad54c8290b0c838d41ee35dcb8b7aa0856f2e5a16f14f4f53b3ecd83';
    const blockRandom = 'cc6c85a369f741fd6f409627a0f73fd166f7dba6ba1b5be6c55703bb5243e013';
    const heigt = getTipHeight();
    setMiningCfg(pubKey, privKey, blockRandom, heigt, 2);
    console.log('mining config: ', getMiningConfig());

    const commitCfgBkt = persistBucket(CommitteeConfig._$info.name);
    const commitCfg = commitCfgBkt.get<string, [CommitteeConfig]>('CC')[0];
    console.log('commitCfg: ', commitCfg);
    const chainHeadBkt = persistBucket(ChainHead._$info.name);
    if (!isSyncing()) {
        setTimer(() => {
            runMining(getMiningConfig(), commitCfg);

            const chainHead = chainHeadBkt.get<string, [ChainHead]>('CH')[0];
            chainHead.height += 1;
            console.log('chainHead: ', chainHead);
            chainHeadBkt.put('CH', chainHead);
        }, null, 2000);
    }
};

start();
