/**
 * 
 */
import { baseType } from '../lang/type';
import { Struct } from '../struct/struct_mgr';
export class Cfg {
	public map: Map<string, Map<baseType, Struct>> = new Map<string, Map<baseType, Struct>>();
	// tslint:disable:no-reserved-keywords
	public set(key: string, value: Map<baseType, Struct>) {
		this.map.set(key, value);
		const annotate = (<any>value.get(0).constructor)._$info.annotate;
		if (annotate && annotate.primary) {
			const primarys = annotate.primary.split('-');
			for (let i = 0; i < primarys.length; i++) {
				const primaryMap = new Map<baseType, Struct>();
				value.forEach((v, k) => {
					primaryMap.set(v[primarys[i]], v);
				});
				this.map.set(`${key}#${primarys[i]}`, primaryMap);
			}
		}
	}

	public get(key: string): Map<baseType, Struct> {
		return this.map.get(key);
	}
}

export const cfgMgr = new Cfg();
