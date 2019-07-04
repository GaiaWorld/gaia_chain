/**
 * forge committee
 */

import { generateBlock } from '../chain/block';
import { getTipHeight } from '../chain/blockchain';
import { Body, ChainHead, CommitteeConfig, Forger, ForgerCommittee, Header, Height2Hash, MiningConfig } from '../chain/schema.s';
import { Inv } from '../net/server/rpc.s';
import { notifyNewBlock } from '../net/server/subscribe';
import { BonBuffer } from '../pi/util/bon';
import { buf2Hex, sha256 } from '../util/crypto';
import { persistBucket } from '../util/db';

export const startMining = (miningCfg: MiningConfig, committeeCfg: CommitteeConfig): void => {
    const chBkt = persistBucket(ChainHead._$info.name);
    const chainHead = chBkt.get<string, [ChainHead]>('CH')[0];

    const headerBkt = persistBucket(Header._$info.name);
    const bodyBkt = persistBucket(Body._$info.name);
    const height2HashBkt = persistBucket(Height2Hash._$info.name);
    // TODO: get mempool txs to mine
    const txs = [];
    if (getTipHeight() % committeeCfg.maxGroupNumber === miningCfg.groupNumber) {
        const forgersBkt = persistBucket(ForgerCommittee._$info.name);
        const maxWeightForger = forgersBkt.get<number, [ForgerCommittee]>(miningCfg.groupNumber)[0].forgers.sort()[0];

        if (maxWeightForger.address === miningCfg.beneficiary) {
            const block = generateBlock(maxWeightForger, chainHead, miningCfg, txs);
            // store generated header and body
            headerBkt.put(block.header.bhHash, block.header);
            bodyBkt.put(block.body.bhHash, block.body);
            // height => block hash index
            height2HashBkt.put(block.header.height, block.header.bhHash);
            
            // prev hash
            chainHead.prevHash = chainHead.headHash;
            // change chain head
            chainHead.headHash = block.header.bhHash;
            chainHead.height = block.header.height;
            const inv = new Inv();
            inv.hash = block.body.bhHash;
            inv.height = block.header.height;

            notifyNewBlock(inv);
            // TODO
        }
    }

    return;
};

const selectMostWeightForger = (groupNumber: number, committeeCfg: CommitteeConfig): Forger => {
    const forgersBkt = persistBucket(ForgerCommittee._$info.name);
    const forgers = forgersBkt.get<number, [ForgerCommittee]>(groupNumber)[0].forgers;
    for (const forger of forgers) {
        
    }

    return;
};

export const calcWeightAtHeight = (forger: Forger, height: number, committeeCfg: CommitteeConfig): number => {
    const heightDiff = height - forger.lastHeight;
    if (heightDiff > committeeCfg.maxAccHeight) {
        return forger.initWeight * committeeCfg.maxAccHeight;
    } else {
        return forger.initWeight * heightDiff;
    }
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
