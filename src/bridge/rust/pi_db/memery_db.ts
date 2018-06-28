
import {NativeObject, call, Error, syncCall} from "../../vm/vm";
import {NObject} from "../../vm/nobject";
export class MemeryDB extends NObject{    
    
    
    static new = (): MemeryDB => {     
        let result = call(2432929176,[  ]);     
        (<any>result) = new MemeryDB(result);
        
        return result; 
    }
}