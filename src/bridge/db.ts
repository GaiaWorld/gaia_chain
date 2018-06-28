
import {Tr, Mgr} from "./rust/pi_db/mgr"
import { Error } from "./vm/vm";

export interface Handler{
    (tr: Tr):void | Error
}

/**
 * 读数据
 * @param timeout 超时时间， 默认10毫秒， 超时将抛出异常 
*/
export const read = (mgr: Mgr, txhd: Handler, timeout = 10) => {
    let tr = mgr.transaction(false);
    let time = new Date().getTime();
    while(timeout > 0){
        if (txhd(tr) instanceof Error){
            timeout = timeout - (new Date().getTime() - time);
            continue;
        }
        let prep = tr.prepare();
        if(prep instanceof Error){
            timeout = timeout - (new Date().getTime() - time);
            continue;
        }

        let comm = tr.commit();
        if(comm instanceof Error){
            timeout = timeout - (new Date().getTime() - time);
            continue;
        }
        return;
    }
    throw "read timeout";
}

/**
 * 写数据
 * @param timeout 超时时间， 默认10毫秒， 超时将抛出异常 
*/
export const write = (mgr: Mgr, txhd: Handler, timeout = 10) => {
    let tr = mgr.transaction(true);
    let time = new Date().getTime();
    while(timeout > 0){
        let r = txhd(tr);
        if (r instanceof Error){
            timeout = timeout - (new Date().getTime() - time);
            console.log(r.message);
            continue;
        }
        //return;
        let prep = tr.prepare();
        if(prep instanceof Error){
            timeout = timeout - (new Date().getTime() - time);
            //console.log(prep.message);
            tr.rollback();
            continue;
        }

        let comm = tr.commit();
        if(comm instanceof Error){
            timeout = timeout - (new Date().getTime() - time);
            tr.rollback();
            continue;
        }
        return;
    }
    throw "write timeout";
}
