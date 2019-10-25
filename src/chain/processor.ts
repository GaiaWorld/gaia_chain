// block processor
import { CAN_FORGE_AFTER_BLOCKS, EMPTY_CODE_HASH, GOD_ADDRESS, MIN_GAS, MIN_PRICE, MIN_STAKE } from '../params/constants';
import { Tr as Txn } from '../pi/db/mgr';
import { buf2Hex, hex2Buf, pubKeyToAddress, sha256 } from '../util/crypto';
import { Logger, LogLevel } from '../util/logger';
import { Block } from './blockchain';
import { readAccount, updateAccount, writeBlock, writeTxLookupEntries } from './chain_accessor';
import { removeBlockChunk } from './common';
import { addForger, calcInitialGroupNumber, deriveInitWeight, removeForger, verifyHeader } from './cpos';
import { getForkChainIdOfHeader, newForkChain, shouldFork, updateCanonicalForkChain, updateForkPoint } from './fork_manager';
import { Account, Forger, Header, Transaction, TxType } from './schema.s';
import { serializeForgerCommitteeTx } from './transaction';

const logger = new Logger('PROCESSOR', LogLevel.DEBUG);

// process block transactions
export const processBlock = (txn: Txn, block: Block): boolean => {
    let chainId = getForkChainIdOfHeader(txn, block.header);
    // if chian id not found, this is an orphan block
    if (!chainId) {
        return false;
    }

    // 1. verify header
    if (!verifyHeader(txn, block.header, chainId)) {
        return false;
    }

    // 2. determine if we need fork
    if (shouldFork(txn, block.header)) {
        chainId = newForkChain(txn, block.header);
    }

    // 3. apply txs
    for (let i = 0; i < block.body.txs.length; i++) {
        if (!applyTransaction(txn, block.header, block.body.txs[i], chainId)) {
            return false;
        }
    }

    // 4. update indexes
    writeTxLookupEntries(txn, block, chainId);
    updateForkPoint(txn, block.header, chainId);
    updateCanonicalForkChain(txn, block.header.totalWeight, chainId);

    // 5. insert block
    writeBlock(txn, block);
    // 6. remove from block chunk, as it has been processed
    removeBlockChunk(txn, block);

    return true;
};

// process a transaction
export const applyTransaction = (txn: Txn, header: Header, tx: Transaction, chainId: number): boolean => {
    const fromAccount = readAccount(txn, tx.from, chainId);
    const coinbaseAccount = readAccount(txn, header.forger, chainId);

    // check gas and price
    if (tx.gas < MIN_GAS || tx.price < MIN_PRICE) {
        logger.debug(`Gas or Gas price is too low`);

        return false;
    }

    // not enough balance
    if ((fromAccount.inputAmount - fromAccount.outputAmount) < tx.value + tx.gas * tx.price) {
        logger.debug(`Not enough balance`);

        return false;
    }

    // nonce not match
    if (fromAccount.nonce + 1 !== tx.nonce) {
        logger.debug(`Nonce not match`);

        return false;
    }

    // last input and output not match
    if (tx.lastInputValue !== fromAccount.inputAmount || tx.lastOutputValue !== fromAccount.outputAmount) {
        logger.debug(`Last input or output not match`);

        return false;
    }

    // address match pubkey
    if (pubKeyToAddress(hex2Buf(tx.pubKey)) !== tx.from) {
        logger.debug(`Pubkey not match from address`);

        return false;
    }

    switch (tx.txType) {
        case TxType.SpendTx:
            handleSpendTx(txn, tx, chainId);
            break;
        case TxType.ForgerGroupTx:
            if (verifyForgerGroupTx(tx)) {
                return false;
            }
            handleForgerGroupTx(txn, header, tx, chainId);
            break;
        case TxType.PenaltyTx:
            handlePenaltyTx(txn, tx, chainId);
            break;
        default:
    }

    coinbaseAccount.inputAmount += tx.gas + tx.price;
    updateAccount(txn, coinbaseAccount, chainId);

    return true;
};

const handleSpendTx = (txn: Txn, tx: Transaction, chainId: number): void => {
    const fromAccount = readAccount(txn, tx.from, chainId);
    const toAccount = readAccount(txn, tx.to, chainId);

    fromAccount.outputAmount += tx.value + tx.gas + tx.price;
    fromAccount.nonce += 1;
    updateAccount(txn, fromAccount, chainId);

    // toAccount exist
    if (toAccount) {
        toAccount.inputAmount += tx.value;
        updateAccount(txn, toAccount, chainId);
    } else {
        // create new account if toAccount not found
        const newAccount = new Account();
        newAccount.address = tx.to;
        newAccount.codeHash = EMPTY_CODE_HASH;
        newAccount.inputAmount = tx.value;
        newAccount.nonce = 0;
        newAccount.outputAmount = 0;

        updateAccount(txn, newAccount, chainId);
    }

    return;
};

const handleForgerGroupTx = (txn: Txn, header: Header, tx: Transaction, chainId: number): void => {
    const fromAccount = readAccount(txn, tx.from, chainId);

    fromAccount.outputAmount += tx.forgerTx.stake + tx.gas * tx.price;
    fromAccount.nonce += 1;

    const forger = new Forger();
    forger.address = tx.forgerTx.address;
    forger.groupNumber = calcInitialGroupNumber(forger.address);
    forger.initWeight = deriveInitWeight(forger.address, header.blockRandom, header.height, tx.forgerTx.stake);
    forger.pubKey = tx.pubKey;
    forger.stake = tx.forgerTx.stake;
    forger.nextGroupStartHeight = header.height + CAN_FORGE_AFTER_BLOCKS;

    if (tx.forgerTx.AddGroup) { // join in
        forger.applyJoinHeight = header.height;
        addForger(txn, forger, chainId);
    } else {// leave
        forger.applyExitHeight = header.height;
        removeForger(txn, forger, chainId);
    }
};

const handlePenaltyTx = (txn: Txn, tx: Transaction, chianId: number): void => {
    return;
};

const verifyForgerGroupTx = (tx: Transaction): boolean => {
    if (tx.forgerTx.stake < MIN_STAKE) {
        console.log(`the stake is too low`);

        return false;
    }
    if (buf2Hex(sha256(serializeForgerCommitteeTx(tx.forgerTx))) !== tx.forgerTx.forgeTxHash) {
        console.log(`forgeTxHash do not match`);

        return false;
    }

    if (tx.forgerTx.AddGroup) {// join in
        if (tx.to !== GOD_ADDRESS || tx.from !== tx.forgerTx.address) {
            console.log(`forge address do not match`);

            return false;
        }
        if (pubKeyToAddress(hex2Buf(tx.pubKey)) !== tx.from) {
            console.log(`the pubkey do not match the from address`);
            
            return false;
        }

    } else { // leave
        if (tx.to !== tx.forgerTx.address || tx.from !== GOD_ADDRESS) {
            console.log(`forge address do not match`);

            return false;
        }
    }

    if (pubKeyToAddress(hex2Buf(tx.pubKey)) !== tx.to) {
        console.log(`the pubkey do not match the to address`);
        
        return false;
    }

    return true;
};