import { Block } from './chain/blockchain';
import { Header } from './chain/schema.s';

/**
 * 
 * @param consenseVersion 和本地版本进行比较，确认是否可以和对方通信
 */
export const checkVersion = (consenseVersion:string):boolean => {
    // TODO:
    
    return true;
};

/**
 * 1.对应字段是否存在
 * 2.时间戳是否低于当前时间戳+误差范围
 * 3.出块者的签名是否正确
 * 4.协议版本是否正确
 */
export const simpleVerifyHeader = (header:Header):boolean => {

    return;
};

/**
 * 1.交易类型存在
 * 2.
 * 
 */
export const simpleVerifyTx = (tx:Transaction):boolean => {

    return;
};

/**
 * 1.对应的区块头存在
 * 2.交易数量不超过1000
 * 3.简单验证所有交易
 * 4.bhHash正确
 */
export const simpleVerifyBlock = (block:Block):boolean => {

    return;
};

export const verifyBlock = (block:Block) => {

};

export const verifyTx = (tx:Transaction):boolean => {

};

const MAX_TIME_STAMP = 1000;// 允许一秒以内的时间戳误差
const MAX_BLOCK_TX = 1000;// 一个区块最多包含1000个交易