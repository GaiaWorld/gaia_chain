import { getPeers } from "./p2p";
import { ShakeHandsInfo } from "./msg";
import { getVersion, getTipHeight, getServiceFlags, getNodeType, getLocalAddr } from "./virtualEnv";
import { getCurrentPubkey } from "../pubkeyMgr";
import { getNextConnNonce } from "./connMgr";

/**
 * the network process
 */

// the main func of processing all message
const processMsg = ():void => {
    
}

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

}
/**
 * 本质上是向对方发送SHAKE_HANDS的消息
 */
const startNetClients = () => {
    /**
     * TODO:从本地文件中读取
     */
    const peers = getPeers();
    peers.forEach((ip)=>{
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

        startConn(ip, shakeHandsInfo);
    })
    // for()
}

const startConn = (ip:string,shakeHandsInfo:ShakeHandsInfo) => {

}

// ============================================ native
let bInited = false; 