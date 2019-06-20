import { getPeers } from "./p2p";
import { ShakeHandsInfo, NetMsg, MSG_TYPE, makeMsg } from "./msg";
import { getVersion, getTipHeight, getServiceFlags, getNodeType, getLocalAddr } from "./virtualEnv";
import { getCurrentPubkey } from "../pubkeyMgr";
import { getNextConnNonce, ConnMgr } from "./connMgr";
import { PNode } from "./pNode";

/**
 * the network process
 */


const checkVersion = ():boolean => {
    return false;
}

/**
 * start the p2p service and client
 */
const initNetLoop = ()=> {

}

/**
 * 开启80端口允许其他节点连接我
 */
const startNetService = () => {
    //TODO:可以加一些额外判断，包括对方是否在黑名单中，对方的版本是否和我一样等等.
    //TODO:不管是service还是client本质上都只是和对方建立链接，建立链接之后的操作一模一样.
    //TODO:需要存储对等节点相关的信息
}
/**
 * 本质上是向对方发送SHAKE_HANDS的消息
 */
export const startNetClients = () => {
    /**
     * TODO:从本地文件中读取
     */
    const peers = getPeers();
    peers.forEach((ip)=>{
        

        startConn(ip);
    })
    // for()
}

/**
 * 创建并保持连接
 * @param ip 
 * @param shakeHandsInfo 
 */
export const startConn = (ip:string) => {
    const shakeHandsInfo = {
        strVersion:getVersion(),//共识版本
        nStartingHeight:getTipHeight(),//本质上是我的当前区块高度
        nServiceFlags:getServiceFlags(),//我可以对外提供的服务
        nNodeType:getNodeType(),//默认都是全节点
        strLocalAddr:getLocalAddr(),//主要在p2p内网穿透时有用
        nPublicKey:getCurrentPubkey(),//公钥
        nLocalHostNonce:getNextConnNonce(),//我给对等节点分配的nonce
        bPing:true,
        bPong:true
    } as ShakeHandsInfo;
    //TODO:将SHAKEHANDS消息发送给对等节点
    //TODO:如果对方没有回应，则将该节点的积分-1
    //TODO:需要存储对等节点相关的信息
    //TODO:调用对等节点的shakeHands方法，如果正确返回，则将对等节点的isServer置为true
    makeMsg(MSG_TYPE.SHAKEHANDS, shakeHandsInfo);
}


/**
 * 链接的最核心函数，所有的消息都是在该函数中处理的
 * @param netMsg 
 * @param pNode 
 */


// ============================================ native
let bInited = false; 