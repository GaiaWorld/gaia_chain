
import {NativeObject, call} from "../../vm/vm";
import {NObject} from "../../vm/nobject";
import * as bigInt from "../../vm/biginteger";
import {TabKV} from "../pi_db/db"
export class Vec extends NObject{    
    
    
    static new_u8 = (): Vec => {     
        let result = call(278583573,[  ]);     
        (<any>result) = new Vec(result);
        
        return result; 
    }    
    
    
    static with_capacity_u8 = (capacity:number): Vec => {          
        let result = call(605387716,[ capacity ]);     
        (<any>result) = new Vec(result);
        
        return result; 
    }    
    
    
    capacity = (): number => {     
        return call(3865263801,[ this.self ]); 
    }    
    
    
    as_slice_u8 = (): Uint8Array => {     
        let result = call(2115662480,[ this.self ]);     
        return result; 
    }    
    
    
    swap_remove_u8 = (index:number): number => {          
        return call(645064753,[ this.self,index ]); 
    }    
    
    
    insert_u8 = (index:number,element:number) => {               
        call(3352453288,[ this.self,index,element ]);
    }    
    
    
    remove_u8 = (index:number): number => {          
        return call(2151809700,[ this.self,index ]); 
    }    
    
    
    push_u8 = (value:number) => {          
        call(107439253,[ this.self,value ]);
    }    
    
    
    pop_u8 = (): number => {     
        let result = call(2913114375,[ this.self ]);     
        if(result !== undefined){         
        }
        
        return result; 
    }    
    
    
    clear = () => {     
        call(4154086477,[ this.self ]);
    }    
    
    
    len = (): number => {     
        return call(1534577376,[ this.self ]); 
    }    
    
    
    static new_TabKV = (): Vec => {     
        let result = call(3787109479,[  ]);     
        (<any>result) = new Vec(result);
        
        return result; 
    }    
    
    
    static with_capacity_TabKV = (capacity:number): Vec => {          
        let result = call(3760459365,[ capacity ]);     
        (<any>result) = new Vec(result);
        
        return result; 
    }    
    
    
    as_slice_TabKV = (): Array<TabKV> => {     
        let result = call(580562131,[ this.self ]);     
        for(let i = 0; i < result.length; i++){         
                (<any>result[i]) = new TabKV(result[i]);
                
        }
        
        return result; 
    }    
    
    
    swap_remove_TabKV = (index:number): TabKV => {          
        let result = call(3697063043,[ this.self,index ]);     
        (<any>result) = new TabKV(result);
        
        return result; 
    }    
    
    
    insert_TabKV = (index:number,element:TabKV) => {               
        (<any>element) = element.self;
        
        call(952027254,[ this.self,index,element ]);
    }    
    
    
    remove_TabKV = (index:number): TabKV => {          
        let result = call(482264970,[ this.self,index ]);     
        (<any>result) = new TabKV(result);
        
        return result; 
    }    
    
    
    push_TabKV = (value:TabKV) => {          
        (<any>value) = value.self;
        
        call(393347340,[ this.self,value ]);
    }    
    
    
    pop_TabKV = (): TabKV => {     
        let result = call(3897029640,[ this.self ]);     
        if(result !== undefined){         
                (<any>result) = new TabKV(result);
                
        }
        
        return result; 
    }    
    
    
    static new_i64 = (): Vec => {     
        let result = call(1982375693,[  ]);     
        (<any>result) = new Vec(result);
        
        return result; 
    }    
    
    
    static with_capacity_i64 = (capacity:number): Vec => {          
        let result = call(3601066191,[ capacity ]);     
        (<any>result) = new Vec(result);
        
        return result; 
    }    
    
    
    as_slice_i64 = (): Array<number> => {     
        let result = call(1239372537,[ this.self ]);     
        return result; 
    }    
    
    
    swap_remove_i64 = (index:number): number => {          
        return call(859758326,[ this.self,index ]); 
    }    
    
    
    insert_i64 = (index:number,element:number) => {               
        call(498200772,[ this.self,index,element ]);
    }    
    
    
    remove_i64 = (index:number): number => {          
        return call(2071154981,[ this.self,index ]); 
    }    
    
    
    push_i64 = (value:number) => {          
        call(2957693395,[ this.self,value ]);
    }    
    
    
    pop_i64 = (): number => {     
        let result = call(802425326,[ this.self ]);     
        if(result !== undefined){         
                (<any>result) = bigInt(result);
                
        }
        
        return result; 
    }    
    
    
    static new_String = (): Vec => {     
        let result = call(2399706024,[  ]);     
        (<any>result) = new Vec(result);
        
        return result; 
    }    
    
    
    static with_capacity_String = (capacity:number): Vec => {          
        let result = call(3498998071,[ capacity ]);     
        (<any>result) = new Vec(result);
        
        return result; 
    }    
    
    
    as_slice_String = (): Array<string> => {     
        let result = call(3093995464,[ this.self ]);     
        return result; 
    }    
    
    
    swap_remove_String = (index:number): string => {          
        return call(3156648318,[ this.self,index ]); 
    }    
    
    
    insert_String = (index:number,element:string) => {               
        call(1978728938,[ this.self,index,element ]);
    }    
    
    
    remove_String = (index:number): string => {          
        return call(1210159287,[ this.self,index ]); 
    }    
    
    
    push_String = (value:string) => {          
        call(3803919743,[ this.self,value ]);
    }    
    
    
    pop_String = (): string => {     
        let result = call(3830052262,[ this.self ]);     
        if(result !== undefined){         
        }
        
        return result; 
    }    
    
    
    static new_Arc = (): Vec => {     
        let result = call(1828679694,[  ]);     
        (<any>result) = new Vec(result);
        
        return result; 
    }    
    
    
    static with_capacity_Arc = (capacity:number): Vec => {          
        let result = call(2496158841,[ capacity ]);     
        (<any>result) = new Vec(result);
        
        return result; 
    }    
    
    
    as_slice_Arc = (): Array<Vec> => {     
        let result = call(2606142630,[ this.self ]);     
        for(let i = 0; i < result.length; i++){         
                (<any>result[i]) = new Vec(result[i]);
                
        }
        
        return result; 
    }    
    
    
    swap_remove_Arc = (index:number): Vec => {          
        let result = call(12783470,[ this.self,index ]);     
        (<any>result) = new Vec(result);
        
        return result; 
    }    
    
    
    insert_Arc = (index:number,element:Vec) => {               
        (<any>element) = element.self;
        
        call(1981878306,[ this.self,index,element ]);
    }    
    
    
    remove_Arc = (index:number): Vec => {          
        let result = call(3566885191,[ this.self,index ]);     
        (<any>result) = new Vec(result);
        
        return result; 
    }    
    
    
    push_Arc = (value:Vec) => {          
        (<any>value) = value.self;
        
        call(1441496172,[ this.self,value ]);
    }    
    
    
    pop_Arc = (): Vec => {     
        let result = call(2704292785,[ this.self ]);     
        if(result !== undefined){         
                (<any>result) = new Vec(result);
                
        }
        
        return result; 
    }
}