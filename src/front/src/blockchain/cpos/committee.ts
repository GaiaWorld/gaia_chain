/*
 * cpos
 */

// ============================== import 

import { Forger } from "../chain/forger"
import { Transaction } from "../chain/transaction"
import { BlockHeader } from "../chain/header"
import { Block } from "../chain/block"
import { U64, U160 } from "../util/number"
import { BN } from "../util/bn";
import { Heap } from "../../pi/util/heap"

// ============================== export

export const MIN_ADD_HEIGHT = new BN(40000, 10, "le");

export const MIN_EXIT_HEIGHT = new BN(400000, 10, "le");

export class ForgeGroup {
    members: Forger[]; // forger's group
}

export class ForgeCommittee {
    groups: ForgeGroup[];     // groups' array
    addWaits: Heap<Forger>;   // wait for forge
    exitWaits: Heap<Forger>;  // wait for exit

    constructor() {
        this.groups = [];
        
        // NOTE: Heap is min-heap
        let cmp = (a: Forger, b: Forger) => a.addBlockHeight.cmp(b.addBlockHeight);
        this.addWaits = new Heap<Forger>(cmp);
        
        cmp = (a: Forger, b: Forger) => a.exitBlockHeight.cmp(b.exitBlockHeight);
        this.exitWaits = new Heap<Forger>(cmp);
    }

    add(height: U64, tx: Transaction) {
        let forger = new Forger(tx.from, tx.value, tx.blsPubKey, height);
        this.addWaits.insert(forger);
    }

    exit(height: U64, address: U160) {
        let group: ForgeGroup, index = -1;
        for (let g of this.groups) {
            for (let i = 0; i < g.members.length; ++i) {
                if (g[i].address.eq(address)) {
                    group = g;
                    index = i;
                }
            }
        }

        if (group !== undefined) {
            this.exitWaits.insert(group[index]);
            group.members.splice(index, 1);
        }
    }

    update(header: BlockHeader) {
        this.addForgerToBlock(header);
        this.updateForger(header);
    }

    forge(parentHeader: BlockHeader) {
        
    }

    private addForgerToBlock(header: BlockHeader) {
        let addHeight = header.height.sub(MIN_ADD_HEIGHT);
        let forger: Forger;
        while(forger = this.addWaits.pop()) {
            if (forger.addBlockHeight.lte(addHeight)) {
                let id = forger.address.mod(new BN(256, 10, "le")).mod.toNumber();
                this.groups[id].members.push(forger);
                forger.computeInitWeight(header.height, header.blsRandom);
            } else {
                this.addWaits.insert(forger);
                break;
            }
        }
    }

    private updateForger(header: BlockHeader) {
        let id = header.groupNumber.toNumber();
        let group = this.groups[id];

        // 分组 = Hash(address..CurrentBlockHeight..CurrentBlockHash)[最后1Byte];
        // accWeight = initWeight = 重新计算，公式同上;

        

    }
}