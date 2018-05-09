/**
 * 工具库接口
 */

/**
 * ------------- 数据结构 -------------
 */

// 160位hash
export class H160 {
    impl: Uint8Array; // 20字节长度的u8数组

    // 取最后一个字节
    getLastByte() {
        return 0;
    }
}

// 256位hash
export class H256 {
    impl: Uint8Array; // 32字节长度的u8数组
}

// TODO 实现
export class Int64 {
    lower: number;   // 低32位
    upper: number;   // 高32位

    constructor(num: number) {
        let base = Math.pow(2, 32);
        this.upper = Math.round(num / base);
        this.lower = num % base;
    }

    neg() {
        return this;
    }

    abs() {
        return this;
    }

    add(other: Int64) {
        return this;
    }

    sub(other: Int64) {
        return this;
    }
    
    mul(other: Int64) {
        return this;
    }

    div(other: Int64) {
        return this;
    }
}

/**
 * ------------- 加密 -------------
 */

// keccak256
export const keccak = (data: Uint8Array) => {
    let r: H256 = new H256();
    return r;
}

/**
 * 根据种子，生成start到end的随机数
 */
export const vrand = (seed: number, start: number, end: number) => {
    
}
