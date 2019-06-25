import { NODE_TYPE } from "./pNode";

/**
 * msg struct
 */
// ===============================================================export 
export const MAX_MESSAGE_SIZE = 8*1024*1024*8;//最大一次发送8M的数据

/**
 * inventory message type
 */
export const enum INV_MSG_TYPE {
    UNDEFINED = "undefined",
    MSG_TX = "msg_tx",
    MSG_BLOCK = "msg_block"
} 
/**
 * inventory message, announce new tx or blocks, or reply GETTXPOOL message
 */
export interface Inv {
    height:number;//交易所在的区块高度，或者区块本身的高度
    hash: number;
    MsgType: INV_MSG_TYPE;//实际取值只会是TX和BLOCK
}