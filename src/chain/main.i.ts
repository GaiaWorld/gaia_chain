/**
 * main function
 */
import { newBlockChain } from '../chain/blockchain';
import { launch } from '../net/client/launch';

//TODO:JFB set the gensis time
const start = (): void => {
    newBlockChain();
    setTimeout(() => {
        launch();
    }, 10000);
};

start();
