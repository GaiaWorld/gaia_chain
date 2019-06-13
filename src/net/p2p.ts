/**
 * 提供了基础的p2p功能,包括节点发现/广播/内网穿透
 */
//=========================================== export

/**
 * 返回所有的peer节点
 * @param count 
 */
export const getPeers = (count:number=DEFAULT_PEERS_COUNT) => {
    
    (count > MAX_PEERS_COUNT) && (count = MAX_PEERS_COUNT);
    return [];
}

//============================================ native
const DEFAULT_PEERS_COUNT = 100;
const MAX_PEERS_COUNT = 5000;