/**
 * main function
 */
import { getCommitteeConfig, newBlockChain, tx2DbTx } from '../chain/blockchain';
import { broadcastNewTx, runMining } from '../consensus/committee';
import { launch } from '../net/client/launch';
import { isSyncing } from '../net/download';
import { persistBucket } from '../util/db';
import { setTimer } from '../util/task';
import { Account, DBTransaction } from './schema.s';
import { buildSignedSpendTx } from './transaction';
import { addTx2Pool } from './validation';

// print the account info and txs info and forgers
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

    let value = 1;
    setTimer(() => {
        simulateTxs(value);
        value += 1;
    }, null, 2000);
};

start();

const simulateTxs = (value: number): void => {
    const privKey = 'c5fa6ef149ef9070a86457e11dfcf3ce5b9e038134aca1b8c1e67fb29f4bf5a08544f6274e42c3aae0974f6eda5b6c5e6343b9b2537fbef7a446e4aacc9902b5';
    const pubKey = '8544f6274e42c3aae0974f6eda5b6c5e6343b9b2537fbef7a446e4aacc9902b5';
    const address = '040a7b003d7b3ee3d1a8d462eb4e6c43eaa4c4c6';
    const toAddr = '5a4ea303e408858d4c8a3791a4f9141552ff82f8';

    const accountBkt = persistBucket(Account._$info.name);
    const fromAccount = accountBkt.get<string, [Account]>(address)[0];

    if (fromAccount) {
        const tx = buildSignedSpendTx(privKey, pubKey, fromAccount, toAddr, value, 20, 10, '');
        addTx2Pool(tx);

        const dbTxbkt = persistBucket(DBTransaction._$info.name);
        dbTxbkt.put(tx.txHash, tx2DbTx(tx));
    
        broadcastNewTx(tx);
        console.log(`=============> build tx: ${JSON.stringify(tx)}`);
    } else {
        console.log('account not found');
    }
};
