/**
 * 返回字符的读取器， 流式读取
 */

// ============================== 导入

// ============================== 导出
/**
 * @description 返回字符的读取器
 */
export type CharReader = () => string;

/**
 * @description 创建
 */
export const createByStr = (s: string, i?: number) : CharReader => {
	i = i || 0;
	
	return () : string => {
		return s[i++];
	};
};

// ============================== 本地

// ============================== 立即执行
