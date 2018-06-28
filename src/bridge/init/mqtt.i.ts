import {read, write} from "../db";
import {Vec} from "../rust/def/vec";
import {NetManager} from "../rust/net/api";
import {Mgr, Tr} from "../rust/pi_db/mgr";
import {RPCServer} from "../rust/rpc/server";
import {mqtt_bind, register_rpc_handler, iter_db, DBIter, get_depend, tabkv_new, arc_deref_Vec, tabkv_get_value, clone_vm_factory, arc_new_TopicHandler} from "../rust/pi_serv/js_call";
import {Depend} from "../rust/pi_serv/depend";
import {TopicHandler} from "../rust/pi_serv/handler";
import {cfgMgr} from "../../pi/util/cfg";
import {RpcMeta} from "../../pi/net/rpc/rpc_meta.s";
import {Error} from "../vm/vm";
import {VMFactory} from "../rust/pi_vm/pi_vm_impl";
import {utf8Decode} from "../../pi/lang/butil";
import {BonBuffer} from "../../pi/util/bon";
import {MqttCfg} from "./mqtt.s";
import * as mc from "./mqtt.c";

let db_mgr = new Mgr((<any>self)._$db_mgr);
let depend = new Depend((<any>self)._$depend);

//初始化mqtt服务
export const init = () => {
    console.log("init start");
    let cfg = cfgMgr.get("_$server_cfg").get(0) as MqttCfg;
    let netMgr = NetManager.new();
    let mqttServer = mqtt_bind(netMgr, cfg.addr, cfg.protocol, cfg.send_buf_size, cfg.recv_timeout);//创建mqtt服务
    let rpcServer = RPCServer.new(mqttServer);//创建rpc服务
    let map = new Map();
    read(db_mgr, (tr) => {
        let iter = iter_db(tr, "memory", RpcMeta._$info.name, null, false, null);
        let flag = true;
        if(iter instanceof Error){
            return iter;
        }
        while(flag){
            let el = (<DBIter>iter).next();
            if(el instanceof Error){
                return el;
            }
            if(!el){
                flag = false;
                continue;
            }
            let v8 = arc_deref_Vec(el[1]);
            let buf = v8.as_slice_u8();
            let bb = new BonBuffer(buf);
            
            let rpc_meta = new RpcMeta();
            rpc_meta.bonDecode(bb);
            let topic = rpc_meta.path;
            let file = topic.slice(0, topic.lastIndexOf("."));
            let handler = map.get(file);
            console.log("topic:" + topic);
            if(!handler){
                handler = createHandler(tr, db_mgr, file);//创建handler， 同一js文件下的rpc函数， handler应该是同一个
                if(handler instanceof Error){
                    return handler;
                }
                map.set(file, handler);
            }
            register_rpc_handler(rpcServer, topic, false, handler); //向rpc服务中设置handler
        }
    })
    console.log("init mqtt ok");
}

const createHandler = (tr: Tr, mgr: Mgr, file: string): TopicHandler|Error => {
    let vmf = VMFactory.new(0);
    let dp = get_depend(depend, file + ".r.js").as_slice_String();
    let codeItems = Vec.new_TabKV();
    for(let i = 0; i < dp.length; i++){
        let bb = new BonBuffer();
        bb.writeUtf8(dp[i]);
        let item = tabkv_new("memory", "_$code", bb.getBuffer());
        codeItems.push_TabKV(item);
    }
    let codeResult = tr.query(codeItems, 1000, false);
    if(codeResult instanceof Error){
        return codeResult;
    }
    let codes = codeResult.as_slice_TabKV();
    
    for(let i = 0; i < codes.length; i++){
        let v = tabkv_get_value(codes[i]);
        vmf = vmf.append(v);
    }
    

    //return arc_new_TopicHandler(TopicHandler.new(1000, vmf, db_mgr));
}