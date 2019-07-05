/**
 * block chain
 */

import { deriveInitWeight } from '../consensus/committee';
import { NODE_TYPE } from '../net/pNode.s';
import { Inv } from '../net/server/rpc.s';
import { GENESIS } from '../params/genesis';
import { hex2Buf } from '../util/crypto';
import { memoryBucket, persistBucket } from '../util/db';
import { calcHeaderHash } from './header';
import { Body, ChainHead, CommitteeConfig, Forger, ForgerCommittee, Header, MiningConfig, Transaction, TxType } from './schema.s';
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
    const chainHeadBkt = persistBucket(ChainHead._$info.name);
    const chainHead = chainHeadBkt.get<string, [ChainHead]>('CH')[0];
    if (!chainHead) {
        const ch = new ChainHead();
        ch.genesisHash = GENESIS.hash;
        ch.headHash = GENESIS.hash;
        ch.height = 1;
        ch.totalWeight = 0;
        ch.pk = 'CH';

        chainHeadBkt.put(ch.pk, ch);
    }

    // initialize mining config
    const bkt2 = persistBucket(MiningConfig._$info.name);
    const miningCfg = bkt2.get<string, [MiningConfig]>('MC')[0];
    if (!miningCfg) {
        const mc = new MiningConfig();
        // load defalut miner config
        mc.beneficiary = GENESIS.allocs[0].address;
        mc.groupNumber = 0;
        mc.pubKey = GENESIS.allocs[0].pubKey;
        mc.privateKey = GENESIS.allocs[0].privKey;
        mc.pk = 'MC';
        
        bkt2.put(mc.pk, mc);
    }
    
    // initialize committee config
    const committeeCfgBkt = persistBucket(CommitteeConfig._$info.name);
    const committeeCfg = committeeCfgBkt.get<string, [CommitteeConfig]>('CC')[0];
    if (!committeeCfg) {
        const cc = new CommitteeConfig();
        cc.pk = 'CC';
        cc.blockIterval = 2000;
        cc.maxAccHeight = 150000;
        cc.maxGroupNumber = 5;
        cc.minToken = 10000;
        cc.withdrawReserveBlocks = 256000;

        committeeCfgBkt.put('CC', cc);
    }

    // load pre configured miners from genesis file
    const forgerCommitteeBkt = persistBucket(ForgerCommittee._$info.name);
    const forgerCommittee = forgerCommitteeBkt.get<number, [ForgerCommittee]>(0)[0];
    if (!forgerCommittee) {
        const preConfiguredForgers = GENESIS.allocs;
        const forgers = [];
        for (let i = 0; i < preConfiguredForgers.length; i++) {
            const f = new Forger();
            f.address = preConfiguredForgers[i].address;
            f.initWeight = deriveInitWeight(f.address, GENESIS.blockRandom, 0, preConfiguredForgers[i].stake);
            f.lastHeight = 0;
            f.lastWeight = 0;
            f.pubKey = preConfiguredForgers[i].pubKey;
            f.stake = preConfiguredForgers[i].stake;

            forgers.push(f);
        }

        for (let i = 0; i < GENESIS.totalGroups; i++) {
            const fc = new ForgerCommittee();
            const groupForgers = [];
            for (let j = 0; j < forgers.length; j++) {
                forgers[j].groupNumber = i;
                if (parseInt(forgers[j].address.slice(forgers[j].address.length - 2), 16) === i) {
                    groupForgers.push(forgers[j]);
                }
            }
            fc.slot = i;
            fc.forgers = groupForgers;
            forgerCommitteeBkt.put(fc.slot, fc);
        }
    }

    return;
};
