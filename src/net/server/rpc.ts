/**
 * 封装了所有客户端可以调用的RPC请求
 */

import { PNode } from "../pNode";
import { NetMsg } from "../msg";
import { startConn } from "../netProcess";

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
export const getTxs = (netMsg:NetMsg,pNode:PNode) => {
    
}

export const getBlocks = (netMsg:NetMsg,pNode:PNode) => {

}

