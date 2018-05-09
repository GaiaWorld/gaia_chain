/**
 * P2P的一个节点
 */
import { Block, BlockBody, BlockChain, BlockHead } from "./blockchain"
import { Forge, ForgeCommittee } from "./committee"
import { getGenesisBlock } from "./genesis"
import { Transaction, TransactionType } from "./transaction"
import { H160, H256 } from './util'

/**
 * 节点自己的锻造者信息
 */
class SelfForge {
    public address: H256;    // 锻造者地址
    public privateKey: H256; // 自己地址对应的私钥，用于签名
}

export class Node {
    public chain: BlockChain;
    public forges: SelfForge[];
    public committee: ForgeCommittee;
    public accounts: Account[];
    
    constructor() {
        this.chain = new BlockChain();
        this.forges = [];
        this.committee = new ForgeCommittee();
    }

    /**
     * 添加一堆区块头，校验
     * 注意：headers必须按照链上的顺序从小到大发送
     */
    public addHead(heads: BlockHead[]) {
        for (let i = 0; i < heads.length; ++i) {
            this.chain.addHead(heads[i]);
        }
    }

    /**
     * 添加一个区块体
     */
    public addBody(body: BlockBody) {
        this.chain.addBody(body);
    }

    /**
     * 申请加入锻造委员会
     * TODO: to的地址？
     */
    public addForge(address: H160, to: H160, privKey: H256, pubKey: H256, fee: number) {
        // 这里会发起一笔交易广播
        // 私钥保留到SelfForge
    }

    /**
     * 申请退出锻造委员会
     * TODO: 过了一定高度后，由谁来发起退款交易？
     */
    public removeForge(address: H160) {
        // 这里会发起一笔交易广播
    }
}