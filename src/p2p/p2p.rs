/**
 * struct definition
 */
#[path=../chain/]
use schema.s::{Transaction, Header, Body};

struct HandShakeReq {
    nodeId: String,
    peerAddr: String,
    nodeVersion: String,
    genesisHash: String,
    totallWeight: usize,
    height: usize,
    headHash: String,
}

struct ReceiveBlockHashReq {
    peerAddr: String,
    hash: String,
    height: usize,
}

struct ReceiveTxHashReq {
    peerAddr: String,
    hash: String,
}

struct ReceiveHeaderReq {
    peerAddr: String,
    header: Header,
}

struct PeerBestChainChangedReq {
    totallWeight: usize,
    height: usize,
    headHash: usize,
}

struct GetTxReq {
    peerAddr: String,
    txHash: String,
}

struct GetTxResp {
    resp: Transaction
}

struct GetBlockReq {
    hash: String,
    height: usize,
}

struct GetBlockResp {
    header: Header,
    body: Body,
}

struct GetHeaderReq {
    hash: String,
    height: usize,
}

struct GetHeaderResp {
    header: Header,
}

struct GetBodyReq {
    hash: String,
    height: usize,
}

struct GetBodyResp {
    body: Body,
}

struct DownloadBlockReq {
    start: usize,
    offset: usize,
}

struct Blocks {
    header: Header,
    body: Body,
}

struct DownloadBlockResp {
    headers: [Header],
    body: [Body]
}