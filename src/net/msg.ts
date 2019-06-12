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
    nVersion:number;//这个是网络协议的版本，不是共识版本
    nSendTime:number;//消息发送时的本地时间
}

/**
 * all message use this struct
 */
export interface NetMsg {
    msgHeader:MsgHeader;
    msgData:JSON;
}

/**
 * all message type
 */
export const enum MSG_TYPE   {
    VERSION = "version",//共识版本
    VERACK = "verack",//握手确认
    
    GETADDR = "getaddr",//获取地址
    ADDR = "addr",//发送地址
    GETDATA = "getdata",//include TXS and BLOCKS 还有个字段用于表示是需要获取TX详细信息还是block详细信息
    TX = "tx", //发送交易
    BLOCK = "block",//发送区块
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
    hash: number;
    MsgType: INV_MSG_TYPE;//实际取值只会是TX和BLOCK
}

/**
 * message 
 */
export const makeMsg = (msgType:MSG_TYPE,data:JSON):NetMsg=>{
    
}