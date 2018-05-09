/**
 * 锻造者以及锻造委员会
 */

import {H160, H256, Int64} from "./util"

// 加入后，需要过这么多区块高度后，才能参与锻造投票
// 退出后，需要过这么多区块高度后，矿工必须将钱打到对应的地址
const WAIT_BLOCK_HEIGHT = 256000;

// 最低的保证金，单位：yGAIA
const MIN_DEPOSIT = new Int64(1000 * 1000000000000);

/**
 * 锻造者
 */
export class Forge {
    address: H160;      // 地址
    randPubKey: H256;   // 随机数的公钥
    initWeight: number; // 初始权重
    initHeight: number; // 加入时候的区块索引
    token: number;      // 总投票权
    // 如果是自己节点，还有私钥
    randPrivKey: H256;

    constructor(address: H160, privKey: H256, pubKey: H256, fee: number, initHeight: number) {
        this.address = address;
        this.randPubKey = pubKey;
        this.randPrivKey = privKey;
        this.initHeight = initHeight;
        this.initWeight = Math.log10(0.01 * fee);
    }
}

/**
 * 锻造者委员会
 */
export class ForgeCommittee {
    forges: Forge[];

    waitsForAdd: Forge[];    // 新锻造者先加入到这里，等到条件到达后再加入
    watisForRemove: Forge[]; // 退出地址加到这里，等指定区块高度后，由响应的锻造者发出转账交易？

    constructor() {
        this.forges = [];
        this.waitsForAdd = [];
        this.watisForRemove = [];
    }

    /**
     * 往上面加入一个锻造者
     */
    addForge(address: H160, privKey: H256, pubKey: H256, initWeight: number, initHeight: number) {
        let forge = new Forge(address, privKey, pubKey, initWeight, initHeight);
        this.waitsForAdd.push(forge);
    }

    /**
     * 申请退出时候
     */
    removeForge(address: H160) {
        let forge = this.findForge(address);
        this.watisForRemove.push(forge);
    }

    /**
     * 通过地址找锻造者
     */
    findForge(address: H160) {
        return null;
    }

    /**
     * 要生成index个区块，返回当前地址是否可以生成区块
     */
    canGenBlock(index: number) {
        // 分组依据为委员地址、当前区块高度、当前随机值三者hash的最后8-bit的值
        return false;
    }
}