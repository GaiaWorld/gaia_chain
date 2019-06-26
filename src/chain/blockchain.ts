/**
 * block chain
 */

import { H160, H256 } from '../pi_pt/rust/hash_value';
import { Body, Forger, ForgerCommittee, ForgerGroupTx, Header, HeaderChain, Receipt, Transaction, TxPool, TxType } from './schema.s';

import { NODE_TYPE } from '../net/pNode';
import { Inv } from '../net/server/rpc.s';
import { pubKeyToAddress, sha256, verify } from '../util/crypto';
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

export const runCommittee = (config: CommitteeConfig): void => {
    // syncing status
};

// ================================================
// helper function
const calcTxHash = (tx: Transaction): string => {
    return sha256(serializeTx(tx));
};

const serializeTx = (tx: Transaction): string => {
    return 'tx';
};

const serializeBlock = (block: Block): string => {
    return 'block';
};

const serializeHeader = (header: Header): string => {
    return 'header';
};

const calcHeaderHash = (header: Header): string => {
    return sha256(serializeHeader(header));
};

const validateHeader = (header: Header): boolean => {
    if (header.version !== getVersion()) {
        return false;
    }

    if (Math.abs(header.timestamp - Date.now()) > 1000 * 5) {
        return false;
    }

    if (!headerSignatureValid(header)) {
        return  false;
    }

    return true;
};

const validateBlock = (block: Block): boolean => {
    // version
    if (block.header.version !== getVersion()) {
        return false;
    }
    // timestamp
    if (Math.abs(block.header.timestamp - Date.now()) > 1000 * 5) {
        return false;
    }
    // size
    if (blockPayloadSize(block) > 1024 * 1024 * 10) {
        return false;
    }
    // forger signature
    if (!blockSignatureValid(block)) {
        return false;
    }
    // validate txs
    for (const tx of block.body.txs) {
        if (!validateTx(tx)) {
            return false;
        }
    }

    // tx root hash
    if (!validateTxRootHash(block)) {
        return false;
    }

    // tx receipt hash
    // TODO
    // ...
    
    return true;
};

const blockPayloadSize = (block: Block): number => {
    return 1024 * 1024 * 10 - 1;
};

const blockSignatureValid = (block: Block): boolean => {
    return verify(block.header.signature, block.header.forgerPubkey, block.header.blockRandom);
};

const headerSignatureValid = (header: Header): boolean => {
    return verify(header.signature, header.forgerPubkey, header.blockRandom);
};

const validateTx = (tx: Transaction): boolean => { 
    // tx type
    if (tx.txType === TxType.ForgerGroupTx && !tx.forgerGroupTx) {
        return false;
    }

    if (tx.txType === TxType.PenaltyTx && !tx.penaltyTx) {
        return false;
    }
    // balance
    // TODO
    // signature
    if (!txSignatureValid(tx)) {
        return false;
    }
    // ...

    return true;
};

const validateTxRootHash = (block: Block): boolean => {
    // TODO: merkle hash of all txs
    return true;
};

const txSignatureValid = (tx: Transaction): boolean => {
    return verify(tx.signature, tx.from, calcTxHash(tx));
};

const deriveGroupNumber = (address: string, rnd: string, height: number): number => {
    const hash = sha256(address + rnd + height.toString(16));

    return parseInt(hash.slice(hash.length - 2), 16);
};

const deriveRate = (address: string, rnd: string, height: number): number => {
    const data = address + rnd + height.toString(16);
    const rate = parseInt(sha256(data).slice(data.length - 4), 16) % 4;

    return rate;
};

const addCommitteeGroup = (tx: Transaction): void => {
    if (tx.txType !== TxType.ForgerGroupTx && !tx.forgerGroupTx) {
        throw new Error('expect ForgeerGroupTx tx type');
    }

    const bkt = persistBucket(ForgerGroupTx._$info.name);
    const committee = bkt.get<string, [ForgerCommittee]>('FC')[0];
    const forger = new Forger();
    const inv = new Inv();
    inv.height = getTipHeight();
    const block = getBlock(inv);
    forger.lastHeight = getTipHeight();
    forger.pubKey = tx.forgerGroupTx.pubKey;
    forger.stake = tx.forgerGroupTx.stake;
    forger.groupNumber = deriveGroupNumber(forger.address, block.header.blockRandom, forger.lastHeight);
    const rate = deriveRate(forger.address, block.header.blockRandom, forger.lastHeight);
    forger.initWeigth = (Math.log(forger.stake * 0.01) / Math.log(10)) * rate;
    forger.lastWeight = 0;
    forger.address = pubKeyToAddress(forger.pubKey);

    committee.waitsForAdd.set(tx.forgerGroupTx.pubKey, forger);

    return;
};

const exitCommitteeGroup = (tx: Transaction): void => {
    if (tx.txType !== TxType.ForgerGroupTx && !tx.forgerGroupTx) {
        throw new Error('expect ForgeerGroupTx tx type');
    }

    const bkt = persistBucket(ForgerGroupTx._$info.name);
    const committee = bkt.get<string, [ForgerCommittee]>('FC')[0];

    const forger = new Forger();
    // only set this field
    forger.lastHeight = getTipHeight();

    committee.waitsForRemove.set(tx.forgerGroupTx.pubKey, forger);

    return;
};
