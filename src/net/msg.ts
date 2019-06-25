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
