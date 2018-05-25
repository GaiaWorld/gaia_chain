/*
 * blocker header
 */

// ============================== import 

// ============================== export

export class BlockHeader {
    headerSign: U520;  // 锻造者对块头的其余数据的签名，v 1B，s 32B, r 32B
    parentHash: U256;  // 父块哈希，用keccak算法
    
    version: U32;      // 区块版本，以后解决硬分叉问题
    timestamp: U64;    // 时间戳，创建时候的Unix时间
    
    forgeAddr: U160;   // 锻造者地址
      
    blsRandom: H256;   // bls随机数，必要性？
    blsPubkey: H256;   // bls随机公钥，必要性？
    txMerkle: U256;    // 交易merkle根，用keccak算法
    
    index: U64;        // 快速索引；
    totalWeight: U64;  // 快速索引；
    groupNumber: U32;  // 同步可选；
    headerHash: U256;  // 不同步；
}