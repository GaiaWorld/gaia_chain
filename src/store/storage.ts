import { Mgr, Tr } from '../pi_pt/db/mgr';
import { H256 } from '../pi_pt/rust/hash_value';

export interface Storage {
    // get a spcific key with value
    get(key: H256): Uint8Array;
    // store a key-value pair
    put(key: H256, val: Uint8Array): void;
    // delete a key-value pair
    delete(key: H256): void;
    // check if key exist
    has(key: H256): boolean;

    // flush to disk
    flush(): void;
}

export class ChainStore implements Storage {
    // TODO: use LRU cache
    public cache: Map<H256, Uint8Array>;
    // database manager
    private mgr: Mgr;

    public constructor(dbMgr: Mgr) {
        this.cache = new Map<H256, Uint8Array>();
        this.mgr = dbMgr;

        return;
    }

    // tslint:disable-next-line:no-reserved-keywords
    public get(key: H256): Uint8Array {

        return;
    }

    public put(key: H256, val: Uint8Array): void {
        return;
    }

    // tslint:disable-next-line:no-reserved-keywords
    public delete(key: H256): void {
        return;
    }

    public has(key: H256): boolean {
        return false;
    }

    public flush(): void {
        return;
    }
}