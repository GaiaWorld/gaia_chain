/** 
 * test helpers
 */

import { Block } from '../chain/blockchain';
import { calcHeaderHash, serializeHeader, signHeader } from '../chain/header';
import { ChainHead, DBBody, Forger, ForgerCommittee, Header, Height2Hash, Transaction } from '../chain/schema.s';
import { signTx } from '../chain/transaction';
import { deriveInitWeight } from '../consensus/committee';
import { GENESIS } from '../params/genesis';
import { buf2Hex, genKeyPairFromSeed, getRand, hex2Buf, pubKeyToAddress } from './crypto';
import { persistBucket } from './db';

export const generateTxs = (len: number): Transaction[] => {
    const txBkt = persistBucket(Transaction._$info.name);
    const res = [];
    for (let i = 0; i < len; i++) {
        const [privKey, pubKey] = genKeyPairFromSeed(getRand(32));

        const t = new Transaction();
        t.gas = getRand(1)[0];
        t.txType = 0;
        t.from = pubKeyToAddress(pubKey);
        t.to = pubKeyToAddress(pubKey);
        t.price = getRand(1)[0];
        t.value = getRand(1)[0];
        t.nonce = getRand(1)[0];
        t.payload = 'abc';
        t.lastOutputValue = getRand(1)[0];

        signTx(privKey, t);
        t.signature = t.signature;

        txBkt.put(t.txHash, t);
        res.push(t);
    }

    return res;
};

export const generateAccounts = (len: number): void => {
    for (let i = 0; i < len; i++) {
        const [privKey, pubKey] = genKeyPairFromSeed(getRand(32));
        const address = pubKeyToAddress(pubKey);
        const balance = parseInt(buf2Hex(getRand(4)), 16) % 100000;

        console.log('{');
        console.log('address: ', `'${address}',`);
        console.log('pubKey: ', `'${buf2Hex(pubKey)}',`);
        console.log('privKey: ', `'${buf2Hex(privKey)}',`);
        console.log('balance: ', balance);
        console.log('},');
        console.log('\n');
    }

    return;
};

export const generateMiners = (len: number): void => {
    const bkt = persistBucket(ForgerCommittee._$info.name);
    for (let i = 0; i < len; i++) {
        console.log('group number ====================== ', i);
        let count = 0;
        const forgers = [];
        // tslint:disable-next-line:no-constant-condition
        while (true) {
            const [privKey, pubKey] = genKeyPairFromSeed(getRand(32));
            const address = pubKeyToAddress(pubKey);
            const groupNumber = parseInt(address.slice(address.length - 2), 16);
            const stake = new DataView(getRand(4).buffer).getUint32(0) % 100000 + 10000;
            if (groupNumber === i) {
                count += 1;
                console.log('{');
                console.log('address: ', `'${address}',`);
                console.log('pubKey: ', `'${buf2Hex(pubKey)}',`);
                console.log('privKey: ', `'${buf2Hex(privKey)}',`);
                console.log('stake: ', stake);
                console.log('},');
                console.log('\n');

                const forger = new Forger();
                forger.address = address;
                forger.groupNumber = i;
                forger.initWeight = deriveInitWeight(address, GENESIS.blockRandom, 0, stake);
                forger.addHeight = 0;
                forger.pubKey = buf2Hex(pubKey);
                forger.stake = stake;

                forgers.push(forger);

            }
            
            if (count >= 5) {
                break;
            }
        }

        const fc = new ForgerCommittee();
        fc.slot = i;
        fc.forgers = forgers;

        bkt.put(fc.slot, fc);
    }

    return;
};

export const generateMockChain = (len: number): void => {
    const headerBkt = persistBucket(Header._$info.name);
    const bodyBkt = persistBucket(DBBody._$info.name);
    const height2HashBkt = persistBucket(Height2Hash._$info.name);
    const chainHeadBkt = persistBucket(ChainHead._$info.name);
    for (let i = 1; i < len; i++) {
        const header = new Header();
        const [privKey, pubKey] = genKeyPairFromSeed(getRand(32));
        header.blockRandom = buf2Hex(getRand(32));
        header.forgerPubkey = buf2Hex(getRand(32));
        header.forger = pubKeyToAddress(hex2Buf(header.forgerPubkey));
        header.groupNumber = i %  2;
        header.height = i;
        header.prevHash = buf2Hex(getRand(32));
        header.pubkey = buf2Hex(pubKey);
        header.receiptRoot = '0';
        header.timestamp = Date.now();
        header.totalWeight = parseInt(buf2Hex(getRand(4)), 16);
        header.txRootHash = '0';
        header.version = '0.0.0.1';
        header.weight = parseInt(buf2Hex(getRand(4)), 16);

        header.bhHash = calcHeaderHash(header);
        header.signature = signHeader(header, buf2Hex(privKey));

        const body = new DBBody();
        body.bhHash = header.bhHash;
        body.txs = [];

        headerBkt.put(header.bhHash, header);
        bodyBkt.put(body.bhHash, body);

        const h2h = new Height2Hash();
        h2h.bhHash = header.bhHash;
        h2h.height = header.height;
        height2HashBkt.put(h2h.height, h2h);

        const chainHead = new ChainHead();
        chainHead.genesisHash = '';
        chainHead.headHash = header.bhHash;
        chainHead.height = i;
        chainHead.pk = 'CH';
        chainHead.prevHash = '0';
        chainHead.totalWeight = header.totalWeight;

        chainHeadBkt.put(chainHead.pk, chainHead);
    }

};