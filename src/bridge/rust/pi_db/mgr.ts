
import {NativeObject, call, Error, syncCall} from "../../vm/vm";
import {NObject} from "../../vm/nobject";
import {GuidGen} from "../pi_lib/guid"
import {Vec} from "../def/vec"
import {Atom} from "../pi_lib/atom"
import {StructInfo} from "../pi_lib/sinfo"
export class Mgr extends NObject{    
    
    
    static new = (gen:GuidGen): Mgr => {          
        (<any>gen) = gen.self;
        
        let result = call(4081023775,[ gen ]);     
        (<any>result) = new Mgr(result);
        
        return result; 
    }    
    
    
    transaction = (writable:boolean): Tr => {          
        let result = call(951191934,[ this.self,writable ]);     
        (<any>result) = new Tr(result);
        
        return result; 
    }
}
export class Tr extends NObject{    
    
    prepare = ():void| Error => {     
    
        let r = syncCall(3803008464,[ this.self ]);                          
                
        return r;
    }    
    
    commit = ():void| Error => {     
    
        let r = syncCall(1346774966,[ this.self ]);                          
                
        return r;
    }    
    
    rollback = ():void| Error => {     
    
        let r = syncCall(977907218,[ this.self ]);                          
                
        return r;
    }    
    
    query = (arr:Vec,lock_time:number,read_lock:boolean):Vec| Error => {     
         
        (<any>arr) = arr.self;
             
        if(lock_time !== null && lock_time !== undefined){         
        }
             
        let r = syncCall(1841891766,[ this.self,arr,lock_time,read_lock ]);                          
                            (<any>r) = new Vec(r);
                            
                
        return r;
    }    
    
    modify = (arr:Vec,lock_time:number,read_lock:boolean):void| Error => {     
         
        (<any>arr) = arr.self;
             
        if(lock_time !== null && lock_time !== undefined){         
        }
             
        let r = syncCall(685881041,[ this.self,arr,lock_time,read_lock ]);                          
                
        return r;
    }    
    
    alter = (ware_name:Atom,tab_name:Atom,meta:StructInfo):void| Error => {     
         
        (<any>ware_name) = ware_name.self;
             
        (<any>tab_name) = tab_name.self;
             
        if(meta !== null && meta !== undefined){         
                (<any>meta) = meta.self;
                
        }
        
        let r = syncCall(3786000589,[ this.self,ware_name,tab_name,meta ]);                          
                
        return r;
    }
}