/**
 * main function
 */
import { getCommitteeConfig, newBlockChain, setupLocalMiners } from '../chain/blockchain';
import { broadcastNewTx, runMining } from '../consensus/committee';
import { asyncLaunch } from '../net/client/async_lanuch.p';
import { launch } from '../net/client/launch';
import { isSyncing } from '../net/download';
import { asyncCall } from '../pi_pt/async/async_req';
import { __gc } from '../pi_pt/vm/vm';
import { persistBucket } from '../util/db';
import { setTimer } from '../util/task';
import { Account } from './schema.s';
import { buildSignedSpendTx } from './transaction';
import { addTx2Pool } from './validation';

// print the account info and txs info and forgers
const start = (): void => {
    newBlockChain();
    setupLocalMiners();

    asyncCall(asyncLaunch, [], (): void => {
        setTimeout(() => {
            launch();
        }, 10000);

        console.log(`start networking`);

        let gcCounter = 1;

        setTimer(() => {
            simulateTxs();
            console.log('simulate new tx');

            if (gcCounter % 20 === 0) {
                __gc(null);
            }
        }, null, 3000);

        const committeeCfg = getCommitteeConfig();

        setTimer(() => {
            gcCounter += 1;
            if (!isSyncing()) {
                console.log(`========> start run one mining round`);
                runMining(committeeCfg);
            } else {
                console.log('sync not ready');
            }

            if (gcCounter % 20 === 0) {
                __gc(null);
                gcCounter = 1;
            }
        }, null, 2000);
    });
};

start();

const simulateTxs = (): void => {
    const privKey = 'c5fa6ef149ef9070a86457e11dfcf3ce5b9e038134aca1b8c1e67fb29f4bf5a08544f6274e42c3aae0974f6eda5b6c5e6343b9b2537fbef7a446e4aacc9902b5';
    const pubKey = '8544f6274e42c3aae0974f6eda5b6c5e6343b9b2537fbef7a446e4aacc9902b5';
    const address = '040a7b003d7b3ee3d1a8d462eb4e6c43eaa4c4c6';
    const toAddr = '5a4ea303e408858d4c8a3791a4f9141552ff82f8';

    const accountBkt = persistBucket(Account._$info.name);
    const fromAccount = accountBkt.get<string, [Account]>(address)[0];

    if (fromAccount) {
        const tx = buildSignedSpendTx(privKey, pubKey, fromAccount, toAddr, 2, 1000, 10, '');
        addTx2Pool(tx);
        broadcastNewTx(tx);
        console.log(`=============> build tx: ${JSON.stringify(tx)}`);
    } else {
        console.log('account not found');
    }
};
