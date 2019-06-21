// forger
#[db=file,primary=address]
struct Forger {
    address: String,
    pubKey: String,
    initWeigth: usize,
    lastWeight: usize,
    lastHeight: usize,
    groupNumber: u16,
    stake: usize,
}

// forger committee
#[db=file]
struct ForgerCommittee {
    pk: String,
    waitsForRemove: HashMap<String, Forger>,
    waitsForAdd: HashMap<String, Forger>,
    groups: [[Forger]],
}

// peer
#[db=file,primary=rid]
struct Peers {
    rid: String,
    capabilities: u32,
}

enum TxType {
    SpendTx = 1,
    AddForgerGroupTx = 2,
    ExitForgerGroupTx = 3,
    PenaltyTx = 4,
}

// transaction
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
#[db=file,primary=height]
struct Header {
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
#[db=file,primary=headerHash]
struct Body {
    headerHash: String,
    txs: [Transaction],
}

// account
#[db=file,primary=address]
struct Account {
    address: String,
    nonce: usize,
    inputAmount: usize,
    outputAmount: usize,
    codeHash: String,
}

#[db=memory]
struct TxPool {
    txs: HashMap<String, [Transaction]>,
}
