import { launch } from '../client/launch';
import { INV_MSG_TYPE } from '../msg';
import { Inv } from './rpc.s';
import { notifyNewBlock, notifyNewTx } from './subscribe';
/**
 * start the net serser
 */

// 启动rpc server
// cloneServerNode(getNativeObj("rpcServer"));

setTimeout(() => {
    launch();
}, 5000);

// setTimeout(()=>{
//     let invTx = new Inv;
//     invTx.MsgType = INV_MSG_TYPE.MSG_TX;
//     invTx.hash = "txabced123";
//     invTx.height = 12323;
//     notifyNewTx(invTx);
//     let invBlock = new Inv;
//     invBlock.MsgType = INV_MSG_TYPE.MSG_BLOCK;
//     invBlock.hash = "blockabced123";
//     invBlock.height = 1232;
//     notifyNewBlock(invBlock)
// },10000)
