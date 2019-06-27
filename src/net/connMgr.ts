/**
 * mgr used for all clients
 */

import { RpcClient } from "../pi_pt/net/rpc_client";
import { PNode } from "./pNode";

/**
 * TODO:因为链接可能会很多，需要对链接进行管理，包括链接的上限，何时断开等
 */
// ========================================================== native

let connNonce = 0; 
export const conMap = new Map<string, RpcClient>();
const pNodeMap = new Map<string, PNode>();


// ========================================================  export

/**
 * 获取一个新的Nonce
 */
export const getNextConnNonce = ():number => {
    return ++connNonce ;
}

/**
 * 
 */
export const getConByNetAddr = (netAddr:string):RpcClient|void => {
    return conMap.get(netAddr);
}

/**
 * 
 */
export const setConByNetAddr = (netAddr:string,client:RpcClient):void => {
    conMap.set(netAddr, client);
    return;
}

/**
 * 
 */
export const getPeerNode = (netAddr:string):PNode|void => {
    return pNodeMap.get(netAddr);
}

/**
 * 
 */
export const setPeerNode = (netAddr:string, pNode:PNode):void => {
    pNodeMap.set(netAddr, pNode);
    return ;
}

