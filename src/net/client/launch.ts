import { getNodeType, getServiceFlags, getTipHeight, getVersion } from '../../chain/blockchain';
import * as bigInt from '../../pi/bigint/biginteger';
import { getCurrentPubkey } from '../../pubkeyMgr';
import { memoryBucket } from '../../util/db';
import { getNextConnNonce } from '../connMgr';
import { CONNECTED, NODE_TYPE, Peer } from '../pNode.s';
import { DEFAULT_PEER, OWN_NET_ADDR } from '../server/cfg/net';
import { shakeHands, subscribeBlock, subscribeTx } from '../server/rpc.p';
import { clientRequest } from '../server/rpc.r';
import { ShakeHandsInfo } from '../server/rpc.s';
import { getLocalAddr } from '../virtualEnv';

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
                const peer = initPeer(netAddr,CONNECTED.CONNECTING);

            }
            
            // clientRequest(netAddr, shakeHands, makeShakeHandsInfo(),(r:ShakeHandsInfo,pNetAddr:string) => {
            //     console.log(`success shakehands with ${pNetAddr}`);
            // // FIXME:just solve the rpc issue
            //     clientRequest(netAddr, subscribeTx, getOwnNetAddr(), (rst:boolean) => {
            //         if (rst) {
            //             console.log(`subscribe tx success`);
            //         }
            //         clientRequest(netAddr, subscribeBlock, getOwnNetAddr(), (rst2:boolean) => {
            //             if (rst2) {
            //                 console.log(`subscribe block success`);
            //             }
            //         });
            //     });

            // });
        }
    });
};

const initPeer = (netAddr:string, nConnected:CONNECTED = CONNECTED.CONNECTING, 
    nLocalStartingHeight:bigInt.BigInteger = bigInt.BigInteger(0),
    nlocalStartingTotalWeigth:bigInt.BigInteger = bigInt.BigInteger(0),
    nNodeType:NODE_TYPE = NODE_TYPE.UNKNOWN,
    strVersion:string = '', nStartingHeight:bigInt.BigInteger = bigInt.BigInteger(0),
    nStartingTotalWeigth:bigInt.BigInteger = bigInt.BigInteger(0),nCurrentHeight:bigInt.BigInteger = bigInt.BigInteger(0),
    nCurrentTotalWeight:bigInt.BigInteger = bigInt.BigInteger(0),
    strPublicKey:string = ''):Peer => {
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
    
    return peer;
};

/**
 * get all the peers from the db or the default config file
 */
// tslint:disable-next-line:typedef
export const getPeers = () => {
    let peers = getPeersFromDb();
    // tslint:disable-next-line:no-unused-expression
    (peers.length === 0) && (peers = getPeersFromCfgFile());

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

export const con2Server = (netAddr: string) => {
    return '';
};

/**
 * 生成握手信息
 */
export const makeShakeHandsInfo = ():ShakeHandsInfo => {
    const shakeHandsInfo = new ShakeHandsInfo();
    shakeHandsInfo.strVersion = getVersion();
    shakeHandsInfo.nStartingHeight = getTipHeight();
    shakeHandsInfo.nServiceFlags = getServiceFlags();
    shakeHandsInfo.nNodeType = getNodeType();
    shakeHandsInfo.strLocalClientAddr = getLocalAddr();
    shakeHandsInfo.strLocalServerAddr = getOwnNetAddr();
    shakeHandsInfo.nPublicKey = getCurrentPubkey();
    shakeHandsInfo.nLocalHostNonce = getNextConnNonce();
    shakeHandsInfo.bPing = true;
    shakeHandsInfo.bPong = true;

    shakeHandsInfo.strNetAddr = getOwnNetAddr();
    shakeHandsInfo.nNodeType = getNodeType();
    shakeHandsInfo.strVersion = getVersion();
    shakeHandsInfo.nStartingHeight: number;
    shakeHandsInfo.nStartingTotalWeigth: bigInt.BigInteger;
    shakeHandsInfo.strPublicKey = getCurrentPubkey();
    
    return shakeHandsInfo;
};