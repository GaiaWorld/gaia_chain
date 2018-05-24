/**
 * RPC， 远程方法调用
 * 采用 mqtt上定义的每会话的$req和$resp主题，来发送请求和接受响应
 */

// ============================== 导入
import { Connect } from '../net/websocket/connect';
import { Func, Struct, StructMgr } from '../struct/struct_mgr';
import { allWrite, getAllReadNext } from '../struct/util';
import { BinBuffer } from '../util/bin';
import { Client } from './mqtt_c';
import { Error, OK_I } from './rpc_r';

/**
 * 创建一个RPC函数
 * @example
 */
export const create = (client: Client, mgr: StructMgr): Rpc => {
	const mqttRpc = new MqttRpc(client, mgr);
	client.subscribe('$resp/#');
	client.onMessage((topic, payload: Uint8Array) => {
		if (topic.indexOf('$resp/') >= 0) {
			const bb = new BinBuffer(payload, 0, payload.length);
			const rid = bb.readU32();// 消息开始表示此次请求的id
			if (mqttRpc.wait[rid]) {
				mqttRpc.wait[rid](bb.read(getAllReadNext(mgr)));
				delete mqttRpc.wait[rid];
			}
		}
	});

	return (req: Struct, callback: Func) => {
		mqttRpc.call(req, callback);
	};
};

class MqttRpc {
	public rid: number = 1;
	public wait: Object = {};
	public client: Client;
	public mgr: StructMgr;
	constructor(client: Client, mgr: StructMgr) {
		this.client = client;
		this.mgr = mgr;
	}

	// 远程调用
	public call(req: Struct, callback: Func) {
		const bb = new BinBuffer();
		this.wait[this.rid] = callback;
		bb.writeU32(this.rid++);
		this.rid >= 0xffffffff && (this.rid = 1);
		bb.writeCt(req, allWrite);
		this.client.publish(`$req/${(<any>req).constructor._$info.name}`, bb.getBuffer(), null);		
	}
}

type Rpc = (req: Struct, callback: Func) => void;