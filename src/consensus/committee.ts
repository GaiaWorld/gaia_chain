/**
 * forge committee
 */

import { Block, BlockChain, Body, Header } from '../chain/blockchain';
import { MemPool } from '../mempool/tx';
import { CommitteeConfig } from '../params/committee';
import { H160, H256, H512 } from '../pi_pt/rust/hash_value';
import { privKeyToAddress, pubKeyToAddress, sha256 } from '../util/crypto';
import { GaiaEvent, GaiaEventBus } from '../util/eventBus';

/**
 * forger
 */
export class Forger {
    public address: H160;
    public pubKey: H256;
    // initial weight
    public initWeigth: number;
    // last weigth
    public lastWeight: number;
    // at which height being a forger
    public lastHeight: number;
    // which group number we are in
    public groupNumber: number;
    // how many tokens this forger staking
    public stake: number;
}

enum RunningMode {
    Minner,
    Verifier
}

/**
 * forger committee
 */
export class ForgerCommittee {
    // users that request to levave the committee but to take effective yet
    private waitsForRemove:  Map<H160, Forger>;
    // total 256 groups, every group has unlimited members
    // TODO: groups' element as a priority queue to get the maximum weighted node in O(1)
    private groups: Forger[][];
    // users that request to be a forger but not take effective yet
    private waitsForAdd:  Map<H160, Forger>;
    // block chain
    private bc: BlockChain;
    // mem pool
    private mp: MemPool;
    // node running mode
    private mode: RunningMode;
    // miner private key
    private privKey: H512;
    // event bus
    private evtBus: GaiaEventBus;
    // event container
    private events: GaiaEvent[];

    public constructor(bc: BlockChain, mp: MemPool, evtBus: GaiaEventBus, mode: RunningMode = RunningMode.Verifier) {
        // tslint:disable-next-line:prefer-array-literal
        this.groups = new Array<Forger[]>(CommitteeConfig.COMMITTE_GROUP);
        this.bc = bc;
        this.mp = mp;
        this.mode = mode;
        this.evtBus = evtBus;
        // listen events
        evtBus.addListener({
            id: 'ForgerCommittee',
            evtName: ['AddToCommittee', 'ExitCommittee'],
            target: this.events
        });
    }

    // start the committee forge loop
    public runLoop(): void {
        // tslint:disable-next-line:no-constant-condition
        while (true) {
            const event = this.events.shift();
            if (event && event.evtName === 'AddToCommittee') {
                this.addToCommittee(<H256>event.data);
            } else if (event && event.evtName === 'ExitCommittee') {
                this.exitCommitee(<H256>event.data);
            } else {
                // TODO
            }
            // running in minner mode
            if (this.mode === RunningMode.Minner) {
                const address = privKeyToAddress(this.privKey).tohex();
                const groupNumber = parseInt(address.slice(address.length - 2), 16);
                // which round?
                const round = this.bc.height() % CommitteeConfig.COMMITTE_GROUP;
                // check if we can forge block, if we are the most weighted node, generate block and broadcast
                if (groupNumber === round && this.bestWeightAddr().tohex() === address) {
                    // TODO
                    this.generateBlock();
                    this.adjustGroup();
                }

            // running in verifier mode
            } else {
                // TODO

            }
        }
    }

    // get current weigth of a node
    private getMemberWeight(addr: H160): number {
        const round = this.bc.height() % CommitteeConfig.COMMITTE_GROUP;
        const members = this.groups[round];
        for (const forger of members) {
            if (forger.address === addr) {
                return forger.lastWeight;
            }
        }
    }

    // add a node to committee by providing it's public key
    private addToCommittee(pubKey: H256): boolean {
        const forger = new Forger();

        const addr = pubKeyToAddress(pubKey);
        const balance = this.bc.balance(addr);
        if (balance < CommitteeConfig.MIN_TOKEN) {
            return false;
        }

        const height = this.bc.height();
        const header = this.bc.getHeader(height);
        const data = header.forger.tohex() + header.blockRandom.tohex() + height.toString(16);
        const rate = parseInt(sha256(data).tohex().slice(data.length - 4), 16) % 4;
        const weight = (Math.log(balance * 0.01) / Math.log(10)) * rate;
        const hash = sha256(data).tohex();
        const newGroupNumber = parseInt(hash.slice(hash.length - 2), 16);

        forger.address = addr;
        forger.lastHeight = height;
        forger.lastWeight = weight;
        forger.pubKey = pubKey;
        forger.lastHeight = weight;
        forger.stake = balance;
        forger.groupNumber = newGroupNumber;

        if (this.waitsForAdd.get(addr)) {
            throw new Error('double enter committee group');
        }

        this.waitsForAdd.set(addr, forger);

        return true;
    }

    // node exit committee
    private exitCommitee(addr: H160): void {
        const forger = this.waitsForRemove.get(addr);
        if (forger) {
            if (forger.lastHeight + CommitteeConfig.WITHDRAW_RESERVE_BLOCKS >= this.bc.height()) {
                this.waitsForRemove.delete(addr);
                // TODO: refund
            }
        } else {
            const address = addr.tohex();
            const group = address.slice(address.length - 2);
            const members = this.groups[parseInt(group, 16)];

            for (let i = 0; i < members.length; i++) {
                if (members[i].address === addr) {
                    this.waitsForRemove.set(addr, members[i]);
                    members.splice(i);
                    break;
                }
            }
        }
    }

    // incrase node weight every round until it gets maximum weight allowed
    private increaseWeight(): void {
        const height = this.bc.height();
        if (height % CommitteeConfig.COMMITTE_GROUP === 0) {
            for (const group of this.groups) {
                for (const member of group) {
                    const maxWeight = member.initWeigth * CommitteeConfig.COMMITTE_GROUP;
                    if (member.lastHeight + member.initWeigth > maxWeight) {
                        member.lastHeight = maxWeight;
                    } else {
                        member.lastHeight += member.initWeigth;
                    }
                }
            }
        }
    }

    // check if the block is valid
    private verifyBlock(bh: Header): boolean {
        // check sig
        if (!bh.verify(bh.forgerPubkey, bh.serialize())) {
            return false;
        }

        // check size
        if (bh.blockSize < 0 || bh.blockSize > 10 * 1024 * 1024) {
            return false;
        }

        // check tx root hash

        // check timestamp

        // ....

        return true;
    }

    private bestWeightAddr(): H160 {
        const round = this.bc.height() % CommitteeConfig.COMMITTE_GROUP;
        const sorted = this.groups[round].sort();

        return sorted[0].address;
    }

    private generateBlock(): void {
        const header = new Header();
        const body = new Body(this.mp.txs());
        const txRootHash = body.txRootHash();
        header.txRootHash = txRootHash;

        // TODO: add reward
        this.evtBus.postEvent({
            evtName: 'MinedNewBlock',
            data: new Block(header, body)
        });
    }

    private adjustGroup(): void {
        const height = this.bc.height();
        const header = this.bc.getHeader(height);
        const data = header.forger.tohex() + header.blockRandom.tohex() + height.toString(16);
        const hash = sha256(data).tohex();

        const newGroupNumber = parseInt(hash.slice(hash.length - 2), 16);
        const members = this.groups[header.groupNumber];
        let index = 0;
        for (let i = 0; i < members.length; i++) {
            if (members[i].address === header.forger) {
                index = i;
                break;
            }
        }
        // remove from privous group
        const removed = members.splice(index, 1)[0];
        // reset weight
        removed.lastHeight = removed.initWeigth;
        // add to new group
        this.groups[newGroupNumber].push(removed);
    }
}
