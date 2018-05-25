"use strict";
// 依赖表加载成功后的回调函数
winit.initNext = function () {
  var win = winit.win;
  win._babelPolyfill = 1;
  win.pi_modules = 1;
  win.Map = 1;
  
  pi_modules.depend.exports.init(winit.deps, winit.path);
  
  var flags = winit.flags;
  winit = undefined; //一定要立即释放，保证不会重复执行
  
  pi_modules.commonjs.exports.require(["pi/widget/util"], {}, function (mods, fm) {
    var util = mods[0];

    var sourceList = [
      "pi/compile/",
      "pi/db/",
      "pi/lang/",
      "pi/net/",
      "pi/struct/",
      "pi/util/",
      "pi/widget/",
      "pi/worker/",
      "blockchain/util/",
      "blockchain/chain/",
      "blockchain/verification/",
      "blockchain/cpos/",
      "blockchain/sync/",
      "test/framework/",
      "test/blockchain/util/",
      "test/blockchain/chain/",
      "test/blockchain/verification/",
      "test/blockchain/cpos/",
      "test/blockchain/sync/",
      "test/blockchain/main/",
    ];
    
    util.loadDir(sourceList, flags, fm, undefined, function (fileMap) {
      
      var main = pi_modules.commonjs.exports.relativeGet("test/blockchain/main/main").exports;
      main.runTest();
    }, function (r) {
      alert("加载目录失败, " + r.error + ":" + r.reason);
    }, undefined);
  }, function (result) {
    alert("加载基础模块失败, " + result.error + ":" + result.reason);
  }, undefined);
};

// 初始化开始
(winit.init = function () {
  if (!winit) return;
  winit.deps &&
    self.pi_modules &&
    self.pi_modules.butil &&
    self._babelPolyfill &&
    winit.initNext();
  !self._babelPolyfill && setTimeout(winit.init, 100);
})();