
import {NativeObject, call, u128ToBuffer, u64ToBuffer} from "../../vm/vm";
import {NObject} from "../../vm/nobject";
import {Atom} from "./atom"
export class StructInfo extends NObject{    
    
    
    static new = (name:Atom,name_hash:number): StructInfo => {          
        (<any>name) = name.self;
             
        let result = call(748243846,[ name,name_hash ]);     
        (<any>result) = new StructInfo(result);
        
        return result; 
    }
}