// https://ethereum.stackexchange.com/questions/2376/what-does-each-genesis-json-parameter-mean
// structure https://blog.csdn.net/DDFFR/article/details/78773013
// yello paper CH : https://github.com/yuange1024/ethereum_yellowpaper/blob/master/ethereum_yellow_paper_cn.pdf
// yellow paper EN: https://ethereum.github.io/yellowpaper/paper.pdf
/**
 * This is the genesis block of gaia.world
 * Actually it is almost like with the head, with little attribute
 */
let genesis = {
    timestamp: '0x1234455667',
    parentHash: '0x0000000000000000000000000000000000000000000000000000000000000000',// used for find the parent
    extraData: '',// just for additional usage
    interval: '0Xbb8',// default time interval millisecond
    gasLimit: '0Xabcdef',// the default value should be large enough
    coinbase: '0x3333333333333333333333333333333333333333'// the address that create the block
    // rootHash: ''
    // init tx TBD
};

/**
 * The block chain just need to 
 */
interface BlockHead {
    parentHash:Number;// 256-bit hash of the parent block’s header
    coinBase:Number;// 160-bit address which cal all the txs.
    // UncleHash:Number;// 64 //Do we need this?
    // stateRootHash:Number;// 256-bit hash of the root node of the state trie for the whole blackchain
    txRootHash:Number;// 256-bit hash of the root node of the tx trie for the current block
    receiptRootHash:Number;// 256-bit hash of the root node of the receipt trie for the current block
    bloom: Number;// 2048-bit bloom fiter composed from log in receipt
    num:Number;// the block index
    gasUsed: Number;// we do not need gaslimit
    timestamp: Number;// local time of when the block been created        
    blsRandom: Number;// https://dfinity.org/pdf-viewer/library/dfinity-consensus.pdf
    blsPubkey: Number;    
    // committee TBD
}

interface BlockBody {
    headerHash:Number;// 256-bit
    txs:Transaction[];
}

interface BlockChain {
    HeaderChain:HeaderChain;
    body:BlockBody[];
    // TBD
}

interface HeaderChain {
    headers:BlockHead[];
    // TBD
}

/**
 * Generated from tx info.
 * struct of receipt https://zhuanlan.zhihu.com/p/30922425
 * struct of logs https://codeburst.io/deep-dive-into-ethereum-logs-a8d2047c7371
 */
interface Log {
    miner: Number;// 160-bit
    blockHash: Number;// 256-bit hash of the block
    blockNumber: Number;// the block index    
    txHash:Number;// 256-bit hash of the current tx
    txIndex:Number;// the index of the current tx in the block
    data:Number;// any-bit
    topics:Number[];// 256-bit
    logIndex:number;
}

interface Receipt {
    blockHash: Number;// 256-bit hash of the block
    blockNumber: Number;// the block index    
    txHash:Number;// 256-bit hash of the current tx
    txIndex:Number;// the index of the current tx in the block
    fromAddr:Number;// 160-bit address that the tx from
    toAddr:Number;// 160-bit address that the tx from
    cumulativeGasUsed:Number;// the cumulative gas used until this tx
    gasUsed:Number;// the gas used by this tx
    contractAddr:Number;// 160-bit contract address or none    
    logs:Log[];
    bloomLogs:Number;// 256-bit 
}

interface Transaction {
    blockHash: Number;// 256-bit hash of the block
    blockNumber: Number;// the block index  
    txHash:Number;// 256-bit hash of the current tx
    txIndex:Number;// the index of the current tx in the block
    fromAddr:Number;// 160-bit address that the tx from
    toAddr:Number;// 160-bit address that the tx from
    data:Number;// for contract it is the params, that signed by the vrs
    value:Number;// for the tx it is the money
    gas:Number;
    gasPrice:Number;
    v:Number;
    r:Number;
    s:Number;
}

/**
 * it is just an address, both for user and contract
 */
interface Account {
    nonce:Number;// data consistency
    balance:Number;
    codeHash:Number;// 256-bit
    storage:Number[];// I am not sure the structure of the storage
}

interface ForgeCommittee {
    groupNumber:Number;
    groups:ForgeGroup[];
    // Forge TBD 
}

interface ForgeGroup {
    members:ForgeMember[];
    // Forge TBD 
}

interface ForgeMember {
    right:Number;
    // TBD
}