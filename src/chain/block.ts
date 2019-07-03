import { persistBucket } from '../util/db';
import { Block, getVersion } from './blockchain';
import { calcHeaderHash } from './header';
import { Body, ChainHead, Forger, Header, MiningConfig, Transaction } from './schema.s';
import { calcTxHash, merkleRootHash, serializeTx } from './transaction';

// TODO: 如何给矿工手续费
export const generateBlock = (forger: Forger, chainHead: ChainHead, miningCfg: MiningConfig, txs: Transaction[]): Block => {
    const headerBkt = persistBucket(Header._$info.name);
    const bodyBkt = persistBucket(Body._$info.name);

    const header = new Header();
    header.forger = miningCfg.beneficiary;
    header.forgerPubkey = miningCfg.pubKey;
    header.height = chainHead.height + 1;
    header.prevHash = chainHead.headHash;
    // not used right now
    header.receiptRoot = '0';
    header.timestamp = Date.now();
    header.totalWeight = chainHead.totalWeight + forger.lastWeight;
    header.txRootHash = calcTxRootHash(txs);
    header.version = getVersion();
    header.weight = forger.lastWeight;
    header.blockRandom = miningCfg.blsRand;
    header.groupNumber = forger.groupNumber;

    header.bhHash = calcHeaderHash(header);

    // store header
    headerBkt.put(header.bhHash, header);

    const body = new Body();
    body.bhHash = calcHeaderHash(header);
    body.txs = txs;

    // store body
    bodyBkt.put(body.bhHash, body);

    return new Block(header, body);
};

const calcTxRootHash = (txs: Transaction[]): string => {
    const txHashes = [];
    for (const tx of txs) {
        txHashes.push(calcTxHash(serializeTx(tx)));
    }

    return merkleRootHash(txHashes);
};