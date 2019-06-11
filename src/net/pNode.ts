import { Queue } from "../util/queue";

/**
 * Information about a peer node
 */

 /**
  * 所有的对等节点类型
  */
enum NODE_TYPE  {
    FULL_NODE = 1
    //TODO:
}

/**
 * 定义一个标准的消息结构体
 */
interface NetMsg {

}

/**
 * 定义了所有的消息类型
 */
interface MSG_TYPE {
    VERSION : 0,
    VERACK,
    ADDR,
    GETADDR,
    INV,//announce new tx or blocks, or reply to a getblocks message or mempool message
    GETDATA,//还有个字段用于表示是需要获取TX详细信息还是block详细信息
    MERKLEBLOCK,//在demo版本中暂时不适用该字段
    GETHEADERS,//The getheaders message requests a headers message that provides block headers starting from a particular point in the block chain.
    TX, 
}

interface INV_MSG_TYPE {
    UNDEFINED:0,
    MSG_TX:1,
    MSG_BLOCK:2
} 

interface Inv {
    hash: number;
    MsgType: INV_MSG_TYPE;//实际取值只会是TX和BLOCK
}
export class PNode { 
    nNodeType:NODE_TYPE;
    hSocket:WebSocket;
    nSendSize:number;
    nRecSize:number;
    sProcessMsgs:Queue<NetMsg>;//所有待处理的消息
    sRecGetData:Queue<Inv>;//所有待处理的
}