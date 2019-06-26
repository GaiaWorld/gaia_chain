import { Inv } from "./rpc.s";
import { getSubMap, TX, BLOCK } from "./rpc.r";
import { getConByNetAddr } from "../connMgr";
import { broadcastTx, broadcastBlock } from "./rpc.p";
import { TIME_OUT } from "../client/launch";

/**
 * 作为服务器允许对等节点订阅的主题，并且主动给对等节点发送相应的信息
 */

 /**
 * core主动调用该函数，告诉网络层有新的TX产生了，TX可以来源于自身也可以来源于外部节点
 * @param invMsg 
 */
export const notifyNewTx = (invMsg:Inv)=>{
    let txSet = getSubMap().get(TX);
    if(txSet && txSet.size>0){
        txSet.forEach((netAddr:string)=>{
            let client = getConByNetAddr(netAddr);
            if(client){
                client.request(broadcastTx, invMsg, TIME_OUT,(r:boolean)=>{
                    r && console.log(`broadcast tx success`);
                })
                //broadcastBlock
            }
        });
    }
}

/**
 * core主动调用该函数，告诉网络层有新的block产生了，block可以来源于自身也可以来源于外部节点
 * @param invMsg 
 */
export const notifyNewBlock = (invMsg:Inv) => {
    let blockSet = getSubMap().get(BLOCK);
    if(blockSet && blockSet.size>0){
        blockSet.forEach((netAddr:string)=>{
            let client = getConByNetAddr(netAddr);
            if(client){
                client.request(broadcastBlock, invMsg, TIME_OUT,(r:boolean)=>{
                    r && console.log(`broadcast block success`);
                })
                //broadcastBlock
            }
        });
    }
}