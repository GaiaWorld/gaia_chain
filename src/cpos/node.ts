/**
 * P2P的一个节点
 */
import { H160, H256 } from "./util"
import { getGenesisBlock } from "./genesis"
import { BlockHead, BlockBody, BlockChain, Block } from "./blockchain"
import { TransactionType, Transaction } from "./transaction"
import { Forge, ForgeCommittee } from "./committee"

/**
 * 节点自己的锻造者信息
 */
class SelfForge {
    address: H256;    // 锻造者地址
    privateKey: H256; // 自己地址对应的私钥，用于签名
}

export class Node {
    chain: BlockChain;
    forges: SelfForge[];
    committee: ForgeCommittee;

    constructor() {
        this.chain = new BlockChain();
        this.forges = [];
        this.committee = new ForgeCommittee();
    }

    /**
     * 添加一堆区块头，校验
     * 注意：headers必须按照链上的顺序从小到大发送
     */
    addHead(heads: BlockHead[]) {
        for (let i = 0; i < heads.length; ++i) {
            this.chain.addHead(heads[i]);
        }
    }

    /**
     * 添加一个区块体
     */
    addBody(body: BlockBody) {
        this.chain.addBody(body);
    }

    /**
     * 申请加入锻造委员会
     * TODO: to的地址？
     */
    addForge(address: H160, to: H160, privKey: H256, pubKey: H256, fee: number) {
        // 这里会发起一笔交易广播
        // 私钥保留到SelfForge
    }

    /**
     * 申请退出锻造委员会
     * TODO: 过了一定高度后，由谁来发起退款交易？
     */
    removeForge(address: H160) {
        // 这里会发起一笔交易广播
    }
}