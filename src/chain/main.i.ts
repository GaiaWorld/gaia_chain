/**
 * main function
 */
import { getTipHeight } from '../chain/blockchain';
import { INV_MSG_TYPE } from '../net/msg';
import { Inv } from '../net/server/rpc.s';
import { notifyNewBlock } from '../net/server/subscribe';
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
                    const block = generateBlock();
                    console.log('blcok header: ------------ ', block.header);
                    console.log('block.body  : ------------ ', block.body.txs);
                    const invmsg = new Inv();
                    invmsg.hash = block.body.headerHash;
                    invmsg.height = block.header.height;
                    invmsg.MsgType = INV_MSG_TYPE.MSG_BLOCK;

                    notifyNewBlock(invmsg);
                }
            }
        }, null, 2000);
    }
    
    console.log('starting gaia ......');
};

start();
