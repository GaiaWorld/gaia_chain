/**
 * 区块链
 */

import { Account } from './account';
import { Transaction } from './transaction';
import { H160, H256 } from './util';

/**
 * 区块头
 */
export class BlockHead {
    public headerSign: H256;  // 锻造者对块头的签名？
    
    public version: number;   // u32，版本号
    public index: number;     // u64, 区块编号，创世区块为0开始
    public totalWeight: number; // u64
    public parentHash: H256;  // 父块哈希，用keccak算法
    
    public forgeAddr: H160;   // 锻造者地址

    public txRootHash: H256;  // 交易根节点哈希，用keccak算法
    public timestamp: number; // u64, 时间戳，创建时候的Unix时间
    
    public blsRandom: H256; // https://dfinity.org/pdf-viewer/library/dfinity-consensus.pdf
    public blsPubkey: H256; // 必要性？   
    
    public groupNumber:number; // u32，optional: committee，验证组号，可选
    
// 下面为不发送到网络的字段，也不参与hash
    
    public txHash: H256[];     // 仅在通信中使用，本区块的hash数组
    public headHash: H256;    // 本块头的hash
    public maxSize: number;   // u32, 块大小，先限定8M，字节数
}

export class BlockBody {
    public headHash: H256;
    public transactions: Transaction;
}

export class Block {
    public head: BlockHead;
    public body: BlockBody;
}