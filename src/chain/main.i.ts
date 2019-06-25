/**
 * main function
 */
import { persistBucket } from '../util/db';
import { setTimer } from '../util/task';
import { Forger } from './schema.s';

const test = (): void => {
    const f = new Forger();
    f.initWeigth = 0;
    f.lastHeight = 0;
    f.lastWeight = 0;
    f.stake = 0;
    f.groupNumber = 0;

    const bkt = persistBucket(Forger._$info.name);
    f.pk = 'hello1';
    bkt.put('hello1', f);
    f.pk = 'hello2';
    bkt.put('hello2', f);
    f.pk = 'hello3';
    bkt.put('hello3', f);

    console.log(bkt.get('hello1'));
    console.log(bkt.get('hello2'));
    console.log(bkt.get('hello3'));

};

const start = (): void => {
    test();
    console.log('starting gaia ......');

    setTimer(() => {
        console.log('xxxxxxxxxxxxxxxx');
    }, null, 5000);
};

start();
