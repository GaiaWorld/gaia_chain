/** 
 * initialize some tables
 */
import { localForgers } from '../params/config';
import { COMMITTEECONFIG_PRIMARY_KEY, EMPTY_CODE_HASH, EMPTY_RECEIPT_ROOT_HASH, GENESIS_PREV_HASH, GENESIS_SIGNATURE } from '../params/constants';
import { GENESIS } from '../params/genesis';
import { Tr as Txn } from '../pi/db/mgr';
import { DEFAULT_FILE_WARE } from '../pi_pt/constant';
import { buf2Hex, genKeyPairFromSeed, getRand } from '../util/crypto';
import { Logger, LogLevel } from '../util/logger';
import { calcTxRootHash } from './block';
import { Block, getGenesisHash, getVersion } from './blockchain';
import { writeBlock, writeBlockIndex } from './chain_accessor';
import { tableInitialized, writeBlockCache } from './common';
import { calcInitialGroupNumber, deriveInitWeight } from './cpos';
import { Account, BestForkChain, Body, CommitteeConfig, Forger, ForgerCommittee, ForkChain, Header, Miner, NextForkChainId } from './schema.s';

const logger = new Logger('INIT', LogLevel.DEBUG);

export const initForkChain = (txn: Txn): void => {
    if (tableInitialized(txn, DEFAULT_FILE_WARE, ForkChain._$info.name)) {
        return;
    }
    logger.info('...... start to initialize ForkChain ......');
    const fork = new ForkChain();
    fork.forkChainId = 1;
    fork.currentHeight = 1;
    fork.genesisHash = getGenesisHash();
    fork.headHash = getGenesisHash();
    fork.prevHash = '';
    fork.totalWeight = 0; // TODO: Genesis weight
    fork.blockRandom = GENESIS.blockRandom;
    fork.createTime = Date.now();

    txn.modify([
            { ware: DEFAULT_FILE_WARE, tab: ForkChain._$info.name, key: fork.forkChainId, value: fork }
    ], 1000, false);
};

export const initBestForkChain = (txn: Txn): void => {
    if (tableInitialized(txn, DEFAULT_FILE_WARE, BestForkChain._$info.name)) {
        return;
    }
    logger.info('...... start to initialize BestForkChain ......');

    const best = new BestForkChain();
    best.forkChainId = 1;
        
    txn.modify([
        { ware: DEFAULT_FILE_WARE, tab: BestForkChain._$info.name, key: best.forkChainId, value: best }
    ], 1000, false);
};

export const initNextForkChainId = (txn: Txn): void => {
    if (tableInitialized(txn, DEFAULT_FILE_WARE, NextForkChainId._$info.name)) {
        return;
    }

    logger.info('...... start to initialize NextForkChainId ......');

    const next = new NextForkChainId();
    next.nextId = 2;

    txn.modify([
        { ware: DEFAULT_FILE_WARE, tab: NextForkChainId._$info.name, key: next.nextId, value: next }
    ], 1000, false);
};

export const initLocalMiners = (txn: Txn): void => {
    if (tableInitialized(txn, DEFAULT_FILE_WARE, Miner._$info.name)) {
        return;
    }
    logger.info('...... start to initialize Local Miners ......');
    const miners = [];
    for (const forger of localForgers.forgers) {
        const miner = new Miner();
        const [privKey, pubKey] = genKeyPairFromSeed(getRand(32));
        miner.address = forger.address;
        miner.blsPrivKey = buf2Hex(privKey);
        miner.blsPubKey = buf2Hex(pubKey);
        miner.groupNumber = calcInitialGroupNumber(forger.address);
        miner.privKey = forger.privKey;
        miner.pubKey = forger.pubKey;

        miners.push({ ware: DEFAULT_FILE_WARE, tab: Miner._$info.name, key: miner.address, value: miner });
    }
    txn.modify(miners, 1000, false);
};

export const initCommitteeConfig = (txn: Txn): void => {
    if (tableInitialized(txn, DEFAULT_FILE_WARE, CommitteeConfig._$info.name)) {
        return;
    }
    logger.info('...... start to initialize CommitteeConfig ......');

    const cc = new CommitteeConfig();
    cc.primaryKey = COMMITTEECONFIG_PRIMARY_KEY;
    cc.blockIterval = GENESIS.blockInterval;
    cc.totalGroupNumber = GENESIS.totalGroups;
    cc.totalAccHeight = GENESIS.totalGroups * GENESIS.totalAccumulateRounds;
    cc.minToken = GENESIS.minToken;
    cc.withdrawReserveBlocks = GENESIS.withdrawReservBlocks;
    cc.maxAccRounds = GENESIS.maxAccRounds;
    cc.canForgeAfterBlocks = GENESIS.canForgeAfterBlocks;

    txn.modify([
        { ware: DEFAULT_FILE_WARE, tab: CommitteeConfig._$info.name, key: cc.primaryKey, value: cc }
    ], 1000, false);
};

export const initGenesisForgers = (txn: Txn): void => {
    if (tableInitialized(txn, DEFAULT_FILE_WARE, ForgerCommittee._$info.name)) {
        return;
    }

    const preConfiguredForgers = GENESIS.forgers;
    const forgers = [];
    const forgersMap = new Map<number, Forger[]>();
    for (let i = 0; i < preConfiguredForgers.length; i++) {
        const f = new Forger();
        f.address = preConfiguredForgers[i].address;
        f.initWeight = deriveInitWeight(f.address, GENESIS.blockRandom, 0, preConfiguredForgers[i].stake);
            // initial miners are start at height 0
        f.applyJoinHeight = 0;
        f.nextGroupStartHeight = 0;
        f.pubKey = preConfiguredForgers[i].pubKey;
        f.stake = preConfiguredForgers[i].stake;
        f.groupNumber = calcInitialGroupNumber(f.address);
        logger.info(`initPreConfiguredForgers: add ${f.address} to group number ${f.groupNumber}`);
        forgers.push(f);

        txn.modify([
            { ware: DEFAULT_FILE_WARE, tab: Forger._$info.name, key: f.address, value: f }
        ], 1000, false);

        const groupForgers = forgersMap.get(f.groupNumber);
        if (!groupForgers) {
            forgersMap.set(f.groupNumber, [f]);
        } else {
            groupForgers.push(f);
            forgersMap.set(f.groupNumber, groupForgers);
        }
    }

        // populate forger committee
    forgersMap.forEach((value: Forger[], key: number) => {
        const fc = new ForgerCommittee();
        fc.slot = key.toString();
        fc.forgers = value;
        logger.info(`Add forgers: ${JSON.stringify(fc.forgers)} to slot: ${fc.slot}`);

        txn.modify([
            { ware: DEFAULT_FILE_WARE, tab: ForgerCommittee._$info.name, key: fc.slot, value: fc }
        ], 1000, false);
    });
};

export const initGenesisBlock = (txn: Txn): void => {
    const header = new Header();
    const body = new Body();

    header.forger = GENESIS.forgers[0].address;
    header.pubkey = GENESIS.forgers[0].address;
    header.forgerPubkey = GENESIS.forgers[0].pubKey;
    // genesis height is 1
    header.height = 1;
    header.prevHash = GENESIS_PREV_HASH;
    // not used right now
    header.receiptRoot = EMPTY_RECEIPT_ROOT_HASH;
    header.timestamp = Date.now();
    header.weight = 0;
    header.totalWeight = 0;
    header.txRootHash = calcTxRootHash([]);
    header.version = getVersion();
    header.blockRandom = GENESIS.blockRandom;
    header.groupNumber = 0;
    header.bhHash = GENESIS.hash;
    header.signature = GENESIS_SIGNATURE;

    body.bhHash = header.bhHash;
    body.txs = [];

    const block = new Block(header, body);

    writeBlock(txn, block);
    writeBlockIndex(txn, block, 1);
    writeBlockCache(txn, header.bhHash, header.height);
};

export const initGenesisAccounts = (txn: Txn): void => {
    // setup initial accounts
    for (let i = 0; i < GENESIS.accounts.length; i++) {
        const account = new Account();
        account.address = GENESIS.accounts[i].address;
        account.codeHash = EMPTY_CODE_HASH;
        account.inputAmount = GENESIS.accounts[i].balance;
        account.outputAmount = 0;
        account.nonce = 0;

        txn.modify([
            { ware: DEFAULT_FILE_WARE, tab: Account._$info.name, key: account.address, value: account }
        ], 1000, false);
    }
};

export const handShakeWithPeers = (txn: Txn): void => {
    return;
};