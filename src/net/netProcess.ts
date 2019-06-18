import { getPeers } from "./p2p";
import { ShakeHandsInfo, NetMsg, MSG_TYPE } from "./msg";
import { getVersion, getTipHeight, getServiceFlags, getNodeType, getLocalAddr } from "./virtualEnv";
import { getCurrentPubkey } from "../pubkeyMgr";
import { getNextConnNonce, ConnMgr } from "./connMgr";
import { PNode } from "./pNode";

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
    //TODO:可以加一些额外判断，包括对方是否在黑名单中，对方的版本是否和我一样等等.
    //TODO:不管是service还是client本质上都只是和对方建立链接，建立链接之后的操作一模一样.
    //TODO:需要存储对等节点相关的信息
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

/**
 * 创建并保持连接
 * @param ip 
 * @param shakeHandsInfo 
 */
const startConn = (ip:string,shakeHandsInfo:ShakeHandsInfo) => {
    //TODO:将SHAKEHANDS消息发送给对等节点
    //TODO:如果对方没有回应，则将该节点的积分-1
    //TODO:需要存储对等节点相关的信息
}

/**
 * 初步校验消息本身有没有在传输过程中被破坏
 * 主要就是校验消息头
 * 包括MD5和消息协议的版本是否一致,以及数据结构是否符合要求
 * 消息类型是否正确
 * @param netMsg 
 * @param pNode 
 */
const isMsgAvaiable = (netMsg:NetMsg,pNode:PNode):boolean => {
    return true;
}

/**
 * 更新对等节点的最新通讯时间
 * 如果时间明显不合理，比如小于上一个通讯时间或者明显大于当前时间则不更新
 * @param netMsg 
 * @param pNode 
 */
const updateMsgTime= (netMsg:NetMsg,pNode:PNode):boolean=> {
    return true;
}
/**
 * 链接的最核心函数，所有的消息都是在该函数中处理的
 * @param netMsg 
 * @param pNode 
 */
const processMessage = (netMsg:NetMsg,pNode:PNode) => {
    if(!isMsgAvaiable(netMsg,pNode)){
        return ;
    }
    updateMsgTime(netMsg,pNode);
    switch(netMsg.msgHeader.nMsgType){
        case MSG_TYPE.SHAKEHANDS:
            /**
             * 如果通过本地节点的各种检测则回应VERACK消息给对等节点
             * 并且可以和该节点进行区块数据的交换
             */
            break;
        case MSG_TYPE.VERACK:
            /**
             * 对方返回了自己的节点信息，已经通过了对方的认证
             * 可以和对方进行区块数据的交换
             */
            break;
        case MSG_TYPE.GETADDR:
            /**
             * 在P2P网络中对方节点希望获取到更多的节点IP
             * 为了防止形成局域网，所有网络地址中必须有1/3是通过对方的广播获取的
             * 只有2/3是通过GETADDR获取的
             */
            break;
        case MSG_TYPE.ADDR:
            /**
             * 通过本地算法返回不超过20个IP地址
             * 为了防止形成局域网，所有网络地址中必须有1/3是通过对方的广播获取的
             * 只有2/3是通过GETADDR获取的
             */
            break;
        case MSG_TYPE.GETDATA:
            /**
             * 这是一个明确告知对方需要哪一个交易数据或者哪一个区块数据
             */
            break;
        case MSG_TYPE.TX:
            /**
             * 返回给对方具体的交易信息,是GETDATA的回应消息
             */
            break;
        case MSG_TYPE.BLOCK:
            /**
             * 返回给对方区块详细信息，是GETDATA的回应消息
             */
            break;
        case MSG_TYPE.GETHEADERS:
            /**
             * 请求区块头消息
             */
            break;
        case MSG_TYPE.HEADERS:
            /**
             * 返回具体的区块头消息，是GETHEADERS的回应消息
             */
            break;
        case MSG_TYPE.GETMEMTXPOOL:
            /**
             * 请求放在缓存池中的孤立交易
             */
            break;
        case MSG_TYPE.INV:
            /**
             * 是GETMEMTXPOOL的回应消息，同时也是主动广播的消息
             */
            break;
        case MSG_TYPE.NOTFOUND:
            break;
        case MSG_TYPE.REJECT:
            break;
        case MSG_TYPE.PING:
            break;
        case MSG_TYPE.PONG:
            break;
        default:
            break;
    }
}


// ============================================ native
let bInited = false; 