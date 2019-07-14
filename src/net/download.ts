import { getTipHeight, getTipTotalWeight, newBlockBodiesReach, newHeadersReach } from '../chain/blockchain';
import { Header, Height2Hash } from '../chain/schema.s';
import { startMining } from '../consensus/committee';
import { memoryBucket, persistBucket } from '../util/db';
import { getOwnNetAddr } from './client/launch';
import { CurrentInfo } from './memory.s';
import { INV_MSG_TYPE } from './msg';
import { Peer } from './pNode.s';
import { getBlocks, getHeadersByHeight } from './server/rpc.p';
import { clientRequest } from './server/rpc.r';
import { BodyArray, GetHeaderHeight, HeaderArray, Inv, InvArray, InvArrayNet } from './server/rpc.s';

/**
 * peer sync
 */

/**
 * 判断是否要向当前peer进行代码同步
 * @param peer Peer
 */
export const download = (peer:Peer):boolean => {
    console.log('begin download ================================: ', peer, getTipTotalWeight());

    // 首先比较当前peer和本地peer的高度和权重，如果本地更高则不需要同步
    if (getTipTotalWeight() > peer.nCurrentTotalWeight) {
        // 本地权重更高不需要同步
        return false;
    }
    if ((getTipTotalWeight() === peer.nCurrentTotalWeight) && (getTipHeight() < peer.nCurrentHeight)) {
        // 本地主链更短不需要同步
        return false;
    }
    const bkt = memoryBucket(CurrentInfo._$info.name);
    const syncState = bkt.get<string,[CurrentInfo]>(SYNC)[0];
    if (syncState !== undefined && syncState.value ===  SYNC_STATE.SYNCING) {
        const currentDownloadPeerNetAddr = bkt.get<string,[CurrentInfo]>(CURRENT_DOWNLOAD_PEER_NET_ADDR)[0];
        if (currentDownloadPeerNetAddr !== undefined) {
            const currentDownloadPeer = memoryBucket(Peer._$info.name).get<string,Peer>(currentDownloadPeerNetAddr.value)[0];
            if (currentDownloadPeer !== undefined) {
                if (currentDownloadPeer.nCurrentTotalWeight > peer.nCurrentTotalWeight) {
                    // 正在同步的链权重更高不需要更改同步链
                    return false;
                }
                if ((currentDownloadPeer.nCurrentTotalWeight === peer.nCurrentTotalWeight) && (currentDownloadPeer.nCurrentTotalWeight < peer.nCurrentHeight)) {
                    // 正在同步的链更短不需要更改同步链
                    return false;
                }
            }
        }
    }
    const currentInfo = new CurrentInfo();
    const startHeight = verifyStartHeight(peer.strNetAddr);
    currentInfo.key = CURRENT_DOWNLOAD_PEER_NET_ADDR;
    currentInfo.value = peer.strNetAddr;
    bkt.put(CURRENT_DOWNLOAD_PEER_NET_ADDR, currentInfo);

    currentInfo.key = SYNC;
    currentInfo.value = SYNC_STATE.SYNCING;
    bkt.put(SYNC, currentInfo);

    currentInfo.key = SKELETON_SYNC;
    currentInfo.value = SYNC_STATE.SYNCING;
    bkt.put(SKELETON_SYNC, currentInfo);

    currentInfo.key = CURRENT_SKELETON_HEIGHT;
    currentInfo.value = `${startHeight}`;
    bkt.put(CURRENT_SKELETON_HEIGHT, currentInfo);

    currentInfo.key = CURRENT_DOWNLOAD_HEIGHT;
    currentInfo.value = `${startHeight}`;
    bkt.put(CURRENT_FILLED_HEIGHT, currentInfo);

    currentInfo.key = CURRENT_DOWNLOAD_HEIGHT;
    currentInfo.value = `${startHeight}`;
    bkt.put(CURRENT_DOWNLOAD_HEIGHT, currentInfo);
    // SYNC
    getSkeletonHeader(startHeight, peer.nCurrentHeight, peer.strNetAddr);

    return true;
};

/**
 * 确认开始同步的高度，并且设置peer的值
 */
const verifyStartHeight = (pNetAddr:string):number => {
    // TODO:根据双方hash对比获取到hash相同的高度并且开始同步，
    // TODO:这里有一个细节如何快速对比获得真正的开始同步高度
    // 暂时不考虑分叉的情况，所以直接返回当前高度即可
    const bkt = memoryBucket(Peer._$info.name);
    const pNode = bkt.get<string,[Peer]>(pNetAddr)[0];
    pNode.nLocalStartingHeight = getTipHeight();
    pNode.nlocalStartingTotalWeigth = getTipTotalWeight();
    bkt.put(pNetAddr, pNode);

    return pNode.nLocalStartingHeight;
    
};

const getSkeletonHeader = (fromHeight:number, toHeight:number, pNetAddr:string):void => {
    // TODO:不应该所有header都从同一个节点获取，防止对方是恶意节点，暂时没有考虑这个问题
    // 不能超过一次性获取的最大header数量
    const heights = new GetHeaderHeight();
    heights.strNetAddr = getOwnNetAddr();
    heights.from = 0;
    heights.to = 0;
    heights.heights = [];
    for (let i = fromHeight; i <= toHeight + MAX_HEADER_NUMBER; i = i + MAX_HEADER_NUMBER) {
        if (heights.heights.length < MAX_HEADER_NUMBER) {
            if (i > toHeight) {
                i = toHeight;
            }
            heights.heights.push(i);
            if (i === toHeight) {
                break;
            }
        } else {
            break;
        }
    }
    console.log('skeleton header syncing');
    clientRequest(pNetAddr,getHeadersByHeight,heights,(headers:HeaderArray,pNet:string) => {
        // TODO:此处需要对区块头进行验证
        
        newHeadersReach(headers.arr);
        const currentInfoBkt = memoryBucket(CurrentInfo._$info.name);
        if (headers.arr.length > 0) {
            const currentInfo = new CurrentInfo();
            currentInfo.key = CURRENT_SKELETON_HEIGHT;
            currentInfo.value = `${headers.arr[headers.arr.length - 1].height}`;
            currentInfoBkt.put(CURRENT_SKELETON_HEIGHT, currentInfo);
        }
        // tslint:disable-next-line:radix
        const currentSkeletonHeight = parseInt(currentInfoBkt.get<string,[CurrentInfo]>(CURRENT_SKELETON_HEIGHT)[0].value);
        const downloadPeer = currentInfoBkt.get<string,[CurrentInfo]>(CURRENT_DOWNLOAD_PEER_NET_ADDR)[0].value;
        const peer = memoryBucket(Peer._$info.name).get<string,[Peer]>(downloadPeer)[0];
        const lastSkeletonHeight = peer.nStartingHeight;
        if (currentSkeletonHeight < lastSkeletonHeight) {
            getSkeletonHeader(currentSkeletonHeight + 1, lastSkeletonHeight, pNet);
        } else {
            const currentInfo = new CurrentInfo();
            currentInfo.key = SKELETON_SYNC;
            currentInfo.value = SYNC_STATE.SUCCESS;
            currentInfoBkt.put(SKELETON_SYNC,currentInfo);

            currentInfo.key = FILLED_SYNC;
            currentInfo.value = SYNC_STATE.SYNCING;
            currentInfoBkt.put(FILLED_SYNC, currentInfo);
            // 开始获取填充数据
            // TODO:理想情况下Skeleton和filled不应该从同一个节点获取，防止同一个节点作恶
            // TODO:此处暂时没有考虑作恶的情况
            console.log('skeleton header done');
            getFilledHeader(peer.nLocalStartingHeight, peer.nStartingHeight, peer.strNetAddr);
        }
    });
};

const getFilledHeader = (fromHeight:number, toHeight:number, pNetAddr:string):void => {
    const heights = new GetHeaderHeight();
    heights.strNetAddr = getOwnNetAddr();
    heights.from = fromHeight;
    heights.to = toHeight <= fromHeight + MAX_HEADER_NUMBER ? toHeight :fromHeight + MAX_HEADER_NUMBER;
    heights.heights = [];
    console.log('filled header syncing');
    clientRequest(pNetAddr,getHeadersByHeight,heights,(headers:HeaderArray,pNet:string) => {
        // TODO:此处需要对区块头进行验证
        // TODO:此处还会把skeletonheader再获取一遍，主要是为了防止skeleton对应的节点作恶
        // TODO:此处没有考虑skeleton节点作恶的情况，默认两次取到的值是一样的
        newHeadersReach(headers.arr);
        const currentInfoBkt = memoryBucket(CurrentInfo._$info.name);
        if (headers.arr.length > 0) {
            const currentInfo = new CurrentInfo();
            currentInfo.key = CURRENT_FILLED_HEIGHT;
            currentInfo.value = `${headers.arr[headers.arr.length - 1].height}`;
            currentInfoBkt.put(CURRENT_FILLED_HEIGHT, currentInfo);
        }
        
        // tslint:disable-next-line:radix
        const currentFilledHeight = parseInt(currentInfoBkt.get<string,[CurrentInfo]>(CURRENT_FILLED_HEIGHT)[0].value);
        const downloadPeer = currentInfoBkt.get<string,[CurrentInfo]>(CURRENT_DOWNLOAD_PEER_NET_ADDR)[0].value;
        const lastFilledHeight = memoryBucket(Peer._$info.name).get<string,[Peer]>(downloadPeer)[0].nStartingHeight;
        if (currentFilledHeight < lastFilledHeight) {
            getFilledHeader(currentFilledHeight + 1, lastFilledHeight, pNet);
        } else {
            const currentInfo = new CurrentInfo();
            currentInfo.key = FILLED_SYNC;
            currentInfo.value = SYNC_STATE.SUCCESS;
            currentInfoBkt.put(FILLED_SYNC, currentInfo);
            console.log('filled header done');
            // 开始获取区块数据数据
            downloadBlocks();
        }
    });
};

/**
 * 为了安全理论上需要从不同节点获取block
 */
const downloadBlocks = ():void => {
    const currentInfoBkt = memoryBucket(CurrentInfo._$info.name);
    const bkt = memoryBucket(CurrentInfo._$info.name);
    const downloadPeer = currentInfoBkt.get<string,[CurrentInfo]>(CURRENT_DOWNLOAD_PEER_NET_ADDR)[0].value;
    const lastDownloadHeight = memoryBucket(Peer._$info.name).get<string,[Peer]>(downloadPeer)[0].nStartingHeight;
    // tslint:disable-next-line:radix
    const fromHeight = parseInt(bkt.get<string,[CurrentInfo]>(CURRENT_DOWNLOAD_HEIGHT)[0].value) + 1;
    const toHeight = lastDownloadHeight < fromHeight + MAX_BLOCK_NUMBER ? lastDownloadHeight : fromHeight + MAX_BLOCK_NUMBER;
    const invArray = new InvArrayNet();
    invArray.net = getOwnNetAddr();
    invArray.r = new InvArray();
    invArray.r.arr = [];
    for (let i = fromHeight; i <= toHeight; i++) {
        const inv = new Inv();
        inv.MsgType = INV_MSG_TYPE.MSG_BLOCK;
        inv.hash = persistBucket(Height2Hash._$info.name).get<number,[Height2Hash]>(i)[0].bhHash;
        inv.height = i;
        invArray.r.arr.push(inv);
    }
    console.log('block download syncing');
    clientRequest(downloadPeer, getBlocks, invArray, (bodys:BodyArray, pNetAddr:string) => {
        // TODO:此处需要对body和TX进行验证，验证成功之后如果已经超过了主链长度则应该更换为主链
        newBlockBodiesReach(bodys.arr);

        if (bodys.arr.length > 0) {
            const currentInfo = new CurrentInfo();
            currentInfo.key = CURRENT_DOWNLOAD_HEIGHT;
            currentInfo.value = `${persistBucket(Header._$info.name).get(bodys.arr[bodys.arr.length - 1].bhHash)[0].height}`;
            currentInfoBkt.put(CURRENT_DOWNLOAD_HEIGHT, currentInfo);
        }
        // tslint:disable-next-line:radix
        const currentDownloadHeight = parseInt(currentInfoBkt.get(CURRENT_DOWNLOAD_HEIGHT)[0].value);
        if (currentDownloadHeight < lastDownloadHeight) {
            downloadBlocks();
        } else {
            const currentInfo = new CurrentInfo();
            currentInfo.key = SYNC;
            currentInfo.value = SYNC_STATE.SUCCESS;
            currentInfoBkt.put(SYNC, currentInfo);
            console.log('block download done');
            startMining();
            
        }
    });
};

export const isSyncing = (): boolean => {
    const bkt = memoryBucket(CurrentInfo._$info.name);
    const syncState = bkt.get<string,[CurrentInfo]>(SYNC)[0];

    if (syncState.value === SYNC_STATE.SUCCESS) {
        return false;
    }

    return true;
};

export const CURRENT_DOWNLOAD_PEER_NET_ADDR = 'current_download_peer_net_addr';
const SYNC = 'sync';
const SKELETON_SYNC = 'skeleton_sync'; 
const FILLED_SYNC = 'filled_sync';
const CURRENT_DOWNLOAD_HEIGHT = 'current_download_height';
const CURRENT_SKELETON_HEIGHT = 'current_skeleton_height';
const CURRENT_FILLED_HEIGHT = 'current_filled_height';

const SYNC_STATE = {
    SUCCESS:'success',
    FAIL:'fail',
    SYNCING:'syncing'
};

export const MAX_HEADER_NUMBER = 1000;
export const MAX_BLOCK_NUMBER = 100;