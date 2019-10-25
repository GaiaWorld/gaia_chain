import { Tr as Txn } from '../pi/db/mgr';
import { DEFAULT_FILE_WARE } from '../pi_pt/constant';
import { buf2Hex, number2Uint8Array } from '../util/crypto';
import { Logger, LogLevel } from '../util/logger';
import { Block } from './blockchain';
import { Account, Body, Header, HeightChainId2HashIndex, Transaction, TxHashIndex } from './schema.s';

const logger = new Logger('CHAIN_ACCESSOR', LogLevel.DEBUG);

const txLookupKey = (txHash: string): string => {
    return `l${txHash}`;
};

export const readTxLookupEntry = (txn: Txn, txHash: string, chainId: number): TxHashIndex => {
    const item = txn.query(
        [{ ware: DEFAULT_FILE_WARE, tab: TxHashIndex._$info.name
            , key: `${txLookupKey(txHash)}${buf2Hex(number2Uint8Array(chainId))}` }]
        , 1000
        , false
    );

    if (item) {
        return <TxHashIndex>item[0].value;
    }
    logger.warn(`read tx lookup entry failed: hash ${txHash}`);
};

// lookupkey => block hash
export const writeTxLookupEntries = (txn: Txn, block: Block, chainId: number): void => {
    const items = [];
    for (const tx of block.body.txs) {
        const t2b = new TxHashIndex();
        t2b.bhHash = block.header.bhHash;
        t2b.txHash = tx.txHash;
        t2b.height = block.header.height;
        items.push({ ware: DEFAULT_FILE_WARE, tab: TxHashIndex._$info.name
            , key: `${txLookupKey(tx.txHash)}${buf2Hex(number2Uint8Array(chainId))}`
            , value: t2b });
    }

    if (items.length > 0) {
        txn.modify(items, 1000, false);
    }
    logger.debug(`empty lookup entry: hash ${block.header.bhHash}, height ${block.header.height}`);
};

export const deleteTxLookupEntry = (txn: Txn, txHash: string, chainId: number): void => {
    txn.modify([{ ware: DEFAULT_FILE_WARE, tab: TxHashIndex._$info.name
        , key: `${txLookupKey(txHash)}${buf2Hex(number2Uint8Array(chainId))}` }], 1000, false);
    logger.debug(`delete look up entry: hash ${txHash}`);
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
    logger.debug(`read header failed: hash ${hash}, height: ${height}`);
};

export const writeHeader = (txn: Txn, header: Header): void => {
    txn.modify(
        [{ ware: DEFAULT_FILE_WARE, tab: Header._$info.name, key: `${headerKey(header.height, header.bhHash)}`, value: header }]
        , 1000
        , false
    );
    logger.debug(`write header: hash ${header.bhHash}, height: ${header.height}`);
};

export const deleteHeader = (txn: Txn, hash: string, height: number): void => {
    txn.modify(
        [{ ware: DEFAULT_FILE_WARE, tab: Header._$info.name, key: `${headerKey(height, hash)}` }]
        , 1000
        , false
    );
    logger.debug(`delete header: hash ${hash}, height: ${height}`);
};

export const readBody = (txn: Txn, hash: string, height: number): Body => {
    const item = txn.query(
        [{ ware: DEFAULT_FILE_WARE, tab: Body._$info.name, key: `${bodyKey(height, hash)}` }]
        , 1000
        , false);

    if (item) {
        return <Body> item[0].value;
    }
    logger.debug(`read body failed: hash ${hash}, height: ${height}`);
};

export const writeBody = (txn: Txn, height: number, body: Body): void => {
    txn.modify(
        [{ ware: DEFAULT_FILE_WARE, tab: Body._$info.name, key: `${bodyKey(height, body.bhHash)}`, value: body }]
        , 1000
        , false
    );
    logger.debug(`write body: hash ${body.bhHash}, height: ${height}`);
};

export const deleteBody = (txn: Txn, hash: string, height: number): void => {
    txn.modify(
        [{ ware: DEFAULT_FILE_WARE, tab: Body._$info.name, key: `${bodyKey(height, hash)}` }]
        , 1000
        , false
    );
    logger.debug(`delete body: hash ${hash}, height: ${height}`);
};

export const readBlock = (txn: Txn, hash: string, height: number): Block => {
    const header = readHeader(txn, hash, height);
    const body = readBody(txn, hash, height);

    if (header && body) {
        return new Block(header, body);
    }
    logger.warn(`block not found, hash: ${hash}, height: ${height}`);
};

export const writeBlock = (txn: Txn, block: Block): void => {
    writeHeader(txn, block.header);
    writeBody(txn, block.header.height, block.body);
    logger.debug(`write block hash: ${block.header.bhHash} height: ${block.header.height}`);
};

export const deleteBlock = (txn: Txn, hash: string, height: number): void => {
    deleteHeader(txn, hash, height);
    deleteBody(txn, hash, height);
    logger.debug(`delete block hash: ${hash}, height: ${height}`);
};

export const readTransaction = (txn: Txn, txHash: string, chainId: number): Transaction => {
    const entry = readTxLookupEntry(txn, txHash, chainId);

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
    logger.warn(`txHash not found: ${txHash}`);
};

export const readAccount = (txn: Txn, address: string, chainId: number): Account => {
    const account = txn.query(
        [{ ware: DEFAULT_FILE_WARE, tab: Account._$info.name, key: `${address}${buf2Hex(number2Uint8Array(chainId))}` }]
        , 1000
        , false
    );

    if (account) {
        return <Account>account[0].value;
    }
    logger.warn(`account not found: address ${address}, chainId ${chainId}`);
};

export const updateAccount = (txn: Txn, account: Account, chainId: number): void => {
    txn.modify(
        [{ ware: DEFAULT_FILE_WARE, tab: Account._$info.name, key: `${account.address}${buf2Hex(number2Uint8Array(chainId))}`, value: account }]
        , 1000
        , false
    );
};

export const deleteAccount = (txn: Txn, address: string, chainId: number): void => {
    txn.modify(
        [{ ware: DEFAULT_FILE_WARE, tab: Account._$info.name, key: `${address}${buf2Hex(number2Uint8Array(chainId))}` }]
        , 1000
        , false
    );
};

export const writeBlockIndex = (txn: Txn, block: Block, chainId: number): void => {
    const val = new HeightChainId2HashIndex();
    val.heightChainId = `${block.header.height}${chainId}`;
    val.hash = block.header.bhHash;
    txn.modify(
        [{ ware: DEFAULT_FILE_WARE, tab: HeightChainId2HashIndex._$info.name, key: val.heightChainId, value: val }], 1000, false
    );
    logger.debug(`write block index height: ${block.header.height} hash: ${block.header.bhHash}`);
};

export const readBlockIndex = (txn: Txn, height: number, chainId: number): string => {
    const index = txn.query(
        [{ ware: DEFAULT_FILE_WARE, tab: HeightChainId2HashIndex._$info.name, key: `${height}${chainId}` }], 1000, false
    );

    if (index) {
        const hash = (<HeightChainId2HashIndex>index[0].value).hash;
        logger.debug(`read block height: ${height} hash: ${hash} chainId: ${chainId}`);
        return hash;
    }
    logger.warn(`read block hash failed height: ${height} chainId: ${chainId}`);
};
