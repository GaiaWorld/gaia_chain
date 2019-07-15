/**
 * block chain
 */

import { deriveInitWeight, updateChainHead } from '../consensus/committee';
import { INV_MSG_TYPE } from '../net/msg';
import { NODE_TYPE } from '../net/pNode.s';
import { Inv } from '../net/server/rpc.s';
import { GENESIS } from '../params/genesis';
import { persistBucket } from '../util/db';
import { Account, Body, ChainHead, CommitteeConfig, DBBody, DBTransaction, Forger, ForgerCommittee, ForgerCommitteeTx, ForgerWaitAdd, ForgerWaitExit, Header, Height2Hash, Miner, PenaltyTx, Transaction, TxType } from './schema.s';
import { calcTxHash, serializeTx } from './transaction';
import { addTx2Pool, MIN_GAS, simpleValidateHeader, simpleValidateTx, validateBlock } from './validation';

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
    const dbtx = dbTxbkt.get<string, [DBTransaction]>(invMsg.hash)[0];

    return dbTx2Tx(dbtx);
};

// convert DBTransaction to Transaction
const dbTx2Tx = (dbtx: DBTransaction): Transaction => {
    const forgerCommitteeBkt = persistBucket(ForgerCommittee._$info.name);
    const tx = new Transaction();
    
    tx.from = dbtx.from;
    tx.gas = dbtx.gas;
    tx.lastInputValue = dbtx.lastInputValue;
    tx.lastOutputValue = dbtx.lastOutputValue;
    tx.nonce = dbtx.nonce;
    tx.payload = dbtx.payload;
    tx.price = dbtx.price;
    tx.pubKey = dbtx.pubKey;
    tx.signature = dbtx.signature;
    tx.to = dbtx.to;
    tx.txHash = dbtx.txHash;
    tx.txType = dbtx.txType;
    tx.value = dbtx.value;

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

    const header = headerBkt.get<string, [Header]>(invMsg.hash)[0];
    const dbBody = bodyBkt.get<string, [DBBody]>(invMsg.hash)[0];

    const body = new Body();
    const txs = [];

    for (const tx of dbBody.txs) {
        const dbTx = txBkt.get<string, [DBTransaction]>(tx)[0];
        txs.push(dbTx2Tx(dbTx));
    }
    body.bhHash = invMsg.hash;
    body.txs = txs;

    return new Block(header, body);
};

// new transactions from peer
export const newTxsReach = (txs: Transaction[]): void => {
    console.log('\n\nnewTxsReach: ---------------------- ', txs);
    for (const tx of txs) {
        if (simpleValidateTx(tx)) {
            addTx2Pool(tx);
        }
    }
};

// new blocks from peer
export const newBlockBodiesReach = (bodys: Body[]): void => {
    console.log('\n\nnewBlockBodiesReach: ---------------------- ', bodys);
    const waitForAddForgers = new ForgerWaitAdd();
    const waitForExitForgers = new ForgerWaitExit();
    const currentHeight = getTipHeight();
    const dbBodyBkt = persistBucket(DBBody._$info.name);
    const headerBkt = persistBucket(Header._$info.name);
    const accountBkt = persistBucket(Account._$info.name);

    for (const body of bodys) {
        const header = headerBkt.get<string, [Header]>(body.bhHash)[0];
        const block = new Block(header, body);
        if (validateBlock(block)) {
            const txHashes = [];
            let minerFee = 0;
            for (const tx of body.txs) {
                // all tx is fixed fee at present
                minerFee += MIN_GAS * tx.price;
                txHashes.push(calcTxHash(serializeTx(tx)));
                switch (tx.txType) {
                    case TxType.ForgerGroupTx:
                        const forger = new Forger();
                        forger.address = tx.forgerTx.address;
                        forger.groupNumber = currentHeight % getCommitteeConfig().maxGroupNumber;
                        forger.initWeight = deriveInitWeight(forger.address, header.blockRandom, currentHeight, tx.forgerTx.stake);
                        forger.addHeight = currentHeight;
                        forger.pubKey = tx.pubKey;
                        forger.stake = tx.forgerTx.stake;

                        // tx that forger want to add to forger committee
                        if (tx.forgerTx.AddGroup === true) {
                            waitForAddForgers.height = currentHeight;
                            waitForAddForgers.forgers.push(forger);
                        // tx that forger want to leave forger committee
                        } else if (tx.forgerTx.AddGroup === false) {
                            waitForExitForgers.height = currentHeight;
                            waitForExitForgers.forgers.push(forger);
                        }
                        break;
                    case TxType.SpendTx:
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

                            accountBkt.put(newAccount.address, newAccount);
                        }
                        // update account info
                        accountBkt.put([fromAccount.address, toAccount.address], [fromAccount, toAccount]);

                        break;
                    case TxType.PenaltyTx:
                        // TODO
                        break;
                    default:
                }

                if (minerFee > 0) {
                    const forgerAccount = accountBkt.get<string, [Account]>(header.forger)[0];
                    forgerAccount.inputAmount += minerFee;
                    // give miner fee to forger
                    // TODO: delay forger reward
                    accountBkt.put(forgerAccount.address, forgerAccount);
                }
            }
            dbBodyBkt.put(body.bhHash, txHashes);
            updateChainHead(header);
        } else {
            // TODO: ban peer
        }
    }

    // update forger committee info
    const height = getTipHeight();
    if (waitForAddForgers.forgers && waitForAddForgers.forgers.length > 0) {
        const forgerWaitAddBkt = persistBucket(ForgerWaitAdd._$info.name);
        forgerWaitAddBkt.put(height, waitForAddForgers);
    }
    if (waitForExitForgers.forgers && waitForExitForgers.forgers.length > 0) {
        const forgerWaitExitBkt = persistBucket(ForgerWaitExit._$info.name);
        forgerWaitExitBkt.put(height, waitForExitForgers);
    }

    return;
};

// new Headers from peer
export const newHeadersReach = (headers: Header[]): void => {
    console.log('\n\nnewHeadersReach: ---------------------- ', headers);

    const headerBkt = persistBucket(Header._$info.name);
    const height2HashBkt = persistBucket(Height2Hash._$info.name);
    const height2Hash = new Height2Hash();
    for (const header of headers) {
        if (simpleValidateHeader(header)) {
            headerBkt.put(header.bhHash, header);
            height2Hash.height = header.height;
            height2Hash.bhHash = header.bhHash;
            height2HashBkt.put(header.height, height2Hash);
        }
    }

    return;
};

export const getMiner = (address: string): Miner => {
    const bkt = persistBucket(Miner._$info.name);

    return bkt.get<string, [Miner]>(address)[0];
};

export const getCommitteeConfig = (): CommitteeConfig => {
    const bkt = persistBucket(CommitteeConfig._$info.name);

    return bkt.get<string, [CommitteeConfig]>('CC')[0];
};

export const newBlockChain = (): void => {
    // load chain head
    const chainHeadBkt = persistBucket(ChainHead._$info.name);
    const chainHead = chainHeadBkt.get<string, [ChainHead]>('CH')[0];

    if (chainHead) {
        return;
    }

    if (!chainHead) {
        const ch = new ChainHead();
        ch.genesisHash = GENESIS.hash;
        ch.headHash = GENESIS.hash;
        // genesis parent hash is empty string
        ch.prevHash = '';
        ch.height = 0;
        ch.totalWeight = 0;
        ch.pk = 'CH';

        chainHeadBkt.put(ch.pk, ch);
    }

    setupInitialAccounts();
    initCommitteeConfig();
    initPreConfiguredForgers();

    return;
};

const setupInitialAccounts = (): void => {
    // setup initial accounts
    const accountBkt = persistBucket(Account._$info.name);
    for (let i = 0; i < GENESIS.accounts.length; i++) {
        const account = new Account();
        account.address = GENESIS.accounts[i].address;
        account.codeHash = '';
        account.inputAmount = GENESIS.accounts[i].balance;
        account.outputAmount = 0;
        account.nonce = 0;
        accountBkt.put(account.address, account);
    }
};

const initCommitteeConfig = (): void => {
    // initialize committee config
    const committeeCfgBkt = persistBucket(CommitteeConfig._$info.name);
    const committeeCfg = committeeCfgBkt.get<string, [CommitteeConfig]>('CC')[0];
    if (!committeeCfg) {
        const cc = new CommitteeConfig();
        cc.pk = 'CC';
        cc.blockIterval = 2000;
        cc.maxGroupNumber = GENESIS.totalGroups;
        cc.maxAccHeight = GENESIS.totalGroups * 100;
        cc.minToken = 10000;
        cc.withdrawReserveBlocks = 0;

        committeeCfgBkt.put('CC', cc);
    }
};

const initPreConfiguredForgers = (): void => {
    // initialize all pre configured forgers
    const forgerBkt = persistBucket(Forger._$info.name);
    // load pre configured miners from genesis file
    const forgerCommitteeBkt = persistBucket(ForgerCommittee._$info.name);
    const forgerCommittee = forgerCommitteeBkt.get<number, [ForgerCommittee]>(0)[0];
    if (!forgerCommittee) {
        const preConfiguredForgers = GENESIS.forgers;
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

        // populate forger committee
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
};
