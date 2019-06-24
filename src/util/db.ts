/**
 * wrappers for db operations (CRUD)
 */

import { Mgr, Tr } from '../pi/db/mgr';
import { Env } from '../pi/lang/env';
import { TabMeta } from '../pi/struct/sinfo';
import { Logger } from './logger';

declare var env: Env;

export type Handler = (tr: Tr) => any;
type RWHandler<V> = (value: V) => V;
const logger = new Logger('DB');

type DbType = 'memory' | 'file';

const createBucket = (dbType: DbType, bucketName: string, bucketMetaInfo: TabMeta): Bucket => {
    const dbMgr = env.dbMgr;
    try {
        dbMgr.write((tr: Tr) => {
            tr.alter(dbType, bucketName, bucketMetaInfo);
        });

    } catch (e) {
        console.log('create bucket failed with error: ', e);
        throw new Error('Create bucket failed');
    }

    return new Bucket(dbType, bucketName);
};

export const createPersistBucket = (bucketName: string, bucketMetaInfo: TabMeta): Bucket => {
    return createBucket('file', bucketName, bucketMetaInfo);
};

export const createMemoryBucket = (bucketName: string, bucketMetaInfo: TabMeta): Bucket => {
    return createBucket('memory', bucketName, bucketMetaInfo);
};

export const persistBucket = (bktName: string): Bucket => {
    return new Bucket('file', bktName);
};

export const memoryBucket = (bktName: string): Bucket => {
    return new Bucket('memory', bktName);
};

class Bucket {

    private bucketName: string;
    private dbType: DbType;
    private dbManager: Mgr;

    constructor(dbType: DbType, bucketName: string) {
        const dbMgr = env.dbMgr;
        this.bucketName = bucketName;
        this.dbType = dbType;
        this.dbManager = dbMgr;
    }

    // tslint:disable-next-line:no-reserved-keywords
    public get<K, V>(key: K, timeout: number = 1000): V {
        let value: any;
        const items = [];
        const dbMgr = this.dbManager;

        try {

            if (Array.isArray(key)) {
                for (const k of key) {
                    items.push({ ware: this.dbType, tab: this.bucketName, key: k });
                }
            } else {
                items.push({ ware: this.dbType, tab: this.bucketName, key: key });
            }
            dbMgr.read((tr: Tr) => {
                value = tr.query(items, timeout, false);
            });

        } catch (e) {
            logger.error('read key from bucket failed with error: ', e);
        }

        if (Array.isArray(value)) {
            value = value.map(v => v.value);
        }

        return value;
    }

    public put<K, V>(key: K, value: V, timeout: number = 1000): boolean {
        const items = [];
        const dbMgr = this.dbManager;
        try {
            if (Array.isArray(key) && Array.isArray(value) && key.length === value.length) {
                for (let i = 0; i < key.length; i++) {
                    items.push({ ware: this.dbType, tab: this.bucketName, key: key[i], value: value[i] });
                }
            } else {
                items.push({ ware: this.dbType, tab: this.bucketName, key: key, value: value });
            }
            dbMgr.write((tr: Tr) => {                
                tr.modify(items, timeout, false);
            });

            return true;
        } catch (e) {
            logger.error('failed to write key with error: ', e);
        }

        return false;
    }
    /**
     * 这是一个完整的事务不会被打断
     * @param key key
     * @param rwHandler RWHandler
     * @param timeout RWHandler
     */
    public readAndWrite<K>(key: K, rwHandler:RWHandler<any>, timeout: number = 1000):boolean {
        const itemsRead = [];
        const itemsWrite = [];
        const dbMgr = this.dbManager;
        try {
            if (Array.isArray(key)) {
                for (const k of key) {
                    itemsRead.push({ ware: this.dbType, tab: this.bucketName, key: k });
                }
            } else {
                itemsRead.push({ ware: this.dbType, tab: this.bucketName, key: key });
            }
            logger.debug(`before write`);
            dbMgr.write((tr: Tr) => {
                logger.debug(`before query`);
                let value = tr.query(itemsRead, timeout, false);
                if (Array.isArray(value)) {
                    value = value.map(v => v.value);
                }
                value = rwHandler(value);
                if (Array.isArray(key) && Array.isArray(value) && key.length === value.length) {
                    for (let i = 0; i < key.length; i++) {
                        itemsWrite.push({ ware: this.dbType, tab: this.bucketName, key: key[i], value: value[i] });
                    }
                } else {
                    itemsWrite.push({ ware: this.dbType, tab: this.bucketName, key: key, value: value });
                }
                logger.debug(`before modify`);
                tr.modify(itemsWrite, timeout, false);
                logger.debug(`after modify`);
            });

            return true;
        } catch (e) {
            logger.error('failed to readAndWrite key with error: ', e);
        }

        return false;
    }

    public update<K, V>(key: K, value: V, timeout: number = 1000): boolean {
        if (this.get<K, V>(key) === undefined) {
            return false;
        }

        return this.put<K, V>(key, value, timeout);
    }

    // tslint:disable-next-line:no-reserved-keywords
    public delete<K>(key: K, timeout: number = 1000): boolean {
        const dbMgr = this.dbManager;
        if (this.get<K, any>(key) === undefined) {
            return false;
        }
        try {
            dbMgr.write((tr: Tr) => {
                tr.modify([{ ware: this.dbType, tab: this.bucketName, key: key }], timeout, false);
            });

            return true;
        } catch (e) {
            logger.error('failed to delete key with error: ', e);
        }

        return false;
    }

    public iter<K>(key: K, desc: boolean = false, filter: string = ''): any {
        let iter;
        const dbMgr = this.dbManager;
        try {
            dbMgr.read((tr: Tr) => {
                iter = tr.iter_raw(this.dbType, this.bucketName, key, desc, filter);
            });
        } catch (e) {
            logger.error('failed to iter db with error: ', e);
        }

        return iter;
    }
}