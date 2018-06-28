
import {NativeObject, call} from "../../vm/vm";
import {NObject} from "../../vm/nobject";
export class NetManager extends NObject{    
    
    
    static new = (): NetManager => {     
        let result = call(1569890377,[  ]);     
        (<any>result) = new NetManager(result);
        
        return result; 
    }
}