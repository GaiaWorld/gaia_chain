
import {NativeObject, Error, syncCall, call} from "../../vm/vm";
import {NObject} from "../../vm/nobject";
import {Vec} from "../def/vec"
export class VMFactory extends NObject{    
    
    
    static new = (size:number): VMFactory => {          
        let result = call(2222376158,[ size ]);     
        (<any>result) = new VMFactory(result);
        
        return result; 
    }    
    
    
    append = (code:Vec): VMFactory => {          
        (<any>code) = code.self;
        
        let result = call(1487978276,[ this.self,code ]);     
        (<any>result) = new VMFactory(result);
        
        return result; 
    }
}