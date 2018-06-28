
import {NativeObject, call, syncCall, callbacks, u128ToBuffer, u64ToBuffer} from "../../vm/vm";
import {NObject} from "../../vm/nobject";
import * as bigInt from "../../vm/biginteger";
import {Vec} from "../def/vec"


export const read_file = (path:string): Vec => {          
    let result = call(2239806005,[ path ]);     
    (<any>result) = new Vec(result);
    
    return result; 
}