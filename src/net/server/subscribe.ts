import { needTX, newTxsReach, needBlock, newBlocksReach } from "../virtualEnv";
import { Inv } from "./rpc.s";

/**
 * 作为服务器允许对等节点订阅的主题，并且主动给对等节点发送相应的信息
 */

 /**
  * 主动向外广播交易信息
  * 在广播的内部有一些更细节的处理，会判断对等节点是否已经有该tx了，有了就不发
  * @param invMsg 
  */
export const broadcastTx = (invMsg:Inv)=>{

}

/**
 * 主动向外广播区块信息
 * 在广播的内部有一些更细节的处理，会判断对等节点是否已经有该block了，有了就不发
 * @param invMsg 
 */
export const broadcastBlock = (invMsg:Inv)=>{

}


/**
 * core主动调用该函数，告诉网络层有新的TX产生了，TX可以来源于自身也可以来源于外部节点
 * @param invMsg 
 */
export const notifyNewTx = (invMsg:Inv)=>{

}

/**
 * core主动调用该函数，告诉网络层有新的block产生了，block可以来源于自身也可以来源于外部节点
 * @param invMsg 
 */
export const notifyNewBlock = (invMsg:Inv) => {

}


/**
 * client端函数
 */

/**
 * 订阅交易信息
 */
// export const subscribeTx=()=>{
//     //TODO:收到区块信息之后我需要知道我是否已经有该区块了
//     let netMsg, pNode;
//     if(!isMsgAvaiable(netMsg,pNode)){
//         return;
//     }
//     if(netMsg.msgData.MsgType == INV_MSG_TYPE.MSG_TX){
//         if(needTX(netMsg)){
//             getTxs(makeMsg(MSG_TYPE.GETTX,[netMsg.invMsg]),(txs)=>{
//                 //此处调用core的newTxReach
//                 newTxsReach(txs)
//             })
//         }
//     }
    
//     //
// }

/**
 * 订阅区块信息
 */
// export const subscribeBlock= ()=> {
//     let netMsg, pNode;
//     if(!isMsgAvaiable(netMsg,pNode)){
//         return;
//     }
//     if(netMsg.msgData.MsgType == INV_MSG_TYPE.MSG_TX){
//         if(needBlock(netMsg)){
//             getHeaders(makeMsg(MSG_TYPE.GETHEADERS,[netMsg.invMsg]),(headers)=>{
//                 //此处调用core的newTxReach
//                 newheadersReach(headers)
//             })
//         }
//     }
// }