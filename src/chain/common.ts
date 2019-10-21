import { Tr as Txn } from '../pi/db/mgr';
import { DEFAULT_FILE_WARE } from '../pi_pt/constant';
import { PeerInfo } from './schema.s';

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
    return;
};

export const getAllPeerInfo = (txn: Txn): PeerInfo[] => {
    // iterate all peers
    return;
};