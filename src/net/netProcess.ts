import { getPeers } from "./p2p";
import { ShakeHandsInfo, MSG_TYPE, makeMsg } from "./msg";
import { getVersion, getTipHeight, getServiceFlags, getNodeType, getLocalAddr } from "./virtualEnv";
import { getCurrentPubkey } from "../pubkeyMgr";
import { getNextConnNonce} from "./connMgr";

/**
 * the network process
 */


const checkVersion = ():boolean => {
    return false;
}

/**
 * 链接的最核心函数，所有的消息都是在该函数中处理的
 * @param netMsg 
 * @param pNode 
 */

// ============================================ native
let bInited = false; 