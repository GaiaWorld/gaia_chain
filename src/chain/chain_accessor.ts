import { Tr as Txn } from '../pi/db/mgr';
import { DEFAULT_FILE_WARE } from '../pi_pt/constant';
import { buf2Hex, number2Uint8Array } from '../util/crypto';
import { Block } from './blockchain';
import { Body, Header, Transaction, TxHashIndex } from './schema.s';

export const txLookupKey = (txHash: string): string => {
    return `l${txHash}`;
};

export const readTxLookupEntry = (txn: Txn, txHash: string): TxHashIndex => {
    const item = txn.query(
        [{ ware: DEFAULT_FILE_WARE, tab: TxHashIndex._$info.name, key: `${txLookupKey(txHash)}` }]
        , 1000
        , false
    );

    if (item) {
        return <TxHashIndex>item[0].value;
    }
};

// lookupkey => block hash
export const writeTxLookupEntries = (txn: Txn, block: Block): void => {
    const items = [];
    for (const tx of block.body.txs) {
        const t2b = new TxHashIndex();
        t2b.bhHash = block.header.bhHash;
        t2b.txHash = tx.txHash;
        t2b.height = block.header.height;
        items.push({ ware: DEFAULT_FILE_WARE, tab: TxHashIndex._$info.name, key: `${txLookupKey(tx.txHash)}`, value: t2b });
    }

    if (items.length > 0) {
        txn.modify(items, 1000, false);
    }
};

export const deleteTxLookupEntry = (txn: Txn, txHash: string): void => {
    txn.modify([{ ware: DEFAULT_FILE_WARE, tab: TxHashIndex._$info.name, key: `${txLookupKey(txHash)}` }], 1000, false);
};

export const headerKey = (height: number, hash: string): string => {
    return `h${buf2Hex(number2Uint8Array(height))}${hash}`;
};

export const bodyKey = (height: number, hash: string): string => {
    return `b${buf2Hex(number2Uint8Array(height))}${hash}`;
};

export const readHeader = (txn: Txn, hash: string, height: number): Header => {
    const item =  txn.query(
        [{ ware: DEFAULT_FILE_WARE, tab: Header._$info.name, key: `${headerKey(height, hash)}` }]
        , 1000
        , false);

    if (item) {
        return <Header>item[0].value;
    }
};

export const writeHeader = (txn: Txn, header: Header): void => {
    txn.modify(
        [{ ware: DEFAULT_FILE_WARE, tab: Header._$info.name, key: `${headerKey(header.height, header.bhHash)}`, value: header }]
        , 1000
        , false
    );
};

export const deleteHeader = (txn: Txn, hash: string, height: number): void => {
    txn.modify(
        [{ ware: DEFAULT_FILE_WARE, tab: Header._$info.name, key: `${headerKey(height, hash)}` }]
        , 1000
        , false
    );
};

export const readBody = (txn: Txn, hash: string, height: number): Body => {
    const item = txn.query(
        [{ ware: DEFAULT_FILE_WARE, tab: Body._$info.name, key: `${bodyKey(height, hash)}` }]
        , 1000
        , false);

    if (item) {
        return <Body> item[0].value;
    }
};

export const writeBody = (txn: Txn, height: number, body: Body): void => {
    txn.modify(
        [{ ware: DEFAULT_FILE_WARE, tab: Body._$info.name, key: `${bodyKey(height, body.bhHash)}`, value: body }]
        , 1000
        , false
    );
};

export const deleteBody = (txn: Txn, hash: string, height: number): void => {
    txn.modify(
        [{ ware: DEFAULT_FILE_WARE, tab: Body._$info.name, key: `${bodyKey(height, hash)}` }]
        , 1000
        , false
    );
};

export const readBlock = (txn: Txn, hash: string, height: number): Block => {
    const header = readHeader(txn, hash, height);
    const body = readBody(txn, hash, height);

    if (header && body) {
        return new Block(header, body);
    }
};

export const writeBlock = (txn: Txn, block: Block): void => {
    writeHeader(txn, block.header);
    writeBody(txn, block.header.height, block.body);
};

export const deleteBlock = (txn: Txn, hash: string, height: number): void => {
    deleteHeader(txn, hash, height);
    deleteBody(txn, hash, height);
};

export const readTransaction = (txn: Txn, txHash: string): Transaction => {
    const entry = readTxLookupEntry(txn, txHash);

    if (entry) {
        const body = readBody(txn, entry.bhHash, entry.height);
        if (body) {
            for (const tx of body.txs) {
                if (tx.txHash === txHash) {
                    return tx;
                }
            }
        }
    }
};
