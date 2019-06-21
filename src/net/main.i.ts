import { cloneServerNode } from "../pi_pt/rust/pi_serv/js_net";
import { getNativeObj } from '../pi_pt/init/init';
/**
 * start the net serser
 */

//启动rpc server
cloneServerNode(getNativeObj("rpcServer"));
