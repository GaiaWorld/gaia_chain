'use strict';

(function(){
	var root = null, hinit = self.winit;
	var es = new EventSource('/event/request');
	es.onmessage = function(e){
		console.log(e.data); // 打印服务器推送的信息
		if(e.data === "ok")
			return;
		if(root)
			return;
		root = createPopup("文件改变，是否需要热更？", function(){
			startHot();
			root.remove();
			root = null;
		}, function(){
			root.remove();
			root = null;
		});
	}

	var createPopup = function(text, sure, cancel){
		var root = document.createElement("div");
		root.style = "width:100%;height:100%;position:absolute;z-index:10";

		var divBox = document.createElement("div");
		divBox.style = "margin:auto;position:absolute;left:100px; top:200px;width:300px;height:100px;background-color:#ffffff";
		root.appendChild(divBox);

		var textNode = document.createTextNode(text);
		divBox.appendChild(textNode);

		var sureNode =  document.createElement("div");
		sureNode.style = "width:50px;height:30px;position:absolute;left:60px;background-color:#777777; bottom:15px;";
		sureNode.addEventListener("click",sure);
		divBox.appendChild(sureNode);

		textNode = document.createTextNode("确定");
		sureNode.appendChild(textNode);

		var cancelNode =  document.createElement("div");
		cancelNode.style = "width:50px;height:30px;position:absolute;right:60px;background-color:#777777;bottom:15px;";
		cancelNode.addEventListener("click",cancel);
		divBox.appendChild(cancelNode);

		textNode = document.createTextNode("取消");
		cancelNode.appendChild(textNode);

		document.body.appendChild(root); 

		return root;
	}

	var newFileMap, deps, oldFileMap, changeList,depend, util, widget, resMgr;

	var hot = function(){
		console.log("热更 检查！");
		var i, mod, cache, res, filePath, file, fileName, suffix, resTemp;
		for(i = 0; i < deps.length; i++){
			filePath = deps[i].path;
			file = oldFileMap[filePath];
			fileName = filePath.split(".")[0];
			suffix = filePath.split(".")[1];
			resTemp = {};

			if(!file){
				changeList.push(filePath);
			}else if(file.sign != newFileMap[filePath].sign){
				changeList.push(filePath);
				if(suffix === "js"){
					mod = pi_modules[fileName];
					if(mod){
						mod.loaded = "";//状态改为强制重新加载
						mod.buildFunc = undefined;
						mod.info = newFileMap[filePath];
					}
				}else if(suffix === "cfg" || suffix === "tpl" || suffix === "wcss"){
					cache = widget.getCache(filePath);
					if(cache)
						cache.value = null;
				}else if(suffix === "widget"){
					widget.deleteCache(filePath);
				}else{
					res = resMgr.getResMap();
					res.forEach(function(v, k){
						if(k.endsWith(":" + filePath) >= 0)
							res.delete(k);
					});
				}
			}
		}

		if(!changeList || changeList.length === 0){
			console.log("无需更新！");
			return;
		}
		console.log("更新：", changeList);
		util.loadDir(changeList, pi_modules.commonjs.exports.flags, {}, undefined, function(fileMap) {
			console.log("热更 成功！");
		}, function(result){
			console.log("加载基础模块失败, "+result.error + ":" + result.reason);
		}, function(){});
	}

	var startHot = function(){
		if(self.winit)
			return;

		depend = pi_modules.depend.exports;
		oldFileMap = depend.getFileMap();
		util = pi_modules["widget/util"].exports;
		widget = pi_modules["widget/widget"].exports;
		resMgr = pi_modules["util/res_mgr"].exports;
		changeList = [];

		self.winit = {init:function(){
			depend.init(self.winit.deps, hinit.path);
			newFileMap = depend.getFileMap();
			deps = self.winit.deps;
			self.winit = undefined;

			hot();
		}};
		console.log("热更 依赖下载！");
		hinit.loadJS(hinit.domains, hinit.path+".depend?"+Math.random(), "utf8", hinit.initFail, "load list error");
	}
})();

