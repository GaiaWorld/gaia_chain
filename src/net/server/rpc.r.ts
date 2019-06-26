/**
 * 封装了所有客户端可以调用的RPC请求
 */
import { makeShakeHandsInfo } from "../client/launch";
import { ShakeHandsInfo, TxArray, BodyArray, HeaderArray, AddrArray, InvArray, hashArray, Inv } from "./rpc.s";
import { checkShakeHandsInfo} from "../virtualEnv";

// #[rpc=rpcServer]
export const shakeHands = (info:ShakeHandsInfo):ShakeHandsInfo => {
    if(checkShakeHandsInfo(info)){
        // if(!getConByNetAddr(info.strLocalServerAddr)){
        //     con2Server(getOwnNetAddr())
        // }
    return makeShakeHandsInfo();
    }
}

// #[rpc=rpcServer]
export const getTxs = (hashs:hashArray):TxArray => {

    return new TxArray;
}

// #[rpc=rpcServer]
export const getBlocks = (hashs:hashArray):BodyArray => {
    //TODO:此处直接调用core的getBlock方法
    return new BodyArray;
}

// #[rpc=rpcServer]
export const getHeaders = (hashs:hashArray):HeaderArray=>{
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

// #[rpc=rpcServer]
export const subscribeTx = (netAddr:String):boolean => {
    let txSet = subMap.get(TX) || new Set<String>();
    txSet.add(netAddr);
    subMap.set(TX,txSet);
    return true;
}

// #[rpc=rpcServer]
export const subscribeBlock = (netAddr:String):boolean => {
    let txSet = subMap.get(BLOCK) || new Set<String>();
    txSet.add(netAddr);
    subMap.set(BLOCK,txSet);
    return true;
}

/**
  * 主动向外广播交易信息
  * 在广播的内部有一些更细节的处理，会判断对等节点是否已经有该tx了，有了就不发
  * @param invMsg 
  */

 // #[rpc=rpcServer]
 export const broadcastTx = (invMsg:Inv):boolean=>{
    console.log("new tx reach!!!!");
    //TODO:此处core需要自己处理，如果需要就需要再调用getTxs真的去获取交易
    return true;
}

/**
 * 主动向外广播区块信息
 * 在广播的内部有一些更细节的处理，会判断对等节点是否已经有该block了，有了就不发
 * @param invMsg 
 */

// #[rpc=rpcServer]
export const broadcastBlock = (invMsg:Inv)=>{
    console.log("new block reach!!!!");
    //TODO:此处core需要自己处理，如果需要就需要再调用getHeaders真的去获取交易头
    return true;
}

export const getSubMap = ():Map<String,Set<String>> => {

    return subMap;
}
const subMap = new Map<String,Set<String>>();
export const TX = "tx";
export const BLOCK = "block";