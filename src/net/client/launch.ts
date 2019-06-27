import { DEFAULT_PEER, OWN_NET_ADDR } from "../server/cfg/net";
import { getNextConnNonce} from "../connMgr";
import { getTipHeight, getVersion, getServiceFlags, getNodeType } from "../virtualEnv";
import { getLocalAddr } from "../virtualEnv";
import { getCurrentPubkey } from "../../pubkeyMgr";
import { PNode } from "../pNode";
import { ShakeHandsInfo } from "../server/rpc.s";
import { shakeHands, subscribeTx, subscribeBlock } from "../server/rpc.p";
import { clientRequest } from "../server/rpc.r";

/**
 * the main loop of client
 */

// =========================================== export 


/**
 * start the client 
 */
export const launch = () => {
  const ownNetAddr = getOwnNetAddr();
    getPeers().forEach((netAddr: string) => {
    if (netAddr !== ownNetAddr) {
        clientRequest(netAddr, shakeHands, makeShakeHandsInfo(),(r,pNetAddr)=>{
            console.log(`success shakehands with ${pNetAddr}`);
            clientRequest(netAddr, subscribeTx, getOwnNetAddr(), (r)=>{
                if(r){
                    console.log(`subscribe tx success`);
                }
            })
            clientRequest(netAddr, subscribeBlock, getOwnNetAddr(), (r)=>{
                if(r){
                    console.log(`subscribe block success`);
                }
            })
        })
    }
  })
}

/**
 * get all the peers from the db or the default config file
 */
export const getPeers = () => {
  let peers = getPeersFromDb();
  (peers.length == 0) && (peers = getPeersFromCfgFile());
  return peers;
}

/**
 * for demo0.1 version, all the peers come from the config file
 */
const getPeersFromDb = (): Array<string> => {
  return [];
}

const getPeersFromCfgFile = (): Array<string> => {
  return DEFAULT_PEER;
}

export const getOwnNetAddr = (): string => {
  return OWN_NET_ADDR;
}

export const con2Server = (netAddr: string) => {

}

/**
 * 生成握手信息
 */
export const makeShakeHandsInfo = ():ShakeHandsInfo => {
    let shakeHandsInfo = new ShakeHandsInfo;
    shakeHandsInfo.strVersion = getVersion();
    shakeHandsInfo.nStartingHeight = getTipHeight();
    shakeHandsInfo.nServiceFlags = getServiceFlags();
    shakeHandsInfo.nNodeType = getNodeType();
    shakeHandsInfo.strLocalClientAddr = getLocalAddr();
    shakeHandsInfo.strLocalServerAddr = getOwnNetAddr();
    shakeHandsInfo.nPublicKey = getCurrentPubkey();
    shakeHandsInfo.nLocalHostNonce = getNextConnNonce();
    shakeHandsInfo.bPing = true;
    shakeHandsInfo.bPong = true;

    return shakeHandsInfo;
}

const updatePeerNodeByShakeHands = (pNode:PNode, shakeHandsInfo:ShakeHandsInfo):PNode => {
    let pNodeCopy = new PNode();
    return pNodeCopy;
}
