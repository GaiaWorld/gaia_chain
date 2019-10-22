/**
 * rpcs
 */
import { Block } from '../chain/blockchain';
import { readBlock, readBlockIndex, readBody, readHeader } from '../chain/chain_accessor';
import { getLocalIp, getLocalNodeId, getLocalNodeVersion, savePeerInfo } from '../chain/common';
import { getCanonicalForkChain } from '../chain/fork_manager';
import { processBlock } from '../chain/processor';
import { PeerInfo } from '../chain/schema.s';
import { addTx2Pool, getSingleTx } from '../chain/txpool';
import { Mgr } from '../pi/db/mgr_impl';
import { fetchPeerBlock, fetchPeerTx } from './block_sync';
import { DownloadBlockReq, DownloadBlockResp, GetBlockReq, GetBlockResp, GetBodyReq, GetBodyResp, GetHeaderReq, GetHeaderResp, GetTxReq, GetTxResp, HandShakeReq, PeerBestChainChangedReq, ReceiveBlockHashReq, ReceiveHeaderReq, ReceiveTxHashReq } from './p2p.s';

// #[rpc=rpcServer]
export const onReceiveHandShake = (req: HandShakeReq): HandShakeResp => {
    return req;
};

// #[rpc=rpcServer]
export const onReceivePing = (): void => {
    // send pong, if we need it ???
    return;
};

// #[rpc=rpcServer]
export const onReceivePong = (): void => {
    // send ping
    return;
};

// we will receive this req when peer announce a new block
// #[rpc=rpcServer]
export const onReceiveBlockHash = (req: ReceiveBlockHashReq): void => {
    // check if we are behind this block
    const txn = new Mgr().transaction(true);
    if (readBlock(txn, req.hash, req.height)) {
        // we have receive this block
        return;
    }
    const blkReq = new GetBlockReq();
    blkReq.hash = req.hash;
    blkReq.height = req.height;
    // local node doesn't have this block , fetch from peer
    fetchPeerBlock(req.peerAddr, blkReq, (resp: GetBlockResp) => {
        const block = new Block(resp.header, resp.body);
        // TODO: prefer not process block here, queue block only for later use
        // process new block
        if (processBlock(txn, block)) {
            txn.commit();
        } else {
            txn.rollback();
        }
    });
};

// we will receive this req when peer announce a new tx
// #[rpc=rpcServer]
export const onReceiveTxHash = (req: ReceiveTxHashReq): void => {
    // if local node does not exsit, fetch and put it to tx pool
    const txn = new Mgr().transaction(false);
    if (getSingleTx(txn, req.hash)) {
        return;
    }
    const txReq = new GetTxReq();
    txReq.peerAddr = req.peerAddr;
    txReq.txHash = req.hash;
    // local node doesn't have this tx , fetch from peer
    fetchPeerTx(req.peerAddr, txReq, (resp: GetTxResp) => {
        // add it to tx pool
        addTx2Pool(txn, resp.resp);
    });
    txn.commit();
};

// // #[rpc=rpcServer]
// export const onReceiveHeader = (req: ReceiveHeaderReq): void => {
//     const txn = new Mgr().transaction(true);
//     if (readHeader(txn, req.header.bhHash, req.header.height)) {
//         return;
//     }
// };

// reaction to peer best chain changed
// #[rpc=rpcServer]
export const onPeerBestChainChanged = (req: PeerBestChainChangedReq): void => {
    // check if we should change head
    const txn = new Mgr().transaction(false);
    const localBestChain = getCanonicalForkChain(txn);
    if (req.totallWeight > localBestChain.totalWeight) {
        // peer has more weight
        // TODO: reorg
    }
};

// ----------------------  passive to react to peer action ---------------------------

// #[rpc=rpcServer]
export const downloadBlocks = (req: DownloadBlockReq): DownloadBlockResp => {
    const resp = new DownloadBlockResp();
    const txn = new Mgr().transaction(false);
    // fetch canonical height to hash index
    // TODO: constrain user request frequency
    const localBestChain = getCanonicalForkChain(txn);
    for (let i = req.start; i < req.start + req.offset; i++) {
        const hash = readBlockIndex(txn, i, localBestChain.forkChainId);
        const block = readBlock(txn, hash, i);
        resp.headers.push(block.header);
        resp.body.push(block.body);
    }
    txn.commit();
    return resp;
};

// #[rpc=rpcServer]
export const handShake = (req: HandShakeReq): HandShakeResp => {
    const txn = new Mgr().transaction(false);
    const peerInfo = new PeerInfo();
    peerInfo.nodeId = req.nodeId;
    peerInfo.ip = req.peerAddr;
    // save peer info
    savePeerInfo(txn, peerInfo);
    const localBestChain = getCanonicalForkChain(txn);
    // ack peer
    req.nodeId = getLocalNodeId(txn);
    req.nodeVersion = getLocalNodeVersion(txn);
    req.peerAddr = getLocalIp();
    req.genesisHash = localBestChain.genesisHash;
    req.height = localBestChain.currentHeight;
    req.headHash = localBestChain.headHash;
    req.totallWeight = localBestChain.totalWeight;

    txn.commit();

    return req;
};

// #[rpc=rpcServer]
export const getTransaction = (req: GetTxReq): GetTxResp => {
    const txn = new Mgr().transaction(false);
    const resp = new GetTxResp();
    const tx = getSingleTx(txn, req.txHash);
    if (tx) {
        resp.resp = tx;
    }

    return resp;
};

// #[rpc=rpcServer]
export const getBlock = (req: GetBlockReq): GetBlockResp => {
    const txn = new Mgr().transaction(false);
    const resp = new GetBlockResp();
    const block = readBlock(txn, req.hash, req.height);
    txn.commit();
    
    if (block) {
        resp.header = block.header;
        resp.body = block.body;
        return resp;
    }
};

// #[rpc=rpcServer]
export const getHeader = (req: GetHeaderReq): GetHeaderResp => {
    const txn = new Mgr().transaction(false);
    const resp = new GetHeaderResp();
    const header = readHeader(txn, req.hash, req.height);
    txn.commit();

    if (header) {
        resp.header = header;
        return resp;
    }
};

// #[rpc=rpcServer]
export const getBody = (req: GetBodyReq): GetBodyResp => {
    const txn = new Mgr().transaction(false);
    const resp = new GetBodyResp();
    const body = readBody(txn, req.hash, req.height);
    txn.commit();

    if (body) {
        resp.body = body;
        return resp;
    }
};

type HandShakeResp = HandShakeReq;
