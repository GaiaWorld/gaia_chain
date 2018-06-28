
import {NativeObject, call} from "../../vm/vm";
import {NObject} from "../../vm/nobject";
import {ServerNode} from "../mqtt/server"
export class RPCServer extends NObject{    
    
    
    static new = (mqtt:ServerNode): RPCServer => {          
        (<any>mqtt) = mqtt.self;
        
        let result = call(193751450,[ mqtt ]);     
        (<any>result) = new RPCServer(result);
        
        return result; 
    }
}