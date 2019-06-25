import { DEFAULT_PEER, OWN_NET_ADDR } from "../server/cfg/net";
import { RpcClient } from "../../pi_pt/net/rpc_client";
import { getConByNetAddr, getNextConnNonce, setConByNetAddr, getPeerNode, setPeerNode } from "../connMgr";
import { getTipHeight, getVersion, getServiceFlags, getNodeType } from "../../chain/blockchain";
import { getLocalAddr } from "../virtualEnv";
import { getCurrentPubkey } from "../../pubkeyMgr";
import { PNode } from "../pNode";
import { ShakeHandsInfo } from "../server/rpc.s";
import { StructMgr } from "../../pi/struct/struct_mgr";
import * as schema from "../../chain/schema.s";

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
      con2Server(netAddr);
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
  let client = getConByNetAddr(netAddr);
  if(client){
      //TODO:if it is disconnected, reconnet
  }else{
      console.log(`before`)
      let client = RpcClient.create(`ws://${netAddr}`);
      console.log(`after`)
      client.connect(KEEP_ALIVE, ''+ getNextConnNonce(), TIME_OUT, ((netAddr)=>{
          return () => {
              console.log(`${netAddr} is connected`)
              let shakeHandsInfo = makeShankeHandsInfo();
            //TODO:将SHAKEHANDS消息发送给对等节点
            //TODO:如果对方没有回应，则将该节点的积分-1
            //TODO:需要存储对等节点相关的信息
            //TODO:调用对等节点的shakeHands方法，如果正确返回，则将对等节点的isServer置为true
            let client = getConByNetAddr(netAddr)
              client && client.request("shakeHands", shakeHandsInfo, TIME_OUT, (r:ShakeHandsInfo)=>{
                  let pNode = getPeerNode(netAddr);
                  if(!pNode){
                      pNode = new PNode;
                  }
                  pNode = updatePeerNodeByShakeHands(pNode, shakeHandsInfo);
                  setPeerNode(netAddr, pNode);
              })
          }
      })(netAddr),((netAddr)=>{
        return () => {
            console.log(`${netAddr} is closed`)
        }
      })(netAddr));
      setConByNetAddr(netAddr, client);
  }
}

/**
 * 生成握手信息
 */
export const makeShankeHandsInfo = ():ShakeHandsInfo => {
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
const KEEP_ALIVE = 10000;
const TIME_OUT = 5000;