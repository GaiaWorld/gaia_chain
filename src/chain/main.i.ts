/**
 * main function
 */
import { Env } from '../pi/lang/env';
import { Item } from '../pi_pt/db';
import { Tr } from '../pi_pt/db/mgr';
import { Forger } from './schema.s';

declare var env: Env;

const test = (): void => {
    const f = new Forger();
    f.initWeigth = 0;
    f.lastHeight = 0;
    f.lastWeight = 0;
    f.stake = 0;
    f.groupNumber = 0;

    const items: Item[] = [{
        ware: 'file',
        tab: Forger._$info.name,
        key: 'hello',
        value: f
    }];
    env.dbMgr.write((tr: Tr) => {
        tr.modify(items, 1000, false);
    });

    env.dbMgr.read((tr: Tr) => {
        const values = tr.query(items, 1000, false);
        console.log('values: ', values);
    });
};

const start = (): void => {
    test();
    console.log('starting gaia ......');
};

start();
