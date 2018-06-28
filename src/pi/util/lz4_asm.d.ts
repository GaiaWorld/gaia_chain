
/**
 * 封装LZ4ASM模块
 */
export module LZ4ASM {

    const HEAPU8: Uint8Array;

    function cwrap(functionName: string, returnType: string, paramsType: string[]): Function;

    function _malloc(size: number): number;

    function _free(ptr: number): void;
}