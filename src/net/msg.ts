import { NODE_TYPE } from "./pNode";

/**
 * msg struct
 */
// ===============================================================export 
export const MAX_MESSAGE_SIZE = 8*1024*1024*8;//最大一次发送8M的数据

/**
 * it's message header, not the block header.
 */
export interface MsgHeader{
    nMsgType:MSG_TYPE;
    nChecksum:number;//使用MD5校验，只保证消息体在网络传输中没有被毁坏，不保证消息没有被恶意串改
    nMsgSize:number;//消息体的大小
    nVersion:number;//这个是应用层网络协议的版本，不是共识版本
    nSendTime:number;//消息发送时的本地时间
}

/**
 * all message use this struct
 */
export interface NetMsg {
    msgHeader:MsgHeader;
    msgData:JSON;
}

export interface ShakeHandsInfo {
    strVersion:string;//共识版本
    nStartingHeight:number;//本质上是我的当前区块高度
    nServiceFlags:number;//我可以对外提供的服务
    nNodeType:NODE_TYPE;//默认都是全节点
    strLocalAddr:string;//主要在p2p内网穿透时有用
    nPublicKey:string;//公钥
    nLocalHostNonce:number;//我给对等节点分配的nonce
    bPing:boolean;
    bPong:boolean;
}

/**
 * all message type
 */
export const enum MSG_TYPE   {
    SHAKEHANDS = "shakehands",//确认共识版本等基础信息
    VERACK = "verack",//握手确认
    
    GETADDR = "getaddr",//获取地址
    ADDR = "addr",//发送地址
    GETTX = "gettx",
    TX = "tx", //发送交易
    GETBLOCK="getblock",//其实返回的是body
    BLOCK = "block",//发送区块，本质上是body
    GETHEADERS = "getheaders",//The getheaders message requests a headers message that provides block headers starting from a particular point in the block chain.
    HEADERS = "headers",//发送区块头
    GETMEMTXPOOL = "getmemtxpool",//requests the TXIDs of transactions that the receiving node has verified as valid but which have not yet appeared in a block
    INV = "inv",//announce new tx or blocks, or reply GETTXPOOL message

    MERKLEBLOCK = "merkleblock",//在demo版本中暂时不适用该字段
    //不存在向对方获取缓存池中的区块的情况，只会获取bestchain的区块
    NOTFOUND = "notfound",//reply to a getdata message which requested an object the receiving node does not have available for relay.
    REJECT = "reject",//拒绝请求

    PING = "ping",
    PONG = "pong"
}

/**
 * inventory message type
 */
export const enum INV_MSG_TYPE {
    UNDEFINED = "undefined",
    MSG_TX = "msg_tx",
    MSG_BLOCK = "msg_block"
} 
/**
 * inventory message, announce new tx or blocks, or reply GETTXPOOL message
 */
export interface Inv {
    height:number;//交易所在的区块高度，或者区块本身的高度
    hash: number;
    MsgType: INV_MSG_TYPE;//实际取值只会是TX和BLOCK
}

/**
 * message 
 */
export const makeMsg = (msgType:MSG_TYPE,data:any):NetMsg=>{
    
}