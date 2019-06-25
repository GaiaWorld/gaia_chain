struct ShakeHandsInfo {
    strVersion:String,
    nStartingHeight:u32,
    nServiceFlags:u8,
    nNodeType:u8,
    strLocalClientAddr:String,
    strLocalServerAddr:String,
    nPublicKey:String,
    nLocalHostNonce:u32,
    bPing:bool,
    bPong:bool
}

struct Header {
    version: String,
    // block height
    height: u32,
    // previous block hash
    prevHash: String,
    
    // transactions root hash
    txRootHash: String,
    // state root hash
    // public stateRoot: H256;
    // receipt root hash
    receiptRoot: String,

    // total weight for all block
    totalWeight: u32,
    // weight for current block
    weight: u32,
    // forger address
    forger: String,
    // which group is this forger belong to
    groupNumber:u16;
    // when this block created
    timestamp: u32;

    // forger public key
    forgerPubkey: String;
    // random number for this block
    blockRandom: String;
    // random number signature signed by forger
    signature: String;
}

struct Headers {
    arr: &[Header]
}

struct Body {
    txs:&[Transaction]
}

struct Transaction {
    nonce: u16;
    gas: u16;
    price: u16;
    to: String;
    value: u32;

    lastOutputValue: u32;

    // transaction type
    txType: u8;
    // two use cases for this field:
    // 1. as normal account, it will be used as a transactoin note
    // 2. as contract account, it contains call code for this transaction
    payload: String;

    // transaction signature
    v: String;
    r: String;
    s: String;
}