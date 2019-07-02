
enum NODE_TYPE{
    FULL_NODE = 1,
    UNKNOWN = 2,
}
enum CONNECTED{
    SUCCESS=1,
    FAIL=2,//连接失败
    CONNECTING=3,//连接中
    DISCONNECTED=4,//主动断开
}
//存储的全部是我主动链接的对方的节点
#[db=memory,primary=strNetAddr]
struct Peer{
    strNetAddr:String,// 对等节点的IP和端口
    nNodeType:NODE_TYPE,//节点类型，默认都是全节点
    strVersion:String,// 对等节点的当前版本
    nStartingHeight:usize,// 链接建立时对等节点的高度
    nStartingTotalWeigth:usize,// 链接建立时对等节点的总权重
    nCurrentHeight:usize,//对等节点的当前高度
    nCurrentTotalWeight:usize,//对等节点的当前总权重
    nLocalStartingHeight:usize,//链接建立时候自己的高度
    nlocalStartingTotalWeigth:usize,//链接建立时候自己的总权重
    strPublicKey:String,// 公钥，可以生成地址
    nConnected:CONNECTED,
    subTx:boolean,
    subBlock:boolean,
    // nTimeConnected:number,// 对等节点连接上的时间点，并不是连接所需的时间
    // bWhiteListed:boolean,// 该节点是否在我的白名单中
    // bPauseRecv:boolean,// 暂停接收该节点的数据
    // bPauseSend:boolean,// 暂停向该节点发送数据
    // mapSendBytesPerMsgCmd:Map<string,number>,// 统计数据，记录每一类消息总共发送的数据量
    // mapRecvBytesPerMsgCmd:Map<string,number>,// 统计数据，记录每一类消息总共接收的数据量

    // arrAddrToSend:string[],// 需要发送给对方的地址
    // setInvTxToSend:Set<Inv>,// 主要强调没有顺序
    // arrInvHeaderToSend:Inv[],// 区块的发送是有顺序的
    // arrInvHeaderToAnnounce:Inv[],// 主动告诉对方的区块信息
    // nLastMemTxPoolReqTime:number,// 最后一次请求缓存的交易信息的时间
    // nLastBlockTime:number,// 最后一次给我发送BLOCK信息的时间
    // nLastTxTime:number,// 最后一次给我发送TX信息的时间
    // nLocalStartingHeight:number,// 我从哪个高度开始请求对方的数据
    
    // nPoint:number,// 默认是0，每次违反协议则-1分，-10分则加入黑名单
}