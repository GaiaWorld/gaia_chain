import { Inv, InvNet, SubTable } from "./rpc.s";
import { getConByNetAddr, conMap } from "../connMgr";
import { broadcastInv } from "./rpc.p";
import { memoryBucket } from "../../util/db";
import { clientRequest } from "./rpc.r";
import { getOwnNetAddr } from "../client/launch";

/**
 * 作为服务器允许对等节点订阅的主题，并且主动给对等节点发送相应的信息
 */

 /**
 * core主动调用该函数，告诉网络层有新的TX产生了，TX可以来源于自身也可以来源于外部节点
 * @param invMsg 
 */
export const notifyNewTx = (invMsg:Inv)=>{
    notifyNewInv("tx",invMsg);
}

const notifyNewInv = (key:string, invMsg:Inv) => {
    let invNet = new InvNet;
    invNet.net = getOwnNetAddr();
    invNet.r = invMsg;
    let bkt = memoryBucket(SubTable._$info.name);
    let column = bkt.get<string, SubTable>(key)[0];
    if(column !== undefined && column.value !== undefined && column.value.length > 0){
        column.value.forEach((netAddr)=>{
            console.log(`netAddr is : ${netAddr}, invNet is : ${JSON.stringify(invNet)}`)
            clientRequest(netAddr,broadcastInv, invNet, ()=>{
                console.log(`success notify a ${key}`);
            })
        })
    }
}

/**
 * core主动调用该函数，告诉网络层有新的block产生了，block可以来源于自身也可以来源于外部节点
 * @param invMsg 
 */
export const notifyNewBlock = (invMsg:Inv) => {
    notifyNewInv("block",invMsg);
}