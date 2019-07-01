// forger
struct Forger {
    address: String,
    pubKey: String,
    initWeight: usize,
    lastWeight: usize,
    lastHeight: usize,
    groupNumber: u16,
    stake: usize,
}

// forger committee
#[db=file,primary=slot]
struct ForgerCommittee  {
    slot: usize,
    forger: [Forger],
}

// forger wait to add to committee
#[db=file,primary=height]
struct ForgerWaitAdd {
    height: usize,
    forgers: [Forger],
}

// forger wait to exit committee
#[db=file,primary=height]
struct ForgerWaitExit {
    height: usize,
    forgers: [Forger],
}

#[db=file,primary=pk]
struct CommitteeConfig {
    pk: String,
    // minium tokens to become a forger
    minToken: usize,
    // the default time for create a new block. For the main chain it is 3000 millisecond.
    blockIterval: usize,
    // maximum height for one forger to accumulate weight priority
    maxAccHeight: usize,
    // stake can withdraw after a certain blocks
    withdrawReserveBlocks: usize,
    // how many groups
    maxGroupNumber: usize,
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

#[db=file,primary=txHash]
struct ForgerCommitteeTx {
    txHash: String,
    // true: add
    // false exit
    AddGroup: bool,
    address: String,
    pubKey: String,
    stake: usize,
    signature: String,
}

#[db=file,primary=txHash]
struct PenaltyTx {
    txHash: String,
    signature: String,
}

// spend tx
#[db=file,primary=txHash]
struct Transaction {
    txHash: String,
    nonce: usize,
    gas: usize,
    price: usize,
    from: String,
    to: String,
    value: usize,
    lastOutputValue: usize,
    txType: TxType,
    payload: String,
    signature: String,
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
#[db=file,primary=bhHash]
struct Header {
    // block header hash
    bhHash: String,
    version: String,
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
#[db=file,primary=bhHash]
struct Body {
    // block header hash
    bhHash: String,
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
#[db=file,primary=address]
struct Account {
    address: String,
    nonce: usize,
    inputAmount: usize,
    outputAmount: usize,
    codeHash: String,
}

#[db=memory,primary=txHash]
struct SpendTxPool {
    txHash: String,
    tx: Transaction,
}

#[db=file,primary=txHash]
struct ForgerCommitteeTxPool {
    txHash: String,
    tx: ForgerCommitteeTx,
}

#[db=file,primary=txHash]
struct PenaltyTxPool {
    txHash: String,
    tx: PenaltyTx,
}

#[db=file,primary=pk]
struct MiningConfig {
    pk: String,
    beneficiary: String,
    privateKey: String,
    blsRand: String,
    groupNumber: usize,
}

#[db=memory,primary=pk]
struct Orphans {
    pk: String,
    height: usize,
    blockHash: String,
    header: Header,
    body: Body,
}