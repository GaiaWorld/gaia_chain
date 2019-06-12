/**
 * committee config
 */

// tslint:disable-next-line:variable-name
export const CommitteeConfig =  {
    // minium tokens to become a forger
    MIN_TOKEN: 1000,
    // the default time for create a new block. For the main chain it is 3000 millisecond.
    FORGE_TIME: 3 * 1000,
    // maximum height for one forger to accumulate weight priority
    MAX_ACCUMULATED_HEIGHT: 150000,

    // stake can withdraw after a certain blocks
    WITHDRAW_RESERVE_BLOCKS: 256000,
    // how many groups
    COMMITTE_GROUP: 256
};
