/**
 * block chain
 */

import { deriveInitWeight, updateChainHead, updateForgerCommittee } from '../consensus/committee';
import { INV_MSG_TYPE } from '../net/msg';
import { NODE_TYPE } from '../net/pNode.s';
import { Inv } from '../net/server/rpc.s';
import { myForgers } from '../params/config';
import { BLOCK_INTERVAL, CHAIN_HEAD_PRIMARY_KEY, COMMITTEECONFIG_PRIMARY_KEY, EMPTY_CODE_HASH, GENESIS_PREV_HASH, MIN_TOKEN, TOTAL_ACCUMULATE_ROUNDS, WITHDRAW_RESERVE_BLOCKS } from '../params/constants';
import { GENESIS } from '../params/genesis';
import { buf2Hex, genKeyPairFromSeed, getRand } from '../util/crypto';
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

    return bkt.get<string, [ChainHead]>(CHAIN_HEAD_PRIMARY_KEY)[0].height;
};

export const getTipTotalWeight = (): number => {
    const bkt = persistBucket(ChainHead._$info.name);

    return bkt.get<string, [ChainHead]>(CHAIN_HEAD_PRIMARY_KEY)[0].totalWeight;
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
    const committeeCfgBkt = persistBucket(CommitteeConfig._$info.name);

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
                        forger.groupNumber = currentHeight % getCommitteeConfig().totalGroupNumber;
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

            // wirte body to db
            const dbBody = new DBBody();
            dbBody.bhHash = body.bhHash;
            dbBody.txs = txHashes;
            dbBodyBkt.put(body.bhHash, dbBody);
            updateChainHead(header);
            updateForgerCommittee(currentHeight, committeeCfgBkt.get(COMMITTEECONFIG_PRIMARY_KEY)[0]);
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
    if (!headers) {
        return;
    }

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

    return bkt.get<string, [CommitteeConfig]>(COMMITTEECONFIG_PRIMARY_KEY)[0];
};

export const newBlockChain = (): void => {
    // load chain head
    const chainHeadBkt = persistBucket(ChainHead._$info.name);
    const chainHead = chainHeadBkt.get<string, [ChainHead]>(CHAIN_HEAD_PRIMARY_KEY)[0];

    if (!chainHead) {
        const ch = new ChainHead(); // FIXME:only one element
        ch.genesisHash = GENESIS.hash;
        ch.headHash = GENESIS.hash;
        // genesis parent hash is empty string
        ch.prevHash = GENESIS_PREV_HASH;
        ch.height = 0;
        ch.totalWeight = 0;
        ch.primaryKey = CHAIN_HEAD_PRIMARY_KEY;
        chainHeadBkt.put(ch.primaryKey, ch);

        setupInitialAccounts();
        initCommitteeConfig();
        initPreConfiguredForgers();
        setupMiners();
    }

    return;
};

const setupInitialAccounts = (): void => {
    // setup initial accounts
    const accountBkt = persistBucket(Account._$info.name);
    for (let i = 0; i < GENESIS.accounts.length; i++) {
        const account = new Account();
        account.address = GENESIS.accounts[i].address;
        account.codeHash = EMPTY_CODE_HASH;
        account.inputAmount = GENESIS.accounts[i].balance;
        account.outputAmount = 0;
        account.nonce = 0;
        accountBkt.put(account.address, account);
    }
};

const setupMiners = (): void => {
    const minersBkt = persistBucket(Miner._$info.name);
    const miner = new Miner();
    // TODO:JFB read forger from independent files
    for (const forger of myForgers.forgers) {
        // TODO: bls key are ephmeral
        const [privKey, pubKey] = genKeyPairFromSeed(getRand(32));
        miner.address = forger.address;
        miner.blsPrivKey = buf2Hex(privKey);
        miner.blsPubKey = buf2Hex(pubKey);
        miner.groupNumber = calcInitialGroupNumber(forger.address);
        miner.privKey = forger.privKey;
        miner.pubKey = forger.pubKey;

        minersBkt.put(miner.address, miner);
    }
};

const calcInitialGroupNumber = (address: string): number => {
    return parseInt(address.slice(address.length - 2), 16);
};

const initCommitteeConfig = (): void => {
    // initialize committee config
    const committeeCfgBkt = persistBucket(CommitteeConfig._$info.name);
    const committeeCfg = committeeCfgBkt.get<string, [CommitteeConfig]>(COMMITTEECONFIG_PRIMARY_KEY)[0];
    if (!committeeCfg) {
        const cc = new CommitteeConfig();
        cc.primaryKey = COMMITTEECONFIG_PRIMARY_KEY;
        cc.blockIterval = BLOCK_INTERVAL;
        cc.totalGroupNumber = GENESIS.totalGroups;
        cc.totalAccHeight = GENESIS.totalGroups * TOTAL_ACCUMULATE_ROUNDS;
        cc.minToken = MIN_TOKEN;
        cc.withdrawReserveBlocks = WITHDRAW_RESERVE_BLOCKS;

        committeeCfgBkt.put(cc.primaryKey, cc);
    }
};

const initPreConfiguredForgers = (): void => {
    // initialize all pre configured forgers
    const forgerBkt = persistBucket(Forger._$info.name);
    // load pre configured miners from genesis file
    const forgerCommitteeBkt = persistBucket(ForgerCommittee._$info.name);
    // check if ForgerCommittee is initialized
    const forgerCommittee = forgerCommitteeBkt.get<number, [ForgerCommittee]>(0)[0];
    if (!forgerCommittee) {
        const preConfiguredForgers = GENESIS.forgers;
        const forgers = [];
        const forgersMap = new Map<number, any[]>();
        for (let i = 0; i < preConfiguredForgers.length; i++) {
            const f = new Forger();
            f.address = preConfiguredForgers[i].address;
            f.initWeight = deriveInitWeight(f.address, GENESIS.blockRandom, 0, preConfiguredForgers[i].stake);
            // initial miners are start at height 0
            f.addHeight = 0;
            f.pubKey = preConfiguredForgers[i].pubKey;// FIXME:JFB use random pubkey
            f.stake = preConfiguredForgers[i].stake;
            f.groupNumber = calcInitialGroupNumber(f.address);
            console.log(`initPreConfiguredForgers: add ${f.address} to group number ${f.groupNumber}`);
            // TODO:JFB neet verify the forger
            // TODO:JFB put forger into slot
            forgers.push(f);
            forgerBkt.put(f.address, f);

            let groupForgers = forgersMap.get(f.groupNumber);
            if (!groupForgers) {
                groupForgers = [f];
            } else {
                groupForgers.push(f);
                forgersMap.set(f.groupNumber, groupForgers);
            }
        }

        // populate forger committee
        forgersMap.forEach((value: any[], key: number) => {
            const fc = new ForgerCommittee();
            fc.slot = key;
            fc.forgers = value;

            forgerCommitteeBkt.put(fc.slot, fc);
        });
    }
};
