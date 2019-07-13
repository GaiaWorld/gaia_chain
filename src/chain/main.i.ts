/**
 * main function
 */
import { newBlockChain } from '../chain/blockchain';
import { launch } from '../net/client/launch';

const start = (): void => {
    newBlockChain();
    setTimeout(() => {
        launch();
    }, 10000);
};

start();
