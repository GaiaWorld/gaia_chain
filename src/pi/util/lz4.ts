/**
 * 编译asm.js命令
 * 
 * emcc --memory-init-file 0 --llvm-lto 1 --closure 1 -s 
 * EXPORTED_FUNCTIONS="['_LZ4_compress_default', '_LZ4_decompress_safe', '_LZ4_compressBound']"
 *  -O3 lz4.c lz4frame.c lz4hc.c xxhash.c -o lz4_asm.js
 * 
 * --memory-init-file 0，禁止生成mem后缀文件
 * -O3 性能最高
 * -Oz 体积最小
 * -s EXPORTED_FUNCTIONS，列出所有需要导出的函数，必须比C函数多了个前缀_
 * --llvm-lto 1：不安全选项！可以使llvm link-time得到优化，有些情况下有用。但是他们有一些已知的
 * 问题，所以代码必须被充分地测试
 * –-closure 1: 不安全选项！可以减小胶水代码的体积，减少启动时间。但是如果你没有做
 * 正确的closure complier，可能有问题。
 * -s ALLOW_MEMORY_GROWTH=1命令的编译允许根据应用程序的需求改变内存总量。
 * 这对于预先不知道需要多少内存的应用程序很有用，但是它禁用了一些优化。
 */

import { LZ4ASM } from './lz4_asm';

/**
 * 压缩
 * @return Uint8Array，压缩后的数据，用完后需要调用free释放内存
 */
export const compress = (src: Uint8Array) => {

	const compressBound = LZ4_compressBound(src.length);

	const compressHeap = newU8Heap(compressBound);

	const compressSize = LZ4_compress_default(src, compressHeap.byteOffset, src.length, compressBound);
	if (compressSize <= 0) {
		// 压缩出错
		LZ4ASM._free(compressHeap.byteOffset);

		return;
	}

	return new Uint8Array(compressHeap.buffer, compressHeap.byteOffset, compressSize);
};

/**
 * 解压
 * @param decompressSize 解压后的大小
 * @return Uint8Array，压缩后的数据，用完后需要调用free释放内存
 */
export const decompress = (src: Uint8Array, decompressSize: number) => {
	
	const decompressHeap = newU8Heap(decompressSize);

	const realSize = LZ4_decompress_safe(src, decompressHeap.byteOffset, src.length, decompressSize);
	if (realSize <= 0) {
		LZ4ASM._free(decompressHeap.byteOffset);

		return;
	}

	return new Uint8Array(decompressHeap.buffer, decompressHeap.byteOffset, realSize);
};

/**
 * 释放内存
 */
export const free = (heap: Uint8Array) => {
	LZ4ASM._free(heap.byteOffset);
};

/*! LZ4_compress_default() :
	Compresses 'srcSize' bytes from buffer 'src'
	into already allocated 'dst' buffer of size 'dstCapacity'.
	Compression is guaranteed to succeed if 'dstCapacity' >= LZ4_compressBound(srcSize).
	It also runs faster, so it's a recommended setting.
	If the function cannot compress 'src' into a limited 'dst' budget,
	compression stops *immediately*, and the function result is zero.
	As a consequence, 'dst' content is not valid.
	This function never writes outside 'dst' buffer, nor read outside 'source' buffer.
		srcSize : supported max value is LZ4_MAX_INPUT_VALUE
		dstCapacity : full or partial size of buffer 'dst' (which must be already allocated)
		return  : the number of bytes written into buffer 'dst' (necessarily <= dstCapacity)
				  or 0 if compression fails 
*/
// LZ4LIB_API int LZ4_compress_default(const char* src, char* dst, int srcSize, int dstCapacity);
// tslint:disable-next-line:variable-name
const LZ4_compress_default = LZ4ASM.cwrap('LZ4_compress_default', 'number', ['array', 'number', 'number', 'number']);

/*! LZ4_decompress_safe() :
	compressedSize : is the exact complete size of the compressed block.
	dstCapacity : is the size of destination buffer, which must be already allocated.
	return : the number of bytes decompressed into destination buffer (necessarily <= dstCapacity)
			 If destination buffer is not large enough, decoding will stop and output an error code (negative value).
			 If the source stream is detected malformed, the function will stop decoding and return a negative result.
			 This function is protected against buffer overflow exploits, including malicious data packets.
			 It never writes outside output buffer, nor reads outside input buffer.
*/
// LZ4LIB_API int LZ4_decompress_safe (const char* src, char* dst, int compressedSize, int dstCapacity);
// tslint:disable-next-line:variable-name
const LZ4_decompress_safe = LZ4ASM.cwrap('LZ4_decompress_safe', 'number', ['array', 'number', 'number', 'number']);

/*!
LZ4_compressBound() :
	Provides the maximum size that LZ4 compression may output in a "worst case" scenario (input data not compressible)
	This function is primarily useful for memory allocation purposes (destination buffer size).
	Macro LZ4_COMPRESSBOUND() is also provided for compilation-time evaluation (stack memory allocation for example).
	Note that LZ4_compress_default() compress faster when dest buffer size is >= LZ4_compressBound(srcSize)
		inputSize  : max supported value is LZ4_MAX_INPUT_SIZE
		return : maximum output size in a "worst case" scenario
			  or 0, if input size is too large ( > LZ4_MAX_INPUT_SIZE)
*/
// LZ4LIB_API int LZ4_compressBound(int inputSize);
// tslint:disable-next-line:variable-name
const LZ4_compressBound = LZ4ASM.cwrap('LZ4_compressBound', 'number', ['number']);

/**
 * 创建属于asmjs的堆对应的U8Array，用完后需要显示调用free释放内存
 * @param size 分配大小
 */
const newU8Heap = (size: number) => {
	const ptr = LZ4ASM._malloc(size);
	const r = new Uint8Array(LZ4ASM.HEAPU8.buffer, ptr, size);
	
	return r;
};