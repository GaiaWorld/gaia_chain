
import {NativeObject, call, u128ToBuffer, u64ToBuffer} from "../../vm/vm";
import {NObject} from "../../vm/nobject";
export class Atom extends NObject{    
    
    
    static from_From = (s:string): Atom => {          
        let result = call(1549520222,[ s ]);     
        (<any>result) = new Atom(result);
        
        return result; 
    }
}