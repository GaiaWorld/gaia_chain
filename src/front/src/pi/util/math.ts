/**
 * 数学库
 */

// PCG 置换线性同余发生器
// 	随机数发生器有两部分。我们可以看到它们有两个功能：
// 	状态转换功能
// 		管理当您要求随机数时，RNG的内部状态如何变化
// 	输出功能
// 		将RNG的内部状态转换为实际的随机数

// 	PCG系列使用线性同余发生器作为状态转换功能
// 	PCG使用一种称为置换函数的新技术来产生比RNG内部状态更为随机的输出。不仅具有出色的统计性能，并难以预测（从而更安全）

// 	pcgXX_boundedrand_r
// 	生成小于约束的均匀分布的XX位无符号整数（即x，其中0 <= x < bound）。
// 	如果 pcgXX_random_r(rng)% bound，但是如果bound不是2的幂，这样做会引入不均匀性。pcgXX_boundedrand_r的代码通过删除一部分RNG的输出来避免不均匀

// 	http://www.pcg-random.org/

// 	#define PCG_DEFAULT_MULTIPLIER_8   141U
// 	#define PCG_DEFAULT_MULTIPLIER_16  12829U
// 	#define PCG_DEFAULT_MULTIPLIER_32  747796405U
// 	#define PCG_DEFAULT_MULTIPLIER_64  6364136223846793005ULL

// 	#include <inttypes.h>

// 	#if __SIZEOF_INT128__
// 		typedef __uint128_t pcg128_t;
// 		#define PCG_128BIT_CONSTANT(high,low) \
// 				((((pcg128_t)high) << 64) + low)
// 		#define PCG_HAS_128BIT_OPS 1
// 	#endif

// 	#if PCG_HAS_128BIT_OPS
// 	#define PCG_DEFAULT_MULTIPLIER_128 \
// 			PCG_128BIT_CONSTANT(2549297995355413924ULL,4865540595714422341ULL)
// 	#endif

// 	// Representations setseq variants

// 	struct pcg_state_setseq_8 {
// 		uint8_t state;
// 		uint8_t inc;
// 	};

// 	struct pcg_state_setseq_16 {
// 		uint16_t state;
// 		uint16_t inc;
// 	};

// 	struct pcg_state_setseq_32 {
// 		uint32_t state;
// 		uint32_t inc;
// 	};

// 	struct pcg_state_setseq_64 {
// 		uint64_t state;
// 		uint64_t inc;
// 	};

// 	#if PCG_HAS_128BIT_OPS
// 	struct pcg_state_setseq_128 {
// 		pcg128_t state;
// 		pcg128_t inc;
// 	};
// 	#endif

// 	inline void pcg_setseq_8_step_r(struct pcg_state_setseq_8* rng)
// 	{
// 		rng->state = rng->state * PCG_DEFAULT_MULTIPLIER_8 + rng->inc;
// 	}

// 	inline void pcg_setseq_16_step_r(struct pcg_state_setseq_16* rng)
// 	{
// 		rng->state = rng->state * PCG_DEFAULT_MULTIPLIER_16 + rng->inc;
// 	}

// 	inline void pcg_setseq_32_step_r(struct pcg_state_setseq_32* rng)
// 	{
// 		rng->state = rng->state * PCG_DEFAULT_MULTIPLIER_32 + rng->inc;
// 	}

// 	inline void pcg_setseq_64_step_r(struct pcg_state_setseq_64* rng)
// 	{
// 		rng->state = rng->state * PCG_DEFAULT_MULTIPLIER_64 + rng->inc;
// 	}

// 	#if PCG_HAS_128BIT_OPS
// 	inline void pcg_setseq_128_step_r(struct pcg_state_setseq_128* rng)
// 	{
// 		rng->state = rng->state * PCG_DEFAULT_MULTIPLIER_128 + rng->inc;
// 	}
// 	#endif

// 	inline void pcg_setseq_8_srandom_r(struct pcg_state_setseq_8* rng,
// 									uint8_t initstate, uint8_t initseq)
// 	{
// 		rng->state = 0U;
// 		rng->inc = (initseq << 1u) | 1u;
// 		pcg_setseq_8_step_r(rng);
// 		rng->state += initstate;
// 		pcg_setseq_8_step_r(rng);
// 	}

// 	inline void pcg_setseq_16_srandom_r(struct pcg_state_setseq_16* rng,
// 										uint16_t initstate, uint16_t initseq)
// 	{
// 		rng->state = 0U;
// 		rng->inc = (initseq << 1u) | 1u;
// 		pcg_setseq_16_step_r(rng);
// 		rng->state += initstate;
// 		pcg_setseq_16_step_r(rng);
// 	}

// 	inline void pcg_setseq_32_srandom_r(struct pcg_state_setseq_32* rng,
// 										uint32_t initstate, uint32_t initseq)
// 	{
// 		rng->state = 0U;
// 		rng->inc = (initseq << 1u) | 1u;
// 		pcg_setseq_32_step_r(rng);
// 		rng->state += initstate;
// 		pcg_setseq_32_step_r(rng);
// 	}

// 	inline void pcg_setseq_64_srandom_r(struct pcg_state_setseq_64* rng,
// 										uint64_t initstate, uint64_t initseq)
// 	{
// 		rng->state = 0U;
// 		rng->inc = (initseq << 1u) | 1u;
// 		pcg_setseq_64_step_r(rng);
// 		rng->state += initstate;
// 		pcg_setseq_64_step_r(rng);
// 	}

// 	#if PCG_HAS_128BIT_OPS
// 	inline void pcg_oneseq_128_srandom_r(struct pcg_state_128* rng,
// 										pcg128_t initstate)
// 	{
// 		rng->state = 0U;
// 		pcg_oneseq_128_step_r(rng);
// 		rng->state += initstate;
// 		pcg_oneseq_128_step_r(rng);
// 	}
// 	#endif

// 	// Rotate helper functions.

// 	inline uint8_t pcg_rotr_8(uint8_t value, unsigned int rot)
// 	{
// 	// Unfortunately, clang is kinda pathetic when  it comes to properly
// 	// recognizing idiomatic rotate code, so for clang we actually provide
// 	// assembler directives (enabled with PCG_USE_INLINE_ASM).  Boo, hiss.
// 	#if PCG_USE_INLINE_ASM && __clang__ && (__x86_64__  || __i386__)
// 		asm ("rorb   %%cl, %0" : "=r" (value) : "0" (value), "c" (rot));
// 		return value;
// 	#else
// 		return (value >> rot) | (value << ((- rot) & 7));
// 	#endif
// 	}

// 	inline uint16_t pcg_rotr_16(uint16_t value, unsigned int rot)
// 	{
// 	#if PCG_USE_INLINE_ASM && __clang__ && (__x86_64__  || __i386__)
// 		asm ("rorw   %%cl, %0" : "=r" (value) : "0" (value), "c" (rot));
// 		return value;
// 	#else
// 		return (value >> rot) | (value << ((- rot) & 15));
// 	#endif
// 	}

// 	inline uint32_t pcg_rotr_32(uint32_t value, unsigned int rot)
// 	{
// 	#if PCG_USE_INLINE_ASM && __clang__ && (__x86_64__  || __i386__)
// 		asm ("rorl   %%cl, %0" : "=r" (value) : "0" (value), "c" (rot));
// 		return value;
// 	#else
// 		return (value >> rot) | (value << ((- rot) & 31));
// 	#endif
// 	}

// 	inline uint64_t pcg_rotr_64(uint64_t value, unsigned int rot)
// 	{
// 	#if 0 && PCG_USE_INLINE_ASM && __clang__ && __x86_64__
// 		// For whatever reason, clang actually *does* generator rotq by
// 		// itself, so we don't need this code.
// 		asm ("rorq   %%cl, %0" : "=r" (value) : "0" (value), "c" (rot));
// 		return value;
// 	#else
// 		return (value >> rot) | (value << ((- rot) & 63));
// 	#endif
// 	}

// 	#if PCG_HAS_128BIT_OPS
// 	inline pcg128_t pcg_rotr_128(pcg128_t value, unsigned int rot)
// 	{
// 		return (value >> rot) | (value << ((- rot) & 127));
// 	}
// 	#endif

// 	// XSH RR

// 	inline uint8_t pcg_output_xsh_rr_16_8(uint16_t state)
// 	{
// 		return pcg_rotr_8(((state >> 5u) ^ state) >> 5u, state >> 13u);
// 	}

// 	inline uint16_t pcg_output_xsh_rr_32_16(uint32_t state)
// 	{
// 		return pcg_rotr_16(((state >> 10u) ^ state) >> 12u, state >> 28u);
// 	}

// 	inline uint32_t pcg_output_xsh_rr_64_32(uint64_t state)
// 	{
// 		return pcg_rotr_32(((state >> 18u) ^ state) >> 27u, state >> 59u);
// 	}

// 	#if PCG_HAS_128BIT_OPS
// 	inline uint64_t pcg_output_xsh_rr_128_64(pcg128_t state)
// 	{
// 		return pcg_rotr_64(((state >> 29u) ^ state) >> 58u, state >> 122u);
// 	}
// 	#endif

// 	// Generation functions for XSH RR

// 	inline uint8_t pcg_setseq_16_xsh_rr_8_random_r(struct pcg_state_setseq_16* rng)
// 	{
// 		uint16_t oldstate = rng->state;
// 		pcg_setseq_16_step_r(rng);
// 		return pcg_output_xsh_rr_16_8(oldstate);
// 	}

// 	inline uint8_t
// 	pcg_setseq_16_xsh_rr_8_boundedrand_r(struct pcg_state_setseq_16* rng,
// 										uint8_t bound)
// 	{
// 		uint8_t threshold = ((uint8_t)(-bound)) % bound;
// 		for (;;) {
// 			uint8_t r = pcg_setseq_16_xsh_rr_8_random_r(rng);
// 			if (r >= threshold)
// 				return r % bound;
// 		}
// 	}

// 	inline uint16_t
// 	pcg_setseq_32_xsh_rr_16_random_r(struct pcg_state_setseq_32* rng)
// 	{
// 		uint32_t oldstate = rng->state;
// 		pcg_setseq_32_step_r(rng);
// 		return pcg_output_xsh_rr_32_16(oldstate);
// 	}

// 	inline uint16_t
// 	pcg_setseq_32_xsh_rr_16_boundedrand_r(struct pcg_state_setseq_32* rng,
// 										uint16_t bound)
// 	{
// 		uint16_t threshold = ((uint16_t)(-bound)) % bound;
// 		for (;;) {
// 			uint16_t r = pcg_setseq_32_xsh_rr_16_random_r(rng);
// 			if (r >= threshold)
// 				return r % bound;
// 		}
// 	}

// 	inline uint32_t
// 	pcg_setseq_64_xsh_rr_32_random_r(struct pcg_state_setseq_64* rng)
// 	{
// 		uint64_t oldstate = rng->state;
// 		pcg_setseq_64_step_r(rng);
// 		return pcg_output_xsh_rr_64_32(oldstate);
// 	}

// 	inline uint32_t
// 	pcg_setseq_64_xsh_rr_32_boundedrand_r(struct pcg_state_setseq_64* rng,
// 										uint32_t bound)
// 	{
// 		uint32_t threshold = -bound % bound;
// 		for (;;) {
// 			uint32_t r = pcg_setseq_64_xsh_rr_32_random_r(rng);
// 			if (r >= threshold)
// 				return r % bound;
// 		}
// 	}

// 	#if PCG_HAS_128BIT_OPS
// 	inline uint64_t
// 	pcg_setseq_128_xsh_rr_64_random_r(struct pcg_state_setseq_128* rng)
// 	{
// 		pcg_setseq_128_step_r(rng);
// 		return pcg_output_xsh_rr_128_64(rng->state);
// 	}
// 	#endif

// 	#if PCG_HAS_128BIT_OPS
// 	inline uint64_t
// 	pcg_setseq_128_xsh_rr_64_boundedrand_r(struct pcg_state_setseq_128* rng,
// 										uint64_t bound)
// 	{
// 		uint64_t threshold = -bound % bound;
// 		for (;;) {
// 			uint64_t r = pcg_setseq_128_xsh_rr_64_random_r(rng);
// 			if (r >= threshold)
// 				return r % bound;
// 		}
// 	}
// 	#endif

// 	// RXS M XS

// 	inline uint8_t pcg_output_rxs_m_xs_8_8(uint8_t state)
// 	{
// 		uint8_t word = ((state >> ((state >> 6u) + 2u)) ^ state) * 217u;
// 		return (word >> 6u) ^ word;
// 	}

// 	inline uint16_t pcg_output_rxs_m_xs_16_16(uint16_t state)
// 	{
// 		uint16_t word = ((state >> ((state >> 13u) + 3u)) ^ state) * 62169u;
// 		return (word >> 11u) ^ word;
// 	}

// 	inline uint32_t pcg_output_rxs_m_xs_32_32(uint32_t state)
// 	{
// 		uint32_t word = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;
// 		return (word >> 22u) ^ word;
// 	}

// 	inline uint64_t pcg_output_rxs_m_xs_64_64(uint64_t state)
// 	{
// 		uint64_t word = ((state >> ((state >> 59u) + 5u)) ^ state)
// 						* 12605985483714917081ull;
// 		return (word >> 43u) ^ word;
// 	}

// 	#if PCG_HAS_128BIT_OPS
// 	inline pcg128_t pcg_output_rxs_m_xs_128_128(pcg128_t state)
// 	{
// 		pcg128_t word = ((state >> ((state >> 122u) + 6u)) ^ state)
// 						* (PCG_128BIT_CONSTANT(17766728186571221404ULL,
// 												12605985483714917081ULL));
// 		// 327738287884841127335028083622016905945
// 		return (word >> 86u) ^ word;
// 	}
// 	#endif

// 	// Generation functions for RXS M XS (no MCG versions because they don't make sense when you want to use the entire state)

// 	inline uint8_t pcg_setseq_8_rxs_m_xs_8_random_r(struct pcg_state_setseq_8* rng)
// 	{
// 		uint8_t oldstate = rng->state;
// 		pcg_setseq_8_step_r(rng);
// 		return pcg_output_rxs_m_xs_8_8(oldstate);
// 	}

// 	inline uint8_t
// 	pcg_setseq_8_rxs_m_xs_8_boundedrand_r(struct pcg_state_setseq_8* rng,
// 										uint8_t bound)
// 	{
// 		uint8_t threshold = ((uint8_t)(-bound)) % bound;
// 		for (;;) {
// 			uint8_t r = pcg_setseq_8_rxs_m_xs_8_random_r(rng);
// 			if (r >= threshold)
// 				return r % bound;
// 		}
// 	}

// 	inline uint16_t
// 	pcg_setseq_16_rxs_m_xs_16_random_r(struct pcg_state_setseq_16* rng)
// 	{
// 		uint16_t oldstate = rng->state;
// 		pcg_setseq_16_step_r(rng);
// 		return pcg_output_rxs_m_xs_16_16(oldstate);
// 	}

// 	inline uint16_t
// 	pcg_setseq_16_rxs_m_xs_16_boundedrand_r(struct pcg_state_setseq_16* rng,
// 											uint16_t bound)
// 	{
// 		uint16_t threshold = ((uint16_t)(-bound)) % bound;
// 		for (;;) {
// 			uint16_t r = pcg_setseq_16_rxs_m_xs_16_random_r(rng);
// 			if (r >= threshold)
// 				return r % bound;
// 		}
// 	}

// 	inline uint32_t
// 	pcg_setseq_32_rxs_m_xs_32_random_r(struct pcg_state_setseq_32* rng)
// 	{
// 		uint32_t oldstate = rng->state;
// 		pcg_setseq_32_step_r(rng);
// 		return pcg_output_rxs_m_xs_32_32(oldstate);
// 	}

// 	inline uint32_t
// 	pcg_setseq_32_rxs_m_xs_32_boundedrand_r(struct pcg_state_setseq_32* rng,
// 											uint32_t bound)
// 	{
// 		uint32_t threshold = -bound % bound;
// 		for (;;) {
// 			uint32_t r = pcg_setseq_32_rxs_m_xs_32_random_r(rng);
// 			if (r >= threshold)
// 				return r % bound;
// 		}
// 	}

// 	inline uint64_t
// 	pcg_setseq_64_rxs_m_xs_64_random_r(struct pcg_state_setseq_64* rng)
// 	{
// 		uint64_t oldstate = rng->state;
// 		pcg_setseq_64_step_r(rng);
// 		return pcg_output_rxs_m_xs_64_64(oldstate);
// 	}

// 	inline uint64_t
// 	pcg_setseq_64_rxs_m_xs_64_boundedrand_r(struct pcg_state_setseq_64* rng,
// 											uint64_t bound)
// 	{
// 		uint64_t threshold = -bound % bound;
// 		for (;;) {
// 			uint64_t r = pcg_setseq_64_rxs_m_xs_64_random_r(rng);
// 			if (r >= threshold)
// 				return r % bound;
// 		}
// 	}

// 	#if PCG_HAS_128BIT_OPS
// 	inline pcg128_t
// 	pcg_setseq_128_rxs_m_xs_128_random_r(struct pcg_state_setseq_128* rng)
// 	{
// 		pcg_setseq_128_step_r(rng);
// 		return pcg_output_rxs_m_xs_128_128(rng->state);
// 	}
// 	#endif

// 	#if PCG_HAS_128BIT_OPS
// 	inline pcg128_t
// 	pcg_setseq_128_rxs_m_xs_128_boundedrand_r(struct pcg_state_setseq_128* rng,
// 											pcg128_t bound)
// 	{
// 		pcg128_t threshold = -bound % bound;
// 		for (;;) {
// 			pcg128_t r = pcg_setseq_128_rxs_m_xs_128_random_r(rng);
// 			if (r >= threshold)
// 				return r % bound;
// 		}
// 	}
// 	#endif

// 	// Generating doubles
// 	double d = ldexp(pcg32_random_r(&rng), -32);
// 	// ldexp = (x, exp) => x * return Math.pow(2, exp);
// 	// Math.pow(2, -32) = 2.3283064365386963e-10

// 	// 32 位下实现 64 位的乘法运算
// 	http://www.mouseos.com/assembly/example/mul64.html
// ============================== 导入

// ============================== 导出

/**
 * 浮点误差
 */
export const EPISION = 0.001;

/**
 * 处理显示上的浮点误差， 选择 12 是一个经验的选择，一般选12就能解决掉大部分0001和0009问题
 * 遇到浮点数误差问题时可以直接使用 https://github.com/dt-fe/number-precision
 * 一个用于任意精度的十进制算术的小型，快速的JavaScript的库。 http://mikemcl.github.io/big.js
 */
export const strip = (num: number, precision = 12) => {
	return +parseFloat(num.toPrecision(precision));
};

/**
 * 返回被视为 32 位带符号整数的两个数字的积。和C的运算一致，会自动溢出32以上的值
 */
export const imul = (() => {
	if (Math.imul) {
		return Math.imul;
	}

	return (a: number, b: number) =>
		(((a & 0xffff) * b) + ((((a >>> 16) * b) & 0xffff) << 16)) & 0xffffffff;
})();

/**
 * 取小数点后n位数，其后的数四舍五入
 * @param   nfloat 数字
 * @param   n 前n位
 * @return  数字
 */
export const round = (nfloat: number, n: number) => {
	const i = Math.pow(10, n);

	return Math.round(nfloat * i) / i;
};
/**
 * 取小数点前n位数，其后的数四舍五入
 * @param   nint 数字
 * @param   n 前n位
 * @return  数字
 */
export const roundInt = (nint: number, n: number) => {
	const i = Math.pow(10, n);

	return Math.round(nint / i) * i;
};

/**
 * @description 获得一个指定范围（左闭右开区间）的随机浮点数
 * @example
 *
 */
export const randomFloat = (v1: number, v2: number): number => {
	return v1 + Math.random() * (v2 - v1);
};
/**
 * @description 获得一个指定范围（闭区间）的随机整数
 * @example
 *
 */
export const randomInt = (v1: number, v2: number): number => {
	return v1 + Math.floor(Math.random() * (v2 - v1 + 1.0));
};

/**
 * @description 获得一个安全的随机32位整数
 * @example
 *
 */
export const cryptoRandomInt = (): number => {
	if (crypto) {
		crypto.getRandomValues(cryptoCache);

		return cryptoCache[0];
	} else {
		return Math.floor(Math.random() * 0xffffffff);
	}
};

/**
 * @description 获得一组安全的随机32位整数
 * @example
 *
 */
export const cryptoRandomInts = (array: Uint32Array): ArrayBufferView => {
	if (crypto) {
		return crypto.getRandomValues(array);
	}
	for (let i = 0, len = array.length; i < len; i++) {
		array[i] = Math.floor(Math.random() * 0xffffffff);
	}

	return array;
};
/**
 * @description 数组乱序
 * @example
 *
 */
export const shuffle = (array: any[]) => {
	for (let i = array.length - 1; i >= 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		const temp = array[i];
		array[i] = array[j];
		array[j] = temp;
	}
};

/**
 * @description 获得两个向量夹角的方向，正数为顺时针，负数为逆时针
 * @example
 */
export const getDirection = (vx1: number, vy1: number, vx2: number, vy2: number): number => {
	return vx1 * vy2 - vx2 * vy1;
};
/**
 * @description 获得两个向量夹角的度数
 * @example
 */
export const getAngle = (vx1: number, vy1: number, vx2: number, vy2: number) => {
	const len1 = Math.sqrt(vx1 * vx1 + vy1 * vy1);
	const len2 = Math.sqrt(vx2 * vx2 + vy2 * vy2);
	const mr = len1 * len2;
	if (mr === 0) {
		return 0;
	}
	const dot = vx1 * vx2 + vy1 * vy2;
	let r = dot / mr;
	if (r > 1) {
		r = 1;
	} else if (r < -1) {
		r = -1;
	}

	return Math.acos(r) * 180 / Math.PI;
};

/**
 * @description  线性插值 interpolation
 * @example
 */
export const linear = (t: number, p0: number, p1: number): number => {
	return (p1 - p0) * t + p0;
};
/**
 * @description  阶乘
 * @example
 */
export const factorial = (n: number): number => {
	const len = facCache.length;
	if (n < len) {
		return facCache[n];
	}
	let s = facCache[len - 1];
	for (let i = len; i <= n; i++) {
		s *= i;
		facCache.push(s);
	}
	
	return s;
};
/**
 * @description  伯恩斯坦 多项式
 * @example
 */
export const bernstein = (i: number, n: number): number => {
	return factorial(n) / factorial(i) / factorial(n - i);
};
/**
 * @description Catmull-Rom 样条插值 interpolation
 * @example
 */
export const catmullRom = (t: number, p0: number, p1: number, p2: number, p3: number): number => {
	const v0 = (p2 - p0) * 0.5;
	const v1 = (p3 - p1) * 0.5;
	const t2 = t * t;
	const t3 = t * t2;

	// tslint:disable:binary-expression-operand-order
	return (2 * p1 - 2 * p2 + v0 + v1) * t3 + (- 3 * p1 + 3 * p2 - 2 * v0 - v1) * t2 + v0 * t + p1;
};

/**
 * @description 截取num在[min, max]之间
 * @note 假设：min必须小于等于max
 */
export const clamp = (num: number, min: number, max: number) => {
	return Math.max(min, Math.min(max, num));
};

/**
 * @description 3次平滑插值
 */
export const smoothstep = (x: number, min: number, max: number) => {
	if (x <= min) return 0;
	if (x >= max) return 1;
	x = (x - min) / (max - min);

	return x * x * (3 - 2 * x);
};

/**
 * @description 5次平滑插值
 */
export const smootherstep = (x: number, min: number, max: number) => {
	if (x <= min) return 0;
	if (x >= max) return 1;
	x = (x - min) / (max - min);

	return x * x * x * (x * (x * 6 - 15) + 10);
};

/**
 * @description 角度转弧度
 */
export const degreeToRadian = (degrees: number) => {
	const DEG2RAD = Math.PI / 180;

	return degrees * DEG2RAD;
};

/**
 * @description 弧度转角度
 */
export const radianToDegree = (radians: number) => {
	const RAD2DEG = 180 / Math.PI;

	return radians * RAD2DEG;
};

/**
 * @description 是否为二的冥
 */
export const isPowerOfTwo = (value: number) => {
	return (value & (value - 1)) === 0 && value !== 0;
};

/**
 * @description 最近的2的冥的整数
 */
export const nearestPowerOfTwo = (value: number) => {
	return Math.pow(2, Math.round(Math.log(value) / Math.LN2));
};

/**
 * @description 下一个2的冥的数
 */
export const nextPowerOfTwo = (value: number) => {
	--value;
	value |= value >> 1;
	value |= value >> 2;
	value |= value >> 4;
	value |= value >> 8;
	value |= value >> 16;
	
	return ++value;
};

/**
 * @description 浮点数相等
 */
export const equal = (num1: number, num2: number) => {
	return Math.abs(num1 - num2) < EPISION;
};

// ============================== 本地
// 阶乘的计算缓冲
const facCache = [0, 1, 2];

// 单个安全的随机32位整数的计算缓冲
const cryptoCache = new Uint32Array(1);
