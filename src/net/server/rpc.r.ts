/**
 * 封装了所有客户端可以调用的RPC请求
 */
import { con2Server, getOwnNetAddr, makeShankeHandsInfo } from "../client/launch";
import { ShakeHandsInfo, TxArray, BodyArray, HeaderArray, AddrArray, InvArray } from "./rpc.s";
import { checkShakeHandsInfo } from "../virtualEnv";
import { getConByNetAddr } from "../connMgr";


/**
 * 
 * @param info 
 */
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
 * @param hashs 
 */
// #[rpc=rpcServer]
export const getTxs = (hashs:Array<string>):TxArray => {
    //TODO:此处直接调用core的getTx方法
    return new TxArray;
}

/**
 * 本质上返回的是body
 * 一次最多请求100个区块
 * @param hashs 
 */
// #[rpc=rpcServer]
export const getBlocks = (hashs:Array<string>):BodyArray => {
    //TODO:此处直接调用core的getBlock方法
    return new BodyArray;
}

/**
 * 一次最多请求10000个区块头
 * @param hashs 
 */
// #[rpc=rpcServer]
export const getHeaders = (hashs:Array<string>):HeaderArray=>{
    //TODO:此处直接调用core的getHeader方法
    return new HeaderArray;
}

/**
 * 这个RPC应该是隔一段时间主动调用一次
 */
// #[rpc=rpcServer]
export const getMemPool = ():InvArray=>{
    //TODO:此处直接调用core的getmemPool方法，返回所以pool中的交易的hash值
    return new InvArray;
}

/**
 * 
 */
// #[rpc=rpcServer]
export const getAddress = ():AddrArray=>{
    //TODO:根据我们地址的积分优先返回积分高的的ip,最多返回40个
    return new AddrArray;
}

/**
 * 
 */
// #[rpc=rpcServer]
export const getCurTime = ():number => {
    return 0;
}