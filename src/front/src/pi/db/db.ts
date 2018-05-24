/*
 * KV数据库，及事务
 */

// ============================== 导入
import { Json } from '../lang/type';
import { Struct } from '../struct/struct_mgr';
import { ListenerList } from '../util/event';

// ============================== 导出
/**
 * 数据库系统提供的表的前缀
 * @example
 */
export const SUFFIX = {
	mq : '_$mq/', // 映射到消息队列的表前缀
	rt : '_$rt/', // 表示运行时的全局表前缀
	db : '_$db/', // 表示运行时的数据库及表的元信息表前缀
	cfg : '_$cfg/', // 表示每配置的全局表前缀
	code : '_$code/', // 表示每代码的全局表前缀
	node : '_$node/', // 表示每节点的表前缀
	cache : '_$cache/', // 表示每节点的的缓冲表前缀，有超时和大小来控制清理
	connect : '_$connect/', // 表示每连接的表前缀，连接结束后会自动清理
	action : '_$action/' // 表示每操作的表前缀，操作结束后会自动清理
};

/**
 * 事务处理函数
 * @example
 */
export interface TxHandler {
	(tx:Transaction);
}
/**
 * 键的类型
 * @example
 */
export type KType = number|string|(number | string)[];

/**
 * 条目
 * @example
 */
export interface Item {
	tab: string;
	key: KType;
	value?: Struct;
	time?: number; // 0 表示插入 负数表示删除 正数表示更新
}
/**
 * 事务
 * @example
 */
export class Transaction {
	// 是否为写事务
	public writable: boolean = false;
	// 事务的超时时间
	public timeout:number = 5000;
	// 开始本地事务
	/* tslint:disable:no-empty */
	public start(s:Session) {}
	// 结束本地事务。
	public end() {}
	// 提交一个本地事务。
	public commit() {}
	// 回滚一个本地事务。
	public rollback() {}
	// 预提交一个本地事务。
	public prepare() {}
	// 回滚一个已进行预提交的事务。
	public recover() {}
	// 锁
	public lock(arr:Item[], lockTime:number) {
	}
	// 查询
	public query(arr:Item[], lockTime?:number):Item[] {
		return [];
	}
	// 插入或更新
	public upsert(arr:Item[], lockTime?:number) {}
	// 删除
	/* tslint:disable:no-reserved-keywords */
	public delete(arr:Item[], lockTime?:number) {}
	// 迭代
	public iter(tab:string, filter:string) {}
	// 新增 修改 删除 表
	public alter(tab:string, meta?:Json) {}

}

/**
 * @description 数据库会话
 * @example
 */
export class Session {

	// 打开与数据库的会话。
	public open(db:DB) {
	}
	// 关闭与数据库的会话。
	public close() {
	}
	// 读事务，无限尝试直到超时，默认10秒
	public read(tx:TxHandler, timeout?:number) {

	}
	// 写事务，无限尝试直到超时，默认10秒
	public write(tx:TxHandler, timeout?:number) {

	}

}

/**
 * @description 数据库会话
 * @example
 */
export class DB {
	/* tslint:disable:typedef */
	public listeners = new ListenerList<MetaModify>();
	public tabListeners = new Map<string, ListenerList<Item[]>>();

	// 打开数据库
	public open() {
	}
	// 关闭数据库
	public close() {
	}
	// 复制一个数据库，在复制的数据库上做的所有操作都不会影响主库，主要用于前端做模拟计算使用
	public clone(): DB {
		return null;
	}
}

export interface MetaModify {
	tab:string;
	meta:Json;
	old:Json;
}
	