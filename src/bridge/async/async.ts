declare var _$worker;
import {NativeObject, callbacks} from "../vm/vm"

let worker = _$worker
export const access = (name: string, args: Array<any>, callback: any) => {
    if(callback){
        let index = callbacks.register(callback);
        args.push(index);
    }
    // worker.
    // NativeObject()
}