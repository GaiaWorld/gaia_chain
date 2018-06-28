/** 
 * 
 */
// 判断相等函数
export type Equal<T> = (el1: T, el2: T) => boolean;
// 单参数函数
export interface Func<T> {
	(arg: T);
}
// 比较函数，返回值大于0 表示el1 大于 el2，返回值小于0 表示el1 小于 el2，返回值等于0 表示el1 等于 el2，
export type Compare<T> = (el1: T, el2: T) => number;
export type Json = any;
export type char = string;
export type i8 = number;
export type i16 = number;
export type i32 = number;
export type i64 = number;
export type u8 = number;
export type u16 = number;
export type u32 = number;
export type u64 = number;
export type f32 = number;
export type f64 = number;
export type isize = number;
export type usize = number;

export type baseType = undefined | null | boolean | number | string;

/*
export interface Json {
    [x: string]: string|number|boolean|Date|Json|JsonArray;
}
export interface JsonArray extends Array<string|number|boolean|Date|Json|JsonArray> {}
*/
