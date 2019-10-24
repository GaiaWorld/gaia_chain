// fork manager
import { PRUN_CHAIN_HEIGHT, PRUN_CHAIN_WEIGHT } from '../params/constants';
import { Tr as Txn } from '../pi/db/mgr';
import { DEFAULT_FILE_WARE } from '../pi_pt/constant';
import { assert } from '../util/assert';
import { buf2Hex, number2Uint8Array } from '../util/crypto';
import { Logger, LogLevel } from '../util/logger';
import { Block } from './blockchain';
import { deleteAccount, deleteBlock, deleteTxLookupEntry, readBlock } from './chain_accessor';
import { BestForkChain, Block2ForkChainIdIndex, ForkChain, ForkPoint, Header, NextForkChainId, Transaction } from './schema.s';

const logger = new Logger('FORK_MANAGER', LogLevel.DEBUG);

// determine fork chain id for this block by utilize its prve hash and height
export const getForkChainIdOfHeader = (txn: Txn, header: Header): number => {
    const fork = txn.query(
        [{ ware: DEFAULT_FILE_WARE
            , tab: ForkPoint._$info.name
            , key: `${header.prevHash}${buf2Hex(number2Uint8Array(header.height - 1))}`}]
            , 1000
            , false
        );

    if (fork) {
        const chainId = (<ForkPoint>fork[0].value).forkChainId;
        logger.debug(`Get fork chain id for header hash: ${header.bhHash} height: ${header.height} chainId: ${chainId}`);
        return chainId;
    }

    logger.warn(`Not found appropriate chain id for header hash ${header.bhHash} height ${header.height}`);
};

export const updateForkPoint = (txn: Txn, header: Header, chianId: number): void => {
    txn.modify(
        [{ ware: DEFAULT_FILE_WARE, tab: ForkPoint._$info.name
            , key: `${header}${buf2Hex(number2Uint8Array(header.height))}`
            , value: chianId }]
        , 1000
        , false
    );
};

// get chain head for chain id
export const getForkChain = (txn: Txn, chainId: number): ForkChain => {
    const forkChain = txn.query(
        [{ ware: DEFAULT_FILE_WARE, tab: ForkChain._$info.name, key: chainId }]
        , 1000
        , false
    );

    if (forkChain) {
        return <ForkChain>forkChain[0].value;
    }
    logger.warn(`Can not found fork chain for chain id ${chainId}`);
};

// canonical chain is the highest voting power chain
export const getCanonicalForkChain = (txn: Txn): ForkChain => {
    const iter = txn.iter_raw(DEFAULT_FILE_WARE, BestForkChain._$info.name, undefined, true, '');
    const best = iter.next();

    if (best) {
        const forkChain = txn.query(
            [{ ware: DEFAULT_FILE_WARE, tab: ForkChain._$info.name, key: (<BestForkChain>best[1]).forkChainId }]
            , 1000
            , false
        );
        if (forkChain) {
            return <ForkChain>forkChain[0].value;
        }
    }
    logger.error(`Can not get canonical chain`);
};

export const getCanonicalChainId = (txn: Txn): number => {
    const iter = txn.iter_raw(DEFAULT_FILE_WARE, BestForkChain._$info.name, undefined, true, '');
    const best = iter.next();

    if (best) {
        return (<BestForkChain>best[1]).forkChainId;
    }
    logger.warn(`Can not get canonical chain id`);
};

// update canonical chain after a fork chain becomes a canonical one
export const updateCanonicalForkChain = (txn: Txn, totallWeight: number, chainId: number): void => {
    const canonical = getCanonicalForkChain(txn);
    if (canonical.totalWeight < totallWeight) {
        const bestChain = new BestForkChain();
        bestChain.forkChainId = chainId;
        txn.modify([{ ware: DEFAULT_FILE_WARE, tab: BestForkChain._$info.name, key: chainId, value: bestChain }], 1000, false);
    }
};

// next fork chain id we can use
export const getNextForkChainId = (txn: Txn): number => {
    // reverse iterator
    const iter = txn.iter_raw(DEFAULT_FILE_WARE, NextForkChainId._$info.name, undefined, false, '');
    const nextId = iter.next();

    if (nextId) {
        const next = (<NextForkChainId>nextId[1]);
        logger.debug(`Get next fork chain id ${(<NextForkChainId>nextId[1]).nextId}`);
        // nextId maybe overflow
        next.nextId += 1;
        txn.modify([{ ware: DEFAULT_FILE_WARE, tab: NextForkChainId._$info.name, key: next.nextId, value: next }], 1000, false);

        return (<NextForkChainId>nextId[1]).nextId;
    } else {
        logger.debug(`Initialize fork chain id`);
        // initialize for the first time
        const next = new NextForkChainId();
        next.nextId = 1;
        txn.modify([{ ware: DEFAULT_FILE_WARE, tab: NextForkChainId._$info.name, key: 1, value: next }], 1000, false);

        return next.nextId;
    }
};

// when we receive a block, we should know if it is a new fork block
export const shouldFork = (txn: Txn, header: Header): boolean => {
    const chainId = getForkChainIdOfHeader(txn, header);
    const chain = getForkChain(txn, chainId);

    if (chain.currentHeight >= header.height) {
        return true;
    }

    return false;
};

// if this block is a fork, we should create a new fork
export const newForkChain = (txn: Txn, header: Header): number => {
    const forkChain = new ForkChain();

    forkChain.blockRandom = header.blockRandom;
    forkChain.createTime = Date.now();
    forkChain.currentHeight = header.height;
    forkChain.forkChainId = getNextForkChainId(txn);
    forkChain.genesisHash = ''; // TODO
    forkChain.headHash = header.bhHash;
    forkChain.prevHash = header.prevHash;
    forkChain.totalWeight = header.totalWeight;

    // write to db
    txn.modify([{ ware: DEFAULT_FILE_WARE, tab: ForkChain._$info.name, key: forkChain.forkChainId, value: forkChain }]
        , 1000
        , false
    );

    return forkChain.forkChainId;
};

// TODO: update fork chain when insert new block
export const updateForkChainHead = (txn: Txn, header: Header, chainId: number): void => {
    const forkChain = getForkChain(txn, chainId);

    assert(forkChain.currentHeight + 1 === header.height);

    forkChain.blockRandom = header.blockRandom;
    forkChain.currentHeight = header.height;
    forkChain.headHash = header.bhHash;
    forkChain.prevHash = header.prevHash;
    forkChain.totalWeight = header.totalWeight;

    // write to db
    txn.modify([{ ware: DEFAULT_FILE_WARE, tab: ForkChain._$info.name, key: forkChain.forkChainId, value: forkChain }]
        , 1000
        , false
    );
};

// prune fork chains according to some criteria
export const pruneForkChain = (txn: Txn): void => {
    // iterate all fork chain
    const bestChain = getCanonicalForkChain(txn);
    const iter = txn.iter_raw(DEFAULT_FILE_WARE, ForkChain._$info.name, undefined, true, '');
    // tslint:disable-next-line:no-constant-condition
    while (true) {
        const chainNext = iter.next();
        if (!chainNext) break;
        const chain = <ForkChain>chainNext[1];

        // fork chains that satisfy our prune criteria
        if (bestChain.currentHeight > chain.currentHeight + PRUN_CHAIN_HEIGHT 
            && bestChain.totalWeight > chain.totalWeight + PRUN_CHAIN_WEIGHT) {
            let block = readBlock(txn, chain.headHash, chain.currentHeight);
            // iterate from chain head to where a block's ref count is 1
            // if a block's ref count is more than 1, which means that it is share common ansestor with other fork chains
            while (blockRefCount(txn, block) === 1) {
                for (const tx of block.body.txs) {
                    // delete account associated with forkChainId
                    deleteAccount(txn, tx.from, chain.forkChainId);
                    deleteAccount(txn, tx.to, chain.forkChainId);
                    // delete tx look up entries
                    deleteTxLookupEntry(txn, tx.txHash, chain.forkChainId);
                }
                deleteBlock(txn, block.header.bhHash, block.header.height);
                logger.debug(`Prun block, chain id ${chain.forkChainId}, block hash ${block.header.bhHash}, height ${block.header.height}`);
                // get the previous block for next iteration
                block = readBlock(txn, block.header.prevHash, block.header.height - 1);
            }

            // delete forkchainId entry
            deleteForkChainId(txn, chain.forkChainId);
            // decrease block ref count
            removeBlockRef(txn, block, chain.forkChainId);
        }
    }
};

const deleteForkChainId = (txn: Txn, forkchainId: number): void => {
    txn.modify([{ ware: DEFAULT_FILE_WARE, tab: ForkChain._$info.name, key: forkchainId }], 1000, false);
    logger.debug(`Delete forkchainId ${forkchainId}`);
};

const removeBlockRef = (txn: Txn, block: Block, chainId: number): void => {
    const ref = new Block2ForkChainIdIndex();
    ref.blockId = `${block.header.bhHash}${block.header.height}`;
    ref.ids = ref.ids.filter((val: number) => val !== chainId);
    txn.modify(
        [{ ware: DEFAULT_FILE_WARE, tab: Block2ForkChainIdIndex._$info.name
            , key: `${block.header.bhHash}${block.header.height}`
            , value: ref }]
            , 1000
            , false
        );
};

// how many blocks refer to this block
const blockRefCount = (txn: Txn, block: Block): number => {
    const ref = txn.query(
        [{ ware: DEFAULT_FILE_WARE, tab: Block2ForkChainIdIndex._$info.name
            , key: `${block.header.bhHash}${block.header.height}` }]
        , 1000
        , false
    );

    if (ref) {
        return (<Block2ForkChainIdIndex>ref[0].value).ids.length;
    }
    logger.error(`This is a orpha block ${block}`);
};