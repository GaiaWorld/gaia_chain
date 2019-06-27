import { launch } from "../client/launch";
import { notifyNewTx, notifyNewBlock } from "./subscribe";
import { Inv } from "./rpc.s";
/**
 * start the net serser
 */

//启动rpc server
// cloneServerNode(getNativeObj("rpcServer"));

setTimeout(() => {
    launch();
}, 5000);

setTimeout(()=>{
    // notifyNewTx(new Inv);
    notifyNewBlock(new Inv)
},10000)
