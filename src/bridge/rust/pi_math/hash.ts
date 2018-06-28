
import {NativeObject, call} from "../../vm/vm";
import {NObject} from "../../vm/nobject";
export class H32 extends NObject{    
    
    
    take = (): Uint8Array => {     
        let result = call(2798870758,[ this.self ]);     
        return result; 
    }    
    
    
    tohex = (): string => {     
        return call(767388297,[ this.self ]); 
    }    
    
    
    static fromhex = (hex:string): H32 => {          
        let result = call(4151244803,[ hex ]);     
        (<any>result) = new H32(result);
        
        return result; 
    }    
    
    
    cmp = (other:H32): number => {          
        (<any>other) = other.self;
        
        return call(2263528600,[ this.self,other ]); 
    }
}
export class H48 extends NObject{    
    
    
    take = (): Uint8Array => {     
        let result = call(385903992,[ this.self ]);     
        return result; 
    }    
    
    
    tohex = (): string => {     
        return call(1426274161,[ this.self ]); 
    }    
    
    
    static fromhex = (hex:string): H48 => {          
        let result = call(4206140082,[ hex ]);     
        (<any>result) = new H48(result);
        
        return result; 
    }    
    
    
    cmp = (other:H48): number => {          
        (<any>other) = other.self;
        
        return call(1194676335,[ this.self,other ]); 
    }
}
export class H160 extends NObject{    
    
    
    take = (): Uint8Array => {     
        let result = call(3292766157,[ this.self ]);     
        return result; 
    }    
    
    
    tohex = (): string => {     
        return call(1334624721,[ this.self ]); 
    }    
    
    
    static fromhex = (hex:string): H160 => {          
        let result = call(2102156475,[ hex ]);     
        (<any>result) = new H160(result);
        
        return result; 
    }    
    
    
    cmp = (other:H160): number => {          
        (<any>other) = other.self;
        
        return call(1173820933,[ this.self,other ]); 
    }
}
export class H256 extends NObject{    
    
    
    take = (): Uint8Array => {     
        let result = call(2454669575,[ this.self ]);     
        return result; 
    }    
    
    
    tohex = (): string => {     
        return call(3197660783,[ this.self ]); 
    }    
    
    
    static fromhex = (hex:string): H256 => {          
        let result = call(3903164331,[ hex ]);     
        (<any>result) = new H256(result);
        
        return result; 
    }    
    
    
    cmp = (other:H256): number => {          
        (<any>other) = other.self;
        
        return call(1683207497,[ this.self,other ]); 
    }
}
export class H512 extends NObject{    
    
    
    take = (): Uint8Array => {     
        let result = call(3783275301,[ this.self ]);     
        return result; 
    }    
    
    
    tohex = (): string => {     
        return call(3697048694,[ this.self ]); 
    }    
    
    
    static fromhex = (hex:string): H512 => {          
        let result = call(4289491258,[ hex ]);     
        (<any>result) = new H512(result);
        
        return result; 
    }    
    
    
    cmp = (other:H512): number => {          
        (<any>other) = other.self;
        
        return call(1422643842,[ this.self,other ]); 
    }
}
export class H520 extends NObject{    
    
    
    take = (): Uint8Array => {     
        let result = call(4027378382,[ this.self ]);     
        return result; 
    }    
    
    
    tohex = (): string => {     
        return call(2639379268,[ this.self ]); 
    }    
    
    
    static fromhex = (hex:string): H520 => {          
        let result = call(1287124001,[ hex ]);     
        (<any>result) = new H520(result);
        
        return result; 
    }    
    
    
    cmp = (other:H520): number => {          
        (<any>other) = other.self;
        
        return call(3340863876,[ this.self,other ]); 
    }
}