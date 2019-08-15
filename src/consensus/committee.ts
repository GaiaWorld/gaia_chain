/**
 * forge committee
 */

import { generateBlock } from '../chain/block';
import { getCommitteeConfig, getTipHeight, newBlocksReach } from '../chain/blockchain';
import { Account, ChainHead, CommitteeConfig, Forger, ForgerCommittee, Header, Miner, Transaction } from '../chain/schema.s';
import { getTxsFromPool } from '../chain/validation';
import { Inv } from '../net/server/rpc.s';
import { notifyNewBlock, notifyNewTx } from '../net/server/subscribe';
import { localForgers } from '../params/config';
import { CHAIN_HEAD_PRIMARY_KEY } from '../params/constants';
import { GENESIS } from '../params/genesis';
import { BonBuffer } from '../pi/util/bon';
import { buf2Hex, sha256 } from '../util/crypto';
import { persistBucket } from '../util/db';

export const runMining = (committeeCfg: CommitteeConfig): void => {
    const currentHeight = getTipHeight();
    const res = selectMostWeightMiner(currentHeight, committeeCfg);
    console.log(`\nselectMostWeightMiner ${JSON.stringify(res)}`);
    if (res) {
        const chainHeadBkt = persistBucket(ChainHead._$info.name);
        const chainHead = chainHeadBkt.get<string, [ChainHead]>(CHAIN_HEAD_PRIMARY_KEY)[0];
        const txs = getTxsFromPool();
        const block = generateBlock(res[1], chainHead, res[0], committeeCfg, txs);
        console.log('\n============================= generate new block at tip height ============================            ', currentHeight);
        console.log(block);
        console.log('\n\n');
        broadcastNewBlock(block.header);
        newBlocksReach([block]);
    }
};

// handle forgers wait for add and exit
export const updateForgerCommittee = (height: number): void => {
    console.log(`\nUpdate forger committee at height: ${height}`);
    const committeeCfg = getCommitteeConfig();
    const forgerBkt = persistBucket(ForgerCommittee._$info.name);
    const currentSlotForgers = forgerBkt.get<number, [ForgerCommittee]>(height % committeeCfg.totalGroupNumber)[0];

    // delete outdated forgers
    for (let i = 0; i < currentSlotForgers.forgers.length; i++) {
        if (currentSlotForgers.forgers[i].applyJoinHeight && currentSlotForgers.forgers[i].applyJoinHeight + committeeCfg.canForgeAfterBlocks >= height) {
            if (!currentSlotForgers.forgers[i].nextGroupStartHeight) {
                currentSlotForgers.forgers[i].nextGroupStartHeight = height;
            }
        }

        if (currentSlotForgers.forgers[i].applyExitHeight && currentSlotForgers.forgers[i].applyExitHeight + committeeCfg.withdrawReserveBlocks >= height) {
            // return stake to forger
            returnStake(currentSlotForgers.forgers[i]);
            currentSlotForgers.forgers.splice(i, 1);
        }
    }

    // update forger committee
    forgerBkt.put(currentSlotForgers.slot, currentSlotForgers);

    return;
};

const returnStake = (forger: Forger): void => {
    const accountBkt = persistBucket(Account._$info.name);
    const account = accountBkt.get<string, [Account]>(forger.address)[0];

    account.inputAmount += forger.stake;
    accountBkt.put(forger.address, forger);
};

export const selectMostWeightMiner = (height: number, committeeCfg: CommitteeConfig): [Miner, Forger] => {
    const forgersBkt = persistBucket(ForgerCommittee._$info.name);
    const minersBkt = persistBucket(Miner._$info.name);
    const forgers = forgersBkt.get<number, [ForgerCommittee]>(height % committeeCfg.totalGroupNumber)[0].forgers;
    forgers.sort((a: Forger, b: Forger) => calcForgerWeightAtHeight(b, height, committeeCfg) - calcForgerWeightAtHeight(a, height, committeeCfg));
    console.log(`\n\nheight ${height} Most weight forger ${JSON.stringify(localForgers.forgers[0])}`);

    for (const forger of localForgers.forgers) {
        if (forger.address === forgers[0].address) {
            return [minersBkt.get<string, [Miner]>(forger.address)[0], forgers[0]];
        }
    }
    // TODO:JFB in the slot, but not the max weight
};

// calculate forger's weight at a specific height
export const calcForgerWeightAtHeight = (forger: Forger, height: number, committeeCfg: CommitteeConfig): number => {
    const heightDiff = height - forger.nextGroupStartHeight;
    // console.log(`calcForgerWeightAtHeight heightDiff ${JSON.stringify(heightDiff)} forger ${JSON.stringify(forger)} committeeCfg ${JSON.stringify(committeeCfg)}`);
    if (heightDiff <= 0) {
        return forger.initWeight;
    }

    if (heightDiff > committeeCfg.totalAccHeight) {
        return forger.initWeight * committeeCfg.maxAccRounds;
    } else if (heightDiff <= committeeCfg.totalAccHeight) {
        return Math.floor(forger.initWeight * (heightDiff / committeeCfg.totalGroupNumber));
    } else {
        // not a valid forger
        console.log(`not valid forger: ${JSON.stringify(forger)}`);

        return 0;
    }
};

export const deriveNextGroupNumber = (address: string, blockRandom: string, height: number, totalGroupNumber: number = 256): number => {
    const bon = new BonBuffer();
    bon.writeUtf8(address)
        .writeUtf8(blockRandom)
        .writeInt(height);

    const hash = buf2Hex(sha256(bon.getBuffer()));
    console.log(`deriveNextGroupNumber address ${address} hash ${hash}`);

    return parseInt(hash.slice(hash.length - 2), 16) % totalGroupNumber;
};

export const deriveInitWeight = (address: string, blockRandom: string, height: number, stake: number): number => {
    const bon = new BonBuffer();
    bon.writeUtf8(address)
        .writeUtf8(blockRandom)
        .writeInt(height);

    const data = buf2Hex(sha256(bon.getBuffer()));

    return Math.floor((Math.log(stake) / Math.log(10) - 2.0) * (parseInt(data.slice(data.length - 2), 16) % 4 + 1));
};

export const getForgerWeight = (height: number, address: string): number => {
    const forgerCommitteeBkt = persistBucket(ForgerCommittee._$info.name);
    const config = getCommitteeConfig();

    const forgers = forgerCommitteeBkt.get<number, [ForgerCommittee]>((height - 1) % config.totalGroupNumber)[0].forgers;
    for (const forger of forgers) {
        if (forger.address === address) {
            return calcForgerWeightAtHeight(forger, height, config);
        }
    }

    return -1;
};

// update chain head
export const updateChainHead = (header: Header): void => {
    const chBkt = persistBucket(ChainHead._$info.name);
    const chainHead = chBkt.get<string, [ChainHead]>(CHAIN_HEAD_PRIMARY_KEY)[0];

    console.log(`chainHead.headHash ${chainHead.headHash}\nchainHead.height ${chainHead.height}`);
    if (chainHead.headHash === header.prevHash && chainHead.height + 1 === header.height) {
        chainHead.prevHash = chainHead.headHash;
        chainHead.headHash = header.bhHash;
        chainHead.height = header.height;
        chainHead.blockRandom = header.blockRandom;
        chainHead.totalWeight = header.totalWeight;

        chBkt.put(chainHead.primaryKey, chainHead);
    } else {
        console.log('out of order header -------------------------------------------', header);
        // TODO: add to Orphans pool
    }

    console.log(`\nAfter update chain head: ${JSON.stringify(chBkt.get(CHAIN_HEAD_PRIMARY_KEY)[0])}`);
};

// broad cast new block to peers
const broadcastNewBlock = (header: Header): void => {
    const inv = new Inv();
    inv.hash = header.bhHash;
    inv.height = header.height;

    // notify peers new block
    notifyNewBlock(inv);
};

export const broadcastNewTx = (tx: Transaction): void => {
    const inv = new Inv();
    inv.hash = tx.txHash;
    // we cannot determine which block this tx would include in
    inv.height = 0;
    
    notifyNewTx(inv);
};

export const adjustGroup = (header: Header): void => {
    const forgerCommitteeBkt = persistBucket(ForgerCommittee._$info.name);
    const forgersBkt = persistBucket(Forger._$info.name);
    const forger = forgersBkt.get<string, [Forger]>(header.forger)[0];
    const prevSlotForgers = forgerCommitteeBkt.get<number, [ForgerCommittee]>(header.groupNumber)[0];
    const index = prevSlotForgers.forgers.map((f: Forger) => f.address).indexOf(forger.address);

    if (index < 0) {
        throw new Error(`forger: ${JSON.stringify(forger)} not in forger committee`);
    }

    // derive new group number
    const newGroupNumber = deriveNextGroupNumber(header.forger, header.blockRandom, header.height, GENESIS.totalGroups);
    console.log(`\nForger ${header.forger} derive new group number ${newGroupNumber}`);
    const newSlotForgers = forgerCommitteeBkt.get<number, [ForgerCommittee]>(newGroupNumber)[0];

    // derive new weight
    forger.initWeight = deriveInitWeight(forger.address, header.blockRandom, header.height, forger.stake);
    // update new group start height
    forger.nextGroupStartHeight = header.height;
    // update new group number
    forger.groupNumber = newGroupNumber;

    if (forger.groupNumber !== newGroupNumber && prevSlotForgers.forgers.length > 1) {
        // delete from old slot
        prevSlotForgers.forgers.splice(index, 1);
        // insert to new slot
        newSlotForgers.forgers.push(forger);

        console.log(`\nForger ${forger.address} changed from group: ${forger.groupNumber} to group: ${newGroupNumber}`);
    }

    console.log(`\nForger ${forger.address} remain in the same group: ${forger.groupNumber}`);

    forgerCommitteeBkt.put([header.groupNumber, newGroupNumber], [prevSlotForgers, newSlotForgers]);
    forgersBkt.put(header.forger, forger);
};
