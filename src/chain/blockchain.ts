/**
 * block chain
 */

import { H160, H256 } from '../pi_pt/rust/hash_value';
import { Body, Forger, ForgerCommittee, Header, HeaderChain, Receipt, Transaction, TxPool, TxType } from './schema.s';

import { Inv } from '../net/msg';
import { NODE_TYPE } from '../net/pNode';
import { memoryBucket, persistBucket } from '../util/db';

export const MAX_BLOCK_SIZE = 10 * 1024 * 1024;

export class Block {
    public header: Header;
    public body: Body;

    public constructor(header: Header, body: Body) {
        this.header = header;
        this.body = body;
    }
}

export interface Chain {
    height(): number;
    balance(addr: H160): number;
    // get header from block number or block hash
    getHeader(hd: number | H256): Header;
    // get body
    getBody(bd: number | H256): Header;
    // get block
    getBlock(block: number | H256): Block;
    // get block hash
    getBlockHash(block: number): H256;
    // insert a single block
    insertBlock(block: Block | Block[]): boolean;
    // get totall weight
    getTotalWeight(): number;
    // get genesis hash
    getGenesisHash(): H256;
    // get transaction info
    getTxInfo(txHash: H256): Transaction;
    // get transaction receipt
    getTxReceiptInfo(txHash: H256): Receipt;
}

export const getGenesisHash = (): string => {
    return 'genesisHash';    
};

export const getVersion = (): string => {
    return '0.0.0.1';
};

export const getTipHeight = (): number => {
    const bkt = persistBucket(HeaderChain._$info.name);

    return bkt.get<string, [HeaderChain]>('HC')[0].height;
};

export const getServiceFlags = ():number => {
    // TODO
    return 1;
};

export const getNodeType = (): NODE_TYPE => {
    // all node are full node at present
    return NODE_TYPE.FULL_NODE;
};

export const needTX = (invMsg: Inv): boolean => {

    return true;
};

export const needBlock = (invMsg: Inv): boolean => {

    return true;
};

export const getTx = (invMsg: Inv): Transaction => {
    const bkt = memoryBucket(TxPool._$info.name);

    return bkt.get<string, [TxPool]>(invMsg.hash)[0].tx;
};

export const getHeader = (invMsg: Inv): Header => {
    const bkt = persistBucket(Header._$info.name);

    return bkt.get<string, [Header]>(invMsg.hash)[0];
};

export const getBlock = (invMsg: Inv): Block => {
    const headerBkt = persistBucket(Header._$info.name);
    const bodyBkt = persistBucket(Body._$info.name);

    const header = headerBkt.get<string, [Header]>(invMsg.hash)[0];
    const body = bodyBkt.get<string, [Body]>(invMsg.hash)[0];

    return new Block(header, body);
};

export const newTxsReach = (txs: Transaction[]): void => {
    for (const tx of txs) {
        if (validateTx(tx)) {
            switch (tx.txType) {
                case TxType.ForgerGroupTx:
                    if (tx.forgerGroupTx && tx.forgerGroupTx.AddGroup) {
                        addCommitteeGroup(tx);
                    } else if (tx.forgerGroupTx && !tx.forgerGroupTx.AddGroup) {
                        exitCommitteeGroup(tx);
                    }
                    break;
                case TxType.SpendTx:
                    const txpoolBkt = memoryBucket(TxPool._$info.name);
                    const tp = new TxPool();
                    tp.tx = tx;
                    tp.txHash = calcTxHash(tx);
                    txpoolBkt.put<string, TxPool>(tp.txHash, tp);
                    break;
                case TxType.PenaltyTx:
                    // TODO
                    break;
    
                default:
            }
        }
    }
};

export const newBlocksReach = (blocks: Block[]): void => {
    // validate blocks
    // add to chain store
    const headerBkt = persistBucket(Header._$info.name);
    const bodyBkt = persistBucket(Body._$info.name);
    for (const block of blocks) {
        // TODO: add to orphans pool if no parent found
        // TODO: advertise new height to peers
        validateBlock(block);
        headerBkt.put<string, Header>(calcHeaderHash(block.header), block.header);
        bodyBkt.put<string, Body>(calcHeaderHash(block.header), block.body);
    }

    // TODO: notify peers that we changed our height

    return;
};

export const newHeadersReach = (headers: Header[]): void => {
    // validate headers
    // retrive corresponding body
    // reassemly to a complete block
    // add to chain store
    const bkt = persistBucket(Header._$info.name);
    for (const header of headers) {
        validateHeader(header);
        // TODO: retrive body
        bkt.put<string, Header>(calcHeaderHash(header), header);
    }

    return;
};

// ================================================
// helper function
const calcTxHash = (tx: Transaction): string => {
    return '0x123456789abcdef';
};

const calcHeaderHash = (header: Header): string => {
    return '0x123456789abcdef';
};

const validateHeader = (header: Header): boolean => {
    return true;
};

const validateBlock = (block: Block): boolean => {
    // version
    // timestamp
    // parent hash
    // size
    // forger signature
    // validate txs
    // ...
    
    return true;
};

const validateTx = (tx: Transaction): boolean => { 
    // tx type
    // balance
    // signature
    // ...

    return true;
};

const addCommitteeGroup = (tx: Transaction): void => {
    return;
};

const exitCommitteeGroup = (tx: Transaction): void => {
    return;
};
