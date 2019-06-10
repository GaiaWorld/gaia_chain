/**
 * forge committee
 */

import {H160, H256} from "./util";

/**
 * forger
 */
export class Forger {
    address: H160;
    pubKey: H256;
    // initial weight
    lastWeight: number;
    // at which height being a forger
    lastHeight: number;
    // how many tokens this forger staking
    stake: number;
}

/**
 * forger committee
 */
export class ForgerCommittee {
    // committee configuration
    config: CommitteeConfig;
    // total 256 groups, every group has unlimited members
    groups: Forger[];
    // users that request to be a forger but not take effective yet
    waitsForAdd: Forger[];
    // users that request to levave the committee but to take effective yet
    waitsForRemove: Forger[];
}

interface CommitteeConfig {
    // minium tokens to become a forger
    readonly minToken: number;
    // the default time for create a new block. For the main chain it is 3000 millisecond.
    readonly forgeTime:number;
    // maximum height for one forger to accumulate weight priority
    readonly maxAcculateHeight: number;
}