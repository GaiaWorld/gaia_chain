import {NativeObject} from "./vm";

export class NObject{
    self: NativeObject;
    //static __genMeta?:any;//Json
    //__h:number;//类型hash
	constructor(self: NativeObject){
        this.self = self;
        //hash && (this.__meta = {hash:hash, gen:gen});
    }
    
    
}