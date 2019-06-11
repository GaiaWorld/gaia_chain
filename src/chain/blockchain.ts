/**
 * block chain
 */

import { H160, H256 } from '../consensus/util';
import { Account } from './account';
import { Transaction } from './transaction';

/**
 * header
 */
export class Header {
    // block version used to upgrade protocol
    public version: number;
    // block height
    public height: number;
    // previous block hash
    public prevHash: H256;
    
    // transactions root hash
    public txRootHash: H256;
    // state root hash
    // public stateRoot: H256;
    // receipt root hash
    public receiptRoot: H256;

    // total weight for all block
    public totalWeight: number;
    // weight for current block
    public weight: number;
    // forger address
    public forger: H160;
    // which group is this forger belong to
    public groupNumber:number;
    // when this block created
    public timestamp: number;

    // forger public key
    public forgerPubkey: H256;
    // random number for this block
    public blockRandom: H256;
    // random number signature signed by forger
    public signature: H256;
}

export class Body {
    // block body contains all transactions
    public txs: Transaction[];
}

export class Block {
    public head: Header;
    public body: Body;
}
