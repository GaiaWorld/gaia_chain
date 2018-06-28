/** 
 * 数据同步,可以计算数据的差异，并根据差异和原有数据构建出新的数据
 * 算法原理参考http://blog.csdn.net/russell_tao/article/details/7240661
 */
import { BinBuffer } from './bin';
import * as Hash from './hash';
import { str_md5 } from './md5';
import { isNumber } from './util';

export class RSync {
	// tslint:disable-next-line:typedef
	public size;
	constructor(blockSize?: number) {
		this.size = blockSize || 64;
	}

	// 计算校验和
	public checksum(data: Uint8Array): Checksum[] {
		const length = data.length;
		const incr = this.size;
		let start = 0;
		let end = incr > length ? length : incr;
		let blockIndex = 0;
		const results: Checksum[] = [];
		let result;

		while (start < length) {
			const chunk = data.slice(start, end);
			const weak = Hash.weak32(chunk).sum;
			const strong = str_md5(chunk);

			result = { weak: weak, strong: strong, index: blockIndex };
			results.push(result);
			start += incr;
			end = (end + incr) > length ? length : end + incr;
			blockIndex++;
		}

		return results;
	}

	// 计算差异
	public diff(newData: Uint8Array, oldChecksums: Checksum[]): Diff[] {
		const results = [];
		const length = newData.length;
		let start = 0;
		let end = this.size > length ? length : this.size;
		let lastMatchedEnd = 0;
		let prevRollingWeak = null;
		const hashtable = createHashtable(oldChecksums);

		let weak;
		let weak16;
		let match;
		for (; end <= length;) {
			weak = Hash.weak32(newData, prevRollingWeak, start, end);
			weak16 = Hash.weak16(weak.sum);

			const checkSums = hashtable.get(weak16);
			if (checkSums) {
				for (let i = 0; i < checkSums.length; i++) {
					if (checkSums[i].weak === weak.sum) {
						const mightMatch = checkSums[i];
						const chunk = newData.slice(start, end);
						const strong = str_md5(chunk);

						if (mightMatch.strong === strong) {
							match = mightMatch;
							break;
						}
					}
				}
			}

			if (match) {
				let d;
				if (start > lastMatchedEnd) {
					d = newData.slice(lastMatchedEnd, start);
				}
				results.push({ index: match.index, data: d });
				start = end;
				lastMatchedEnd = end;
				end += this.size;
				prevRollingWeak = null;
			} else {
				start++;
				end++;
				prevRollingWeak = weak;
			}
		}

		if (lastMatchedEnd < length) {
			results.push({
				data: newData.slice(lastMatchedEnd, length)
			});
		}

		return results;
	}

	// 同步数据
	public sync(oldData: Uint8Array, diffs: Diff[]) {
		if (oldData === undefined) {
			throw new Error('\'must do checksum() first\'');
		}

		const len = diffs.length;
		let synced = new Uint8Array(0);
		for (let i = 0; i < len; i++) {
			const chunk = diffs[i];

			if (chunk.data === undefined) { // use slice of original file
				synced = concatU8(synced, rawslice(oldData, chunk.index, this.size));
			} else {
				synced = concatU8(synced, chunk.data);

				if (chunk.index !== undefined) {
					synced = concatU8(synced, rawslice(oldData, chunk.index, this.size));
				}
			}
		}

		return synced;
	}
}

// 序列化差异数据
export const encodeDiffs = (diffs: Diff[], bb: BinBuffer) => {
	let diff;
	for (let i = 0; i < diffs.length; i++) {
		diff = diffs[i];
		if (diff.data) {
			bb.writeBin(diff.data);
		}
		if (diff.index !== undefined) {
			bb.writeInt(diff.index);
		}
	}
};

// 反序列化差异数据
export const decodeDiffs = (bb: BinBuffer): Diff[] => {
	const arr: Diff[] = [];
	while (bb.head < bb.tail) {
		const r = bb.read();
		if (typeof r === 'number') {
			arr.push({ index: r });
		} else if (ArrayBuffer.isView(r)) {
			arr.push({ data: <Uint8Array>r });
		}
	}

	return arr;
};

interface Diff {
	index?: number;
	data?: Uint8Array;
}

interface Checksum {
	index: number;
	weak: number;
	strong: string;
}

// 以校验和的弱校验值为key，创建映射表
const createHashtable = (checksums: Checksum[]): Map<number, Checksum[]> => {
	const map = new Map<number, Checksum[]>();
	for (let i = 0; i < checksums.length; i++) {
		const checksum = checksums[i];
		const weak16 = Hash.weak16(checksum.weak);

		const cs = map.get(weak16);
		if (cs) {
			cs.push(checksum);
		} else {
			map.set(weak16, [checksum]);
		}
	}

	return map;
};

// 合并Uint8Array
const concatU8 = (data1: Uint8Array, data2: Uint8Array) => {
	const len1 = data1.length;
	const len2 = data2.length;
	const u8 = new Uint8Array(len1 + len2);
	u8.set(data1, 0);
	u8.set(data2, len1);

	return u8;
};

const rawslice = (raw: Uint8Array, index: number, chunkSize: number) => {
	const start = index * chunkSize;
	const end = start + chunkSize > raw.length
		? raw.length
		: start + chunkSize;

	return raw.slice(start, end);
};
