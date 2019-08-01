/**
 * main function
 */
import { newBlockChain } from '../chain/blockchain';
import { launch } from '../net/client/launch';

//TODO:JFB set the gensis time
//TODO:JFB simulate transactions 1/2/3/4/5 every 2 seconds

const start = (): void => {
    newBlockChain();
    setTimeout(() => {
        launch();
    }, 10000);
};

start();
