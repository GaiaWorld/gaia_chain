/**
 * forge committee
 */

import { Block } from '../chain/blockchain';
import { CommitteeConfig } from '../params/committee';
import { H160, H256 } from './util';

/**
 * forger
 */
export class Forger {
    public address: H160;
    public pubKey: H256;
    // initial weight
    public lastWeight: number;
    // at which height being a forger
    public lastHeight: number;
    // how many tokens this forger staking
    public stake: number;
}

/**
 * forger committee
 */
export class ForgerCommittee {
    // total 256 groups, every group has unlimited members
    public groups: Forger[];
    // users that request to be a forger but not take effective yet
    public waitsForAdd: Forger[];
    // users that request to levave the committee but to take effective yet
    public waitsForRemove: Forger[];

    public nextRound(): void {
        return;
    }

    public getNodeWeight(node: H160): number {
        return 0;
    }

    public addToCommittee(node: H160, info: {}): void {
        return;
    }

    public exitCommitee(node: H160): void {
        return;
    }

    public generateBlock(): Block {
        return new Block();
    }
}
