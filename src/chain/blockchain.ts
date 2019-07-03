/**
 * block chain
 */

import { Body, ChainHead, CommitteeConfig, Forger, ForgerCommittee, Header, MiningConfig, Transaction, TxType } from './schema.s';

import { NODE_TYPE } from '../net/pNode.s';
import { Inv } from '../net/server/rpc.s';
import { GENESIS } from '../params/genesis';
import { genKeyPairFromSeed, getRand, pubKeyToAddress, sha256, verify } from '../util/crypto';
import { memoryBucket, persistBucket } from '../util/db';
import { calcHeaderHash } from './header';
import { calcTxHash } from './transaction';

export const MAX_BLOCK_SIZE = 10 * 1024 * 1024;

export class Block {
    public header: Header;
    public body: Body;

    public constructor(header: Header, body: Body) {
        this.header = header;
        this.body = body;
    }
}

export const getGenesisHash = (): string => {
    return GENESIS.hash;
};

export const getVersion = (): string => {
    return '0.0.0.1';
};

export const getTipHeight = (): number => {
    const bkt = persistBucket(ChainHead._$info.name);

    return bkt.get<string, [ChainHead]>('CH')[0].height;
};

export const getTipTotalWeight = (): number => {
    const bkt = persistBucket(ChainHead._$info.name);

    return bkt.get<string, [ChainHead]>('CH')[0].totalWeight;
};

export const getServiceFlags = ():number => {
    // TODO
    return 1;
};

export const getNodeType = (): NODE_TYPE => {
    // all node are full node at present
    return NODE_TYPE.FULL_NODE;
};

export const getTx = (invMsg: Inv): Transaction => {
    const bkt = persistBucket(Transaction._$info.name);

    return bkt.get<string, [Transaction]>(invMsg.hash)[0];
};

export const getHeader = (invMsg: Inv): Header => {
    const bkt = persistBucket(Header._$info.name);

    return bkt.get<string, [Header]>(invMsg.hash)[0];
};

export const getBlock = (invMsg: Inv): Block => {
    const headerBkt = persistBucket(Header._$info.name);
    const bodyBkt = persistBucket(Body._$info.name);

    const header = headerBkt.get<string, [Header]>(invMsg.hash)[0];
    const body = bodyBkt.get<string, [Body]>(invMsg.hash)[0];

    return new Block(header, body);
};

export const newTxsReach = (txs: Transaction[]): void => {
    console.log('\n\nnewTxsReach: ---------------------- ', txs);
    for (const tx of txs) {
        if (validateTx(tx)) {
            const txBkt = persistBucket(Transaction._$info.name);
            txBkt.put<string, Transaction>('T' + `${calcTxHash(tx)}`, tx);
            switch (tx.txType) {
                case TxType.ForgerGroupTx:
                    if (tx.forgerGroupTx && tx.forgerGroupTx.AddGroup) {
                        addCommitteeGroup(tx);
                    } else if (tx.forgerGroupTx && !tx.forgerGroupTx.AddGroup) {
                        exitCommitteeGroup(tx);
                    }
                    break;
                case TxType.SpendTx:
                    const txpoolBkt = memoryBucket(TxPool._$info.name);
                    const tp = new TxPool();
                    tp.tx = tx;
                    tp.txHash = calcTxHash(tx);
                    txpoolBkt.put<string, TxPool>(tp.txHash, tp);
                    break;
                case TxType.PenaltyTx:
                    // TODO
                    break;
    
                default:
            }
        }
    }
};

export const newBlocksReach = (bodys: Body[]): void => {
    console.log('\n\nnewBlocksReach: ---------------------- ', bodys);
    // validate blocks
    // add to chain store
    const bodyBkt = persistBucket(Body._$info.name);
    for (const body of bodys) {
        // TODO: add to orphans pool if no parent found
        // TODO: advertise new height to peers
        // TODO: validateBlock(block);
        bodyBkt.put<string, Body>('B' + `${body.headerHash}`, body);
    }

    // TODO: notify peers that we changed our height

    return;
};

export const newHeadersReach = (headers: Header[]): void => {
    console.log('\n\nnewHeadersReach: ---------------------- ', headers);
    // validate headers
    // retrive corresponding body
    // reassemly to a complete block
    // add to chain store
    const bkt = persistBucket(Header._$info.name);
    for (const header of headers) {
        validateHeader(header);
        // TODO: retrive body
        bkt.put<string, Header>('H' + `${calcHeaderHash(header)}`, header);
    }

    return;
};

export const adjustGroupPosistion = (seed: number): void => {
    // 更具随机种子修改两个槽位，

};

// increase weight until it gets the maximum allowed
export const increaseWeight = (): void => {
    // TODO: 只计算本次出块的槽，返回排序后的矿工
    const bkt = persistBucket(ForgerCommittee._$info.name);
    const fc = bkt.get<string, [ForgerCommittee]>('FC')[0];
    const groups = fc.groups;

    const bkt2 = persistBucket(CommitteeConfig._$info.name);
    const cc = bkt2.get<string, [CommitteeConfig]>('CC')[0];

    if (getTipHeight() % cc.maxGroupNumber === 0) {
        for (let i = 0; i < groups.length; i++) {
            for (let j = 0; j < groups[i].length; j++) {
                const maxWeight = groups[i][j].initWeigth * cc.maxAccHeight;
                if (groups[i][j].lastWeight + groups[i][j].initWeigth > maxWeight) {
                    groups[i][j].lastWeight = maxWeight;
                } else {
                    groups[i][j].lastWeight += groups[i][j].initWeigth;
                }
            }
            // console.log('group: ', groups[i]);
        }
    }
    bkt.put('FC', fc);
};

export const isSyncing = (): boolean => {
    return false;
};

export const bestWeightAddr = (round: number): string => {
    const bkt = persistBucket(ForgerCommittee._$info.name);
    const forgers = bkt.get < number, [ForgerCommittee]>(round)[0];

    return forgers.forgers.sort()[0].address;
};

export const getMiningConfig = (): MiningConfig => {
    const bkt = persistBucket(MiningConfig._$info.name);

    return bkt.get<string, [MiningConfig]>('MC')[0];
};

export const getCommitteeConfig = (): CommitteeConfig => {
    const bkt = persistBucket(CommitteeConfig._$info.name);

    return bkt.get<string, [CommitteeConfig]>('CC')[0];
};

// TODO
export const adjustGroup = (): string => {
    return;
};

export const runCommittee = (config: CommitteeConfig): void => {
    // syncing status
};

export const newBlockChain = (): void => {
    // load chain head
    const bkt = persistBucket(ChainHead._$info.name);
    const chainHead = bkt.get<string, [ChainHead]>('CH')[0];
    if (!chainHead) {
        const ch = new ChainHead();
        ch.genesisHash = GENESIS.hash;
        ch.headHash = GENESIS.hash;
        ch.height = 1;
        ch.totalWeight = 0;
        ch.pk = 'CH';

        bkt.put(ch.pk, ch);
    }

    // initialize mining config
    const bkt2 = persistBucket(MiningConfig._$info.name);
    const miningCfg = bkt2.get<string, [MiningConfig]>('MC')[0];
    if (!miningCfg) {
        const mc = new MiningConfig();
        const [privKey, pubKey] = genKeyPairFromSeed(getRand(32));
        mc.beneficiary = pubKeyToAddress(pubKey);
        mc.blsRand = getRand(32);
        mc.groupNumber = 0;
        mc.pubKey = pubKey;
        mc.privateKey = privKey;
        mc.pk = 'MC';
        
        bkt2.put(mc.pk, mc);
    }
    
    // initialize committee config
    const bkt3 = persistBucket(CommitteeConfig._$info.name);
    const committeeCfg = bkt3.get<string, [CommitteeConfig]>('CC')[0];
    if (!committeeCfg) {
        const cc = new CommitteeConfig();
        cc.pk = 'CC';
        cc.blockIterval = 2000;
        cc.maxAccHeight = 150000;
        cc.maxGroupNumber = 5;
        cc.minToken = 10000;
        cc.withdrawReserveBlocks = 256000;

        bkt3.put('CC', cc);
    }
    
    return;
};

// ================================================
// helper function

const validateHeader = (header: Header): boolean => {
    if (header.version !== getVersion()) {
        return false;
    }

    if (Math.abs(header.timestamp - Date.now()) > 1000 * 5) {
        return false;
    }

    if (!headerSignatureValid(header)) {
        return  false;
    }

    return true;
};

const validateBlock = (block: Block): boolean => {
    // version
    if (block.header.version !== getVersion()) {
        return false;
    }
    // timestamp
    if (Math.abs(block.header.timestamp - Date.now()) > 1000 * 5) {
        return false;
    }
    // size
    if (blockPayloadSize(block) > 1024 * 1024 * 10) {
        return false;
    }
    // forger signature
    if (!blockSignatureValid(block)) {
        return false;
    }
    // validate txs
    for (const tx of block.body.txs) {
        if (!validateTx(tx)) {
            return false;
        }
    }

    // tx root hash
    if (!validateTxRootHash(block)) {
        return false;
    }

    // tx receipt hash
    // TODO
    // ...
    
    return true;
};

const blockPayloadSize = (block: Block): number => {
    return 1024 * 1024 * 10 - 1;
};

const blockSignatureValid = (block: Block): boolean => {
    return verify(block.header.signature, block.header.forgerPubkey, block.header.blockRandom);
};

const headerSignatureValid = (header: Header): boolean => {
    return verify(header.signature, header.forgerPubkey, header.blockRandom);
};

const validateTx = (tx: Transaction): boolean => { 
    // tx type
    if (tx.txType === TxType.ForgerGroupTx && !tx.forgerGroupTx) {
        return false;
    }

    if (tx.txType === TxType.PenaltyTx && !tx.penaltyTx) {
        return false;
    }
    // balance
    // TODO
    // signature
    if (!txSignatureValid(tx)) {
        return false;
    }
    // ...

    return true;
};

const validateTxRootHash = (block: Block): boolean => {
    // TODO: merkle hash of all txs
    return true;
};

const txSignatureValid = (tx: Transaction): boolean => {
    // return verify(tx.signature, tx.from, calcTxHash(tx));
    return true;
};

const addCommitteeGroup = (tx: Transaction): void => {
    if (tx.txType !== TxType.ForgerGroupTx && !tx.forgerGroupTx) {
        throw new Error('expect ForgeerGroupTx tx type');
    }

    const bkt = persistBucket(ForgerCommittee._$info.name);
    const committee = bkt.get<string, [ForgerCommittee]>('FC')[0];
    const forger = new Forger();
    const inv = new Inv();
    inv.height = getTipHeight();
    const block = getBlock(inv);
    forger.lastHeight = getTipHeight();
    forger.pubKey = tx.forgerGroupTx.pubKey;
    forger.stake = tx.forgerGroupTx.stake;
    forger.groupNumber = deriveGroupNumber(forger.address, block.header.blockRandom, forger.lastHeight);
    const rate = deriveRate(forger.address, block.header.blockRandom, forger.lastHeight);
    forger.initWeigth = (Math.log(forger.stake * 0.01) / Math.log(10)) * rate;
    forger.lastWeight = 0;
    forger.address = pubKeyToAddress(forger.pubKey);

    committee.waitsForAdd.set(tx.forgerGroupTx.pubKey, forger);

    return;
};

const exitCommitteeGroup = (tx: Transaction): void => {
    if (tx.txType !== TxType.ForgerGroupTx && !tx.forgerGroupTx) {
        throw new Error('expect ForgeerGroupTx tx type');
    }

    const bkt = persistBucket(ForgerGroupTx._$info.name);
    const committee = bkt.get<string, [ForgerCommittee]>('FC')[0];

    const forger = new Forger();
    // only set this field
    forger.lastHeight = getTipHeight();

    committee.waitsForRemove.set(tx.forgerGroupTx.pubKey, forger);

    return;
};
