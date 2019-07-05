/**
 * main function
 */
import { getTipHeight } from '../chain/blockchain';
import { INV_MSG_TYPE } from '../net/msg';
import { Inv } from '../net/server/rpc.s';
import { notifyNewBlock, notifyNewTx } from '../net/server/subscribe';
import { setTimer } from '../util/task';
import { isSyncing, newBlockChain } from './blockchain';

const start = (): void => {
    newBlockChain();
    if (!isSyncing()) {
        setTimer(() => {
            // TODO
            console.log('xxxxxxxxx');
        }, null, 5000);
    }
    
    console.log('starting gaia ......');
};

start();
