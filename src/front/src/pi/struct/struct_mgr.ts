/**
 * 
 */
// ============================== 导入
import { Json } from '../lang/type';
import { BinBuffer, BinCode } from '../util/bin';
import { arrDelete, arrInsert } from '../util/util';

// ============================== 导出
/**
 * 单参的Struct函数定义
 * @example
 */
export interface Func {
	(arg: Struct);
}

/**
 * 结构信息
 * @example
 */
interface StructInfo {
	name: string;// 名称
	annotate: Json;// 注解
	fields: Json;// 字段详情（包含字段名称及类型）
	nameHash: number;// 名称hash
}

export class StructMeta {
	public mgr: StructMgr;// 管理器
	public info: StructInfo;// 静态信息
	public name: string;// 名称
	public construct: any;// 构造器
	// 添加元信息
	public addStruct(s: Struct) {
		s._$meta = this;
	}
	// 删除元信息
	public delStruct(ss: Struct) {
		ss._$meta = null;
	}
}
/**
 * 结构元信息
 * @example
 */
export class MStructMeta extends StructMeta {
	public maxIndex: number = 0;// 当前实例的最大索引位置
	public map: any = new Map<number, MStruct>();// 实例表
	public add: Function[] = [];// 插入监听器
	public modify: Function[] = [];// 修改监听器
	public remove: Function[] = [];// 删除监听器	

	// 添加一个实例
	public addStruct(s: MStruct) {
		s._$index = this.maxIndex++;
		s._$meta = this;
		this.map.set(s._$index, s);
		this.addNotify(s);// 通知添加监听器
	}

	// 插入一个实例
	public insertStruct(s: MStruct, index: number) {
		s._$index = index;
		s._$meta = this;
		this.map.set(s._$index, s);
		this.addNotify(s);// 通知添加监听器

		if (index >= this.maxIndex) {
			this.maxIndex = index + 1;
		}
	}

	// 删除一个实例
	public delStruct(ss: MStruct) {
		const s = this.map.get(ss._$index);
		if (!s) {
			throw new Error(`StructMeta Error:struct is not exist!,index:${ss._$index}`);			
		}
		this.map.delete(ss._$index);
		this.removeNotify(s);
		s._$meta = null;
		s._$index = -1;
	}

	// 通知插入监听
	public addNotify(s: MStruct) {
		const arr = this.add;
		for (const l of arr) {
			l(s);
		}
	}
	// 通知移除监听
	public removeNotify(s: MStruct) {
		const arr = this.remove;
		for (const l of arr) {
			l(s);
		}
	}
	// 通知修改监听
	public modifyNotify(s: MStruct, fieldKey: string, value: any, old: any, index?: number | string) {
		const arr = this.modify;
		for (const l of arr) {
			l(s, fieldKey, value, old, index);
		}
	}

	/**
	 * 添加结构添加监听器
	 */
	public addAddListener(listener: Function) {
		this.add.push(listener);
	}
	/**
	 * 移除组件添加监听器
	 */
	public removeAddListener(listener: Function) {
		this.add = arrDelete(this.add, this.add.indexOf(listener));
	}
	/**
	 * 注册组件修改监听器
	 */
	public addModifyListener(listener: Function) {
		this.modify = arrInsert(this.modify, listener);
	}
	/**
	 * 移除组件添加监听器
	 */
	public removeModifyListener(listener: Function) {
		this.modify = arrDelete(this.modify, this.modify.indexOf(listener));
	}
	/**
	 * 注册组件移除监听器
	 */
	public addRemoveListener(listener: Function) {
		this.remove = arrInsert(this.remove, listener);
	}
	/**
	 * 移除组件添加监听器
	 */
	public removeRemoveListener(listener: Function) {
		this.remove = arrDelete(this.remove, this.remove.indexOf(listener));
	}

}

/**
 * 结构
 * @example
 */
export class Struct implements BinCode {
	// tslint:disable-next-line:variable-name
	public _$meta: StructMeta;// 该类结构的元信息
	// tslint:disable-next-line:no-empty
	public removeMeta() { }// 从元信息上移除
	// tslint:disable-next-line:no-empty
	public addMeta(mgr: StructMgr) { }// 添加到元信息上
	// tslint:disable-next-line:no-empty
	public binEncode(bb: BinBuffer, next: Function) { }	// 二进制编码
	// tslint:disable-next-line:no-empty
	public binDecode(bb: BinBuffer, next: Function) { }// 二进制解码
}

/**
 * 实例被管理器管理起来的结构
 * @example
 */
// tslint:disable:max-classes-per-file
export class MStruct extends Struct {
	// tslint:disable-next-line:variable-name
	public _$meta: MStructMeta;// 该类结构的元信息
	// tslint:disable-next-line:variable-name
	public _$index: number;// 结构实例的索引
	// tslint:disable-next-line:no-empty
	public insertMeta(mgr: StructMgr, index?: number) { }// 添加到元信息上
}

/**
 * 将结构添加到元信息中
 */
export const addToMeta = (ss: StructMgr, struct: Struct) => {
	const meta = ss.constructMap.get(struct.constructor);
	if (!meta) {
		throw new Error(`unregister struct, name:${struct.constructor.name}`);		
	}
	meta.addStruct(struct);
};

/**
 * 将结构添加插入到元信息中
 */
export const insertToMeta = (ss: StructMgr, struct: MStruct, index: number) => {
	const meta = ss.constructMap.get(struct.constructor);
	if (!meta) {
		throw new Error(`unregister struct, name:${struct.constructor.name}`);		
	}
	(<MStructMeta>meta).insertStruct(struct, index);
};

/**
 * 从元信息中删除结构
 */
export const removeFromMeta = (struct: Struct) => {
	struct._$meta.delStruct(struct);
};

/**
 * 通知字段改变
 */
export const notifyModify = (struct: MStruct, field: string, value: any, old: any, index?: number | string) => {
	struct._$meta.modifyNotify(struct, field, value, old, index);
};

/**
 * 结构系统管理器
 * @example
 */
export class StructMgr {
	public numberMap: Map<number,StructMeta> = new Map();// 组件元信息表
	public constructMap: Map<Function, StructMeta> = new Map();// 组件元信息表

	/**
	 * 注册
	 */
	public register(nameHash: number, construct: any, name: string) {
		const hash = construct._$info.nameHash;
		const meta = this.numberMap.get(hash);
		if (meta) {
			throw new Error(`class already register, name:${name}`);			
		}
		let s;
		if (MStruct.isPrototypeOf(construct)) {
			s = new MStructMeta();
		} else {
			s = new StructMeta();
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
	public lookup(key: any) {
		return Number.isInteger(key) ? this.numberMap.get(key) : this.constructMap.get(key);
	}

}
