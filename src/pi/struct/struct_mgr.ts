

// ============================== 导入
import { Json } from "../lang/type";
import { arrInsert, arrDelete } from '../util/util';
import { BonBuffer, BonCode } from '../util/bon';
import { StructInfo } from './sinfo';

// ============================== 导出
/**
 * 单参的Struct函数定义
 * @example
 */
export interface Func {
	(arg: Struct);
}



export class StructMeta {
	mgr: StructMgr;// 管理器
	info: StructInfo;//静态信息
	name: string;//名称
	construct: any;//构造器
	//添加元信息
	addStruct(s: Struct) {
		s._$meta = this;
	}
	//删除元信息
	delStruct(ss: Struct) {
		ss._$meta = null;
	}
}
/**
 * 结构元信息
 * @example
 */
export class MStructMeta extends StructMeta {
	maxIndex = 0;// 当前实例的最大索引位置
	map = new Map<number, MStruct>();// 实例表
	add:Array<Function> = [];// 插入监听器
	modify:Array<Function> = [];// 修改监听器
	remove:Array<Function> = [];// 删除监听器	

	//添加一个实例
	addStruct(s: MStruct) {
		s._$index = this.maxIndex++;
		s._$meta = this;
		this.map.set(s._$index, s);
		this.addNotify(s);//通知添加监听器
	}

	//插入一个实例
	insertStruct(s: MStruct, index: number) {
		s._$index = index;
		s._$meta = this;
		this.map.set(s._$index, s);
		this.addNotify(s);//通知添加监听器

		if(index >= this.maxIndex){
			this.maxIndex = index + 1;
		}
	}

	//删除一个实例
	delStruct(ss: MStruct) {
		let s = this.map.get(ss._$index);
		if(!s)
			throw new Error("StructMeta Error:struct is not exist!,index:" + ss._$index);
		this.map.delete(ss._$index);
		this.removeNotify(s);
		s._$meta = null;
		s._$index = -1;
	}

	//通知插入监听
	addNotify(s: MStruct) {
		let arr = this.add;
		for(let l of arr)
			l(s);
	}
	//通知移除监听
	removeNotify(s: MStruct) {
		let arr = this.remove;
		for(let l of arr)
			l(s);
	}
	//通知修改监听
	modifyNotify(s: MStruct, fieldKey:string, value:any, old:any, index?:number | string) {
		let arr = this.modify;
		for(let l of arr)
			l(s, fieldKey, value, old, index);
	}

	/**
	 * 添加结构添加监听器
	 */
	addAddListener(listener: Function) {
		this.add.push(listener);
	}
	/**
	 * 移除组件添加监听器
	 */
	removeAddListener(listener: Function) {
		this.add = arrDelete(this.add, this.add.indexOf(listener));
	}
	/**
	 * 注册组件修改监听器
	 */
	addModifyListener(listener: Function) {
		this.modify = arrInsert(this.modify, listener);
	}
	/**
	 * 移除组件添加监听器
	 */
	removeModifyListener(listener: Function) {
		this.modify = arrDelete(this.modify, this.modify.indexOf(listener));
	}
	/**
	 * 注册组件移除监听器
	 */
	addRemoveListener(listener: Function) {
		this.remove = arrInsert(this.remove, listener);
	}
	/**
	 * 移除组件添加监听器
	 */
	removeRemoveListener(listener: Function) {
		this.remove = arrDelete(this.remove, this.remove.indexOf(listener))
	}

}

/**
 * 结构
 * @example
 */
export class Struct implements BonCode {
    static _$sinfo: StructInfo;
	_$meta:StructMeta;// 该类结构的元信息
	removeMeta(){};//从元信息上移除
	addMeta(mgr: StructMgr){};//添加到元信息上
	bonEncode(bb:BonBuffer){};	//二进制编码
	bonDecode(bb:BonBuffer){};//二进制解码
}

/**
 * 实例被管理器管理起来的结构
 * @example
 */
export class MStruct extends Struct {
	_$meta:MStructMeta;// 该类结构的元信息
	_$index:number;// 结构实例的索引
	insertMeta(mgr: StructMgr, index?: number){};//添加到元信息上
}

/**
 * 将结构添加到元信息中
 */
export const addToMeta = (ss: StructMgr, struct: Struct) => {
	const meta = ss.constructMap.get(struct.constructor);
	if(!meta)
		throw new Error("unregister struct, name:" + struct.constructor.name);
	meta.addStruct(struct);
}

/**
 * 将结构添加插入到元信息中
 */
export const insertToMeta = (ss: StructMgr, struct: MStruct, index: number) => {
	const meta = ss.constructMap.get(struct.constructor);
	if(!meta)
		throw new Error("unregister struct, name:" + struct.constructor.name);
	(<MStructMeta>meta).insertStruct(struct, index);
}

/**
 * 从元信息中删除结构
 */
export const removeFromMeta = (struct: Struct) => {
	struct._$meta.delStruct(struct);
}

/**
 * 通知字段改变
 */
export const notifyModify = (struct: MStruct, field: string, value: any, old: any, index?: number | string) => {
	struct._$meta.modifyNotify(struct, field, value, old, index);
}

/**
 * 结构系统管理器
 * @example
 */
export class StructMgr {
	numberMap = new Map<number, StructMeta>();//组件元信息表
	constructMap = new Map<Function, StructMeta>();//组件元信息表

	/**
	 * 注册
	 */
	register(nameHash: number, construct: any, name: string) {
        const hash = construct._$info.name_hash;
		const meta = this.numberMap.get(hash);
		if(meta)
			throw new Error("class already register, name:"+ name);
		let s;
		if(MStruct.isPrototypeOf(construct)){
			s = new MStructMeta;
		}else{
			s = new StructMeta;
		}
		s.construct = construct;
		s.mgr = this;
		s.info = construct._$info;
		construct._$info.name = name;
		s.name = name;
		this.numberMap.set(hash, s);
		this.constructMap.set(construct, s);	
	}

	/**
	 * 查询
	 */
	lookup(key: any) {
		return Number.isInteger(key) ? this.numberMap.get(key) : this.constructMap.get(key);
	}

}

