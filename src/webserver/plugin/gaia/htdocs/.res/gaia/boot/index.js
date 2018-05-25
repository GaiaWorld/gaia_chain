'use strict';

winit.path="/gaia/";//"/pi/0.1/";

winit.loadJS(winit.domains, winit.path+'boot/init.js?'+Math.random(), "utf8", winit.initFail, "load init error");

winit.loadJS(winit.domains, winit.path+'boot/next.js?'+Math.random(), "utf8", winit.initFail, "load next error");

winit.loadJS(winit.domains, winit.path+'.depend?'+Math.random(), "utf8", winit.initFail, "load list error");

winit.loadJS(winit.domains, winit.path+"pi/polyfill/babel_polyfill.js", "utf8", winit.initFail, "load babel_polyfill error");

//winit.debug=false; 