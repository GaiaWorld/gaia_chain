/** 
 * test helpers
 */

import { CommitteeConfig, Forger, ForgerCommittee } from '../chain/schema.s';
import { getRand, pubKeyToAddress, sha256 } from './crypto';
import { persistBucket } from './db';

export const buildForgerCommittee = (): void => {
    const bkt = persistBucket(ForgerCommittee._$info.name);
    if (bkt.get<string, [ForgerCommittee]>('FC')[0]) {
        return;
    }

    const bkt2 = persistBucket(CommitteeConfig._$info.name);
    const cc = bkt2.get<string, [CommitteeConfig]>('CC')[0];

    const forgerPerGroup = 2;
    const fc = new ForgerCommittee();
    fc.groups = [];
    fc.waitsForAdd = new Map();
    fc.waitsForRemove = new Map();
    
    for (let i = 0; i < cc.maxGroupNumber; i++) {
        fc.groups.push([]);

        for (let j = 0; j < forgerPerGroup; j++) {
            const fg = new Forger();
            fg.address = pubKeyToAddress(sha256(j.toString() + i.toString()));
            fg.pk = j.toString();
            fg.pubKey = sha256(j.toString() + i.toString());
            fg.groupNumber = i;
            fg.initWeigth = getRand(1)[0] * getRand(1)[0];
            fg.lastHeight = 0;
            fg.lastWeight = 0;
            fg.stake = getRand(1)[0] * getRand(1)[0] + 10000;

            fc.groups[i].push(fg);
        }
    }

    bkt.put('FC', fc);
};