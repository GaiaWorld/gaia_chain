import { Tr as Txn } from '../pi/db/mgr';
import { DEFAULT_FILE_WARE, DEFAULT_WARE } from '../pi_pt/constant';
import { Logger, LogLevel } from '../util/logger';
import { Block } from './blockchain';
import { BlockChunk, BlockHashCache, PeerInfo, SyncState } from './schema.s';

const logger = new Logger('COMMON', LogLevel.DEBUG);

export const getLocalNodeVersion = (txn: Txn): string => {
    return '0.0.1';
};

// TODO: if not exist random generate
export const getLocalNodeId = (txn: Txn): string => {
    return 'gaia-node1';
};

// TODO: how to get local ip ?
export const getLocalIp = (): string => {
    return '127.0.0.1:2001';
};

export const savePeerInfo = (txn: Txn, peerInfo: PeerInfo): void => {
    txn.modify([{ ware: DEFAULT_FILE_WARE, tab: PeerInfo._$info.name, key: peerInfo.nodeId, value: peerInfo }], 1000, false);
};

export const getPeerInfo = (txn: Txn, nodeId: string): PeerInfo => {
    const item = txn.query([
        { ware: DEFAULT_FILE_WARE, tab: PeerInfo._$info.name, key: nodeId }
    ], 1000, false);

    if (item) {
        return <PeerInfo>item[0].value;
    }
};

export const getAllPeerInfo = (txn: Txn): PeerInfo[] => {
    // iterate all peers
    const iter = txn.iter(DEFAULT_FILE_WARE, PeerInfo._$info.name, undefined, true, '');
    const res = [];
    for (const p of iter) {
        res.push(p);
    }
    return res;
};

// check if we have this block or not
export const hasBlock = (txn: Txn, hash: string, height: number): boolean => {
    const blkHash = txn.query([
        { ware: DEFAULT_WARE, tab: BlockHashCache._$info.name, key: `${hash}${height}` }
    ], 1000, false);

    if (blkHash) {
        return true;
    }
    return false;
};

// TODO: add cache eviction policy, prefer LRU
export const writeBlockCache = (txn: Txn, hash: string, height: number): void => {
    const cache = new BlockHashCache();
    cache.blockId = `${hash}${height}`;
    cache.hash = hash;
    txn.modify([
        { ware: DEFAULT_WARE, tab: BlockHashCache._$info.name, key: cache.blockId, value: cache }
    ], 1000, false);
    logger.info(`Write block cache hash: ${hash} height: ${height}`);
};

// pick next block to be processed
export const nextBlock = (txn: Txn): Block => {
    const iter = txn.iter_raw(DEFAULT_WARE, BlockChunk._$info.name, undefined, false, '');
    const item = iter.next();

    if (item) {
        const blkChunk = <BlockChunk>item[1];
        const block = new Block(blkChunk.header, blkChunk.body);
        logger.info(`.... block to be processed .... height: ${block.header.height} hash: ${block.header.height}`);
        return block;
    }
    logger.info(`.... No new block need to be processed ....`);
};

export const addBlockChunk = (txn: Txn, block: Block): void => {
    const blkChunk = new BlockChunk();
    blkChunk.header = block.header;
    blkChunk.body = block.body;
    txn.modify([
        { ware: DEFAULT_WARE, tab: BlockChunk._$info.name, key: `${block.header.height}${block.header.bhHash}`, value: blkChunk }
    ]
        , 1000, false);
};

export const removeBlockChunk = (txn: Txn, block: Block): void => {
    txn.modify([
        { ware: DEFAULT_WARE, tab: BlockChunk._$info.name, key: `${block.header.height}${block.header.bhHash}` }
    ], 1000, false);
};

export const getSyncState = (txn: Txn): SyncState => {
    const item = txn.query([
        { ware: DEFAULT_WARE, tab: SyncState._$info.name, key: 'syncstate' }
    ], 1000, false);

    if (item) {
        return <SyncState>item[1].value;
    }
};

export const setSyncState = (txn: Txn, syncState: SyncState): void => {
    txn.modify([
        { ware: DEFAULT_WARE, tab: SyncState._$info.name, key: syncState.id, value: syncState }
    ], 1000, false);
};