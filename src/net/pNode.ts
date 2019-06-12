/**
 * Information about a peer node
 */
// ==================================================import
import { Queue } from "../util/queue";
import { Inv, NetMsg} from "./msg";

// ==================================================export 
/**
 * 所有的对等节点类型
 */
export enum NODE_TYPE  {
    FULL_NODE = 1
    //TODO:
}

export const MIN_POINT = -10;
/**
 * peer node
 */
export class PNode { 
    //websocket
    nNodeType:NODE_TYPE;
    hSocket:WebSocket;
    nSendSize:number;
    nRecvSize:number;
    sProcessMsgs:Queue<NetMsg>;//所有待处理的消息
    arrRecvMsg:Queue<NetMsg>;//所有收到的消息
    sRecvGetData:Queue<Inv>;//所有待处理的数据，本质上只会是TX和BLOCK
    strVersion:string;//对等节点的当前版本,感觉是一个完整的数据结构，而不仅仅是一个字符串
    nLastSendTime:number;
    nLastRecvTime:number;
    nTimeConnected:number;//对等节点连接上的时间点，并不是连接所需的时间
    nTimeOffset:number;//对方发送信息的时候会有一个时间戳，我接收到信息会有一个时间戳，两者相减就是timeoffset，如果整个值超过了阈值，则需要进行时钟修正
    //不一定是我的时钟有问题，也可能是对等节点时钟有问题，这个时候需要多个节点就行对比才能确定
    strAddr:string;//对等节点的IP和端口
    bWhiteListed:boolean;//该节点是否在我的白名单中
    bFullyConnected:boolean;//指代的是连接上了且通过了双方的握手协议
    bDisconnect:boolean;//仅仅指代断开连接
    bSentAddr:boolean;//是否发送部分节点地址给对方
    bPauseRecv:boolean;//暂停接收该节点的数据
    bPauseSend:boolean;//暂停向该节点发送数据
    mapSendBytesPerMsgCmd:Map<string,number>;//统计数据，记录每一类消息总共发送的数据量
    mapRecvBytesPerMsgCmd:Map<string,number>;//统计数据，记录每一类消息总共接收的数据量
    //block
    hashContinue:number;//如果数据太多一次性发不完，则需要记录下一次发送的起始hash,该值可以为NULL
    nStartingHeight:number;//从哪个高度向自己要的数据
    arrAddrToSend:Array<string>;//需要发送给对方的地址
    setInvTxToSend:Set<Inv>;//主要强调没有顺序
    arrInvHeaderToSend:Array<Inv>;//区块的发送是有顺序的
    arrInvHeaderToAnnounce:Array<Inv>;//主动告诉对方的区块信息
    nLastMemTxPoolReqTime:number;//最后一次请求缓存的交易信息的时间
    nLastBlockTime:number;//最后一次给我发送BLOCK信息的时间
    nLastTxTime:number;//最后一次给我发送TX信息的时间
    //ping-pong
    nLastPingTime:number;
    nLastPingPongTime:number;//从ping到pong返回的时间
    bPing:boolean;//对方会主动ping我
    bPong:boolean;//对方是否会响应pong
    //local
    nNodeId:number;
    nLocalHostNonce:number;//我自己给对等节点分配的Nonce
    nServiceFlags:number;//本质上是一个二进制数，每一位代表一个服务
    nMyStartingHeight:number;//我从哪个高度开始请求对方的数据
    nSendVersion:string;//我告诉对方我的版本,我可以告诉不同的对等节点不同的版本
    strLocalAddr:string;//我的IP和端口
    //peer
    nPublicKey:string;//公钥，可以生成地址
    nPoint:number;//默认是0，每次违反协议则-1分，-10分则加入黑名单
}