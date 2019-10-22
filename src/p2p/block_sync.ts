/**
 * block syncronizer
 */

import { SerializeType } from '../pi/util/bon';
import { RpcClient } from '../pi_pt/net/rpc_client';
import { getRand } from '../util/crypto';
import { downloadBlocks, getBlock, getBody, getHeader, getTransaction, handShake, onReceiveBlockHash, onReceiveTxHash } from './p2p.p';
import { DownloadBlockReq, GetBlockReq, GetBodyReq, GetHeaderReq, GetTxReq, HandShakeReq, ReceiveBlockHashReq, ReceiveTxHashReq } from './p2p.s';

type callback = (serializeType: SerializeType, pNetAddr?: string) => void;

export const makeHandShake = (peerAddr: string, req: HandShakeReq, cb: callback): void => {
    clientRequest(peerAddr, handShake, req, cb);
};
// sync header if we don't catch up with peer node
export const fetchPeerHeader = (peerAddr: string, req: GetHeaderReq, cb: callback): void => {
    clientRequest(peerAddr, getHeader, req, cb);
};

export const fetchPeerBody = (peerAddr: string, req: GetBodyReq, cb: callback): void => {
    clientRequest(peerAddr, getBody, req, cb);
};

// sync block if we don't catch up with peer
export const fetchPeerBlock = (peerAddr: string, req: GetBlockReq, cb: callback): void => {
    clientRequest(peerAddr, getBlock, req, cb);
};

// fetch peer tx pool
export const fetchPeerTx = (peerAddr: string, req: GetTxReq, cb: callback): void => {
    clientRequest(peerAddr, getTransaction, req, cb);
};

// notify peer new tx
export const notifyPeerNewTxHash = (peerAddr: string, req: ReceiveTxHashReq): void => {
    clientRequest(peerAddr, onReceiveTxHash, req, null);
};

// notify peer new block hash
export const notifyPeerNewBlockHash = (peerAddr: string, req: ReceiveBlockHashReq): void => {
    clientRequest(peerAddr, onReceiveBlockHash, req, null);
};

// store block in memory first and then process it
export const syncBlock = (peerAddr: string, req: DownloadBlockReq, cb: callback): void => {
    clientRequest(peerAddr, downloadBlocks, req, cb);
};

// ---------------  helper ------------------

const clientId = getRand(16).toString();

export const clientRequest = (pNetAddr: string, cmd: string, body: SerializeType, cb: callback): void => {
    const client = RpcClient.create(`ws://${pNetAddr}`);
    client.connect(KEEP_ALIVE, `${clientId}`, TIME_OUT, ((pConNetAddr: string): (() => void) => {
        return (): void => {
            client.request(cmd, body, TIME_OUT, (serializeType: SerializeType) => {
                cb(serializeType, pConNetAddr);
            });
        };
    })(pNetAddr), () => {
        return;
    });
};

const KEEP_ALIVE = 10000;
const TIME_OUT = 10000;