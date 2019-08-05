/**
 * 封装了所有客户端可以调用的RPC请求
 */
import { getBlock, getGenesisHash, getHeader, getHeaderByHeight, getTipHeight, getTipTotalWeight, getTx, newBodiesReach, newHeadersReach, newTxsReach } from '../../chain/blockchain';
import { checkVersion } from '../../chain/validation';
import { EMPTY_BLOCK_HEAD_HASH } from '../../params/constants';
import { SerializeType } from '../../pi/util/bon';
import { RpcClient } from '../../pi_pt/net/rpc_client';
import { memoryBucket } from '../../util/db';
import { getOwnNetAddr, makeShakeHandsInfo } from '../client/launch';
import { DEFAULT_STR_ERR } from '../const';
import { CURRENT_DOWNLOAD_PEER_NET_ADDR, download, isSyncing, MAX_HEADER_NUMBER } from '../download';
import { CurrentInfo } from '../memory.s';
import { INV_MSG_TYPE } from '../msg';
import { Peer } from '../pNode.s';
import { getBlocks as getBlocksString, getHeaders as getHeadersString, getTxs as getTxsString } from './rpc.p';
import { AddrArray, BodyArray, GetHeaderHeight, HeaderArray, Inv, InvArray,InvArrayNet, InvNet, ShakeHandsInfo, SubTable, TxArray } from './rpc.s';

// #[rpc=rpcServer]
export const shakeHands = (info:ShakeHandsInfo):ShakeHandsInfo => {
    const shakeHandsInfo = makeShakeHandsInfo();
    if (info.strGensisHash !== getGenesisHash() || !checkVersion(info.strVersion)) {
        shakeHandsInfo.strNetAddr = DEFAULT_STR_ERR;
    }
    
    return shakeHandsInfo;
};

// #[rpc=rpcServer]
export const getTxs = (invArray:InvArrayNet):TxArray => {
    const txArray = new TxArray();
    txArray.arr = [];
    invArray.r.arr.forEach((inv:Inv) => {
        const tx = getTx(inv);
        if (tx) {
            txArray.arr.push(tx);
        }
    });

    return txArray;
};

// #[rpc=rpcServer]
export const getBlocks = (invArray:InvArrayNet):BodyArray => {
    const bodyArray = new BodyArray();
    bodyArray.arr = [];
    invArray.r.arr.forEach((inv:Inv) => {
        const block = getBlock(inv);
        if (block && block.header.bhHash !== EMPTY_BLOCK_HEAD_HASH) {
            bodyArray.arr.push(block.body);
        }
    });

    return bodyArray;
};

// #[rpc=rpcServer]
export const getHeaders = (invArray:InvArrayNet):HeaderArray => {
    // TODO:此处直接调用core的getHeader方法
    const headerArray = new HeaderArray();
    headerArray.arr = [];
    invArray.r.arr.forEach((inv:Inv) => {
        const header = getHeader(inv);
        if (header) {
            headerArray.arr.push(header);
        }
    });

    return headerArray;
};

/**
 * 如果有from/to就不使用第三个参数
 */
 // #[rpc=rpcServer]
export const getHeadersByHeight = (heights:GetHeaderHeight):HeaderArray => {
    const headerArray = new HeaderArray();
    headerArray.arr = [];
    if (heights.to - heights.from < 0 || heights.to - heights.from > MAX_HEADER_NUMBER) {
        return headerArray;
    }
    if (heights.to - heights.from > 0) {
        heights.heights = [];
        for (let i = heights.from; i <= heights.to; i++) {
            heights.heights.push(i);
        }
    }
    heights.heights.forEach((height:number) => {
        const header = getHeaderByHeight(height);
        // 只要有一条没取到就返回空
        if (header === undefined) {
            headerArray.arr = [];

            return;
        }
        headerArray.arr.push(header);
    });

    return headerArray;
};

// #[rpc=rpcServer]
export const getMemPool = (netAddr:string):InvArray => {
    // TODO:此处直接调用core的getmemPool方法，返回所以pool中的交易的hash值
    const invArray = new InvArray();
    invArray.arr = [];

    return invArray;
};

// #[rpc=rpcServer]
export const getAddress = (netAddr:string):AddrArray => {
    // TODO:根据我们地址的积分优先返回积分高的的ip,最多返回40个
    const addrArray = new AddrArray();
    addrArray.arr = [];

    return addrArray;
};

// #[rpc=rpcServer]
export const getCurTime = (netAddr:string):number => {
    return 0;
};

/**
 * 
 * @param pNetAddr network address
 * @param key the value is 'tx' or 'block'
 */
const subscribeKeyFromMemory = (pNetAddr:string, key:string):boolean => {
    const bkt = memoryBucket(SubTable._$info.name);
    let column = bkt.get<string, SubTable>(key)[0];
    console.log(`rpc column is : ${column}`);
    if (column === undefined || column.value === undefined) {
        column = new SubTable();
        column.key = key;
        column.value = [];
    }

    if (column.value.indexOf(pNetAddr) < 0) {
        column.value.push(pNetAddr);
        bkt.put(key, column);
    }

    return true;
};

// #[rpc=rpcServer]
export const subscribeTx = (netAddr:string):boolean => {
    return subscribeKeyFromMemory(netAddr, 'tx');
};

// #[rpc=rpcServer]
export const subscribeBlock = (netAddr:string):boolean => {
    return subscribeKeyFromMemory(netAddr, 'block');
};

/**
 * * 在广播的内部有一些更细节的处理，会判断对等节点是否已经有该tx了，有了就不发
 * @param invNet * 主动向外广播交易信息
 * 
 */
// #[rpc=rpcServer]
export const broadcastInv = (invNet:InvNet):boolean => {
    console.log(`new ${invNet.r.MsgType} reach from ${invNet.net}'s client!!!! ${JSON.stringify(invNet)}`);

    // example
    if (invNet.r.MsgType === INV_MSG_TYPE.MSG_BLOCK) {
        // TODO: core判断是否需要该block,如果需要则首先调用getHeaders
        console.log('(getHeader(invNet.r): ', getHeader(invNet.r));
        if (getHeader(invNet.r) !== undefined) {
            return false;
        }
        const invArrayNet = new InvArrayNet();
        invArrayNet.net = getOwnNetAddr();
        invArrayNet.r = new InvArray();
        invArrayNet.r.arr = [invNet.r];
        clientRequest(invNet.net,getHeadersString,invArrayNet, (headerArray:HeaderArray, pHeaderNetAddr:string) => {
            
            if (!headerArray.arr || headerArray.arr.length === 0) {
                return false;
            }
            // 和当前高度进行对比
            if (headerArray.arr[0].totalWeight < getTipTotalWeight()) {
                return false;
            }
            // 更新节点信息
            const peerBkt =  memoryBucket(Peer._$info.name);
            const peer = peerBkt.get<string,[Peer]>(pHeaderNetAddr)[0];
            peer.nCurrentHeight = headerArray.arr[0].height; 
            peer.nCurrentTotalWeight = headerArray.arr[0].totalWeight; 
            peerBkt.put(pHeaderNetAddr, peer);
            // 和同步节点进行对比
            const downloadPeer = memoryBucket(CurrentInfo._$info.name).get<string,[CurrentInfo]>(CURRENT_DOWNLOAD_PEER_NET_ADDR)[0].value;
            if (downloadPeer && isSyncing()) {
                if (headerArray.arr[0].totalWeight < memoryBucket(Peer._$info.name).get<string,[Peer]>(downloadPeer)[0].nStartingTotalWeigth) {
                    return false;
                }
                if (headerArray.arr[0].totalWeight < memoryBucket(Peer._$info.name).get<string,[Peer]>(downloadPeer)[0].nCurrentTotalWeight) {
                    return false;
                }
                // TODO:如果走到了这里说明出现了一条链比我正在同步的链条更长，我需要更换到该链重新进行同步
                console.log(`need change the download chain`);

                return false;
            }
            const tipHeight = getTipHeight();
            // TODO:JFB 如果此头的高度超过本地高度+2，则需要重新启动同步
            if (headerArray.arr[0].height >= tipHeight + 2) {
                download(memoryBucket(Peer._$info.name).get<string,[Peer]>(invNet.net)[0]);
            } else if (headerArray.arr[0].height === tipHeight + 1) {
                newHeadersReach(headerArray.arr);
            }

            // TODO: core判断是否需要对应的body，如果需要则通过getBlocks获取
            clientRequest(invNet.net, getBlocksString, invArrayNet, (bodyArray:BodyArray, pBlockNetAddr:String) => {
                // TODO: 对body进行验证
                if (bodyArray && bodyArray.arr.length > 0) {
                    newBodiesReach(bodyArray.arr);
                }
            });
        });
    }
    // example
    if (invNet.r.MsgType === INV_MSG_TYPE.MSG_TX) {
        if (getTx(invNet.r) !== undefined) {
            return false;
        }
        const invArrayNet = new InvArrayNet();
        invArrayNet.net = getOwnNetAddr();
        invArrayNet.r = new InvArray();
        invArrayNet.r.arr = [invNet.r];
        clientRequest(invNet.net,getTxsString,invArrayNet, (txArray:TxArray, pNetAddr:String) => {
            // TODO: 告诉core有新的tx到达了
            newTxsReach(txArray.arr);
        });
    }

    return true;
};

/**
 * 看起来像http，功能上是一个短链接
 */
export const clientRequest = (pNetAddr:string, cmd:string, body: SerializeType, callback: (serializeType:SerializeType,pNetAddr?:string) => void):void => {
    const client = RpcClient.create(`ws://${pNetAddr}`);
    client.connect(KEEP_ALIVE,'1', TIME_OUT, ((pConNetAddr:string):(() => void) => {
        return ():void => {

            client.request(cmd, body, TIME_OUT, (serializeType:SerializeType) => {
                callback(serializeType, pConNetAddr);
            });
        };
    })(pNetAddr),() => {

        return;
    });
};

const KEEP_ALIVE = 10000;
const TIME_OUT = 5000;
