
import {NativeObject, call, u128ToBuffer, u64ToBuffer} from "../../vm/vm";
import {NObject} from "../../vm/nobject";
import * as bigInt from "../../vm/biginteger";
import {H160} from "../pi_math/hash"
import {H256} from "../pi_math/hash"
import {H32} from "../pi_math/hash"


export const ripemd160 = (input:Uint8Array): H160 => {          
    let result = call(1476345609,[ input ]);     
    (<any>result) = new H160(result);
    
    return result; 
}


export const keccak256 = (input:Uint8Array): H256 => {          
    let result = call(2108893530,[ input ]);     
    (<any>result) = new H256(result);
    
    return result; 
}


export const dhash160 = (input:Uint8Array): H160 => {          
    let result = call(842379557,[ input ]);     
    (<any>result) = new H160(result);
    
    return result; 
}


export const dhash256 = (input:Uint8Array): H256 => {          
    let result = call(1125159944,[ input ]);     
    (<any>result) = new H256(result);
    
    return result; 
}


export const siphash24 = (key0:bigInt.BigInteger,key1:bigInt.BigInteger,input:Uint8Array): bigInt.BigInteger => {          
    (<any>key0) = u64ToBuffer(key0);
         
    (<any>key1) = u64ToBuffer(key1);
         
    let result = call(796485226,[ key0,key1,input ]);     
    (<any>result) = bigInt(result);
    
    return result; 
}


export const checksum = (data:Uint8Array): H32 => {          
    let result = call(235181891,[ data ]);     
    (<any>result) = new H32(result);
    
    return result; 
}