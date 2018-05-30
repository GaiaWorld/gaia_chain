'use strict';
var pi_modules = pi_modules || {};
// 定义基础函数模块
pi_modules.butil = { id: 'butil', exports: undefined, loaded: true };
pi_modules.butil.exports = (function () {
	var module = function mod_butil() { };
	// ============================== 导入
	// ============================== 导出
	// utf8的ArrayBuffer解码成字符串
	module.utf8Decode = (self.TextDecoder) ? (function () {
		var decoder = new TextDecoder('utf-8');
		return function (arr) {
			if((!arr) || arr.byteLength === 0)
				return "";
			if(arr instanceof ArrayBuffer)
				arr = new Uint8Array(arr);
			return decoder.decode(arr);
		};
	})() : function (arr) {
		if((!arr) || arr.byteLength === 0)
			return "";
		if(arr instanceof ArrayBuffer) 
			arr = new Uint8Array(arr);
		var c, out = "", i = 0, len = arr.length;
		while (i < len) {
			c = arr[i++];
			if (c < 128) {
				out += String.fromCharCode(c);
			} else if (c < 0xE0 && i < len) {
				out += String.fromCharCode(((c & 0x1F) << 6) | (arr[i++] & 0x3F));
			} else if (c < 0xF0 && i + 1 < len) {
				out += String.fromCharCode((((c & 0x0F) << 12) | ((arr[i++] & 0x3F) << 6) | (arr[i++] & 0x3F)));
			} else if (c < 0xF8 && i + 2 < len) {
				out += String.fromCharCode((((c & 0x07) << 18) | ((arr[i++] & 0x3F) << 12) | ((arr[i++] & 0x3F) << 6) | (arr[i++] & 0x3F)));
			} else if (c < 0xFC && i + 3 < len) {
				out += String.fromCharCode((((c & 0x03) << 24) | ((arr[i++] & 0x3F) << 18) | ((arr[i++] & 0x3F) << 12) | ((arr[i++] & 0x3F) << 6) | (arr[i++] & 0x3F)));
			} else if (c < 0xFE && i + 4 < len) {
				out += String.fromCharCode((((c & 0x01) << 30) | ((arr[i++] & 0x3F) << 24) | ((arr[i++] & 0x3F) << 18) | ((arr[i++] & 0x3F) << 12) | ((arr[i++] & 0x3F) << 6) | (arr[i++] & 0x3F)));
			} else
				throw new Error("invalid utf8");
		}
		return out;
	};
	// 柯里化函数，将调用参数放在参数列表前
	module.curryFirst = function (func, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8) {
		return function (arg) {
			return func(arg, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8);
		};
	};
	// 柯里化函数，将调用参数放在参数列表后
	module.curryLast = function (func, arg/*:any*/) {
		return function (arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8) {
			return func(arg, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8);
		};
	};
	// 获得分隔文件名字和后缀的点的位置
	module.fileDot = function (file/*:string*/) {
		var i, c;
		for (i = file.length - 1; i >= 0; i--) {
			c = file.charCodeAt(i);
			if (c === 47)
				return -1;
			if (c === 46)
				return i;
		}
		return -1;
	};
	// 获得文件后缀
	module.fileSuffix = function (file/*:string*/) {
		var dot = module.fileDot(file);
		return (dot >= 0) ? file.slice(dot + 1) : "";
	};
	// 获得指定的路径相对目录的路径
	module.relativePath = function (filePath/*:string*/, dir/*:string*/) {
		var i, len, j;
		if (filePath.charCodeAt(0) !== 46)
			return filePath;
		i = 0;
		len = filePath.length;
		j = dir.length - 1;
		if (dir.charCodeAt(j) !== 47) {
			j = dir.lastIndexOf("/");
		}
		while (i < len) {
			if (filePath.charCodeAt(i) !== 46)
				break;
			if (filePath.charCodeAt(i + 1) === 47) {// ./的情况
				i += 2;
				break;
			}
			if (filePath.charCodeAt(i + 1) !== 46 || filePath.charCodeAt(i + 2) !== 47)
				break;
			// ../的情况
			i += 3;
			j = dir.lastIndexOf("/", j - 1);
		}
		if (i > 0)
			filePath = filePath.slice(i);
		if (j < 0)
			return filePath;
		if (j < dir.length - 1)
			dir = dir.slice(0, j + 1);
		return dir + filePath;
	};
	// 计算字符串的hash
	module.hash = function (s/*:string*/, h/*:number*/) {
		if (!s)
			return h;
		var c, i = 0, len = s.length;
		for (; i < len; i++) {
			c = s.charCodeAt(i);
			h = (((h << 5) - h) + c) | 0;//乘31，然后使用了 “|” 运算符，转换参数为 32bit，确保结果是个32位整数
		}
		return h;
	};

	// ============================== 本地
	// ============================== 立即执行

	return module;
})();

// 定义依赖模块
pi_modules.depend = { id: 'depend', exports: undefined, loaded: true };
pi_modules.depend.exports = (function () {
	var module = function mod_depend() { };
	// ============================== 导入
	// ============================== 导出
	// 根据文件表初始化依赖表
	module.init = function (files, path/*:string*/) {
		var i, f, dir;
		fileMap = {};
		for (i = files.length - 1; i >= 0; i--) {
			f = files[i];
			fileMap[f.path] = f;
			initDir(f, fileMap);
		}
		rootPath = path;
	};
	// 根据文件表初始化依赖表
	module.rootPath = function () {
		return rootPath;
	};
	// 获得文件信息，如果是"***/"表示为目录，则获得目录对象，包含所有的文件和子目录
	module.get = function (path) {
		return fileMap[path];
	};

	// 获得文件表
	module.getFileMap = function () {
		return fileMap;
	};
	
	// 多个域名地址，尽量使用CDN，第一个地址尝试下载2次，以后每个地址尝试下载1次
	module.domains = winit.domains; /*:Array<string>*/

	// ============================== 本地
	// 文件表的根路径
	var rootPath;
	// 文件表
	var fileMap;

	// 将目录放入到文件表中
	var initDir = function (f, map) {
		var i, dir, info, s, suf="", path = f.path, i = path.lastIndexOf("."), j = path.lastIndexOf("/");
		if(i > j)
			suf = path.slice(i + 1);
		j = 0;
		while ((i = path.indexOf("/", j)) >= 0) {
			dir = path.slice(j, i + 1);
			info = map[dir];
			if (!info) {
				map[dir] = info = { children: {}, size: 0, path: path.slice(0, i), count: 0, suffix:{} };
				fileMap[path.slice(0, i + 1)] = info;
			}
			info.size += f.size;
			info.count++;
			info.suffix[suf] = (info.suffix[suf] || 0) + f.size;
			map = info.children;
			j = i + 1;
		}
		if (info)
			map[path.slice(j)] = f;
	};

	// ============================== 立即执行
	return module;
})();

// IndexedDB存储
pi_modules.store = { id: 'store', exports: undefined, loaded: true };
pi_modules.store.exports = (function () {
	var module = function mod_store() { };
	// ============================== 导入
	// ============================== 导出
	module.ERR_READ = "ERR_READ";
	module.ERR_WRITE = "ERR_WRITE";
	module.ERR_DELETE = "ERR_DELETE";
	module.ERR_ITERATE = "ERR_ITERATE";
	module.ERR_CLEAR = "ERR_CLEAR";
	/**
	 * @description 判断是否支持IndexedDB
	 * @example
	 */
	module.check = function () {
		return !!iDB;
	}

	/**
	 * @description 创建指定名称的存储
	 * @example
	 */
	module.create = function (dbName/*:string*/, tabName/*:string*/) {// 返回值类型1|类型2
		dbName = dbName || "_idb_db";
		tabName = tabName || "_idb_tab";
		return { dbName: dbName, tabName: dbName, db: undefined };
	}
	/**
	 * @description 初始化存储
	 * @example
	 */
	module.init = function (store/*:Store*/, callback/*:function*/, errorCallback/*:function*/) {// 返回值类型1|类型2
		if (!iDB) {
			store.db = {};
			return callback && setTimeout(callback, 0);
		}
		try {
			var request = iDB.open(store.dbName, 1);
			request.onupgradeneeded = function (e) {
				// 创建table
				e.currentTarget.result.createObjectStore(store.tabName, { autoIncrement: false });
			};
			request.onsuccess = function (e) {
				store.db = e.currentTarget.result;
				callback && callback();
			};
			request.onerror = errorCallback;
		} catch (e) {
			iDB = undefined;
			store.db = {};
			return callback && setTimeout(callback, 0);
		}
	};

	/**
	 * @description 读取数据
	 * @example
	 */
	module.read = function (store/*:Store*/, key/*:string*/, callback/*:function*/, errorCallback/*:function*/) {
		if (!iDB) {
			return setTimeout(function () { callback(store.db[key], key); }, 0);
		}
		var request = store.db.transaction(store.tabName, "readonly").objectStore(store.tabName).get(key);
		request.onsuccess = function (e) {
			callback(e.target.result, key);
		};
		request.onerror = onerror(errorCallback, module.ERR_READ, key);
	};

	/**
	 * @description 写入数据，如果键名存在则替换
	 * @example
	 */
	module.write = function (store/*:Store*/, key/*:string*/, data/*:any*/, callback/*:function*/, errorCallback/*:function*/) {
		if (!iDB) {
			store.db[key] = data;
			return callback && setTimeout(callback, 0);
		}
		var tx = store.db.transaction(store.tabName, "readwrite");
		tx.objectStore(store.tabName).put(data, key);
		tx.oncomplete = callback;
		tx.onerror = onerror(errorCallback, module.ERR_WRITE, key);
	};

	/**
	 * @description 删除数据
	 * @example
	 */
	module.delete = function (store/*:Store*/, key/*:string*/, callback/*:function*/, errorCallback/*:function*/) {
		if (!iDB) {
			delete store.db[key];
			return callback && setTimeout(callback, 0);
		}
		var tx = store.db.transaction(store.tabName, "readwrite");
		tx.objectStore(store.tabName).delete(key);
		tx.oncomplete = callback;
		tx.onerror = onerror(errorCallback, module.ERR_DELETE, key);
	};

	/**
	 * @description 迭代
	 * @example
	 */
	module.iterate = function (store/*:Store*/, callback/*:function*/, errorCallback/*:function*/) {
		if (!iDB) {
			return setTimeout(function () {
				var k, db = store.db;
				for (k in db) {
					if (callback(k, db[k]) !== false)
						r.continue();
				}
				callback();
			}, 0);
		}
		var cursor = store.db.transaction(store.tabName, "readonly").objectStore(store.tabName).openCursor();
		cursor.onsuccess = function () {
			var r = cursor.result;
			if (r) {
				if (callback(r.key, r.value) !== false)
					r.continue();
			} else {
				callback();
			}
		};
		cursor.onerror = onerror(errorCallback, module.ITERATE, "");
	};

	/**
	 * @description 清除存储
	 * @example
	 */
	module.clear = function (store/*:Store*/, callback/*:function*/, errorCallback/*:function*/) {
		if (!iDB) {
			store.db = {};
			return callback && setTimeout(callback, 0);
		}
		var tx = store.db.transaction(store.tabName, "readwrite");
		tx.objectStore(store.tabName).clear();
		tx.oncomplete = callback;
		tx.onerror = onerror(errorCallback, module.CLEAR, "");
	};

	// ============================== 本地
	// 返回错误处理函数
	var onerror = function (cb, type, key) {
		if (!cb)
			return;
		return function (e) {
			cb({
				nativeError: e,
				error: type,
				reason: key + ", error code: " + e.target.errorCode
			});
		}
	}

	// ============================== 立即执行
	var iDB = self.indexedDB || self.webkitIndexedDB || self.mozIndexedDB || self.OIndexedDB || self.msIndexedDB;

	return module;
})();

// 定义ajax
pi_modules.ajax = { id: 'ajax', exports: undefined, loaded: true };
pi_modules.ajax.exports = (function () {
	var module = function mod_ajax() { };
	// ============================== 导出
	module.RESP_TYPE_BIN = 'bin';
	module.RESP_TYPE_JSON = 'json';
	module.RESP_TYPE_TEXT = 'text';

	module.ERR_ABORT = "ERR_ABORT";
	module.ERR_TIMEOUT = "ERR_TIMEOUT";
	module.ERR_ARGS = "ERR_ARGS";
	module.ERR_NORMAL = "ERR_NORMAL";
	module.ERR_LOCATION = "ERR_LOCATION";
	module.ERR_JSON = "ERR_JSON";

	/**
	 * @description URL增加随机参数
	 * @example
	 */
	module.randomUrl = function (url/*:string*/) {
		return (url.indexOf("?") > 0) ? url + "&" + Math.random() : url + "?" + Math.random();
	}

	/**
	 * @description 参数化对象数据
	 * @return {string} 被encodeURIComponent编码过的&=分隔的字符串， "Content-Type":"application/x-www-form-urlencoded"
	 * @example
	 */
	module.param = function (data/*:json*/) { // string
		var k, v, arr = [];
		for (k in data) {
			if (!data.hasOwnProperty(k))
				continue;
			v = data[k];
			if (v === undefined) {
				v = "undefined";
			} else if (v === null) {
				v = "null";
			} else if (typeof v === typeof "") {
				v = encodeURIComponent(v);
			} else if (typeof v === typeof 0) {
			} else {
				v = encodeURIComponent(JSON.stringify(v));
			}
			arr.push(encodeURIComponent(k), "=", v, "&");
		}
		if (arr.length > 0)
			arr.length--;
		return arr.join("");
	}

	/**
	 * @description GET方法
	 * @example
	 */
	module.get = function (url/*:string*/, headers/*:join*/, reqData/*:json|string*/, respType/*:string*/, timeout/*:int*/, callback/*:function*/, errorCallback/*:function*/, processCallback/*:function*/) {
		if (reqData !== null && typeof reqData === "object") {
			reqData = param(reqData);
			url = (url.indexOf("?") > 0) ? url + "&" + reqData : url + "?" + reqData;
		}
		return module.request('GET', url, headers, undefined, respType, timeout, callback, errorCallback, processCallback);
	}

	/**
	 * @description POST方法
	 * @example
	 */
	module.post = function (url/*:string*/, headers/*:join*/, reqData/*:string|ArrayBuffer|FormData*/, contentType/*:string*/, respType/*:string*/, timeout/*:int*/, callback/*:function*/, errorCallback/*:function*/, processCallback/*:function*/) {
		headers = headers || {};
		headers["Content-Type"] = contentType;
		return module.request('POST', url, headers, reqData, respType, timeout, callback, errorCallback, processCallback);
	}

	/**
	 * @description request方法
	 * @example
	 */
	module.request = function (type/*:string*/, url/*:string*/, headers/*:join*/, reqData/*:string|ArrayBuffer*/, respType/*:string*/, timeout/*:int*/, callback/*:function*/, errorCallback/*:function*/, processCallback/*:function*/) {
		var xhr = new XMLHttpRequest();
		if (respType === module.RESP_TYPE_BIN) {
			xhr.responseType = 'arraybuffer';
		}
		xhr.onabort = function () {
			timeout && clearTimeout(xhr.timerRef);
			errorCallback({
				error: module.ERR_ABORT,
				reason: "abort"
			});
		};
		if (timeout > 0) {
			// 自己处理超时，超时指超过规定时间没有收到数据
			xhr.activeTime = Date.now();
			var timer = function () {
				var t = xhr.activeTime + timeout - Date.now();
				if (t <= 0)
					return errorCallback({
						error: module.ERR_TIMEOUT,
						reason: "timeout"
					});
				xhr.timerRef = setTimeout(timer, t);
			};
			xhr.timerRef = setTimeout(timer, timeout);
		}
		xhr.onerror = function (ev) {
			timeout && clearTimeout(xhr.timerRef);
			errorCallback({
				nativeError: ev,
				error: module.ERR_NORMAL,
				reason: "error status: " + xhr.status + " " + xhr.statusText + ", " + url
			});
		};
		xhr.upload.onprogress = function (ev) {
			xhr.activeTime = Date.now();
			ev.progressType = 'upload';
			processCallback && processCallback(ev);
		}
		xhr.onprogress = function (ev) {
			xhr.activeTime = Date.now();
			ev.progressType = 'download';
			processCallback && processCallback(ev);
		}
		xhr.onload = function (ev) {
			timeout && clearTimeout(xhr.timerRef);
			if (xhr.status === 300 || xhr.status === 301 || xhr.status === 302 || xhr.status === 303) {
				return errorCallback({
					error: module.ERR_LOCATION,
					reason: xhr.getResponseHeader("Location")
				});
			}
			if (xhr.status !== 200 && xhr.status !== 304) {
				return errorCallback({
					nativeError: ev,
					error: module.ERR_NORMAL,
					reason: "error status: " + xhr.status + " " + xhr.statusText + ", " + url
				});
			}
			if (respType === undefined || respType === module.RESP_TYPE_TEXT) {
				callback(xhr.responseText);
			} else if (respType === module.RESP_TYPE_JSON) {
				var json;
				try {
					json = JSON.parse(xhr.responseText);
				} catch (e) {
					return errorCallback({
						nativeError: e,
						error: module.ERR_JSON,
						reason: e.name + ": " + e.message
					});
				}
				callback(json);
			} else if (respType === module.RESP_TYPE_BIN && !xhr.response) {
				callback(new ArrayBuffer(0));
			} else {
				callback(xhr.response);
			}
		};
		xhr.open(type, url, true);
		//传输的文件HTTP头信息， 必须在open之后设置
		if (headers) {
			var i;
			for (i in headers) {
				if (headers.hasOwnProperty(i))
					xhr.setRequestHeader(i, headers[i]);
			}
		}
		xhr.send(reqData);
		return xhr;
	}

	// ============================== 本地
	// ============================== 立即执行
	return module;
})();

// 定义前端加载器
pi_modules.load = { id: 'load', exports: undefined, loaded: true };
pi_modules.load.exports = (function () {
	var module = function mod_load() { };
	/*
	// 前端加载和资源框架：
	1、服务器提供一次性下载多个文件的接口，GET上行要最小化文件列表，因为要CDN缓存
	2、本地将数据保存在IndexedDB里面
	4、ajax取数据，支持上下行进度。
	5、根据资源列表和本地文件签名，判断是否需要找服务器要数据。如果需要，则获取下载文件列表及签名，从服务器下载，并保存在本地。
	6、 TODO 支持SRI

	上行消息结构： (后缀1(文件名1:文件名2)后缀2(文件名1:文件名2):目录1()目录2()) (): $作为转义,$转$$ (转$1 )转$2
	上行消息支持路径，如果一个目录下所有文件都需要下载，则仅发送路径

	知识：
	文件名不能包含 \/:*?"<>|
	":@-._~!$&'()*+,;="等字符在url的路径部分允许不被转义，
	"/?:@-._~!$&'()*+,;="等字符在任何段中允许不被转义。

	 */

	// ============================== 导入
	var butil = pi_modules.butil.exports;
	var depend = pi_modules.depend.exports;
	var store = pi_modules.store.exports;
	var ajax = pi_modules.ajax.exports;
	var empty = function () { };

	// ============================== 导出
	/**
	 * @description 获取本地存储
	 * @example
	 */
	module.getStore = function () {
		return localStore;
	};
	/**
	 * @description 判断是否为本地数据库
	 * @example
	 */
	module.isNativeBrowser = function () {
		return isNative;
	};
	/**
	 * @description 检查文件是否会从本地加载, 返回 true | false | undefined
	 * @example
	 */
	module.isLocal = function (path/*:string*/) {
		var info = depend.get(path);
		return (info) ? info.sign === getSign(path) : undefined;
	};
	/**
	 * @description 创建加载对象
	 * @example
	 */
	module.create = function (files/*:Array<Info>*/, successCallback/*:function*/, errorCallback/*:function*/, processCallback/*:function*/) {
		return {
			// 多个下载文件
			files: files, /*:Array<Info>*/
			// 加载成功的回调函数
			onsuccess: successCallback || empty,
			// 加载失败的回调函数
			onerror: errorCallback || empty,
			// 加载进度的回调函数
			onprocess: processCallback || empty,
			// 所有加载的文件数量
			loadAmount: 0, /*:number*/
			// 加载到的文件数量
			loadCount: 0, /*:number*/
			// 所有下载的文件数量
			downAmount: 0, /*:number*/
			// 下载到的文件数量
			downCount: 0, /*:number*/
			// 下载的总文件长度
			total: 0,
			// url为键，值为已下载的长度
			loaded: {},
			// 加载文件的数据
			fileMap: {}, /*:Map*/
			// 加载文件的数据
			fileTab: {}, /*:Map*/
			// 下载超时时间，默认20秒
			timeout: 20000, /*:number*/
			// url为键，值为ajax请求对象
			ajax: {}
		};
	};
	/**
	 * @description 加载开始
	 * @example
	 */
	module.start = function (load/*:Load*/) {
		if (!initWait)
			return startNext(load);
		initWait.push(load);
		if (initWait.length === 1)
			localInit();
	};

	/**
	 * @description 停止
	 * @example
	 */
	module.stop = function (load/*:Load*/) {
		return load.ajax && load.ajax.abort();
	};
	/**
	 * @description 清除
	 * @example
	 */
	module.clear = function () {
		store.clear(localStore);
		localSign = {};
		initWait = [];
	};

	// ============================== 本地
	// 本地存储名称
	var storeName = winit.store; /*:string*/
	// 本地存储
	var localStore; /*:Json*/
	// 本地签名表
	var localSign; /*:Json*/
	// 初始化等待
	var initWait = []; /*:Array<Load>*/
	// 下载等待
	var loadWait = []; /*:Array<Load>*/
	// 限制url的长度
	var LimitLength = 1024 - 100;
	// 是否为本地浏览器
	var isNative = navigator.userAgent.indexOf("YINENG") >= 0;


	// 获得路径签名， "-"开头表示本地文件
	var getSign = function (path/*:string*/) {
		return formatSign(localSign[path]);
	}
	// 格式化签名， "-"开头表示本地文件
	var formatSign = function (s/*:string*/) {
		if(!s)
			return s;
		if(s.charCodeAt(0) === 45)
			s = s.slice(1);
		return s;
	}
	// 本地加载
	var localInit = function () {
		localStore = store.create(storeName);
		store.init(localStore, function () {
			store.read(localStore, "", function (value) {
				if(value){
					localSign = value;
					localInitCheck(false);
				}else if(isNative){
					// 加载标准版的.depend，但是统一叫depend
					ajax.get("file:///android_asset/res/depend", undefined, undefined, ajax.RESP_TYPE_TEXT, 0, function(r){
						localSign = {};
						var i = r.indexOf("["), j = r.lastIndexOf("]"), info;
						var arr = JSON.parse(r.slice(i, j + 1));
						// 本地文件的签名前面加"-"的前缀
						for (i = arr.length - 1; i >= 0; i--) {
							info = arr[i];
							localSign[info.path] = "-"+info.sign;
						}
						localInitCheck(true);
					}, function(r){
						localSign = {};
						localInitCheck(false);
					});
				}else{
					localSign = {};
					localInitCheck(false);
				}
			}, alert);
		}, alert);
	};
	// 本地加载检查
	var localInitCheck = function (save/*:boolean*/) {
		var k, info, s, i;
		// 删除不存在或签名不正确的文件
		for (k in localSign) {
			if (!localSign.hasOwnProperty(k))
				continue;
			info = depend.get(k);
			if (info && getSign(k) === info.sign)
				continue;
			store.delete(localStore, k);
			delete localSign[k];
			save = true;
		}
		if (save)
			store.write(localStore, "", localSign);
		for (i = initWait.length - 1; i >= 0; i--) {
			startNext(initWait[i]);
		}
		initWait = undefined;
	};
	// 加载继续
	var startNext = function (load/*:Load*/) {
		var tree, result, dir, dirMap, len, count, arr = [];
		localLoad(load, arr);
		load.onprocess({ type: "loadStart", loadAmount: load.loadAmount, downAmount: load.downAmount });
		if (load.loadAmount === 0 && load.downAmount === 0)
			return load.onsuccess(load.fileMap);
		loadWait.push(load);
		if (arr.length === 0)
			return;
		tree = fileTree(arr);
		dir = {children:{}, suffix:{}}, dirMap = {};
		dirTree(tree, dir, dirMap, "");
		// 先发送路径部分
		while (true) {
			result = { url: "", d: "", f: "", files: [], next: false };
			// 检查url长度, 限制长度1k，超过1k，需要分多次下载
			stringify(dir, LimitLength, result);
			if (result.url.length > 1) {
				result.d = result.url;
				result.files = dirFiles(result.files, dirMap, []);
			}
			if (!result.next)
				break;
			startURL(load, result.d, result.f, result.files);
		}
		// 然后发送文件部分
		len = LimitLength - result.url.length - 4;
		result.url = "";
		while (true) {
			count = result.files.length;
			// 检查url长度, 限制长度1k，超过1k，需要分多次下载
			stringify(tree, len, result);
			if (result.files.length > count)
				result.f = result.url;
			startURL(load, result.d, result.f, result.files);
			if (!result.next)
				break;
			len = LimitLength;
			result = { url: "", d: "", f: "", files: [], next: false };
		}
	}
	// 加载URL
	var startURL = function (load/*:Load*/, durl, furl, files) {
		var i, info, url, len = files.length, size = 0, h = 0; // hash值
		if (len === 0)
			return;
		for (i = 0; i < len; i++) {
			info = files[i];
			size += info.size;
			h = butil.hash(info.sign, h);
		}
		load.total += size;
		url = depend.rootPath() + "files?s=" + size + (durl ? "&d=" + durl : "") + (furl ? "&f=" + furl : "") + "&h=" + h;
		download(load, url, load.timeout, function (data) {
			if (data.byteLength !== size) {
				return downloadError("download error!, size: " + size + ", invalid size: " + data.byteLength, durl, furl, files);
			}
			save(load, data, files, size);
		}, function (err) {
			downloadError(err, files);
		}, function (ev) {
			if (ev.progressType === 'download') {
				load.loaded[url] = ev.loaded;
				loadProcess();
			}
		});
	};

	// 本地加载
	var localLoad = function (load/*:Load*/, arr) {
		var i, info, name, s, sign, files = load.files;
		for (i = files.length - 1; i >= 0; i--) {
			info = files[i];
			if (!info)
				continue;
			name = info.path;
			// 文件长度为0，跳过
			if (!info.size)
				continue;
			// 去除重复的文件
			if (load.fileMap[name] !== undefined)
				continue;
			if (findWait(name, load))
				continue;
			s = localSign[name];
			sign = formatSign(s);
			if (info.sign === sign) {
				load.loadAmount++;
				load.fileMap[name] = 0;
				if(s === sign)
					store.read(localStore, name, loadOK, butil.curryFirst(loadError, name));
				else
					ajax.get("file:///android_asset/res/"+name, undefined, undefined, ajax.RESP_TYPE_BIN, 0, butil.curryFirst(loadOK, name), butil.curryFirst(loadError, name));
			} else {
				load.downAmount++;
				load.fileMap[name] = null;
				arr.push(info); // 将要下载的文件放入数组
			}
		}
	};
	// 从等待的加载中获取文件数据，返回false表示没有加载该文件
	var findWait = function (file/*:string*/, load/*:Load*/) {
		var i, data;
		for (i = loadWait.length - 1; i >= 0; i--) {
			data = loadWait[i].fileMap[file];
			if (data === undefined)
				continue;
			// 记录已加载或正在加载的文件
			load.fileMap[file] = data;
			load.fileTab[file] = data;
			// 如果等待加载，则数量加1
			if (data === 0) {
				load.loadAmount++;
			} else if (data === null) {
				load.downAmount++;
			}
			return true;
		}
		return false;
	};

	// 加载指定的文件成功，通知所有正在等待的加载器
	var loadOK = function (data, file/*:string*/, down) {
		var i, load;
		for (i = loadWait.length - 1; i >= 0; i--) {
			load = loadWait[i];
			if (load.fileMap[file] === undefined)
				continue;
			load.fileMap[file] = data;
			load.fileTab[file] = data;
			if (down) {
				load.downCount++;
				load.onprocess({ type: "downFile", file: file, data: data, total: load.downAmount, count: load.downCount });
			} else {
				load.loadCount++;
				load.onprocess({ type: "loadFile", file: file, data: data, total: load.loadAmount, count: load.loadCount });
			}
			if (load.downCount < load.downAmount || load.loadCount < load.loadAmount)
				continue;
			if (i < loadWait.length - 1)
				loadWait[i] = loadWait[loadWait.length - 1];
			loadWait.length--;
			load.onsuccess(load.fileMap);
		}
	};

	// 加载指定的文件失败，通知所有正在等待的加载器
	var loadError = function (err, file/*:string*/) {
		var i, load;
		for (i = loadWait.length - 1; i >= 0; i--) {
			load = loadWait[i];
			if (load.fileMap[file])
				continue;
			if (i < loadWait.length - 1)
				loadWait[i] = loadWait[loadWait.length - 1];
			loadWait.length--;
			load.onerror(err, file);
		}
	};
	// 下载一组文件失败
	var downloadError = function (err, files/*:Array<Info>*/) {
		var i;
		for (i = files.length - 1; i >= 0; i--) {
			loadError(err, files[i].path);
		}
	};
	// 下载进度事件
	var loadProcess = function () {
		var i, load, loaded, k, ev = { type: "download", total: 0, loaded: 0 };
		for (i = loadWait.length - 1; i >= 0; i--) {
			load = loadWait[i];
			ev.total += load.total;
			loaded = load.loaded;
			for (k in loaded) {
				if (loaded.hasOwnProperty(k))
					ev.loaded += loaded[k];
			}
		}
		for (i = loadWait.length - 1; i >= 0; i--) {
			load = loadWait[i];
			load.onprocess(ev);
		}
	};
	// 获取文件的去掉第一个后缀的文件名
	var basename = function (file/*:string*/) {
		var i = file.lastIndexOf('/'), j = file.lastIndexOf('.');
		return j > i ? file.slice(i + 1, j) : file.slice(i + 1);
	};
	// 上行消息结构： (后缀1(文件名1:文件名2)后缀2(文件名1:文件名2):目录1()目录2())
	var stringify = function (tree/*:Map*/, limit/*:number*/, result/*:any*/) {
		// 先写入本目录下的文件，按后缀归类
		var k, v, f, rk, rs, i, ss = tree.suffix;
		if (ss) {
			for (k in ss) {
				if (!ss.hasOwnProperty(k))
					continue;
				v = ss[k].arr;
				if(!v.length)
					continue;
				i = v.length - 1;
				f = v[i--];
				rk = replace(k);
				rs = replace(basename(f.path));
				if (result.url.length + rk.length + rs.length > limit) {
					result.next = true;
					return;
				}
				result.files.push(f);
				result.url += rk + "(" + rs;
				for (; i >= 0; i--) {
					f = v[i];
					rs = replace(basename(f.path));
					if (result.url.length + rs.length > limit) {
						v.length = i + 1;
						result.next = true;
						result.url += ")";
						return;
					}
					result.url += ":" + rs;
					result.files.push(f);
				}
				result.url += ")";
				delete ss[k];
			}
		}
		result.url += ":";
		ss = tree.children;
		for (k in ss) {
			if (!ss.hasOwnProperty(k))
				continue;
			rk = replace(k);
			result.url += rk + "(";
			stringify(ss[k], limit, result);
			result.url += ")";
			if (result.next)
				return result;
			delete ss[k];
		}
	};
	// 3个分隔符 (): $作为转义, $转$$ (转$1 )转$2
	var replace = function (s/*:string*/) {
		return s.replace(/\(/g, "$1").replace(/\)/g, "$2").replace(/\$/g, "$$");
	};
	// 构建上行消息, 最小化文件列表, GET上行，因为要CDN缓存
	// 先构建一个目录树，目录内再构建一个后缀表
	var fileTree = function (files/*:Array<Info>*/) {
		var ss, n, t, s, i, info, j, len, suf, root = {size:0, children:{}, suffix:{}};
		for (i = files.length - 1; i >= 0; i--) {
			info = files[i];
			ss = info.path.split("/");
			s = ss[ss.length - 1];
			j = s.lastIndexOf(".");
			suf = j >= 0 ? s.substring(j + 1) : "";
			n = root;
			for (j = 0, len = ss.length - 1; j < len; j++) {
				s = ss[j];
				t = n.children[s];
				if (!t)
					n.children[s] = t = {size:0, children:{}, suffix:{}};
				t.size += info.size;
				n = t.suffix[suf];
				if(!n)
					t.suffix[suf] = n = {arr:[], size: 0};
				n.size += info.size;
				n = t;
			}
			n.suffix[suf].arr.push(info);
		}
		return root;
	};
	// 根据下载文件的目录树，生成完全目录加载的目录树
	var dirTree = function (tree, dir, dirMap, path) {
		var k, s, tr, d, dd, v, suf, suffix, r = false, children = tree.children;
		for (k in children) {
			if (!children.hasOwnProperty(k))
				continue;
			s = path + k + "/";
			d = depend.get(s);
			tr = children[k];
			if (d.size === tr.size) { // 完全目录加载
				dirMap[d.path] = treeFiles(tr, []);
				v = dir.suffix[""];
				if (!v) {
					dir.suffix[""] = v = {arr:[]};
				}
				v.arr.push(d);
				delete children[k];
				tree.size -= tr.size;
				r = true;
				continue;
			}
			suffix = tr.suffix;
			for(suf in suffix) { // 目录下全部指定后缀的文件加载
				if(d.suffix[suf] !== suffix[suf].size)
					continue;
				dd = {path: d.path+"."+suf};
				dirMap[dd.path] = treeFiles(tr, [], suf);
				v = dir.suffix[suf];
				if (!v) {
					dir.suffix[suf] = v = {arr:[]};
				}
				v.arr.push(dd);
				r = true;
				continue;
			}
			if(tr.size) { // 子目录需要检查大小，因为在后缀处理时，可能目录下已经没有文件
				d = {children:{}, suffix:{}};
				if (dirTree(tr, d, dirMap, s)) {
					dir.children[k] = d;
					r = true;
				}
			}
			if(!tr.size)
				delete children[k];
		}
		return r;
	};
	// 将该目录下所有的文件放入数组中
	var treeFiles = function (tree, arr, suf) {
		var k, v, s;
		v = tree.suffix;
		if(suf) {
			// 目录下所有指定的后缀文件
			s = v[suf];
			if(s) {
				arr.push.apply(arr, s.arr);
				tree.size -= s.size;
				delete v[suf];
			}
		} else {
			for (k in v) {
				if (v.hasOwnProperty(k))
					arr.push.apply(arr, v[k].arr);
			}
		}
		v = tree.children;
		for (k in v) {
			if (v.hasOwnProperty(k))
				treeFiles(v[k], arr, suf);
		}
		return arr;
	};
	// 将目录下的文件放入数组中
	var dirFiles = function (dirs, map, r) {
		var arr, i = 0, len = dirs.length;
		var sort = function (a, b) {
			return a.path > b.path ? 1 : -1;
		};
		for (; i < len; i++)
			r = r.concat(map[dirs[i].path].sort(sort));
		return r;
	};

	// 下载
	var download = function (load, path, timeout, onsuccess, onerror, onprocess, err, retry) {
		if (retry >= depend.domains.length) {
			return onerror(err);
		}
		load.ajax[path] = ajax.get(depend.domains[retry || 0] + path, undefined, undefined, ajax.RESP_TYPE_BIN, timeout, onsuccess, function (err) {
			download(load, path, timeout, onsuccess, onerror, onprocess, err, retry === undefined ? 0 : retry + 1);
		}, onprocess);
	};

	// 保存
	var save = function (load, buff, files, size) {
		var i, info, name, data, count = files.length - 1;
		var onsuccess = function () {
			count--;
			if (count < 0)
				store.write(localStore, "", localSign);
		};
		for (i = count; i >= 0; i--) {
			info = files[i];
			name = info.path;
			data = buff.slice(size - info.size, size);
			size -= info.size;
			savefile(name, data, info, onsuccess, butil.curryFirst(loadError, name));
			loadOK(data, name, true);
		}
	};
	// 保存文件
	var savefile = function (name, data, info, successCallback, errorCallback) {
		store.write(localStore, name, data, function () {
			localSign[name] = info.sign;
			successCallback();
		}, errorCallback);
	};

	// ============================== 立即执行
	return module;
})();

// 异步模块请求加载， AMD规范允许输出的模块兼容CommonJS规范， 类似： define(function (require, exports, module){ var someModule = require("someModule");
pi_modules.commonjs = { id: 'commonjs', exports: undefined, loaded: true };
pi_modules.commonjs.exports = (function () {
	var module = function mod_commonjs() { };
	var cmdClass = function commonjs_class() { };
	// ============================== 导入
	var butil = pi_modules.butil.exports;
	var depend = pi_modules.depend.exports;
	var load = pi_modules.load.exports;
	// ============================== 导出
	/**
	 * @description js源码调试标志
	 * @example
	 */
	// js源码调试标志
	module.debug = winit.debug;
	// 构建超时时间
	module.buildTimeout = 50;
	// 最大超时后的延迟时间
	module.buildDelay = 10;
	// 获得模块名
	module.modName = function (path) {
		var dot = butil.fileDot(path);
		return (dot >= 0) ? path.slice(0, dot) : path;
	};
	// 判断是否为内置模块
	module.isBase = function (modName) {
		return modName.indexOf("/") < 0;
	};
	/**
	 * @description 检查指定的模块是否加载， modName应该使用绝对路径， 返回true | false | undefined
	 * @example
	 */
	module.check = function (modName) {
		var mod = pi_modules[modName];
		if (mod)
			return mod.loaded;
		var info = depend.get(modName + ".js");
		return info ? false : undefined;
	};
	/**
	 * @description 获取已经加载的模块，modName为相对路径， 如果模块名为"./**"，表示相对当前模块路径的模块，为"/**"表示绝对路径的模块，为"**"表示系统内置模块。返回模块的exports
	 * @example
	 */
	module.relativeGet = function (modName, dir) {
		if (module.isBase(modName))
			return pi_modules[modName];
		return pi_modules[butil.relativePath(modName, dir)];
	};
	/**
	 * @description 计算模块及依赖，返回依赖的模块数组（包括已加载和未加载的模块）
	 * @example
	 */
	module.depend = function (modNames) {
		var i, name, info, len1, len2, j, arr, temp = {}, set = [];
		for (i = 0, len1 = modNames.length; i < len1; i++) {
			name = modNames[i];
			if ((!module.isBase(name)) && !temp[name])
				create(name, "", set, temp);
		}
		len1 = 0;
		len2 = set.length;
		// 依次加载数组中的依赖，直到数组长度不在增长
		while (len1 < len2) {
			for (i = len2 - 1; i >= len1; i--) {
				info = set[i].info;
				arr = info.depend && info.depend.js ? info.depend.js : [];
				for (j = arr.length - 1; j >= 0; j--) {
					name = arr[j];
					if (module.isBase(name))
						continue;
					// 转换成绝对路径
					name = butil.relativePath(name, info.path);
					if (!temp[name])
						create(name, info.path, set, temp);
				}
			}
			len1 = len2;
			len2 = set.length;
		}
		return set;
	};
	/**
	 * @description 异步模块加载， modNames应该使用绝对路径
	 * @example
	 */
	module.require = function (modNames, fileMap, successCallback, errorCallback, processCallback) {
		var i, len, mod, data, wait, down, modMap = {}, needs = [], modSet = module.depend(modNames);
		var dataJS = function (e) {
			var mod = pi_modules[module.modName(e.file)];
			(module.debug) ? debugDefine(mod, e.data) : releaseDefine(mod, e.data);
		}
		for (i = len = modSet.length - 1; i >= 0; i--) {
			mod = modSet[i];
			// 如果模块已加载，则跳过
			if (mod.loaded) {
				modSet[i] = modSet[len--];
				continue;
			}
			// 如果模块被热更新， 或者模块未加载，则放入模块系统中，根据是否有数据决定是否下载
			if (mod.loaded === "" || !pi_modules[mod.id]) {
				pi_modules[mod.id] = mod;
				data = fileMap[mod.info.path];
				if (data)
					dataJS({ file: mod.info.path, data: data });
				else
					needs.push(mod.info);
			}
			modMap[mod.id] = mod;
		}
		modSet.length = len + 1;
		if (len < 0)
			return loadOK(modNames, fileMap, successCallback);
		processCallback && processCallback({ type: "requireStart", total: modSet.length, download: needs.length });
		wait = { names: modNames, onsuccess: successCallback, onerror: errorCallback, onprocess: processCallback, set: modSet, map: modMap, count: modSet.length, fileMap: {} };
		waitList.push(wait);
		if (needs.length === 0)
			return;
		down = load.create(needs, function (r) {
			wait.fileMap = r;
		}, butil.curryFirst(loadError, needs), function (e) {
			processCallback && processCallback(e);
			e.file && dataJS(e);
		});
		load.start(down);
		return down;
	};
	/**
	 * @description 获取一个进度处理器
	 * @example
	 */
	module.getProcess = function () {
		var loadAmount = 0, //加载文件总数量
			load = 0, // 加载进度
			downAmount = 0, //下载文件总数量
			down = 0, // 下载进度
			defineAmount = 0, //定义模块总数量
			define = 0, // 定义模块进度
			buildAmount = 0, //构建模块总数量
			build = 0, // 构建模块进度
			value = 0, // 当前进度
			interval = 50, // 间隔时间
			showFunc = null, // 显示函数
			timerRef = 0, // 定时器引用
			startValue = 0, // 定时器开始时的进度
			process = {};
		var timer = function () {
			showFunc((value - startValue) / (1 - startValue));
			timerRef = 0;
		};
		var calc = function () {
			var total = loadAmount + downAmount + defineAmount + buildAmount;
			value = (load + down + define + build) / total;
			if (value < 1) {
				if (!timerRef)
					timerRef = setTimeout(timer, interval);
			} else {
				showFunc((value - startValue) / (1 - startValue));
				timerRef && clearTimeout(timerRef);
			}
		};
		process.show = function (show) {
			showFunc = show;
			startValue = value;
		};
		process.handler = function (e) {
			process[e.type](e);
		};
		process.loadStart = function (e) {
			if (e.loadAmount > loadAmount)
				loadAmount = e.loadAmount;
			if (e.downAmount > downAmount)
				downAmount = e.downAmount;
		};
		process.requireStart = function (e) {
			defineAmount = e.total;
			buildAmount = e.total;
		};
		process.loadFile = function (e) {
			if (loadAmount > e.total || load >= e.count)
				return;
			load = e.count;
			calc();
		};
		process.downFile = function (e) {
		};
		process.download = function (e) {
			down = downAmount * e.loaded / e.total;
			calc();
		};
		process.defineMod = function (e) {
			define = e.count;
			calc();
		}
		process.buildMod = function (e) {
			build = e.count;
			calc();
		}
		process.loadTpl = function (e) {
		};
		process.loadWidget = function (e) {
		};
		process.loadDirCompleted = function (e) {
		};
		return process;
	};
	// ============================== 本地
	// 加载等待列表
	var waitList = [];

	// 创建模块
	var create = function (name, parent, set, temp) {
		var mod = pi_modules[name], info, child;
		if (mod) {
			temp[name] = mod;
			set.push(mod); // 放置已加载和正在加载的模块
			return;
		}
		info = depend.get(name + ".js");
		if (!info) {
			debugger;
			throw new Error("mod not found, name:" + name + ", from:" + parent);
		}
		child = info.depend && info.depend.js ? info.depend.js : undefined;
		mod = { id: name, exports: {}, info: info, loaded: false, children: child, parent: parent, buildFunc: undefined };
		mod.__proto__ = cmdClass.prototype;
		temp[name] = mod;
		set.push(mod);
	};
	// 加载成功的回调
	var loadOK = function (names, fileMap, callback) {
		var i, arr = [], modules = pi_modules;
		arr.length = names.length;
		for (i = names.length - 1; i >= 0; i--)
			arr[i] = modules[names[i]].exports;
		callback(arr, fileMap);
	};

	// 加载一组模块失败
	var loadError = function (err, arr/*:Array<Info>*/) {
		var i;
		for (i = arr.length - 1; i >= 0; i--) {
			modError(err, arr[i].path);
		}
	};
	// 加载指定的模块失败，通知所有正在等待的加载器
	var modError = function (err, name/*:string*/) {
		var i, wait;
		for (i = waitList.length - 1; i >= 0; i--) {
			wait = waitList[i];
			if (!checkError(wait.set, name))
				continue;
			if (i < waitList.length - 1)
				waitList[i] = waitList[waitList.length - 1];
			waitList.length--;
			wait.onerror(err);
		}
	};
	// 检查待加载的模块数组是否包含指定的模块
	var checkError = function (arr, name/*:string*/) {
		var i;
		for (i = arr.length - 1; i >= 0; i--) {
			if (arr[i].info.path === name)
				return true;
		}
		return false;
	};

	// debug模式下，用node.src的方式加载模块
	var debugDefine = function (mod/*:Mod*/, data/*:ArrayBuffer*/) {
		var info = mod.info;
		loadJS({ mod: mod, src: depend.domains[0] + depend.rootPath() + info.path + "?" + info.sign });
	};
	// 用BlobURL的方式加载的模块，二进制转换字符串及编译，浏览器内核会异步处理
	// 创建函数的方式加载，二进制转换字符串及编译，主线程同步处理性能不好
	var releaseDefine = function (mod/*:Mod*/, data/*:ArrayBuffer*/) {
		var info = mod.info;
		var blob = new Blob([data], { type: "text/javascript" });
		loadJS({ mod: mod, src: URL.createObjectURL(blob), revokeURL: URL.revokeObjectURL });
	};
	// 用node.src的方式加载模块
	var loadJS = function (cfg) {
		var mod = cfg.mod;
		// 如果模块已经就绪或已经有创建函数，则跳过
		if (mod.loaded || mod.buildFunc)
			return;
		var head = document.head;
		var n = document.createElement('script');
		n.charset = 'utf8';
		n.onerror = function (e) {
			n.onload = n.onerror = undefined;
			head.removeChild(n);
			cfg.revokeURL && cfg.revokeURL(cfg.src);
			modError({
				nativeError: e,
				error: "ERR_NORMAL",
				reason: "load js fail: " + mod.info.path
			}, mod.id);
		};
		n.onload = function () {
			n.onload = n.onerror = undefined;
			head.removeChild(n);
			cfg.revokeURL && cfg.revokeURL(cfg.src);
		};
		n.async = true;
		n.crossorigin = true;
		n.src = cfg.src;
		head.appendChild(n);
	};
	// 模块定义成功，通知所有正在等待的加载器
	var modDefine = function (mod/*:Mod*/) {
		var i, wait;
		for (i = waitList.length - 1; i >= 0; i--) {
			wait = waitList[i];
			if (!wait.map[mod.id])
				continue;
			wait.count--;
			wait.onprocess && wait.onprocess({ type: "defineMod", total: wait.set.length, count: wait.set.length - wait.count });
			if (wait.count > 0)
				continue;
			if (i < waitList.length - 1)
				waitList[i] = waitList[waitList.length - 1];
			waitList.length--;
			wait.count = wait.set.length;
			setTimeout(butil.curryLast(build, wait), 1);
		}
	};
	// 构建模块
	var build = function (wait) {
		var i, mod, oldlen, mods = wait.set, len = mods.length, end = Date.now() + module.buildTimeout;
		// 尽量按照依赖的次序构建模块
		do {
			oldlen = len;
			for (i = len - 1; i >= 0; i--) {
				mod = mods[i];
				if (!checkDepend(mod))
					continue;
				buildMod(mod);
				if (i < len - 1)
					mods[i] = mods[len - 1];
				len--;
				if (len > 0 && Date.now() > end) {
					mods.length = len;
					wait.onprocess && wait.onprocess({ type: "buildMod", total: wait.count, count: wait.count - mods.length });
					return setTimeout(butil.curryLast(build, wait), module.buildDelay);
				}
			}
		} while (len < oldlen);
		mods.length = len;
		// 强行构建模块
		// if (len > 0 && module.debug)
		// 	console.log("cycle depend modules,", mods);
		buildForce(wait);
	};
	// 强行构建模块
	var buildForce = function (wait) {
		var i, mods = wait.set, end = Date.now() + module.buildTimeout;
		for (i = mods.length - 1; i >= 0; i--) {
			buildMod(mods[i]);
			if (i > 0 && Date.now() > end) {
				mods.length = i;
				wait.onprocess && wait.onprocess({ type: "buildMod", total: wait.count, count: wait.count - mods.length });
				return setTimeout(butil.curryLast(buildForce, wait), module.buildDelay);
			}
		}
		wait.onprocess && wait.onprocess({ type: "buildMod", total: wait.count, count: wait.count });
		loadOK(wait.names, wait.fileMap, wait.onsuccess);
	}
	// 构建模块
	var buildMod = function (mod) {
		var func = mod.buildFunc;
		if (func) {
			mod.buildFunc = undefined;
			// 构建模块
			func(butil.curryFirst(relativeBuild, mod.id), mod.exports, mod);
			mod.loaded = true;
		} else if (!mod.loaded)
			throw new Error("invalid amd mod: " + mod.id);
	};
	// 检查文件的依赖是否都已经就绪
	var checkDepend = function (srcMod) {
		var j, name, mod, arr = srcMod.children || [];
		for (j = arr.length - 1; j >= 0; j--) {
			mod = module.relativeGet(arr[j], srcMod.id);
			if ((!mod) || !mod.loaded)
				return false;
		}
		return true;
	};
	// 相对构建
	var relativeBuild = function (modName, dir) {
		var mod = module.relativeGet(modName, dir);
		if (!mod)
			throw new Error("invalid require: " + modName + ", from: " + dir);
		var func = mod.buildFunc;
		if (func) {
			mod.buildFunc = undefined;
			func(butil.curryFirst(relativeBuild, mod.id), mod.exports, mod);
			mod.loaded = true;
		}
		return mod.exports;
	};

	// ============================== 立即执行
	// 定义全局的模块定义函数
	self._$define = function (name, func) {
		var mod = pi_modules[name];
		if(!mod)
			throw new Error("invalid define: " + name);
		mod.buildFunc = func;
		modDefine(mod);
	};
	return module;
})();

// window全局错误捕捉，记录次数后发送到服务器上
self.onerror = winit.debug ? undefined : (function () {
	var map = {}, count = function (e) {
		var v = map[e] || 0, c = 1;
		map[e] = ++v;
		while (true) { // 仅在1,2,4,8...上发送错误信息
			if (c === v) return v;
			if (c > v) return 0;
			c += c;
		}
	};
	var sid = Date.now().toString(36) + "X" + Math.floor(Math.random() * 0xffffffff).toString(36);
	return function (msg, uri, line, column, error) {
		var e, c;
		if (msg.stack) {
			e = msg;
		} else if (error && error.stack) {
			e = error;
		} else
			return;
		e = JSON.stringify(e);
		c = count(e);
		if (c) {
			(new Image()).src = "errlog?s=" + sid + "&e=" + encodeURIComponent(e) + "&c=" + c + "&r=" + Math.random();
		}
	};
})();
winit.init();
