/**
 * block chain
 */

import { H160, H256, H512 } from '../pi_pt/rust/hash_value';
import { sign, verify } from '../util/crypto';
import { Account } from './account';
import { Transaction } from './transaction';

/**
 * header
 */
export class Header {
    // block version used to upgrade protocol
    public version: number;
    // block size
    public blockSize: number;
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

    public constructor() {
        this.version = 1;
        this.timestamp = Date.now();
    }

    public sign(privKey: H256): void {
        this.signature = sign(privKey, this.serialize());
    }

    public verify(pubKey: H512, header: string): boolean {
        return verify(pubKey, header);
    }

    public serialize(): string {
        return;
    }
}

export class Body {
    // block body contains all transactions
    public txs: Transaction[];

    public constructor(txs: Transaction[]) {
        this.txs = txs;
    }

    public txRootHash(): H256 {
        return;
    }
}

export class Block {
    public header: Header;
    public body: Body;

    public constructor(header: Header, body: Body) {
        this.header = header;
        this.body = body;
    }
}

export interface BlockChain {
    height(): number;
    balance(addr: H160): number;
    // get header from block number or block hash
    getHeader(hd: number | string): Header;
    // get body
    getBody(bd: number | string): Header;
}
