/**
 * block chain
 */

import { deriveInitWeight } from '../consensus/committee';
import { INV_MSG_TYPE } from '../net/msg';
import { NODE_TYPE } from '../net/pNode.s';
import { Inv } from '../net/server/rpc.s';
import { GENESIS } from '../params/genesis';
import { persistBucket } from '../util/db';
import { addTx2Pool, simpleVerifyTx } from '../validation';
import { calcHeaderHash } from './header';
import { Account, Body, ChainHead, CommitteeConfig, Forger, ForgerCommittee, ForgerWaitAdd, ForgerWaitExit, Header, Height2Hash, MiningConfig, Transaction, TxType } from './schema.s';

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

export const getHeaderByHeight = (height:number):Header|undefined => {
    const bkt = persistBucket(Height2Hash._$info.name);
    const height2Hash = bkt.get<number,[Height2Hash]>(height)[0];
    if (height2Hash === undefined) {

        return;
    }
    const invMsg = new Inv();
    invMsg.MsgType = INV_MSG_TYPE.MSG_BLOCK;
    invMsg.height = height;
    invMsg.hash = height2Hash.bhHash;
    
    return getHeader(invMsg);
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
        if (simpleVerifyTx(tx)) {
            // TODO: add to tx pool
            addTx2Pool(tx);
        }
    }
};

export const newBlocksReach = (bodys: Body[]): void => {
    console.log('\n\nnewBlocksReach: ---------------------- ', bodys);
    const waitForAddForgers = new ForgerWaitAdd();
    const waitForExitForgers = new ForgerWaitExit();
    const currentHeight = getTipHeight();
    const bodyBkt = persistBucket(Body._$info.name);
    for (const body of bodys) {
        // store body
        bodyBkt.put<string, Body>(body.bhHash, body);
        for (const tx of body.txs) {
            if (validateTx(tx)) {
                switch (tx.txType) {
                    case TxType.ForgerGroupTx:
                        const forger = new Forger();
                        forger.address = tx.forgerTx.address;
                        forger.groupNumber = currentHeight % getCommitteeConfig().maxGroupNumber;
                        forger.initWeight = 0;
                        forger.addHeight = currentHeight;
                        forger.pubKey = tx.pubKey;
                        forger.stake = tx.forgerTx.stake;

                        if (tx.forgerTx.AddGroup === true) {
                            waitForAddForgers.height = currentHeight;
                            waitForAddForgers.forgers.push(forger);
    
                        } else if (tx.forgerTx.AddGroup === false) {
                            waitForExitForgers.height = currentHeight;
                            waitForExitForgers.forgers.push(forger);
                        }
                        break;
                    case TxType.SpendTx:
                        const accountBkt = persistBucket(Account._$info.name);
                        const fromAccount = accountBkt.get<string, [Account]>(tx.from)[0];
                        const toAccount = accountBkt.get<string, [Account]>(tx.to)[0];

                        if (fromAccount) {
                            fromAccount.nonce += 1;
                            fromAccount.outputAmount += tx.value;
                        } else {
                            throw new Error('unknown account spending');
                        }

                        if (toAccount) {
                            toAccount.inputAmount += tx.value;
                        } else {
                            // create new account in db
                            const newAccount = new Account();
                            newAccount.address = tx.to;
                            newAccount.nonce = 0;
                            newAccount.inputAmount = tx.value;
                            newAccount.outputAmount = 0;
                        }
                        // update account info
                        accountBkt.put([fromAccount.address, toAccount.address], [fromAccount, toAccount]);

                        break;
                    case TxType.PenaltyTx:
                        // TODO
                        break;
                    default:
                }
            }
        }
    }

    // update forger committee info
    const forgerWaitAddBkt = persistBucket(ForgerWaitAdd._$info.name);
    const forgerWaitExitBkt = persistBucket(ForgerWaitExit._$info.name);

    forgerWaitAddBkt.put(getTipHeight(), waitForAddForgers);
    forgerWaitExitBkt.put(getTipHeight(), waitForExitForgers);

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
        bkt.put<string, Header>(calcHeaderHash(header), header);
    }

    return;
};

export const isSyncing = (): boolean => {
    return false;
};

export const getMiningConfig = (): MiningConfig => {
    const bkt = persistBucket(MiningConfig._$info.name);

    return bkt.get<string, [MiningConfig]>('MC')[0];
};

export const getCommitteeConfig = (): CommitteeConfig => {
    const bkt = persistBucket(CommitteeConfig._$info.name);

    return bkt.get<string, [CommitteeConfig]>('CC')[0];
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
        // mc.beneficiary = GENESIS.allocs[0].address;
        mc.beneficiary = '49fb96e79b3b3ac56d2789001534f7ae47c21200';
        mc.groupNumber = 1;
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

    // initialize all pre configured forgers
    const forgerBkt = persistBucket(Forger._$info.name);
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
            f.addHeight = 0;
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
                    // store to Forger bucket
                    forgerBkt.put(forgers[j].address, forgers[j]);
                }
            }
            fc.slot = i;
            fc.forgers = groupForgers;
            forgerCommitteeBkt.put(fc.slot, fc);
        }
    }

    return;
};
