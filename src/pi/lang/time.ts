/** 
 * 
 */
const getNow = () => {
	if ((typeof self) !== 'undefined') {
		const p = self.performance;
		if (p) {
			const dNow = Date.now();
			const pNow = p.now();

			return () => dNow + p.now() - pNow;
		}
	}

	return Date.now;
};

// 注意此处是把getNow的执行结果返回给now
export const now = getNow();

// ============================== 本地

// ============================== 立即执行
