// block processor
import { EMPTY_CODE_HASH, GOD_ADDRESS, MIN_GAS, MIN_PRICE, MIN_STAKE } from '../params/constants';
import { Tr as Txn } from '../pi/db/mgr';
import { buf2Hex, hex2Buf, pubKeyToAddress, sha256 } from '../util/crypto';
import { Logger, LogLevel } from '../util/logger';
import { Block } from './blockchain';
import { readAccount, updateAccount, writeBlock, writeTxLookupEntries } from './chain_accessor';
import { verifyHeader } from './cpos';
import { getForkChainId, newForkChain, shouldFork, updateCanonicalForkChain, updateForkPoint } from './fork_manager';
import { Account, Transaction, TxType } from './schema.s';
import { serializeForgerCommitteeTx } from './transaction';

const logger = new Logger('PROCESSOR', LogLevel.DEBUG);

// process block transactions
export const processBlock = (txn: Txn, block: Block): boolean => {
    let chainId = getForkChainId(txn, block.header);
    // if chian id not found, this is an orphan block
    if (!chainId) {
        return false;
    }

    // 1. verify header
    if (!verifyHeader(txn, block.header, chainId)) {
        txn.rollback();

        return false;
    }

    // 2. determine if we need fork
    if (shouldFork(txn, block.header)) {
        chainId = newForkChain(txn, block.header);
    }

    // 3. apply txs
    for (let i = 0; i < block.body.txs.length; i++) {
        if (!applyTransaction(txn, block.header.forger, block.body.txs[i], chainId)) {
            txn.rollback();

            return false;
        }
    }

    // 4. update indexes
    writeTxLookupEntries(txn, block);
    updateForkPoint(txn, block.header, chainId);
    updateCanonicalForkChain(txn, block.header.totalWeight, chainId);

    // 5. insert block
    writeBlock(txn, block);

    // 6. persist changes
    txn.commit();

    return true;
};

// process a transaction
export const applyTransaction = (txn: Txn, coinbase: string, tx: Transaction, chainId: number): boolean => {
    const fromAccount = readAccount(txn, tx.from, chainId);
    const toAccount = readAccount(txn, tx.to, chainId);
    const coinbaseAccount = readAccount(txn, coinbase, chainId);

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
            handleForgerGroupTx(txn, tx, chainId);
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

const handleForgerGroupTx = (txn: Txn, tx: Transaction, chainId: number): void => {
    const fromAccount = readAccount(txn, tx.from, chainId);

    if (tx.forgerTx.AddGroup) { // join in
        fromAccount.outputAmount += tx.forgerTx.stake + tx.gas * tx.price;
        fromAccount.nonce += 1;
        // TODO: add to committee

    } else { // leave
        // TODO: remove form committee

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

    if (tx.forgerTx.AddGroup === true) {// join in
        if (tx.to !== GOD_ADDRESS || tx.from !== tx.forgerTx.address) {
            console.log(`forge address do not match`);

            return false;
        }
        if (pubKeyToAddress(hex2Buf(tx.pubKey)) !== tx.from) {
            console.log(`the pubkey do not match the from address`);
            
            return false;
        }

    }
    if (tx.forgerTx.AddGroup === false) {// leave 
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