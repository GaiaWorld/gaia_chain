/**
 * forge committee
 */

import { getTipHeight } from '../chain/blockchain';
import { CommitteeConfig, Forger, ForgerCommittee, MiningConfig } from '../chain/schema.s';
import { BonBuffer } from '../pi/util/bon';
import { buf2Hex, sha256 } from '../util/crypto';
import { persistBucket } from '../util/db';

export const startMining = (miningCfg: MiningConfig, committeeCfg: CommitteeConfig): void => {
    if (getTipHeight() % committeeCfg.maxGroupNumber === miningCfg.groupNumber) {
        const forgersBkt = persistBucket(ForgerCommittee._$info.name);
        const forgers = forgersBkt.get<number, [ForgerCommittee]>(miningCfg.groupNumber)[0].forgers.sort();
    }

    return;
};

export const calcWeightAtHeight = (forger: Forger, height: number): number => {
    return;
};

export const deriveNextGroupNumber = (address: string, blockRandom: Uint8Array, height: number): number => {
    const bon = new BonBuffer();
    bon.writeUtf8(address)
        .writeBin(blockRandom)
        .writeInt(height);

    const hash = buf2Hex(sha256(bon.getBuffer()));

    return parseInt(hash.slice(hash.length - 2), 16);
};

export const deriveInitWeight = (address: string, blockRandom: Uint8Array, height: number, stake: number): number => {
    const bon = new BonBuffer();
    bon.writeUtf8(address)
        .writeBin(blockRandom)
        .writeInt(height);

    const data = buf2Hex(sha256(bon.getBuffer()));

    return Math.floor((Math.log(stake) / Math.log(10) - 2.0) * (parseInt(data.slice(data.length - 4), 16) % 4 + 1));
};
