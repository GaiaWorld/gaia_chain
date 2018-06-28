/*
 * 声音播放
 * 注意，时间单位是秒, 可以使用小数表示毫秒
 */

// ============================== 导入
import { depend, load } from '../lang/mod';
import { logLevel, warn } from '../util/log';
import { arrDrop } from '../util/util';
import { loadError, loadOK, register, Res, ResTab } from './res_mgr';

// ============================== 导出
export let level = logLevel;

/**
 * @description 声音的资源类型
 * @example
 */
export const RES_TYPE_SOUND = 'sound';

/**
 * @description 声音状态类型
 */
export enum StateType {
	INIT = 0, // 初始化
	READY, // 就绪
	PLAY, // 播放
	PAUSE // 暂停
}

/**
 * @description 声音
 * @example
 */
class Sound {
	public res: Res = null;
	public src: AudioBufferSourceNode = null;
	public volume: GainNode = null;
	public playTime: number = 0;
	public pauseTime: number = 0;
	public onended: Function = null;

	/**
	 * @description 暂停
	 * @example
	 */
	public getState(): StateType {
		if (!this.res) {
			return StateType.INIT;
		}
		if (this.playTime) {
			return StateType.PLAY;
		}
		if (this.pauseTime) {
			return StateType.PAUSE;
		}

		return StateType.READY;
	}
	/**
	 * @description 获取声音时长
	 * @example
	 */
	public getDuration(): number {
		if (!this.res) {
			return -1;
		}

		return this.res.link.duration;
	}
	/**
	 * @description 播放声音
	 * @example
	 */
	public play(volume?: number, delay?: number, offset?: number): void {
		if ((!this.res) && this.playTime) {
			return;
		}
		const s = this.src = context.createBufferSource();
		s.buffer = this.res.link;
		this.volume = context.createGain();
		this.volume.gain.value = volume || 1;
		s.connect(this.volume);
		this.volume.connect(context.destination);
		delay = delay ? context.currentTime + delay : 0;
		offset = offset || this.pauseTime;
		s.start(delay, offset);
		this.playTime = context.currentTime + delay - offset;
		this.pauseTime = 0;
		const func = this.onended;
		if (!func) {
			return;
		}
		s.onended = (ev) => {
			this.playTime = 0;
			if (this.onended === func) {
				func(this, ev);
			}
		};
	}
	/**
	 * @description 暂停
	 * @example
	 */
	public pause(): void {
		if ((!this.src) && !this.playTime) {
			return;
		}
		this.src.stop();
		this.pauseTime = context.currentTime - this.playTime;
		if (this.pauseTime < 0) {
			this.pauseTime = 0;
		}
		this.playTime = 0;
	}
	/**
	 * @description 停止
	 * @example
	 */
	public stop(): void {
		if ((!this.src) && !this.playTime) {
			return;
		}
		this.src.stop();
		this.playTime = this.pauseTime = 0;
	}
	/**
	 * @description 销毁
	 * @example
	 */
	public destroy(): void {
		if (!this.res) {
			return;
		}
		if (this.volume) {
			this.volume.disconnect();
		}
		this.res = null;
	}

}

/**
 * @description 声音管理器
 * @example
 */
export class Mgr extends ResTab {
	// 当前播放的声音数组
	public arr: Cfg[] = [];
	// 音量， 0-1之间
	public volume: number = 1;

	/**
	 * @description 播放指定的声音
	 * @arg src 声音的文件名
	 * @example
	 */
	public play(src: string, delay?: number, repeat?: number, repeatDelay?: number): void {
		if (!context) {
			return;
		}
		const name = `${RES_TYPE_SOUND}:${src}`;
		const cfg = new Cfg();
		cfg.mgr = this;
		cfg.startTime = context.currentTime;
		cfg.delay = delay || 0;
		cfg.repeat = repeat || 0;
		cfg.repeatDelay = repeatDelay || 0;
		this.arr.push(cfg);

		return this.load(name, RES_TYPE_SOUND, src, undefined, (res) => {
			if (!cfg.mgr) {
				return this.delete(res);
			}
			play(cfg, res);
		}, (error) => {
			throw new Error(`play failed, src = ${src}, error = ${error.reason}`);
		});
	}
	/**
	 * @description 设置音量
	 * @example
	 */
	public getVolume(): number {
		return this.volume;
	}
	/**
	 * @description 设置音量
	 * @example
	 */
	public setVolume(v: number): void {
		if (v < 0) {
			v = 0;
		} else if (v > 1) {
			v = 1;
		}
		this.volume = v;
		for (const c of this.arr) {
			c.sound.volume.gain.value = v;
		}
	}
	/**
	 * @description 暂停或取消暂停所有的声音
	 * @example
	 */
	public pause(b: boolean): void {
		if (b) {
			for (const c of this.arr) {
				c.sound.pause();
			}
		} else {
			for (const c of this.arr) {
				c.sound.play(c.delay);
			}
		}
	}
	/**
	 * @description 停止所有的声音
	 * @example
	 */
	public stop(): void {
		for (const c of this.arr) {
			c.mgr = null;
			if (!c.sound) {
				continue;
			}
			this.delete(c.sound.res);
			c.sound.destroy();
		}
		this.arr.length = 0;
	}
	/**
	 * @description 释放资源表
	 * @example
	 */
	public release(): boolean {
		if (!super.release()) {
			return false;
		}
		this.stop();

		return true;
	}
}

/**
 * @description 获得当前的音频环境
 * @example
 */
export const getContext = () => {
	return context;
};

// ============================== 本地
// 声音配置
class Cfg {
	public mgr: Mgr = null; // null 表示被销毁
	public sound: Sound = null;
	public delay: number = 0;
	public repeat: number = 0;
	public repeatDelay: number = 0;
	public startTime: number = 0;
}
// 播放声音
const play = (cfg: Cfg, res: Res) => {
	const s = new Sound();
	s.res = res;
	cfg.sound = s;
	s.onended = () => {
		const mgr = cfg.mgr;
		if (!mgr) {
			return;
		}
		if (cfg.repeat < 1) {
			cfg.mgr = null;
			s.destroy();
			mgr.delete(res);

			return arrDrop(mgr.arr, cfg);
		}
		cfg.repeat--;
		s.play(mgr.volume, cfg.repeatDelay);
	};
	const d = cfg.delay + cfg.startTime - context.currentTime;
	s.play(cfg.mgr.volume, d > 0 ? d : 0);
};
// 解码音频
// tslint:disable:no-reserved-keywords
const decode = (ab: ArrayBuffer, name: string, type: string, file: string, construct: Function) => {
	if (ab.byteLength === 0) {
		return loadError(name, {
			error: 'SOUND_ZERO_SIZE',
			reason: `decode fail: ${file}`
		});
	}
	context.decodeAudioData(ab, (buffer) => {
		loadOK(name, type, file, construct, buffer);
	}, (e) => {
		loadError(name, {
			error: 'SOUND_DECODE_ERROR',
			reason: `decode fail: ${e}`
		});
	});
};
/**
 * @description 创建声音资源
 * @example
 */
const createSoundRes = (name: string, type: string, file: string, fileMap: Map<string, ArrayBuffer>, construct: Function): void => {
	if (!context) {
		return loadError(name, {
			error: 'not support web audio api',
			reason: `createSoundRes fail: ${file}`
		});
	}
	if (fileMap) {
		const data = fileMap[file];
		if (data) {
			return decode(data, name, type, file, construct);
		}
	}
	const info = depend.get(file);
	if (!info) {
		return loadError(name, {
			error: 'FILE_NOT_FOUND',
			reason: `createSoundRes fail: ${file}`
		});
	}
	const down = load.create([info], (r) => {
		return decode(r[file], name, type, file, construct);
	}, (err) => {
		loadError(name, err);
	});
	load.start(down);
};

// ============================== 立即执行
// 创建音频环境
const context = (() => {
	const c = ((<any>window).AudioContext || (<any>window).webkitAudioContext);
	if (c) {
		return new c();
	}
	console.log('not support web audio api');
})();

register(RES_TYPE_SOUND, (name: string, type: string, args: string, fileMap: Map<string, ArrayBuffer>) => {
	createSoundRes(name, type, args, fileMap, Res);
});
