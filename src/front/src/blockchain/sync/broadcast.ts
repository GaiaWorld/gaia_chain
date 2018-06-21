/**
 * verify block
 */

// ============================== import 

import { Block } from "../chain/block";
import { Transaction } from "../chain/transaction";


// ============================== export

export const broadcastBlock = (block: Block) => {
    console.log("now send block to peer: " + block.headerHash.toString(16));
}

export const broadcastTransaction = (tx: Transaction) => {
    console.log("now send tx to peer: " + tx.txHash.toString(16));
}