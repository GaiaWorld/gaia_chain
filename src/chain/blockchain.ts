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
import { Account, Body, ChainHead, CommitteeConfig, DBBody, DBTransaction, Forger, ForgerCommittee, ForgerCommitteeTx, ForgerWaitAdd, ForgerWaitExit, Header, Height2Hash, MiningConfig, PenaltyTx, Transaction, TxType } from './schema.s';
import { calcTxHash, serializeTx } from './transaction';

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

// retrive transaction to peer
export const getTx = (invMsg: Inv): Transaction => {
    const dbTxbkt = persistBucket(DBTransaction._$info.name);
    const forgerCommitteeBkt = persistBucket(ForgerCommittee._$info.name);
    const dbtx = dbTxbkt.get<string, [DBTransaction]>(invMsg.hash)[0];
    const tx = new Transaction();

    if (dbtx.txType === TxType.ForgerGroupTx) {
        const forgerTx = forgerCommitteeBkt.get<string, [ForgerCommitteeTx]>(dbtx.forgerTx)[0];
        tx.forgerTx = forgerTx;
    } else if (dbtx.txType === TxType.PenaltyTx) {
        const penaltyTx = forgerCommitteeBkt.get<string, [PenaltyTx]>(dbtx.penaltyTx)[0];
        tx.penaltyTx = penaltyTx;
    }

    return tx;
};

// retrive header to peer
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

// retrive block from local to peer
export const getBlock = (invMsg: Inv): Block => {
    const headerBkt = persistBucket(Header._$info.name);
    const bodyBkt = persistBucket(DBBody._$info.name);
    const txBkt = persistBucket(DBTransaction._$info.name);
    const forgerCommitteeBkt = persistBucket(ForgerCommittee._$info.name);

    const header = headerBkt.get<string, [Header]>(invMsg.hash)[0];
    const dbBody = bodyBkt.get<string, [DBBody]>(invMsg.hash)[0];

    const body = new Body();
    const txs = [];

    for (const tx of dbBody.txs) {
        const dbTx = txBkt.get<string, [DBTransaction]>(tx)[0];
        const newTx = new Transaction();
        if (dbTx.txType === TxType.ForgerGroupTx) {
            const forgerTx = forgerCommitteeBkt.get<string, [ForgerCommitteeTx]>(dbTx.forgerTx)[0];
            newTx.forgerTx = forgerTx;
        } else if (dbTx.txType === TxType.PenaltyTx) {
            const penaltyTx = forgerCommitteeBkt.get<string, [PenaltyTx]>(dbTx.penaltyTx)[0];
            newTx.penaltyTx = penaltyTx;
        }
        txs.push(newTx);
    }
    body.txs = txs;

    return new Block(header, body);
};

// new transactions from peer
export const newTxsReach = (txs: Transaction[]): void => {
    console.log('\n\nnewTxsReach: ---------------------- ', txs);
    for (const tx of txs) {
        if (simpleVerifyTx(tx)) {
            // TODO: add to tx pool
            addTx2Pool(tx);
        }
    }
};

// new blocks from peer
export const newBlocksReach = (bodys: Body[]): void => {
    console.log('\n\nnewBlocksReach: ---------------------- ', bodys);
    const waitForAddForgers = new ForgerWaitAdd();
    const waitForExitForgers = new ForgerWaitExit();
    const currentHeight = getTipHeight();
    const dbBodyBkt = persistBucket(DBBody._$info.name);
    const headerBkt = persistBucket(Header._$info.name);
    const accountBkt = persistBucket(Account._$info.name);

    for (const body of bodys) {
        const txHashes = [];
        let minerFee = 0;
        for (const tx of body.txs) {
            // all tx is fixed fee at present
            minerFee += 21000;
            if (validateTx(tx)) {
                txHashes.push(calcTxHash(serializeTx(tx)));
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
            const header = headerBkt.get<string, [Header]>(body.bhHash)[0];

            if (minerFee > 0) {
                const account = accountBkt.get<string, [Account]>(header.forger)[0];
                account.inputAmount += minerFee;
                // give miner fee to forger
                accountBkt.put(account.address, account);
            }
        }
        dbBodyBkt.put(body.bhHash, txHashes);
    }

    // update forger committee info
    const forgerWaitAddBkt = persistBucket(ForgerWaitAdd._$info.name);
    const forgerWaitExitBkt = persistBucket(ForgerWaitExit._$info.name);

    forgerWaitAddBkt.put(getTipHeight(), waitForAddForgers);
    forgerWaitExitBkt.put(getTipHeight(), waitForExitForgers);

    return;
};

// new Headers from peer
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
