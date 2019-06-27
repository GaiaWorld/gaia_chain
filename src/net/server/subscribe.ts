import { Inv } from "./rpc.s";
import { getConByNetAddr, conMap } from "../connMgr";
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
    
    let txSet = getSubMap(TX);
    console.log(`txSet.size is : ${txSet.size}`);
    if(txSet && txSet.size>0){
        txSet.forEach((netAddr:string)=>{
            console.log(`netAddr is : ${netAddr}`)
            for (let key of conMap.keys()){
                console.log(`key is : ${key}` )
            }
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
    let blockSet = getSubMap(BLOCK);
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

export const getSubMap = (key:string):Set<string> => {
    console.log(`in sub map the size is : ${subMap.get(key).size}`)
    return subMap.get(key);
}


export const subMap = new Map<string,Set<string>>();
export const TX = "tx";
export const BLOCK = "block";
subMap.set(TX, new Set);
subMap.set(BLOCK, new Set);