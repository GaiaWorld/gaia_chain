/**
 * 
 */
/* tslint:disable:no-reserved-keywords only-arrow-functions no-constant-condition no-var-requires 
no-require-imports no-implicit-dependencies*/
declare function require(modName: string);
/*
 * 内置模块导出
 */

// ============================== 导入

// ============================== 导出
export type Mod = any;

// butil模块
export const butil = ((typeof self !== 'undefined') && (<any>self)._$define) ? require('butil') : {};
// depend模块
export const depend = ((typeof self !== 'undefined') && (<any>self)._$define) ? require('depend') : {};
// store模块
export const store = ((typeof self !== 'undefined') && (<any>self)._$define) ? require('store') : {};
// ajax模块
export const ajax = ((typeof self !== 'undefined') && (<any>self)._$define) ? require('ajax') : {};
// load模块
export const load = ((typeof self !== 'undefined') && (<any>self)._$define) ? require('load') : {};
// commonjs模块
export const commonjs = ((typeof self !== 'undefined') && (<any>self)._$define) ? require('commonjs') : {};

// ============================== 本地

// ============================== 立即执行
