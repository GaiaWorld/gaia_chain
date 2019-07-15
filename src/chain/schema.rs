// forger
#[db=file,primary=address]
struct Forger {
    address: String,
    pubKey: String,
    initWeight: usize,
    addHeight: usize,
    groupNumber: u8,
    stake: usize,
}

// forger committee
#[db=file,primary=slot]
struct ForgerCommittee  {
    slot: usize,
    forgers: [Forger],
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

#[db=file,primary=forgeTxHash]
struct ForgerCommitteeTx {
    forgeTxHash: String,
    // true: add
    // false exit
    AddGroup: bool,
    blsPubKey: String,
    address: String,
    stake: usize,
}

#[db=file,primary=penaltyTxHash]
struct PenaltyTx {
    penaltyTxHash: String,
    loseStake: usize,
}

// spend tx
#[db=file,primary=txHash]
struct DBTransaction {
    txHash: String,
    nonce: usize,
    gas: usize,
    price: usize,
    from: String,
    to: String,
    value: usize,
    lastInputValue: usize,
    lastOutputValue: usize,
    txType: TxType,
    forgerTx: String,
    penaltyTx: String,
    payload: Option<String>,
    pubKey: String,
    signature: String,
}

struct Transaction {
    txHash: String,
    nonce: usize,
    gas: usize,
    price: usize,
    from: String,
    to: String,
    value: usize,
    lastInputValue: usize,
    lastOutputValue: usize,
    txType: TxType,
    forgerTx: Option<ForgerCommitteeTx>,
    penaltyTx: Option<PenaltyTx>,
    payload: Option<String>,
    pubKey: String,
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
    data: String,
    topics: [String],
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
    pubkey:String,
    forgerPubkey: String,
    blockRandom: String,
    signature: String,
}

#[db=file,primary=height]
struct Height2Hash {
    height: usize,
    bhHash: String,
}

// block body
#[db=file,primary=bhHash]
struct DBBody {
    // block header hash
    bhHash: String,
    txs: [String],
}

struct Body {
    bhHash: String,
    txs: [Transaction],
}

// blockchain head info
#[db=file,primary=pk]
struct ChainHead {
    pk: String,
    headHash: String,
    height: usize,
    genesisHash: String,
    totalWeight: usize,
    prevHash: String,
}

// account
#[db=file,primary=address]
struct Account {
    address: String,
    nonce: usize,
    inputAmount: usize,
    outputAmount: usize,
    codeHash: Option<String>,
}

#[db=memory,primary=txHash]
struct TxPool {
    txHash: String,
    tx: Transaction,
}

#[db=file,primary=beneficiary]
struct Miners {
    beneficiary: String,
    privateKey: String,
    pubKey: String,
    blsPubKey: String,
    blsPrivKey: String,
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