import { Block } from './chain/blockchain';
import { Header, Transaction, TxPool, TxType } from './chain/schema.s';
import { calcTxHash, serializeTx } from './chain/transaction';
import { hex2Buf, pubKeyToAddress, verify } from './util/crypto';
import { memoryBucket } from './util/db';

/**
 * 
 * @param consenseVersion 和本地版本进行比较，确认是否可以和对方通信
 */
export const checkVersion = (consenseVersion:string):boolean => {
    // TODO:
    
    return true;
};

/**
 * 1. 签名是否正确
 * 2. 对应字段是否存在
 * 3. 时间戳是否低于当前时间戳+误差范围
 * 4. 协议版本是否正确
 */
export const simpleVerifyHeader = (header:Header):boolean => {

    return;
};

/**
 * 公钥和from地址是对应的
 * 交易hash是否正确
 * gas不小于系统允许的最小gas
 * price不小于系统允许的最小price
 * lastInputValue >= lastOutputValue + value + gas*price
 * 签名是否正确
 * 
 * 1. 
 * 2. 交易类型存在

 * 5. 
 * 如果是加入委员会则需要额外验证
 * 1. to地址为上帝地址from地址和publickey是匹配的
 * 2. value需要和stake一致
 * 如果是退出委员会则需要额外验证
 * 1. from地址为上帝地址且to地址和publicKey是匹配的
 * //暂未处理惩罚交易
 */
export const simpleVerifyTx = (tx:Transaction):boolean => {
    const serTx = serializeTx(tx);

    if (pubKeyToAddress(hex2Buf(tx.pubKey)) !== tx.from) {
        console.log(`the pubkey do not match the from address`);
        
        return false;
    }

    if (calcTxHash(serTx) !== tx.txHash) {
        console.log(`tx hash is not match`);

        return false;
    }
    if (tx.gas < MIN_GAS || tx.price < MIN_PRICE) {
        console.log(`gas price is too low`);

        return false;
    }
    if (tx.lastInputValue < tx.lastOutputValue + tx.value + tx.gas * tx.price) {
        console.log(`the account do not have enough money`);

        return false;
    }
    if (!verify(hex2Buf(tx.signature), hex2Buf(tx.pubKey), hex2Buf(tx.txHash))) {
        console.log(`wrong signature`);

        return false;
    }

    if (tx.txType === TxType.SpendTx) {
        
        return true;
    }
    if (tx.txType === TxType.ForgerGroupTx) {
        if (tx.forgerTx.AddGroup === true) {// join in
            
        }
        if (tx.forgerTx.AddGroup === false) {// leave 

        }
    }

};

/**
 * 1. 对应的区块头存在，且通过了简单验证
 * 2. 交易数量不超过1000
 * 3. 简单验证所有交易
 * 4. bhHash正确
 */
export const simpleVerifyBlock = (block:Block):boolean => {

    return;
};

/**
 * 1. 区块高度正确
 * 2. 父hash正确
 * 3. 所有交易进行了严格验证
 * 4. txrootHash正确
 * 5. receiptRoot正确
 * 6. forger正确
 * 7. 权重正确
 * 8. 总权重正确
 * 9. 随机值正确
 */
export const verifyBlock = (block:Block):boolean => {

};

/**
 * 区块放到主链上的时候需要执行严格验证
 * 1. lastInputValue和lastOutputValue和账户信息对应
 * 如果是退出委员会则需要额外验证
 * 1. 该用户是否在委员会中
 * 2. 用户持有的资金是否和退出资金相同
 * 如果是加入委员会则需要额外验证
 * 1. 该用户是否在委员会中
 */
export const verifyTx = (tx:Transaction):boolean => {

};

export const addTx2Pool = (tx:Transaction):boolean => {
    memoryBucket(TxPool._$info.name).put(tx.txHash, tx);

    return true;
};

export const getTxsFromPool = ():Transaction[] => {
    // 通过迭代返回pool里面的所有交易
    // TODO:
    return [];
};
const MAX_TIME_STAMP = 1000;// 允许一秒以内的时间戳误差
const MAX_BLOCK_TX = 1000;// 一个区块最多包含1000个交易
const MIN_GAS = 1000;
const MIN_PRICE = 10;
const GOD_ADDRESS = '00000000000000000000';