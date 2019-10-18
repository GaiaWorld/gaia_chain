/**
 * rpcs
 */
import { Block } from '../chain/blockchain';
import { readBlock, readBody, readHeader } from '../chain/chain_accessor';
import { getCanonicalForkChain } from '../chain/fork_manager';
import { processBlock } from '../chain/processor';
import { addTx2Pool, getSingleTx } from '../chain/txpool';
import { Mgr } from '../pi/db/mgr_impl';
import { fetchPeerBlock, fetchPeerTx } from './block_sync';
import { GetBlockReq, GetBlockResp, GetBodyReq, GetBodyResp, GetHeaderReq, GetHeaderResp, GetTxReq, GetTxResp, HandShakeReq, PeerBestChainChangedReq, ReceiveBlockHashReq, ReceiveHeaderReq, ReceiveTxHashReq } from './p2p.s';

// #[rpc=rpcServer]
export const onReceiveHandShake = (req: HandShakeReq): HandShakeResp => {
    // determine how to sync with peers
    const txn = new Mgr().transaction(false);
    const localBestChain = getCanonicalForkChain(txn);
    // TODO: more criteria expected
    if (localBestChain.genesisHash === req.genesisHash
         && localBestChain.totalWeight < req.totallWeight) {
        // we are behind, find common ansestor and sync to peer
        for (let i = localBestChain.currentHeight; i < req.height; i++) {
            let flag = false;
            const blkReq = new GetBlockReq();
            blkReq.height = i;
            blkReq.hash = ''; // TODO: how to handle hash
            fetchPeerBlock(req.peerAddr, blkReq, (blockResp: GetBlockResp) => {
                const block = new Block(blockResp.header, blockResp.body);
                if (!processBlock(txn, block)) {
                    flag = true; // TODO: callback could set flag=true before next if statement?
                    txn.rollback();
                }
            });
            if (flag) {
                // TODO: peer give us bad block, we should ban it
                break;
            }
        }
        txn.commit();
    }
    
    // TODO:
    req.peerAddr = '';
    req.nodeVersion = '';

    return req;
};

// #[rpc=rpcServer]
export const onReceivePing = (): void => {
    // send pong, if we need it ???
    return;
};

// #[rpc=rpcServer]
export const onReceiveBlockHash = (req: ReceiveBlockHashReq): void => {
    // check if we have this block
    const txn = new Mgr().transaction(true);
    if (readBlock(txn, req.hash, req.height)) {
        return;
    }
    const blkReq = new GetBlockReq();
    blkReq.hash = req.hash;
    blkReq.height = req.height;
    fetchPeerBlock(req.peerAddr, blkReq, (resp: GetBlockResp) => {
        const block = new Block(resp.header, resp.body);
        // process new block
        if (processBlock(txn, block)) {
            txn.commit();
        } else {
            txn.rollback();
        }
    });
};

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
    fetchPeerTx(req.peerAddr, txReq, (resp: GetTxResp) => {
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
