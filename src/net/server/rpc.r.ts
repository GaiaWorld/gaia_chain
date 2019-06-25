/**
 * 封装了所有客户端可以调用的RPC请求
 */
import { con2Server, getOwnNetAddr, makeShankeHandsInfo } from "../client/launch";
import { ShakeHandsInfo, TxArray, BodyArray, HeaderArray, AddrArray, InvArray, hashArray } from "./rpc.s";
import { checkShakeHandsInfo } from "../virtualEnv";
import { getConByNetAddr } from "../connMgr";

// #[rpc=rpcServer]
export const shakeHands = (info:ShakeHandsInfo):ShakeHandsInfo => {
    if(checkShakeHandsInfo(info)){
        // if(!getConByNetAddr(info.strLocalServerAddr)){
        //     con2Server(getOwnNetAddr())
        // }
    return makeShankeHandsInfo();
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