import { getNodeType, getServiceFlags, getTipHeight, getVersion } from '../../chain/blockchain';
import { getCurrentPubkey } from '../../pubkeyMgr';
import { getNextConnNonce } from '../connMgr';
import { PNode } from '../pNode';
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
export const launch = () => {
  const ownNetAddr = getOwnNetAddr();
    getPeers().forEach((netAddr: string) => {
    if (netAddr !== ownNetAddr) {
        clientRequest(netAddr, shakeHands, makeShakeHandsInfo(),(r,pNetAddr) => {
            console.log(`success shakehands with ${pNetAddr}`);
            // FIXME:just solve the rpc issue
            clientRequest(netAddr, subscribeTx, getOwnNetAddr(), (r) => {
                if (r) {
                    console.log(`subscribe tx success`);
                }
                clientRequest(netAddr, subscribeBlock, getOwnNetAddr(), (r) => {
                    if (r) {
                        console.log(`subscribe block success`);
                    }
                });
            });

        });
    }
  });
};

/**
 * get all the peers from the db or the default config file
 */
export const getPeers = () => {
  let peers = getPeersFromDb();
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

};

/**
 * 生成握手信息
 */
export const makeShakeHandsInfo = ():ShakeHandsInfo => {
    const shakeHandsInfo = new ShakeHandsInfo;
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

    return shakeHandsInfo;
};