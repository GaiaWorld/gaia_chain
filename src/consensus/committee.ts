/**
 * forge committee
 */

import { generateBlock, writeBlockToDB, writeHeaderToDB } from '../chain/block';
import { getCommitteeConfig, getMiningConfig, getTipHeight } from '../chain/blockchain';
import { Account, ChainHead, CommitteeConfig, Forger, ForgerCommittee, ForgerWaitAdd, ForgerWaitExit, Header, Height2Hash, MiningConfig } from '../chain/schema.s';
import { getTxsFromPool } from '../chain/validation';
import { Inv } from '../net/server/rpc.s';
import { notifyNewBlock } from '../net/server/subscribe';
import { myForgers } from '../params/config';
import { BonBuffer } from '../pi/util/bon';
import { buf2Hex, hex2Buf, pubKeyToAddress, sha256 } from '../util/crypto';
import { persistBucket } from '../util/db';
import { setTimer } from '../util/task';

export const startMining = (): void => {
    // setup mining config
    const pubKey = '0fff49afad54c8290b0c838d41ee35dcb8b7aa0856f2e5a16f14f4f53b3ecd83';
    const privKey = '61bd92548e50464c94da8c33a076b7956bda74ca1957ec43a7095e92b5a011b80fff49afad54c8290b0c838d41ee35dcb8b7aa0856f2e5a16f14f4f53b3ecd83';
    const blockRandom = 'cc6c85a369f741fd6f409627a0f73fd166f7dba6ba1b5be6c55703bb5243e013';
    const heigt = getTipHeight();
    setMiningCfg(pubKey, privKey, blockRandom, heigt, 2);
    console.log('mining config: ', getMiningConfig());

    const commitCfgBkt = persistBucket(CommitteeConfig._$info.name);
    const commitCfg = commitCfgBkt.get<string, [CommitteeConfig]>('CC')[0];
    console.log('commitCfg: ', commitCfg);
    const chainHeadBkt = persistBucket(ChainHead._$info.name);

    setTimer(() => {
        runMining(getMiningConfig(), commitCfg);

        const chainHead = chainHeadBkt.get<string, [ChainHead]>('CH')[0];
        chainHead.height += 1;
        console.log('chainHead: ', chainHead);
        chainHeadBkt.put('CH', chainHead);
    }, null, 2000);

};

export const runMining = (miningCfg: MiningConfig, committeeCfg: CommitteeConfig): void => {
    const currentHeight = getTipHeight();
    if (currentHeight % committeeCfg.maxGroupNumber === miningCfg.groupNumber) {
        const maxWeightForger = selectMostWeightForger(currentHeight, committeeCfg);
        console.log('maxWeightForger: ', maxWeightForger);
        console.log('miningCfg: ', miningCfg);
        // if we are the mosted weight forger
        if (maxWeightForger) {
            const chainHeadBkt = persistBucket(ChainHead._$info.name);
            const chainHead = chainHeadBkt.get<string, [ChainHead]>('CH')[0];
            const txs = getTxsFromPool();
            const block = generateBlock(maxWeightForger, chainHead, miningCfg, committeeCfg, txs);
            console.log('\n============================= generate new block at tip height ============================            ', currentHeight);
            console.log(block);
            console.log('\n\n');

            writeHeaderToDB(block.header);
            writeBlockToDB(block);
            writeHeigh2HashIndex(block.header.height, block.header.bhHash);
            updateChainHead(block.header);
            broadcastNewBlock(block.header);
            adjustGroup(block.header);
        }
    }

    // update forger committee every round
    updateForgerCommittee(currentHeight, committeeCfg);
};

// handle forgers wait for add and exit
export const updateForgerCommittee = (height: number, committeeCfg: CommitteeConfig): void => {
    const forgerBkt = persistBucket(ForgerCommittee._$info.name);
    const forgerWaitAddBkt = persistBucket(ForgerWaitAdd._$info.name);
    const forgerWaitExitBkt = persistBucket(ForgerWaitExit._$info.name);
    const addForgers = forgerWaitAddBkt.get<number, [ForgerWaitAdd]>(height - committeeCfg.withdrawReserveBlocks)[0];
    const exitForgers = forgerWaitExitBkt.get<number, [ForgerWaitExit]>(height - committeeCfg.withdrawReserveBlocks)[0];
    const forgers = forgerBkt.get<number, [ForgerCommittee]>(height % committeeCfg.maxGroupNumber)[0];

    // console.log('forges: ', forgers);

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
                    const exitForger = forgers.forgers.splice(j, 1);
                    returnStake(exitForger[0]);
                }
            }
        }
        forgerWaitExitBkt.delete(height - committeeCfg.withdrawReserveBlocks);
        forgerBkt.put(height % committeeCfg.maxGroupNumber, forgers);
    }

    return;
};

const returnStake = (forger: Forger): void => {
    const accountBkt = persistBucket(Account._$info.name);
    const account = accountBkt.get<string, [Account]>(forger.address)[0];

    account.inputAmount += forger.stake;
    accountBkt.put(forger.address, forger);
};

export const selectMostWeightForger = (height: number, committeeCfg: CommitteeConfig): Forger => {
    const forgersBkt = persistBucket(ForgerCommittee._$info.name);
    const forgers = forgersBkt.get<number, [ForgerCommittee]>(height % committeeCfg.maxGroupNumber)[0].forgers;
    forgers.sort((a: Forger, b: Forger) => calcWeightAtHeight(b, height, committeeCfg) - calcWeightAtHeight(a, height, committeeCfg));
    // store sorted forgers by weight
    // forgersBkt.put(groupNumber, forgers);
    console.log('sorted forgers: ', forgers);

    for (const forger of myForgers.forgers) {
        if (forger.address === forgers[0].address) {
            return forgers[0];
        }
    }
};

// calculate forger's weight at a specific height
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

    return Math.floor((Math.log(stake) / Math.log(10) - 2.0) * (parseInt(data.slice(data.length - 2), 16) % 4 + 1));
};

export const setMiningCfg = (pubKey: string, privKey: string, blockRandm: string, height: number, maxGroupNumber: number): void => {
    const miningCfg = new MiningConfig();
    const miningCfgBkt = persistBucket(MiningConfig._$info.name);
    miningCfg.beneficiary = pubKeyToAddress(hex2Buf(pubKey));
    miningCfg.pubKey = pubKey;
    miningCfg.privateKey = privKey;
    miningCfg.groupNumber = deriveNextGroupNumber(miningCfg.beneficiary, blockRandm, height, maxGroupNumber);
    miningCfg.blsPubKey = pubKey;
    miningCfg.blsPrivKey = privKey;

    miningCfgBkt.put('MC', miningCfg);

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

const writeHeigh2HashIndex = (height: number, blockHash: string): void => {
    const height2HashBkt = persistBucket(Height2Hash._$info.name);

    const height2Hash = new Height2Hash();
    height2Hash.height = height;
    height2Hash.bhHash = blockHash;
    height2HashBkt.put(height, height2Hash);
};

// update chain head
export const updateChainHead = (header: Header): void => {
    const chBkt = persistBucket(ChainHead._$info.name);
    const chainHead = chBkt.get<string, [ChainHead]>('CH')[0];

    console.log('before update chain head: ', chainHead);

    if (chainHead.headHash === header.prevHash && chainHead.height + 1 === header.height) {
        chainHead.prevHash = chainHead.headHash;
        chainHead.headHash = header.bhHash;
        chainHead.height = header.height;
        chainHead.totalWeight = header.totalWeight;

        chBkt.put(chainHead.pk, chainHead);
    } else {
        console.log('out of order header -------------------------------------------', header);
        // TODO: add to Orphans pool
    }
};

// broad cast new block to peers
const broadcastNewBlock = (header: Header): void => {
    const inv = new Inv();
    inv.hash = header.bhHash;
    inv.height = header.height;

    // notify peers new block
    notifyNewBlock(inv);
};

const adjustGroup = (header: Header): void => {
    const forgerCommitteeBkt = persistBucket(ForgerCommittee._$info.name);
    const forgerBkt = persistBucket(Forger._$info.name);
    const miningCfgBkt = persistBucket(MiningConfig._$info.name);
    const miningCfg = getMiningConfig();

    const oldForgerCommitteeGroup = forgerCommitteeBkt.get<number, [ForgerCommittee]>(miningCfg.groupNumber)[0];
    const newGroupNumber = deriveNextGroupNumber(miningCfg.beneficiary, header.blockRandom, header.height, 2);

    const forger = forgerBkt.get<string, [Forger]>(miningCfg.beneficiary)[0];
    const index = oldForgerCommitteeGroup.forgers.indexOf(forger);

    // derive new weight
    forger.initWeight = deriveInitWeight(forger.address, header.blockRandom, header.height, forger.stake);

    // new group is not the same as old group and old forger group length greater than 1
    if (miningCfg.groupNumber !== newGroupNumber && oldForgerCommitteeGroup.forgers.length > 1) {
        console.log('change group: ', forger.groupNumber, ' ====>', newGroupNumber);
        console.log('oldForgerCommitteeGroup length: ', oldForgerCommitteeGroup.forgers.length);
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
};