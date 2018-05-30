import { BonBuffer, BonCode } from '../util/bon';

export enum EnumType{
    Bool,
	U8,
	U16,
	U32,
	U64,
	U128,
	U256,
	Usize,
	I8,
	I16,
	I32,
	I64,
	I128,
	I256,
	Isize,
	F32,
	F64,
	BigI,
	Str,
	Bin,
	UTC,
	Arr,
	Map,
	Struct,
}

export class FieldType implements BonCode{
    type: EnumType;
    arrType?: FieldType;
    mapType?:[FieldType, FieldType];
    structType?: StructInfo;
 
    constructor(type: EnumType, into?: FieldType | [FieldType, FieldType] | StructInfo){
        this.type = type;
        switch(this.type){
            case EnumType.Arr:
                this.arrType =into as FieldType;
            case EnumType.Map:
                this.mapType = into as [FieldType, FieldType];
            case EnumType.Struct:
                this.structType = into as StructInfo;
        }
    }
    /**
	 * 二进制编码
	 */
    bonEncode(bb: BonBuffer){
        bb.writeInt(this.type);
        this.arrType && bb.writeBonCode(this.arrType);
        if(this.mapType){
            bb.writeBonCode(this.mapType[0]);
            bb.writeBonCode(this.mapType[1]);
        }
        this.structType && bb.writeBonCode(this.structType);
    }
	/**
	 * 二进制解码
	 */
	bonDecode(bb: BonBuffer){
        this.type = bb.readInt();
        switch(this.type){
            case EnumType.Arr:
                this.arrType = bb.readBonCode(FieldType);
            case EnumType.Map:
                this.mapType = [bb.readBonCode(FieldType), bb.readBonCode(FieldType)];
            case EnumType.Struct:
                this.structType = bb.readBonCode(FieldType);
        }
    }
}

export class FieldInfo implements BonCode{
	name: string;
	ftype: FieldType;
    notes: Map<string, string>;
    
    constructor(name: string, ftype: FieldType, notes: Map<string, string>){
        this.name = name;
        this.ftype = ftype;
        this.notes = notes;
    }
    /**
	 * 二进制编码
	 */
    bonEncode(bb: BonBuffer){
        bb.writeUtf8(this.name);
        bb.writeBonCode(this.ftype);
        bb.writeMap(this.notes, (v, k) =>{
            bb.writeUtf8(k);
            bb.writeUtf8(v);
        })
    }

	/**
	 * 二进制解码
	 */
	bonDecode(bb: BonBuffer){
        this.name = bb.readUtf8();
        this.ftype = bb.readBonCode(FieldType);
        this.notes = bb.readMap(() => {
            return [bb.readUtf8(), bb.readUtf8()]
        });
        this.notes = new Map();
    }
}
    
/**
 * 结构信息
 * @example
 */
export class StructInfo implements BonCode {
    name: string;//名称
    name_hash: number;//名称hash
	notes: Map<string, string>;//注解
    fields: Array<FieldInfo>;//字段详情（包含字段名称及类型）
    
    constructor(name: string, name_hash: number, notes: Map<string, string>, fields: Array<FieldInfo>,){
        this.name = name;
        this.name_hash = name_hash;
        this.notes = notes;
        this.fields = fields;
    }
    
    bonEncode(bb: BonBuffer){
        bb.writeUtf8(this.name);
        bb.writeInt(this.name_hash);
        bb.writeMap(this.notes, (k, v) => {
            bb.writeUtf8(k);
            bb.writeUtf8(v);
        });
    }
	/**
	 * 二进制解码
	 */
	bonDecode(bb: BonBuffer){
        this.name = bb.readUtf8();
        this.name_hash = bb.readInt();
        this.notes = bb.readMap(() => {
            return [bb.readUtf8(), bb.readUtf8()]
        });
        this.fields = bb.readArray(() => {
            return bb.readBonCode(FieldType);
        });
    }
}