// forger
#[db=file,primary=pk]
struct Forger {
    pk: String,
    address: String,
    pubKey: String,
    initWeigth: usize,
    lastWeight: usize,
    lastHeight: usize,
    groupNumber: u16,
    stake: usize,
}

// forger committee
#[db=file,primary=pk]
struct ForgerCommittee {
    pk: String,
    waitsForRemove: HashMap<String, Forger>,
    waitsForAdd: HashMap<String, Forger>,
    groups: [[Forger]],
}

// peer
#[db=file,primary=peerId]
struct Peers {
    peerId: String,
    capabilities: u32,
    address: String,
}

enum TxType {
    SpendTx = 1,
    ForgerGroupTx = 2,
    PenaltyTx = 3,
}

struct ForgerGroupTx {
    // true: add
    // false exit
    AddGroup: bool,
    address: String,
    pubKey: String,
    stake: usize,
}

struct PenaltyTx {
    // TODO
}

// spend tx
#[db=file,primary=pk]
struct Transaction {
    pk: String,
    nonce: usize,
    gas: usize,
    price: usize,
    from: String,
    to: String,
    value: usize,
    lastOutputValue: usize,
    txType: TxType,
    forgerGroupTx: Option<ForgerGroupTx>,
    penaltyTx: Option<PenaltyTx>,
    payload: [u8],
    signature: [u8],
}

// Log
#[db=file,primary=pk]
struct Log {
    pk: String,
    forger: String,
    blockHash: String,
    blockNumber: String,
    txHash: String,
    txIndex: usize,
    data: [u8],
    topics: [[u8]],
}

// Receipt
#[db=file,primary=pk]
struct Receipt {
    pk: String,
    status: bool,
    gasUsed: usize,
    txHash: String,
    blockHash: String,
    blockNumber: usize,
    txIndex: usize,
    log: Log,
}

// block header
#[db=file,primary=pk]
struct Header {
    pk: String,
    version: u32,
    height: usize,
    prevHash: String,
    txRootHash: String,
    receiptRoot: String,
    totalWeight: usize,
    weight: usize,
    forger: String,
    groupNumber: u16,
    timestamp: usize,
    forgerPubkey: String,
    blockRandom: String,
    signature: String,
}

// block body
#[db=file,primary=pk]
struct Body {
    pk: String,
    headerHash: String,
    txs: [Transaction],
}

// header chain
#[db=file,primary=pk]
struct HeaderChain {
    pk: String,
    head: usize,
    height: usize,
    genesisHash: String,
    pervHash: String,
}

// account
#[db=file,primary=pk]
struct Account {
    pk: String,
    address: String,
    nonce: usize,
    inputAmount: usize,
    outputAmount: usize,
    codeHash: String,
}

#[db=memory,primary=pk]
struct TxPool {
    pk: String,
    address: String,
    txHash: String,
    tx: Transaction,
}

#[db=memory,primary=pk]
struct Orphans {
    pk: String,
    height: usize,
    blockHash: String,
    block: Block,
}