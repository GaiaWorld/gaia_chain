/**
 * 封装了所有客户端可以调用的RPC请求
 */

import { Block } from "../../chain/blockchain";
import { Transaction } from "../../chain/transaction";
import { con2Server, getOwnNetAddr, makeShankeHandsInfo } from "../client/launch";
import { ShakeHandsInfo } from "./rpc.s";
import { checkShakeHandsInfo } from "../virtualEnv";
import { getConByNetAddr } from "../connMgr";

/**
 * 初步校验消息本身有没有在传输过程中被破坏
 * 主要就是校验消息头
 * 包括MD5和消息协议的版本是否一致,以及数据结构是否符合要求
 * 消息类型是否正确
 * @param netMsg 
 * @param pNode 
 */
// export const isMsgAvaiable = (netMsg:NetMsg):boolean => {
//     return true;
// }

// #[rpc=rpcServer]
export const shakeHands = (info:ShakeHandsInfo):ShakeHandsInfo => {
    //TODO:核心是判断双方的共识版本是否一致，如果一致则通过，并且将isClient置为true
    //TODO:设置对方的pNode
    //将自己的基本信息返回给对方
    //TODO:判断自己的client是否和对方的server进行了链接,如果没有链接则主动向对方服务器发送请求建立链接
    if(checkShakeHandsInfo(info)){
        if(!getConByNetAddr(info.strLocalServerAddr)){
            con2Server(getOwnNetAddr())
        }
    return makeShankeHandsInfo();
    }
}

/**
 * 
 * @param netMsg 
 * @param pNode 
 */
export const getTxs = (hashs:Array<string>):Array<Transaction>|void => {
    //TODO:此处直接调用core的getTx方法
}

/**
 * 这个方法还可以优化，理论上只需要body就行了，并不需要header
 * 一次最多请求100个区块
 * @param netMsg 
 * @param pNode 
 */
export const getBlocks = (hashs:Array<string>):Array<Block>|void => {
    //TODO:此处直接调用core的getBlock方法
}

/**
 * 一次最多请求10000个区块头
 * @param netMsg 
 * @param pNode 
 */
export const getHeaders = (hashs:Array<string>):Array<Headers>|void=>{
    //TODO:此处直接调用core的getHeader方法
}

/**
 * 这个RPC应该是隔一段时间主动调用一次
 * @param netMsg 
 * @param pNode 
 */
export const getMemPool = ():Array<Transaction>|void=>{
    //TODO:此处直接调用core的getmemPool方法，返回所以pool中的交易的hash值
}

export const getAddress = ():Array<String>|void=>{
    //TODO:根据我们地址的积分优先返回积分高的的ip,最多返回40个
}

export const getCurTime = ():number => {
    return 0;
}