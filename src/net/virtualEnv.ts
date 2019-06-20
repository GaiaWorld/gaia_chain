import { NODE_TYPE } from "./pNode";
import { Inv } from "./msg";
import { Header, Block } from "../chain/blockchain";
import { Transaction } from "../chain/transaction";

/**
 * 临时文件，放置了所有上层应该提供给net层的接口
 */
// ============================================= export 
/**
 * 获取共识协议的版本
 */
export const getVersion = ():string => {

    return "0.0.1";
}

/**
 * 获取当前主链的高度
 */
export const getTipHeight = ():number => {

    return 1;
}

/**
 * 返回所有支持的服务类型,暂时没想好有哪些服务,1表示支持所有服务
 */
export const getServiceFlags = ():number => {

    return 1;
}

/**
 * 返回节点类型，当前只支持全节点
 */
export const getNodeType = ():NODE_TYPE => {

    return NODE_TYPE.FULL_NODE;
}

/**
 * 返回当前节点的内网地址
 */
export const getLocalAddr = ():string => {

    return "127.0.0.1:80";
}


/**
 * 如果高度低于我当前的高度，则不论是否存在我都不需要
 * 这个函数的实现需要一定的技巧，需要和子午线对一下
 * 需要告诉我这个hash值对应的交易是否已经存在
 * 存在的意思是：既可能在我的主链上也可能是在mempool里
 * 如果一个链不是最长链，则它上面的交易应该在mempool里
 * 这个细节很难实现
 */
/**
 * @param invMsg 
 */
export const needTX = (invMsg:Inv):boolean=>{

    return true;
}

/**
 * 如果高度低于我当前的高度，则不论是否存在我都不需要
 * 一个区块链是否已经存在，存在的意思是他可能在主链上，
 * 也有可能他不在主链上，但是我仍然存储了他,即他可能曾经在另一条主链上
 * 这个细节很难实现
 * @param invMsg 
 */
export const needBlock = (invMsg:Inv):boolean => {

    return true;
}

/**
 * 
 * @param invMsg 
 */
export const getTx = (invMsg:Inv):Transaction|void => {
    return 
}

/**
 * 
 * @param invMsg 
 */
export const getHeader = (invMsg:Inv):Header|void => {
    return
}

/**
 * 
 * @param invMsg 
 */
export const getBlock = (invMsg:Inv):Block|void => {
    return
}

/**
 * 通讯层在接收到完整交易的时候调用该方法
 * core自己进行处理
 * @param tx 
 */
export const newTxsReach = (txs:Array<Transaction>)=>{

}

/**
 * 这个一定是getBlocks的返回值，是在getHeaders之后调用的
 * 通讯层在接收到完整区块的时候调用该方法
 * core自己进行处理
 * @param blocks 
 */
export const newBlocksReach = (blocks:Array<Block>)=> {

}

/**
 * 都是自己通过getHeaders主动请求的
 * @param headers 
 */
export const newheadersReach = (headers:Array<Header>) => {

}