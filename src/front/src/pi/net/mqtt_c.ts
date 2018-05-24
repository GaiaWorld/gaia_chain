/*
* mqtt模块， 用于消息发布和订阅
* mqtt消息协议：
	压缩方式：（0：不压缩， 1：lz4压缩， 2: zstd压缩）-- 占2位
	是否差异比较：（0：否， 1：是）-- 占1位
	版本号：-- 占5位，------------------------以上总共1字节
	原始数据大小：仅在发布数据为压缩数据时需要，  类型为PInt, PInt类型参考./util/bin.ts
	剩余部分：消息内容
*/
import { mqtt, PacketCallback, ClientSubscribeCallback, ISubscriptionMap, CloseCallback, OnMessageCallback, OnPacketCallback, OnErrorCallback, MqttClient, IClientOptions, Packet} from "./mqtt";
import * as lz4 from "../util/lz4";
import {RSync, decodeDiffs, encodeDiffs} from "../util/rsync";
import { BinBuffer } from "../util/bin";
import { baseType } from "../lang/type";

/**
 * 创建一个连接
 * @param compressTap-压缩阀值
 * @example
 */
export const connect = (url: string, compressTap? : number, option?: IClientOptions): Client => {
	let c = mqtt.connect(url, option);
	return new Client(c, compressTap);
}

/**
 * mqtt客户端
 * @example
 */
export class Client{
	mc: MqttClient;
	lastMsg = new Map<string, Uint8Array>();//需要使用差异比较进行数据同步的主题，每次发布时，应该保存最后发布的数据
	//可以为主题设置0个或多个tag，其中"compressMode"，"isRsync"为内置tag，用于配置主题数据的压缩模式，是否使用差异比较进行数据同步
	tags =  new Map<string, Map<string, baseType>>();
	rsync: RSync;
	compressTap: number;//压缩阀值， 当数据大小超过compressTap， 将会使用tag中配置的压缩方式进行压缩
	constructor(c: MqttClient, compressTap? : number){
		this.mc = c;
		this.rsync = new RSync(32);
		this.compressTap = compressTap || 64;
	}

	//设置tag
	setTag(topic: string, key: string, value: baseType){
		let tag  = this.tags.get(topic);
		if(!tag){
			tag = new Map<string, baseType>();
			this.tags.set(topic, tag);
		}
		tag.set(key, value);
	}

	//设置压缩阀值
	setCompressTap(value: number){
		this.compressTap = value;
	}

	/**
	 * @description 发布消息
	 */
	publish (topic: string, message: Uint8Array, callback?: PacketCallback){
		let messageHeadBb = new BinBuffer();
		let tag = this.tags.get(topic), isRsync, compressMode, originalSize;
		if(tag){
			isRsync = tag.get("isRsync");
			compressMode = tag.get("compressMode");
		}else{
			isRsync = 0;//默认不进行差异比较
			compressMode = 1;//默认lz4压缩
		}

		//如果需要进行差异比较，将发布数据改为差异数据
		if(isRsync){
			let last = this.lastMsg.get(topic);
			this.lastMsg.set(topic, message);
			if(!last){
				isRsync = 0;
			}else{
				let bb1 = new BinBuffer()
				encodeDiffs(this.rsync.diff(message, this.rsync.checksum(last)), bb1);
				message = bb1.getBuffer();
			}	
		}

		//如果数据大于压缩阀值，对其进行压缩 
		if(message.length > this.compressTap){
			originalSize = message.length;
			if(compressMode === CompressMode.LZ4){
				message = lz4.compress(message);
			}else if(compressMode === CompressMode.ZSTD){
				//todo
			}else if(compressMode === CompressMode.NONE){
				compressMode = 0;
			}else{
				throw "压缩方式不支持， mode：" + compressMode;
			}	
		}else{
			compressMode = 0;
		}

		let first = (isRsync << 2) + compressMode;
		messageHeadBb.writeU8(first);
		originalSize && messageHeadBb.writePInt(originalSize);
		
		let messageHead = messageHeadBb.getBuffer();
		let u8 = new Uint8Array(messageHead.length + message.length);
		u8.set(messageHead);
		u8.set(message, messageHead.length);
		this.mc.publish(topic, u8, callback);
	}
	
	/**
	 * @description 订阅消息
	 */
	subscribe (topic:string | string[] | ISubscriptionMap, callback?: ClientSubscribeCallback){
		this.mc.subscribe(topic, callback);
	}

	/**
	 * @description 退订
	 */
	unsubscribe (topic: string | string[], callback?: PacketCallback){
		this.mc.unsubscribe(topic, callback);
	}

	/**
	 * @description 关闭连接
	 */
	end (force?: boolean, cb?: CloseCallback){
		this.mc.end(force, cb);
	}

	/**
	 * @description 重新连接
	 */
	reconnect (){
		this.mc.reconnect(); 
	}

	/**
	 * @description 事件
	 */
	onMessage(cb: OnMessageCallback){
		this.mc.on('message', (topic: string, payload: Uint8Array, packet: Packet) => {
			const c = (payload[0] & 3);//压缩方式（0：不压缩，1：lz4压缩, 2:zstd压缩）
			const r = (payload[0] >> 2 & 1);//是否为差异部分
			payload = new Uint8Array(payload.buffer, payload.byteOffset + 1);
			if(c){
				const bb = new BinBuffer(payload);
				const len = bb.readPInt();
				payload = new Uint8Array(payload.buffer, payload.byteOffset + bb.head);
				if(c === 1){
					payload = lz4.decompress(payload, len);
				}else if(c === 2){
					//todo
				}else {
					throw "压缩方式不支持，mode：" + c;
				}	
			}
			
			r && (payload = this.rsync.sync(this.lastMsg.get(topic), decodeDiffs( new BinBuffer(payload) )));
			cb(topic, payload, packet);
			this.lastMsg.set(topic, payload);
		}) ;
	}

	onPacketsend(cb: OnMessageCallback){
		this.mc.on('packetsend', cb) ;
	}

	onError(cb: OnMessageCallback){
		this.mc.on('error', cb) ;
	}
}

//压缩模式
enum CompressMode{
	NONE = 0,
	LZ4 = 1,
	ZSTD = 2,
}
