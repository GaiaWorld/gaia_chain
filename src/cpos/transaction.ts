
import {H160} from "./util"

/**
 * 交易类型
 */
export enum TransactionType {
    Default,      // 普通转账，userData为undefined
    AddForge,     // 加入锻造委员会，userData为Forge
    RemoveForge,  // 退出锻造委员会，userData为地址
}

/**
 * 交易
 */
export class Transaction {
    lastBlockHash: Number;// 256-bit hash of the block todo
    lastBlockNumber: Number;// the block index  

    nonce: number; // i32, 账户发出的交易数量
    fee: number;   // i32, 为执行交易所需要的价格, 以 yGaia 为单位。
    to: H160;      // 接收者地址
    public value: number; // i32, 转账额度，以 yGaia 为单位
    
    public type: TransactionType; // 类型
    public userData: Uint8Array;  // 用户数据，具体意义由类型决定

    public v: number;
    public r: number;
    public s: number; // 和交易签名相关的变量, 用于确定交易的发送者。   

    /// 不需要序列化的
    public hash: H256;  // 
}

// 区块链上的交易数据
export class ChainTx {

}