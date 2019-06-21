/**
 * 封装了所有客户端可以调用的RPC请求
 */

import { PNode } from "../pNode";
import { NetMsg } from "../msg";
import { startConn } from "../netProcess";
import { Block } from "../../chain/blockchain";
import { Transaction } from "../../chain/transaction";

/**
 * 更新对等节点的最新通讯时间
 * 如果时间明显不合理，比如小于上一个通讯时间或者明显大于当前时间则不更新
 * @param netMsg 
 * @param pNode 
 */
const updateMsgTime= (netMsg:NetMsg,pNode:PNode):boolean=> {
    return true;
}

/**
 * 确认该节点是否有权调用rpc,如果有权则调用，无权则返回拒绝，且积分-1
 * @param netMsg 
 * @param pNode 
 */
const rpcFilter = (netMsg:NetMsg,pNode:PNode) => {
    //TODO:确认该节点是否有权调用该RPC
    if(!isMsgAvaiable(netMsg,pNode)){
        return false
    }
    updateMsgTime(netMsg,pNode);
    return true;
}

/**
 * 初步校验消息本身有没有在传输过程中被破坏
 * 主要就是校验消息头
 * 包括MD5和消息协议的版本是否一致,以及数据结构是否符合要求
 * 消息类型是否正确
 * @param netMsg 
 * @param pNode 
 */
export const isMsgAvaiable = (netMsg:NetMsg,pNode:PNode):boolean => {
    return true;
}

export const shakeHands = (netMsg:NetMsg,pNode:PNode) => {
    //TODO:核心是判断双方的共识版本是否一致，如果一致则通过，并且将isClient置为true
    //TODO:设置对方的pNode
    //将自己的基本信息返回给对方
    //TODO:判断自己的client是否和对方的server进行了链接,如果没有链接则主动向对方服务器发送请求建立链接
    let pIp;
    startConn(pIp)
}

/**
 * 
 * @param netMsg 
 * @param pNode 
 */
export const getTxs = (netMsg:NetMsg,pNode:PNode):Array<Transaction>|void => {
    //TODO:此处直接调用core的getTx方法
}

/**
 * 这个方法还可以优化，理论上只需要body就行了，并不需要header
 * 一次最多请求100个区块
 * @param netMsg 
 * @param pNode 
 */
export const getBlocks = (netMsg:NetMsg,pNode:PNode):Array<Block>|void => {
    //TODO:此处直接调用core的getBlock方法
}

/**
 * 一次最多请求10000个区块头
 * @param netMsg 
 * @param pNode 
 */
export const getHeaders = (netMsg:NetMsg,pNode:PNode):Array<Headers>|void=>{
    //TODO:此处直接调用core的getHeader方法
}

/**
 * 这个RPC应该是隔一段时间主动调用一次
 * @param netMsg 
 * @param pNode 
 */
export const getMemPool = (netMsg:NetMsg,pNode:PNode):Array<Transaction>|void=>{
    //TODO:此处直接调用core的getmemPool方法，返回所以pool中的交易的hash值
}

export const getAddress = (netMsg:NetMsg,pNode:PNode):Array<String>|void=>{
    //TODO:根据我们地址的积分优先返回积分高的的ip,最多返回40个
}