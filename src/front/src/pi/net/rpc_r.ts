
import { partWrite, allWrite } from "../../../pi/struct/util";
import { BinBuffer, BinCode, ReadNext, WriteNext } from "../../../pi/util/bin";
import { addToMeta, removeFromMeta, Struct, notifyModify, StructMgr } from "../../../pi/struct/struct_mgr";

export class OK extends Struct {


	addMeta(mgr: StructMgr){
		if(this._$meta)
			return;
		addToMeta(mgr, this);
	}

	removeMeta(){
		removeFromMeta(this);
	}


	copy(o: OK) : OK {
		return this;
	}

	clone() : OK {
		return new OK().copy(this);
	}

	binDecode(bb:BinBuffer, next: Function) {
	}

	binEncode(bb:BinBuffer, next: WriteNext) {
		let temp: any;
	}
}

(<any>OK)._$info = {
	nameHash:2103275166,
	annotate:{"type":"rpc"},
	fields:{  }
}
export class OK_I extends Struct {
value: number;


	addMeta(mgr: StructMgr){
		if(this._$meta)
			return;
		addToMeta(mgr, this);
	}

	removeMeta(){
		removeFromMeta(this);
	}

	setValue (value: number){	
		let old = this.value;
		this.value = value;
	}

	copy(o: OK_I) : OK_I {
		this.value = o.value;
		return this;
	}

	clone() : OK_I {
		return new OK_I().copy(this);
	}

	binDecode(bb:BinBuffer, next: Function) {
		(<any>this).value = bb.read() as number;
	}

	binEncode(bb:BinBuffer, next: WriteNext) {
		let temp: any;
		if(this.value === null || this.value === undefined)
			bb.writeNil();
		else{
			bb.writeInt(this.value);
		}						
	}
}

(<any>OK_I)._$info = {
	nameHash:3598563122,
	annotate:{"type":"rpc"},
	fields:{ value:{"name":"value","type":{"type":"i32"}} }
}
export class OK_S extends Struct {
value: string;


	addMeta(mgr: StructMgr){
		if(this._$meta)
			return;
		addToMeta(mgr, this);
	}

	removeMeta(){
		removeFromMeta(this);
	}

	setValue (value: string){	
		let old = this.value;
		this.value = value;
	}

	copy(o: OK_S) : OK_S {
		this.value = o.value;
		return this;
	}

	clone() : OK_S {
		return new OK_S().copy(this);
	}

	binDecode(bb:BinBuffer, next: Function) {
		(<any>this).value = bb.read() as string;
	}

	binEncode(bb:BinBuffer, next: WriteNext) {
		let temp: any;
		if(this.value === null || this.value === undefined)
			bb.writeNil();
		else{
			bb.writeUtf8(this.value);
		}						
	}
}

(<any>OK_S)._$info = {
	nameHash:2852573932,
	annotate:{"type":"rpc"},
	fields:{ value:{"name":"value","type":{"type":"str"}} }
}
export class Error extends Struct {
code: number;
info: string;


	addMeta(mgr: StructMgr){
		if(this._$meta)
			return;
		addToMeta(mgr, this);
	}

	removeMeta(){
		removeFromMeta(this);
	}

	setCode (value: number){	
		let old = this.code;
		this.code = value;
	}
	setInfo (value: string){	
		let old = this.info;
		this.info = value;
	}

	copy(o: Error) : Error {
		this.code = o.code;
		this.info = o.info;
		return this;
	}

	clone() : Error {
		return new Error().copy(this);
	}

	binDecode(bb:BinBuffer, next: Function) {
		(<any>this).code = bb.read() as number;
		(<any>this).info = bb.read() as string;
	}

	binEncode(bb:BinBuffer, next: WriteNext) {
		let temp: any;
		if(this.code === null || this.code === undefined)
			bb.writeNil();
		else{
			bb.writeInt(this.code);
		}						
		if(this.info === null || this.info === undefined)
			bb.writeNil();
		else{
			bb.writeUtf8(this.info);
		}						
	}
}

(<any>Error)._$info = {
	nameHash:79074689,
	annotate:{"type":"rpc"},
	fields:{ code:{"name":"code","type":{"type":"i32"}},info:{"name":"info","type":{"type":"str"}} }
}
export class Req extends Struct {
path: string;


	addMeta(mgr: StructMgr){
		if(this._$meta)
			return;
		addToMeta(mgr, this);
	}

	removeMeta(){
		removeFromMeta(this);
	}

	setPath (value: string){	
		let old = this.path;
		this.path = value;
	}

	copy(o: Req) : Req {
		this.path = o.path;
		return this;
	}

	clone() : Req {
		return new Req().copy(this);
	}

	binDecode(bb:BinBuffer, next: Function) {
		(<any>this).path = bb.read() as string;
	}

	binEncode(bb:BinBuffer, next: WriteNext) {
		let temp: any;
		if(this.path === null || this.path === undefined)
			bb.writeNil();
		else{
			bb.writeUtf8(this.path);
		}						
	}
}

(<any>Req)._$info = {
	nameHash:2040004017,
	annotate:{"type":"rpc"},
	fields:{ path:{"name":"path","type":{"type":"str"}} }
}