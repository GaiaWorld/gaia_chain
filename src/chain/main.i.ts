/**
 * main function
 */
import { calcTxHash, getTipHeight } from '../chain/blockchain';
import { INV_MSG_TYPE } from '../net/msg';
import { Inv } from '../net/server/rpc.s';
import { notifyNewBlock, notifyNewTx } from '../net/server/subscribe';
import { setTimer } from '../util/task';
import { buildForgerCommittee, generateTxs } from '../util/test_helper';
import { bestWeightAddr, generateBlock, getCommitteeConfig, getMiningConfig, increaseWeight, isSyncing, newBlockChain } from './blockchain';

const start = (): void => {
    newBlockChain();
    buildForgerCommittee();
    if (!isSyncing()) {
        setTimer(() => {
            increaseWeight();
            console.log('\n==========================================================================================\n');
            const miningCfg = getMiningConfig();
            const cc = getCommitteeConfig();
            const bestAddr = bestWeightAddr();
            console.log('maxGroupNumber: ---------------- ', cc.maxGroupNumber);
            if (getTipHeight() % cc.maxGroupNumber === miningCfg.groupNumber) {
                if (bestAddr === miningCfg.beneficiary) {
                    const block = generateBlock();
                    console.log('\n\ngenerate new block hash  : ------------ ', block.body.headerHash);
                    const invmsg = new Inv();
                    invmsg.hash = block.body.headerHash;
                    invmsg.height = block.header.height;
                    invmsg.MsgType = INV_MSG_TYPE.MSG_BLOCK;

                    // const newTxs = generateTxs(1);
                    // const invmsg2 = new Inv();
                    // invmsg2.hash = calcTxHash(newTxs[0]);
                    // invmsg2.height = 0;
                    // invmsg2.MsgType = INV_MSG_TYPE.MSG_TX;

                    notifyNewBlock(invmsg);
                    // notifyNewTx(invmsg2);
                }
            }
        }, null, 5000);
    }
    
    console.log('starting gaia ......');
};

start();
