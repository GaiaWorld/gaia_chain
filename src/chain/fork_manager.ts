// fork manager
import { Tr as Txn } from '../pi/db/mgr';
import { DEFAULT_FILE_WARE } from '../pi_pt/constant';
import { assert } from '../util/assert';
import { buf2Hex, number2Uint8Array } from '../util/crypto';
import { Logger, LogLevel } from '../util/logger';
import { BestForkChain, ForkChain, ForkPoint, Header, NextForkChainId } from './schema.s';

const logger = new Logger('FORK_MANAGER', LogLevel.DEBUG);

export const getForkChainId = (txn: Txn, header: Header): number => {
    const fork = txn.query(
        [{ ware: DEFAULT_FILE_WARE
            , tab: ForkPoint._$info.name
            , key: `${header.prevHash}${buf2Hex(number2Uint8Array(header.height - 1))}`}]
            , 1000
            , false
        );

    if (fork) {
        return (<ForkPoint>fork[0].value).forkChainId;
    }

    logger.warn(`Not found appropriate chain id for header hash ${header.bhHash} height ${header.height}`);
};

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

// next fork chain id we can use
export const getNextForkChainId = (txn: Txn): number => {
    // reverse iterator
    const iter = txn.iter_raw(DEFAULT_FILE_WARE, NextForkChainId._$info.name, undefined, false, '');
    const nextId = iter.next();

    if (nextId) {
        const next = (<NextForkChainId>nextId[1]);
        logger.debug(`Get next fork chain id ${(<NextForkChainId>nextId[1]).nextId}`);
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
    const chainId = getForkChainId(txn, header);
    const chain = getForkChain(txn, chainId);

    if (chain.currentHeight >= header.height) {
        return true;
    }

    return false;
};

export const newForkChain = (txn: Txn, header: Header): void => {
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

// TODO: purn non canonical chain for specific time
export const prunForkChain = (txn: Txn): void => {
    // iterate and prun
    
    return;
};