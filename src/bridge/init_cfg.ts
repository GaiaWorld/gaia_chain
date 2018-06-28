declare var pi_modules;

import {Struct, StructMgr} from "../pi/struct/struct_mgr";
import { cfgMgr } from "../pi/util/cfg";
import {Mgr, Tr} from "./rust/pi_db/mgr"
import {TabKV} from "./rust/pi_db/db"
import {Vec} from "./rust/def/vec"
import {GuidGen} from "./rust/pi_lib/guid"
import {create_sinfo, tabkv_with_value, tabkv_new} from "./rust/pi_serv/js_call"
import {MemeryDB} from "./rust/pi_db/memery_db"
import {read, write} from "./db"
import {StructInfo} from "./rust/pi_lib/sinfo"
import * as Bon from "./rust/pi_lib/bon"
import {BonBuffer} from "../pi/util/bon"
import { Atom } from "./rust/pi_lib/atom";
import { Error, __thread_call } from "./vm/vm";
import * as Mqtt from "./init/mqtt.i";
import {} from "../app/async";
//import {} from "../app/gen";
let db_mgr = new Mgr((<any>self)._$db_mgr);
//let memery_db = MemeryDB.new(); 
//export const db_mgr = Mgr.new(GuidGen.new(0,0));
let sMgr = new StructMgr();
for(var id in pi_modules){
	if(pi_modules.hasOwnProperty(id) && pi_modules[id].exports){
		for(var kk in pi_modules[id].exports){
			var c = pi_modules[id].exports[kk];
			if(Struct.isPrototypeOf(c) && c._$info){
                // console.log(c._$info.name_hash);
                // console.log(id + "." + kk);
				//sMgr.register(c._$info.name_hash, c, id + "." + kk);
			}
		}
	}
}
(<any>self)._$structMgr = sMgr;

//register_memery_db(db_mgr, "memory", memery_db);
//把配置写入数据库
let writeCfg = () => {
	cfgMgr.map.forEach((tab, k) => {
		if(k.indexOf("#") > -1){ //如果是主键表， 先不插入
			return;
		}

		let first: Struct;
        let writeData = Vec.new_TabKV();
		tab.forEach((value, key) => {
			if(!first){
				first = value;
			}
			let keyBon = new BonBuffer();
			keyBon.writeInt(key as number);

			let valueBon = new BonBuffer();
            value.bonEncode(valueBon);
            //if(key === "_$rpc_meta"){
                // console.log("value----------", (<any>value).path);
                // console.log("rpc_meta------" +k + ":" +  valueBon.getBuffer().length)
            //}
			writeData.push_TabKV(tabkv_with_value("memory", (<any>first.constructor)._$info.name,  keyBon.getBuffer(), valueBon.getBuffer()) );
		});

		write(db_mgr, (tr) => {
			let buf = new BonBuffer();
            (<any>first.constructor)._$info.bonEncode(buf);
			let r = tr.alter(Atom.from_From("memory"), Atom.from_From((<any>first.constructor)._$info.name), create_sinfo(buf.getBuffer()));
			if(r instanceof Error){
				return r;
            }
            r = tr.modify(writeData, 1000, false);
			if(r instanceof Error){
				return r;
            }
        }); 
    });
    
    console.log("writecfg: ok");
}

const init = () => {
    //writeCfg();
    //Mqtt.init();
    //test_sleep();
    //test_set_timeout();
}
//__thread_call(init);