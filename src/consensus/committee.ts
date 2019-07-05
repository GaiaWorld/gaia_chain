/**
 * forge committee
 */

import { generateBlock } from '../chain/block';
import { getTipHeight } from '../chain/blockchain';
import { Body, ChainHead, CommitteeConfig, Forger, ForgerCommittee, Header, Height2Hash, MiningConfig } from '../chain/schema.s';
import { Inv } from '../net/server/rpc.s';
import { notifyNewBlock } from '../net/server/subscribe';
import { BonBuffer } from '../pi/util/bon';
import { buf2Hex, getRand, sha256 } from '../util/crypto';
import { persistBucket } from '../util/db';

export const startMining = (miningCfg: MiningConfig, committeeCfg: CommitteeConfig): void => {
    const chBkt = persistBucket(ChainHead._$info.name);
    const chainHead = chBkt.get<string, [ChainHead]>('CH')[0];

    const headerBkt = persistBucket(Header._$info.name);
    const bodyBkt = persistBucket(Body._$info.name);
    const height2HashBkt = persistBucket(Height2Hash._$info.name);
    const miningCfgBkt = persistBucket(MiningConfig._$info.name);
    const forgerCommitteeBkt = persistBucket(ForgerCommittee._$info.name);
    const forgerBkt = persistBucket(Forger._$info.name);

    const currentHeight = getTipHeight();
    // TODO: get mempool txs to mine
    const txs = [];
    if (currentHeight % committeeCfg.maxGroupNumber === miningCfg.groupNumber) {
        const maxWeightForger = selectMostWeightForger(miningCfg.groupNumber, currentHeight, committeeCfg);

        // if we are the mosted weight forger
        if (maxWeightForger.address === miningCfg.beneficiary) {
            const block = generateBlock(maxWeightForger, chainHead, miningCfg, txs);
            // store generated header and body
            headerBkt.put(block.header.bhHash, block.header);
            bodyBkt.put(block.body.bhHash, block.body);
            // height => block hash index
            height2HashBkt.put(block.header.height, block.header.bhHash);
            
            // update chain head
            chainHead.prevHash = chainHead.headHash;
            chainHead.headHash = block.header.bhHash;
            chainHead.height = block.header.height;
            chainHead.totalWeight = block.header.totalWeight;

            // broad cast new block to peers
            const inv = new Inv();
            inv.hash = block.body.bhHash;
            inv.height = block.header.height;

            // notify peers new block
            notifyNewBlock(inv);

            // adjust group
            const newGroupNumber = deriveNextGroupNumber(miningCfg.beneficiary, block.header.blockRandom, block.header.height);
            miningCfg.groupNumber = newGroupNumber;
            // save new group number
            miningCfgBkt.put('MC', miningCfg);

            const forger = forgerBkt.get<string, [Forger]>(miningCfg.beneficiary)[0];
            forger.groupNumber = newGroupNumber;
            // derive new weight
            forger.initWeight = deriveInitWeight(forger.address, buf2Hex(getRand(32)), forger.initWeight, forger.stake);

            const forgers = forgerCommitteeBkt.get<number, [ForgerCommittee]>(newGroupNumber)[0];
            forgers.forgers.push(forger);
            // add to new group
            forgerCommitteeBkt.put(newGroupNumber, forgers);
        }
    }

    return;
};

const selectMostWeightForger = (groupNumber: number, height: number, committeeCfg: CommitteeConfig): Forger => {
    const forgersBkt = persistBucket(ForgerCommittee._$info.name);
    const forgers = forgersBkt.get<number, [ForgerCommittee]>(groupNumber)[0].forgers;
    forgers.sort((a: Forger, b: Forger) => calcWeightAtHeight(b, height, committeeCfg) - calcWeightAtHeight(a, height, committeeCfg));
    // store sorted forgers by weight
    forgersBkt.put(groupNumber, forgers);

    return forgers[0];
};

export const calcWeightAtHeight = (forger: Forger, height: number, committeeCfg: CommitteeConfig): number => {
    const heightDiff = height - forger.lastHeight;
    if (heightDiff > committeeCfg.maxAccHeight) {
        return forger.initWeight * committeeCfg.maxAccHeight;
    } else {
        return forger.initWeight * heightDiff;
    }
};

export const deriveNextGroupNumber = (address: string, blockRandom: string, height: number): number => {
    const bon = new BonBuffer();
    bon.writeUtf8(address)
        .writeUtf8(blockRandom)
        .writeInt(height);

    const hash = buf2Hex(sha256(bon.getBuffer()));

    return parseInt(hash.slice(hash.length - 2), 16);
};

export const deriveInitWeight = (address: string, blockRandom: string, height: number, stake: number): number => {
    const bon = new BonBuffer();
    bon.writeUtf8(address)
        .writeUtf8(blockRandom)
        .writeInt(height);

    const data = buf2Hex(sha256(bon.getBuffer()));

    return Math.floor((Math.log(stake) / Math.log(10) - 2.0) * (parseInt(data.slice(data.length - 4), 16) % 4 + 1));
};
