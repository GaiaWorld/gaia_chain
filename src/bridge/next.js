(self)._$modWait = [];
var _$define = function (name, func) {
	var mod = { id: name, exports: {},loaded: true, children: undefined, buildFunc: func };
	pi_modules[mod.id] = mod;
	mod.buildFunc = func;
	(self)._$modWait.push(mod.id);
};

self._$build = function () {
	//console.log(self._$modWait.length);
	for(var i = 0; i < self._$modWait.length; i++){
		var mod = pi_modules[self._$modWait[i]];
		if(mod && mod.buildFunc){
			pi_modules.commonjs.exports.buildMod(mod);
		}
	}
	self._$modWait = undefined;
};