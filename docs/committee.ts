/**
 * it is just an address, both for user and contract
 */
interface ForgeCommittee {
    groupSum:Number;// how many group do the main chain totally have
    groups:ForgeGroup[];
    config:CommitteeConfig;
    constConfig:ConstConfig;
    currentGroup:Number;
    currentRandom:Number;    
}

interface ForgeGroup {
    num:Number;// the serial number of this group
    members:ForgeMember[];// this array need to be sorted by right
}

interface ForgeMember {
    right:Number;// 
    deposit:Number;
    address:Number;// 160-bit
    ip?:Number;// just for broadcast optimzation
    groupNumber:Number;
    rank:Number;// the rank of right in current group
    AccumulateHeight:Number;
}

interface CommitteeConfig {
    groupNumber:Number;// the number of group. For the main chain it is 256
    startDeposit:Number;// the lower limit of deposit. For main chain it is 1GA
    forgeTime:Number;// the default time for create a new block. For the main chain it is 3000 millisecond.
}

interface ConstConfig {
    applyHeight:100000;// the period before becoming a committee and after applying to be a committee.
    accumulateRatio:0.001;
    accumulateHeight:10000;
    exitHeight:100000;// the period before actually exit the committee and after applying for exiting. 
    publishHeight:1000000;// the period before actually exit the committee and after publish for exiting. 
}