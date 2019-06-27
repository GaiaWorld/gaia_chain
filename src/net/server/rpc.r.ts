/**
 * 封装了所有客户端可以调用的RPC请求
 */
import { makeShakeHandsInfo } from "../client/launch";
import { ShakeHandsInfo, TxArray, BodyArray, HeaderArray, AddrArray, InvArray, hashArray, Inv, InvNet, hashArrayNet, ShakeHandsInfoNet } from "./rpc.s";
import { checkShakeHandsInfo} from "../virtualEnv";
import { memoryBucket } from "../../util/db";
import { SubTable } from "./rpc.s";
import { SerializeType } from "../../pi/util/bon";
import { RpcClient } from "../../pi_pt/net/rpc_client";

// #[rpc=rpcServer]
export const shakeHands = (info:ShakeHandsInfo):ShakeHandsInfo => {
    if(checkShakeHandsInfo(info)){
        //TODO:此处应该记录下对等节点的基本信息，暂时使用strLocalServerAddr作为主键
    return makeShakeHandsInfo();
    }
}

// #[rpc=rpcServer]
export const getTxs = (hashs:hashArrayNet):TxArray => {

    return new TxArray;
}

// #[rpc=rpcServer]
export const getBlocks = (hashs:hashArrayNet):BodyArray => {
    //TODO:此处直接调用core的getBlock方法
    return new BodyArray;
}

// #[rpc=rpcServer]
export const getHeaders = (hashs:hashArrayNet):HeaderArray=>{
    //TODO:此处直接调用core的getHeader方法
    return new HeaderArray;
}

// #[rpc=rpcServer]
export const getMemPool = ():InvArray=>{
    //TODO:此处直接调用core的getmemPool方法，返回所以pool中的交易的hash值
    return new InvArray;
}

// #[rpc=rpcServer]
export const getAddress = ():AddrArray=>{
    //TODO:根据我们地址的积分优先返回积分高的的ip,最多返回40个
    return new AddrArray;
}

// #[rpc=rpcServer]
export const getCurTime = ():number => {
    return 0;
}


const subscribeKeyFromMemory = (pNetAddr:string, key:string) => {
    let bkt = memoryBucket(SubTable._$info.name);
    let column = bkt.get<string, SubTable>(key)[0];
    if(column && column.value){
       //TODO:暂时不需要做处理 
    }
    else {
        column = new SubTable;
        column.key=key;
        column.value = [];
    }

    if (column.value.indexOf(pNetAddr) < 0) {
        column.value.push(pNetAddr);
        bkt.put(key, column);
    }

    return true;
}

// #[rpc=rpcServer]
export const subscribeTx = (netAddr:string):boolean => {
    return subscribeKeyFromMemory(netAddr, "tx");
}

// #[rpc=rpcServer]
export const subscribeBlock = (netAddr:string):boolean => {
    return subscribeKeyFromMemory(netAddr, "block");
}

/**
  * 主动向外广播交易信息
  * 在广播的内部有一些更细节的处理，会判断对等节点是否已经有该tx了，有了就不发
  * @param invMsg 
  */

 // #[rpc=rpcServer]
 export const broadcastInv = (invMsg:InvNet):boolean=>{
    console.log(`new ${invMsg.r.MsgType} reach from ${invMsg.net}'s client!!!!`);
    return true;
}

/**
 * 看起来像http，功能上是一个短链接
 */
export const clientRequest = (pNetAddr:string, cmd:string, body: SerializeType, callback: (SerializeType,pNetAddr?:string) => void)=>{
    let client = RpcClient.create(`ws://${pNetAddr}`);
    client.connect(KEEP_ALIVE,"1", TIME_OUT, ((pNetAddr)=>{
        return ()=>{

            client.request(cmd, body, TIME_OUT, (r:any)=>{
                callback(r, pNetAddr)
            })
        }
    })(pNetAddr),()=>{})
}

const KEEP_ALIVE = 10000;
const TIME_OUT = 5000;