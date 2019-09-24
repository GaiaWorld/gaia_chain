// fork manager
import { Tr as Txn } from '../pi/db/mgr';
import { DEFAULT_FILE_WARE } from '../pi_pt/constant';
import { buf2Hex, number2Uint8Array } from '../util/crypto';
import { Logger, LogLevel } from '../util/logger';
import { BestForkChain, ForkChain, ForkPoint, Header } from './schema.s';

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

// TODO: purn non canonical chain for specific time
export const purnForkChain = (txn: Txn): void => {
    return;
};