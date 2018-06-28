
import {NativeObject, call, u128ToBuffer, u64ToBuffer} from "../../vm/vm";
import {NObject} from "../../vm/nobject";
export class GuidGen extends NObject{    
    
    
    static new = (node_time:bigInt.BigInteger,node_id:number): GuidGen => {          
        (<any>node_time) = u64ToBuffer(node_time);
             
        let result = call(1469354144,[ node_time,node_id ]);     
        (<any>result) = new GuidGen(result);
        
        return result; 
    }
}