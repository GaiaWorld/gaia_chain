import {BigInteger} from "./biginteger"

export class NativeObject{
    static call(funHash: number, args:Array<any>); 
}

declare function syncCall(funHash: number, args:Array<any>): any;
declare function call(funHash: number, args:Array<any>): any;

declare function __thread_yield():any;
declare function __thread_call(f: any): any;
declare function u128ToBuffer(n: BigInteger): ArrayBuffer;// Arraybuffer
declare function u64ToBuffer(n: BigInteger): ArrayBuffer;// Arraybuffer

export class callbacks{
    static register(f: any); 
}

export class Error{
    message: string;
}