/**
 * main function
 */
import { getCommitteeConfig, newBlockChain } from '../chain/blockchain';
import { runMining } from '../consensus/committee';
import { launch } from '../net/client/launch';
import { isSyncing } from '../net/download';
import { setTimer } from '../util/task';

// TODO:JFB set the gensis time
const start = (): void => {
    newBlockChain();
    setTimeout(() => {
        launch();
    }, 10000);

    const committeeCfg = getCommitteeConfig();

    setTimer(() => {
        if (!isSyncing()) {
            runMining(committeeCfg);
        } else {
            console.log('sync not ready');
        }
    }, null, 1000);
};

start();
