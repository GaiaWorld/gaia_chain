declare var _$structMgr;
declare var pi_modules;
import {Mgr} from "../rust/pi_db/mgr";
import { Session} from "../rust/mqtt/session";
import { Atom} from "../rust/pi_lib/atom";
import {BonBuffer} from "../../pi/util/bon";
import {OK, Error} from "../../pi/net/rpc/rpc_r.s";
import {StructMgr} from "../../pi/struct/struct_mgr";
import { writeBon} from "../../pi/struct/util";
import { mqtt_respond} from "../rust/pi_serv/js_call";
import { structMgr } from "../init_meta";

const _$rpc = (topic: string, buffer: Uint8Array, mgr:any, mqttSession: any) => {
    mgr = new Mgr(mgr);
    mqttSession = new Session(mqttSession);
    let index = topic.lastIndexOf(".");
    let mod = topic.slice(0, index) + ".r";
    let funName = topic.slice(index + 1, topic.length);
    let bb = new BonBuffer();
    try {
        console.log(mod);
        let r = pi_modules[mod].exports[funName](mgr, mqttSession);
        //rcp方法可以没有返回值， 当有返回值时， 其返回值类型必须的Struct
        if(!r){
            writeBon(new OK(), bb);
        }else{
            writeBon(r, bb); 
        }
        mqtt_respond(mqttSession, topic, bb.getBuffer());
    } catch (error) {
        console.log("rpc_error:" + error);
        let e = new Error();
        e.code = 0;
        e.info = error;
        writeBon(e, bb);
        mqtt_respond(mqttSession, topic, bb.getBuffer());
    }
}
(<any>self)._$rpc = _$rpc;
console.log((<any>self)._$rpc);