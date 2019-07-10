import { buf2Hex, getRand, hex2Buf, sign } from '../util/crypto';
import { persistBucket } from '../util/db';
import { Block, getVersion } from './blockchain';
import { calcHeaderHash } from './header';
import { Body, ChainHead, CommitteeConfig, Forger, Header, Height2Hash, MiningConfig, Transaction } from './schema.s';
import { calcTxHash, merkleRootHash, serializeTx } from './transaction';

export const generateBlock = (forger: Forger, chainHead: ChainHead, miningCfg: MiningConfig, committeeCfg: CommitteeConfig, txs: Transaction[]): Block => {
    const header = new Header();
    header.forger = miningCfg.beneficiary;
    header.pubkey = miningCfg.pubKey;
    header.forgerPubkey = miningCfg.pubKey;
    header.height = chainHead.height + 1;
    header.prevHash = chainHead.headHash;
    // not used right now
    header.receiptRoot = '0';
    header.timestamp = Date.now();
    header.weight = forger.initWeight * (header.height - forger.addHeight - committeeCfg.withdrawReserveBlocks);
    header.totalWeight = chainHead.totalWeight + header.weight;
    header.txRootHash = calcTxRootHash(txs);
    header.version = getVersion();
    header.blockRandom = buf2Hex(getRand(32));
    header.groupNumber = forger.groupNumber;
    header.bhHash = calcHeaderHash(header);
    // sign the whole block
    header.signature = buf2Hex(sign(hex2Buf(miningCfg.privateKey), hex2Buf(header.bhHash)));

    const body = new Body();
    body.bhHash = header.bhHash;
    body.txs = txs;

    return new Block(header, body);
};

export const calcTxRootHash = (txs: Transaction[]): string => {
    const txHashes = [];
    for (const tx of txs) {
        txHashes.push(calcTxHash(serializeTx(tx)));
    }

    return merkleRootHash(txHashes);
};

export const getBlockHashByHeight = (height: number): string => {
    const height2HashBkt = persistBucket(Height2Hash._$info.name);
    const hash = height2HashBkt.get<number, [Height2Hash]>(height)[0];

    return hash.bhHash;
};