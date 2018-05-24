/**
 * websocket通信
 */

import { decode, encode, getEncryption, nextEncryption } from './protocol_block';
import { isString, parseUrl } from './util';
const WEB_CONNECT_STATE = {
	SEND_TYPE: 'send',
	RETURN_OK_TYPE: 'r_ok',
	VERIFY_TYPE: 'verify',
	CLOSE_STATE: 'close',
	READY_STATE: 'ready',
	OPEN_STATE: 'open'
};

const swapBigLittle32 = (i) => {
	return ((i & 0xff000000) >>> 24) | ((i & 0xff0000) >> 8) | ((i & 0xff00) << 8) | ((i & 0xff) << 24);
};

const timeoutFunc = (rwait, rid, callback, con) => {
	return () => {
		delete rwait[rid];
		callback({
			error: -69,
			reason: 'timeout',
			con: con
		});
	};
};

const send = (ws, msg, rId, sendType, cfg) => {
	// 判定2进制数据
	let conMsg;
	let key;
	const temp: any = {};
	let encryption;
	if (sendType === 'string') {
		// tslint:disable:prefer-template
		conMsg = msg.type + '?=' + rId;
		for (key in msg.param) {
			if (msg.param.hasOwnProperty(key)) {
				conMsg += '&' + key + '=' + msg.param[key];
			}
		}
	} else {
		msg.param[''] = rId;
		temp.encode = cfg.encode;// 加密
		temp.verify = cfg.verify;// 校验
		temp.encodeNum = cfg.encodeNum || 6;
		temp.deflate = cfg.deflate;// 压缩
		if (temp.xxtea) {
			encryption = ws.getEncodeEncryption();
			conMsg = encode(msg, encryption, temp);
			if (conMsg !== false) {
				ws.setEncodeEncryption(encryption);
			}
		} else {
			conMsg = encode(msg, null, temp);
		}
	}
	ws.sendMsg(conMsg);
};

class PiWebSocket {
	private mReceiveCB: (e: any) => {};// 本质上是一个CB
	private mStatus: any = WEB_CONNECT_STATE.CLOSE_STATE;
	private encodeEncryption: any;
	private decodeEncryption: any;
	private mEncode: any;

	public setReceiveCB(cb: any) {
		this.mReceiveCB = cb;
	}
	// tslint:disable-next-line:typedef
	public open(url, cfg, timeout) {
		let domain;
		const con: any = {};
		let rid = 1;
		const rwait = {};
		let ws;
		let isActive = false;
		con.getUrl = () => {
			return url;
		};
		// 判断连接是否活动
		con.setActive = (iIsActive) => {
			isActive = iIsActive;
		};
		// 判断连接是否活动
		con.isActive = () => {
			return isActive;
		};
		// 获得连接的活动时间（最后一次的接收时间）
		con.getActiveTime = () => {
			// TODO
			return con.activeTime;
		};
		// 发送请求，等待回应
		con.request = (msg, callback, timeout, sendType) => {
			if (isActive) {
				// tslint:disable-next-line:no-string-based-set-timeout
				rwait[rid] = [callback, setTimeout(timeoutFunc(rwait, rid, callback, con), timeout)];

				return send(ws, msg, rid++, sendType, cfg);
			}
		};
		con.fireRequest = (msg) => {
			let rid;
			let arr;
			const param = msg.param;
			rid = param[''];
			if (rid) {
				arr = rwait[rid];
				if (arr) {
					if (msg.type === 'r_err') {
						param.error = 'r_err';
					}
					clearTimeout(arr[1]);
					delete rwait[rid];
					arr[0](msg.param);

					return;
				}
			}
			console.log('invalid msg, rid not found! ' + rid + ', param:' + param);
		};
		// 发送数据
		// todo 目前传输的结果是尽量采用同步发送，异步发送可能导致数据错误
		// todo chrome浏览器只支持一次发送65000byte以内的数据，而Firefox则支持921600byte以内的数据
		con.send = (msg, sendType) => {
			if (isActive) {
				return send(ws, msg, rid++, sendType, cfg);
			}
		};
		// 发送数据
		con.close = (reason) => {
			ws.close();
		};
		con.getStatus = () => {
			return ws.getStatus();

		};
		con.openTimeout = setTimeout(() => {
			con.openTimeout = undefined;
			con.close();
			this.mReceiveCB({
				type: 'open',
				url: url,
				con: {
					error: -69,
					reason: 'timeout url:' + url
				}
			});
		}, timeout);
		domain = parseUrl(url)[0];
		// 无效的url
		// 创建连接对象失败
		// 连接失败
		// 创建一个连接内部对象
		ws = this.create(url, con, cfg);

	}

	// tslint:disable-next-line:typedef
	// tslint:disable-next-line:max-func-body-length
	private create(url: string, con: any, cfg: any) {
		const ws: any = new WebSocket(url);
		let openOk;
		if (cfg.encode !== undefined) {
			this.mEncode = cfg.encode;
		}
		openOk = () => {
			this.mReceiveCB({
				type: 'open',
				url: url,
				con: con
			});
		};
		ws.binaryType = 'arraybuffer';
		ws.onopen = () => {
			console.log('websocket connected');
			const r = con.openTimeout;
			if (r) {
				con.openTimeout = undefined;
				clearTimeout(r);
			}
			con.setActive(true);
			if (this.mEncode) {
				this.mStatus = WEB_CONNECT_STATE.READY_STATE;
			} else {
				this.mStatus = WEB_CONNECT_STATE.OPEN_STATE;
				openOk();
			}
		};
		/**
		 * 后台发送(回调)的方法
		 * 参数 evt.data：
		 *  r_ok--回调成功
		 *  send--后台主动发送的
		 */
		ws.onmessage = (evt) => {
			let msg: any;
			let b;
			let preEncode;
			let preDecode;
			let newEncryption;
			const checkMsg = (iData) => {
				let iData1;
				let iData2;
				let rm;
				let i;
				let iData3;
				iData1 = iData.split('?');
				iData2 = iData1[1].split('&');
				rm = {};
				for (i = 0; i < iData2.length; i++) {
					iData3 = iData2[i].split('=');
					if (iData3.length === 2) {
						rm[iData3[0]] = iData3[1];
					}
				}
				console.log(iData);

				return {
					type: iData1[0],
					param: rm
				};
			};
			if (isString(evt.data)) {
				msg = checkMsg(evt.data);
			} else if (this.mStatus === WEB_CONNECT_STATE.READY_STATE) {
				msg = {};
				msg.type = WEB_CONNECT_STATE.VERIFY_TYPE;
				b = new Uint32Array(evt.data);
				preEncode = swapBigLittle32(b[0]);
				preDecode = swapBigLittle32(b[1]);
				this.encodeEncryption = getEncryption(preEncode);
				this.decodeEncryption = getEncryption(preDecode);
			} else if (this.mStatus === WEB_CONNECT_STATE.OPEN_STATE) {
				msg = {};
				// b = new Uint8Array(evt.data);
				// console.log(b)
				if (this.mEncode) {
					newEncryption = nextEncryption(this.decodeEncryption);
				}
				msg = decode(evt.data, newEncryption, cfg.encodeNum || 6);
				if (msg !== false) {
					this.decodeEncryption = newEncryption;
				}
			}
			if (msg.type === WEB_CONNECT_STATE.SEND_TYPE) {
				console.log(msg.param);
				// TODO 后台向前台推数据
			} else if (msg.type === WEB_CONNECT_STATE.VERIFY_TYPE) {
				this.mStatus = WEB_CONNECT_STATE.OPEN_STATE;
				openOk();
				console.log('preEncode=' + preEncode + ',preDecode=' + preDecode);
			} else if (msg.type === 'r_ok' || msg.type === 'r_err') {
				con.fireRequest(msg);
			} else {
				this.mReceiveCB({
					type: 'read',
					con: con,
					msg: msg
				});
			}
		};
		ws.onclose = (evt) => {
			console.log('websocket closed');
			this.mStatus = WEB_CONNECT_STATE.CLOSE_STATE;
			this.mReceiveCB({
				type: 'closed',
				reason: evt,
				url: url,
				con: con
			});
		};
		ws.onerror = (error) => {
			console.log('websocket error : ' + JSON.stringify(error));
		};
		ws.getEncodeEncryption = () => {
			return nextEncryption(this.encodeEncryption);
		};
		ws.setEncodeEncryption = (encryption) => {
			this.encodeEncryption = encryption;
		};
		ws.sendMsg = (conMsg) => {
			if (this.mStatus !== WEB_CONNECT_STATE.CLOSE_STATE) {
				ws.send(conMsg);
			}
		};
		ws.getStatus = () => {
			return this.mStatus;
		};

		return ws;
	}
}

export { PiWebSocket };