/**
 * forge committee
 */

import { generateBlock } from '../chain/block';
import { getCommitteeConfig, getTipHeight } from '../chain/blockchain';
import { Body, ChainHead, CommitteeConfig, Forger, ForgerCommittee, ForgerWaitAdd, ForgerWaitExit, Header, Height2Hash, MiningConfig } from '../chain/schema.s';
import { Inv } from '../net/server/rpc.s';
import { notifyNewBlock } from '../net/server/subscribe';
import { BonBuffer } from '../pi/util/bon';
import { buf2Hex, hex2Buf, pubKeyToAddress, sha256 } from '../util/crypto';
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
    console.log('currentHeight: ----------------------------------------- ', currentHeight);
    // TODO: get mempool txs to mine
    const txs = [];
    if (currentHeight % committeeCfg.maxGroupNumber === miningCfg.groupNumber) {
        const maxWeightForger = selectMostWeightForger(miningCfg.groupNumber, currentHeight, committeeCfg);

        // if we are the mosted weight forger
        if (maxWeightForger.address === miningCfg.beneficiary) {
            const block = generateBlock(maxWeightForger, chainHead, miningCfg, committeeCfg, txs);
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
            chBkt.put(chainHead.pk, chainHead);

            // broad cast new block to peers
            const inv = new Inv();
            inv.hash = block.body.bhHash;
            inv.height = block.header.height;

            // notify peers new block
            notifyNewBlock(inv);

            console.log('miningCfg.groupNumber: ', miningCfg.groupNumber);
            // adjust group
            const oldForgerCommitteeGroup = forgerCommitteeBkt.get<number, [ForgerCommittee]>(miningCfg.groupNumber)[0];
            const newGroupNumber = deriveNextGroupNumber(miningCfg.beneficiary, block.header.blockRandom, block.header.height, 5);

            const forger = forgerBkt.get<string, [Forger]>(miningCfg.beneficiary)[0];
            const index = oldForgerCommitteeGroup.forgers.indexOf(forger);

            // derive new weight
            forger.initWeight = deriveInitWeight(forger.address, block.header.blockRandom, block.header.height, forger.stake);

            // new group is not the same as old group and old forger group length greater than 1
            if (miningCfg.groupNumber !== newGroupNumber && oldForgerCommitteeGroup.forgers.length > 1) {
                forger.groupNumber = newGroupNumber; // assign new group number
                const forgerCommittee = forgerCommitteeBkt.get<number, [ForgerCommittee]>(newGroupNumber)[0];
                forgerCommittee.forgers.push(forger); // add to new group
                oldForgerCommitteeGroup.forgers.splice(index, 1); // delete from old group
                forgerCommitteeBkt.put(newGroupNumber, forgerCommittee);
                forgerCommitteeBkt.put(miningCfg.groupNumber, oldForgerCommitteeGroup);
                miningCfg.groupNumber = newGroupNumber;
                miningCfgBkt.put('MC', miningCfg);
            }

            forgerBkt.put(miningCfg.beneficiary, forger); // update forger info
        }
    }

    // update forger committee every round
    updateForgerCommittee(currentHeight, committeeCfg);

    return;
};

export const updateForgerCommittee = (height: number, committeeCfg: CommitteeConfig): void => {
    const forgerBkt = persistBucket(ForgerCommittee._$info.name);
    const forgerWaitAddBkt = persistBucket(ForgerWaitAdd._$info.name);
    const forgerWaitExitBkt = persistBucket(ForgerWaitExit._$info.name);
    const addForgers = forgerWaitAddBkt.get<number, [ForgerWaitAdd]>(height - committeeCfg.withdrawReserveBlocks)[0];
    const exitForgers = forgerWaitExitBkt.get<number, [ForgerWaitExit]>(height - committeeCfg.withdrawReserveBlocks)[0];
    const forgers = forgerBkt.get<number, [ForgerCommittee]>(height % committeeCfg.maxGroupNumber)[0];

    // if there are forgers wait for add
    if (addForgers) {
        forgers.forgers.push(...addForgers.forgers);
        forgerWaitAddBkt.delete(height - committeeCfg.withdrawReserveBlocks);
        forgerBkt.put(height % committeeCfg.maxGroupNumber, forgers);
    }

    // if there are forgers wait to exit
    if (exitForgers) {
        for (let i = 0; i < exitForgers.forgers.length; i++) {
            for (let j = 0; j < forgers.forgers.length; j++) {
                if (exitForgers.forgers[i].address === forgers.forgers[j].address) {
                    forgers.forgers.splice(j, 1);
                }
            }
        }
        forgerWaitExitBkt.delete(height - committeeCfg.withdrawReserveBlocks);
        forgerBkt.put(height % committeeCfg.maxGroupNumber, forgers);
    }

    return;
};

export const selectMostWeightForger = (groupNumber: number, height: number, committeeCfg: CommitteeConfig): Forger => {
    const forgersBkt = persistBucket(ForgerCommittee._$info.name);
    const forgers = forgersBkt.get<number, [ForgerCommittee]>(groupNumber)[0].forgers;
    forgers.sort((a: Forger, b: Forger) => calcWeightAtHeight(b, height, committeeCfg) - calcWeightAtHeight(a, height, committeeCfg));
    // store sorted forgers by weight
    forgersBkt.put(groupNumber, forgers);

    return forgers[0];
};

export const calcWeightAtHeight = (forger: Forger, height: number, committeeCfg: CommitteeConfig): number => {
    const heightDiff = height - forger.addHeight - committeeCfg.withdrawReserveBlocks;
    if (heightDiff === 0) {
        return forger.initWeight;
    }

    if (heightDiff > committeeCfg.maxAccHeight) {
        return forger.initWeight * (committeeCfg.maxAccHeight / committeeCfg.maxGroupNumber);
    } else {
        return forger.initWeight * (heightDiff / committeeCfg.maxGroupNumber);
    }
};

export const deriveNextGroupNumber = (address: string, blockRandom: string, height: number, maxGroupNumber: number = 256): number => {
    const bon = new BonBuffer();
    bon.writeUtf8(address)
        .writeUtf8(blockRandom)
        .writeInt(height);

    const hash = buf2Hex(sha256(bon.getBuffer()));

    return parseInt(hash.slice(hash.length - 2), 16) % maxGroupNumber;
};

export const deriveInitWeight = (address: string, blockRandom: string, height: number, stake: number): number => {
    const bon = new BonBuffer();
    bon.writeUtf8(address)
        .writeUtf8(blockRandom)
        .writeInt(height);

    const data = buf2Hex(sha256(bon.getBuffer()));

    return Math.floor((Math.log(stake) / Math.log(10) - 2.0) * (parseInt(data.slice(data.length - 4), 16) % 4 + 1));
};

export const setMiningCfg = (pubKey: string, privKey: string, blockRandm: string, height: number): void => {
    const miningCfgBkt = persistBucket(MiningConfig._$info.name);
    const cfg = miningCfgBkt.get<string, [MiningConfig]>('MC')[0];
    cfg.beneficiary = pubKeyToAddress(hex2Buf(pubKey));
    cfg.pubKey = pubKey;
    cfg.privateKey = privKey;
    cfg.groupNumber = deriveNextGroupNumber(cfg.beneficiary, blockRandm, height);

    miningCfgBkt.put(cfg.pk, cfg);

    return;
};

export const getForgerWeight = (height: number, address: string): number => {
    const forgerCommitteeBkt = persistBucket(ForgerCommittee._$info.name);
    const config = getCommitteeConfig();

    const forgers = forgerCommitteeBkt.get<number, [ForgerCommittee]>(height % config.maxGroupNumber)[0].forgers;
    for (const forger of forgers) {
        if (forger.address === address) {
            return calcWeightAtHeight(forger, height, config);
        }
    }

    return -1;
};
