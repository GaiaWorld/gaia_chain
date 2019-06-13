import { NODE_TYPE } from "./pNode";

/**
 * 临时文件，放置了所有上层应该提供给net层的接口
 */
// ============================================= export 
/**
 * 获取共识协议的版本
 */
export const getVersion = ():string => {

    return "0.0.1";
}

/**
 * 获取当前主链的高度
 */
export const getTipHeight = ():number => {

    return 1;
}

/**
 * 返回所有支持的服务类型,暂时没想好有哪些服务,1表示支持所有服务
 */
export const getServiceFlags = ():number => {

    return 1;
}

/**
 * 返回节点类型，当前只支持全节点
 */
export const getNodeType = ():NODE_TYPE => {

    return NODE_TYPE.FULL_NODE;
}

/**
 * 返回当前节点的内网地址
 */
export const getLocalAddr = ():string => {

    return "127.0.0.1:80";
}