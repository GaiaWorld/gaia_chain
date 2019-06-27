/**
 * main function
 */
import { getTipHeight } from '../chain/blockchain';
import { setTimer } from '../util/task';
import { buildForgerCommittee } from '../util/test_helper';
import { bestWeightAddr, generateBlock, getCommitteeConfig, getMiningConfig, increaseWeight, isSyncing, newBlockChain } from './blockchain';

const start = (): void => {
    newBlockChain();
    buildForgerCommittee();
    if (!isSyncing()) {
        setTimer(() => {
            increaseWeight();
            console.log('==============');
            const miningCfg = getMiningConfig();
            const cc = getCommitteeConfig();
            const bestAddr = bestWeightAddr();
            console.log('maxGroupNumber: ', cc.maxGroupNumber);
            if (getTipHeight() % cc.maxGroupNumber === miningCfg.groupNumber) {
                if (bestAddr === miningCfg.beneficiary) {
                    generateBlock();
                }
            }
        }, null, 2000);
    }
    
    console.log('starting gaia ......');
};

start();
