import { getGenesisHash, getNodeType, getTipHeight, getTipTotalWeight, getVersion } from '../../chain/blockchain';
import { checkVersion } from '../../chain/validation';
import { getCurrentPubkey } from '../../pubkeyMgr';
import { memoryBucket } from '../../util/db';
import { DEFAULT_STR_ERR } from '../const';
import { download } from '../download';
import { CONNECTED, NODE_TYPE, Peer } from '../pNode.s';
import { DEFAULT_PEER, OWN_NET_ADDR } from '../server/cfg/net';
import { shakeHands, subscribeBlock, subscribeTx } from '../server/rpc.p';
import { clientRequest } from '../server/rpc.r';
import { ShakeHandsInfo } from '../server/rpc.s';

/**
 * the main loop of client
 */

// =========================================== export 

/**
 * start the client 
 */
// tslint:disable-next-line:typedef
export const launch = () => {
    const ownNetAddr = getOwnNetAddr();
    getPeers().forEach((netAddr: string) => {
        if (netAddr !== ownNetAddr) {
            // TODO:判断PNode中是否已经有该节点了，如果有该节点了则直接退出
            const peerBkt = memoryBucket(Peer._$info.name);
            if (peerBkt.get<string,[Peer]>(netAddr)[0] === undefined) {
                const shakeHandsInfo = makeShakeHandsInfo();

                const peer = initPeer(netAddr,CONNECTED.CONNECTING,shakeHandsInfo.nStartingHeight, shakeHandsInfo.nStartingTotalWeigth);
                peerBkt.put(netAddr,peer);
                clientRequest(netAddr, shakeHands, makeShakeHandsInfo(),(r:ShakeHandsInfo,pNetAddr:string) => {
                    const existPeer = peerBkt.get<string,[Peer]>(pNetAddr)[0];
                    if (existPeer === undefined) {
                        console.log(`1 fail to find the peer from the Peer Memory DB, launch.ts`);

                        return;
                    }
                    if (r.strNetAddr === DEFAULT_STR_ERR || r.strGensisHash !== getGenesisHash() || !checkVersion(r.strVersion)) {
                        existPeer.nConnected = CONNECTED.DISCONNECTED;                        
                    } else {
                        existPeer.nNodeType = r.nNodeType;
                        existPeer.strVersion = r.strVersion;
                        existPeer.nStartingHeight = r.nStartingHeight;
                        existPeer.nStartingTotalWeigth = r.nStartingTotalWeigth;
                        existPeer.nCurrentHeight = r.nStartingHeight;
                        existPeer.nCurrentTotalWeight = r.nStartingTotalWeigth;
                        existPeer.strPublicKey = r.strPublicKey;
                        existPeer.nConnected = CONNECTED.SUCCESS;
                    }
                    peerBkt.put(pNetAddr, existPeer);
                    if (r.strNetAddr !== DEFAULT_STR_ERR) {
                        clientRequest(netAddr, subscribeTx, getOwnNetAddr(), (txRst:boolean,pTxNetAddr:string) => {
                            if (!txRst) {
                                console.log(`fail to sub tx from ${pTxNetAddr}, launch.ts`);

                                return;
                            }   
                            const existTxPeer = peerBkt.get<string,[Peer]>(pTxNetAddr)[0];
                            if (existTxPeer === undefined) {
                                console.log(`2 fail to find the peer from the Peer Memory DB, launch.ts`);
        
                                return;
                            }
                            existTxPeer.subTx = true;
                            peerBkt.put(pTxNetAddr, existTxPeer);   
                            console.log(`success to sub tx from ${pTxNetAddr}, launch.ts`);                                                      
                        });  
                        clientRequest(netAddr, subscribeBlock, getOwnNetAddr(), (blockRst:boolean,pBlockNetAddr:string) => {
                            if (!blockRst) {                                
                                console.log(`fail to sub block from ${pBlockNetAddr}, launch.ts`);

                                return;
                            }  
                            const existBlockPeer = peerBkt.get<string,[Peer]>(pBlockNetAddr)[0];
                            if (existBlockPeer === undefined) {
                                console.log(`3 fail to find the peer from the Peer Memory DB, launch.ts`);
        
                                return;
                            }
                            existBlockPeer.subBlock = true;
                            peerBkt.put(pBlockNetAddr, existBlockPeer);
                            console.log(`success to sub block from ${pBlockNetAddr}, launch.ts`);
                        });                      
                    }
                    console.log(`success shakehands with ${pNetAddr}`);
                    download(existPeer);
                });
            }
        }
    });
};

const initPeer = (netAddr:string, nConnected:CONNECTED = CONNECTED.CONNECTING, 
    nLocalStartingHeight:number = 0,
    nlocalStartingTotalWeigth:number = 0,
    nNodeType:NODE_TYPE = NODE_TYPE.UNKNOWN,
    strVersion:string = '', nStartingHeight:number = 0,
    nStartingTotalWeigth:number = 0,nCurrentHeight:number = 0,
    nCurrentTotalWeight:number = 0,
    strPublicKey:string = '', subTx:boolean = false, subBlock:boolean = false):Peer => {
    const peer = new Peer();
    // peerInfo
    peer.strNetAddr = netAddr;
    // localInfo
    peer.nConnected = nConnected;
    peer.nLocalStartingHeight = nLocalStartingHeight;
    peer.nlocalStartingTotalWeigth = nlocalStartingTotalWeigth;
    // peerInfo
    peer.nNodeType = nNodeType;
    peer.strVersion = strVersion;
    peer.nStartingHeight = nStartingHeight;
    peer.nStartingTotalWeigth = nStartingTotalWeigth;
    peer.nCurrentHeight = nCurrentHeight;
    peer.nCurrentTotalWeight = nCurrentTotalWeight;
    peer.strPublicKey = strPublicKey;

    peer.subTx = subTx;
    peer.subBlock = subBlock; 
    
    return peer;
};

/**
 * get all the peers from the db or the default config file
 */
// TODO:真正的去获取对等节点
export const getPeers = ():string[] => {
    const peers = getPeersFromDb();
    getPeersFromCfgFile().forEach((peer:string) => {
        if (peers.indexOf(peer) < 0) {
            peers.push(peer);
        }
    });

    return peers;
};

/**
 * for demo0.1 version, all the peers come from the config file
 */
const getPeersFromDb = (): string[] => {
    return [];
};

const getPeersFromCfgFile = (): string[] => {
    return DEFAULT_PEER;
};

export const getOwnNetAddr = (): string => {
    return OWN_NET_ADDR;
};

/**
 * 生成握手信息
 */
export const makeShakeHandsInfo = ():ShakeHandsInfo => {
    const shakeHandsInfo = new ShakeHandsInfo();
    shakeHandsInfo.strNetAddr = getOwnNetAddr();
    shakeHandsInfo.nNodeType = getNodeType();
    shakeHandsInfo.strVersion = getVersion();
    shakeHandsInfo.nStartingHeight = getTipHeight();
    shakeHandsInfo.nStartingTotalWeigth = getTipTotalWeight();
    shakeHandsInfo.strPublicKey = getCurrentPubkey();
    shakeHandsInfo.strGensisHash = getGenesisHash();

    return shakeHandsInfo;
};
