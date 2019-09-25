// block processor
import { EMPTY_CODE_HASH } from '../params/constants';
import { Tr as Txn } from '../pi/db/mgr';
import { Logger, LogLevel } from '../util/logger';
import { Block } from './blockchain';
import { readAccount, updateAccount, writeBlock } from './chain_accessor';
import { verifyHeader } from './cpos';
import { getForkChain, getForkChainId } from './fork_manager';
import { Account, Header, Transaction } from './schema.s';

const logger = new Logger('PROCESSOR', LogLevel.DEBUG);

// process block transactions
export const processBlock = (txn: Txn, block: Block): boolean => {
    const chainId = getForkChainId(txn, block.header);
    // if chian id not found, this is an orphan block
    if (chainId) {
        const chain = getForkChain(txn, chainId);
        // this is a new fork
        if (chain.currentHeight >= block.header.height) {
            // TODO: create new fork, get next fork chain id
        }
    }

    // TODO: verify header
    if (!verifyHeader(txn, block.header, chainId)) {
        return false;
    }

    // if anyone of transaction failed, this block is invalid
    for (let i = 0; i < block.body.txs.length; i++) {
        if (!applyTransaction(txn, block.body.txs[i], chainId)) {
            txn.rollback();

            return false;
        }
    }

    // after header is verified and transaction are successfully applied

    // TODO: update some indexes

    // TODO: reward

    // TODO: need chainId or not ?
    writeBlock(txn, block);

    // all is ok, commit
    txn.commit();

    return true;
};

// process a transaction
export const applyTransaction = (txn: Txn, tx: Transaction, chainId: number): boolean => {
    // check balance
    // add / remove forger
    const fromAccount = readAccount(txn, tx.from, chainId);
    const toAccount = readAccount(txn, tx.to, chainId);

    // not enough balance
    if ((fromAccount.inputAmount - fromAccount.outputAmount) < tx.value) {
        return false;
    }

    // nonce not match
    if (fromAccount.nonce + 1 !== tx.nonce) {
        return false;
    }

    // last input and output not match
    if (tx.lastInputValue !== fromAccount.inputAmount || tx.lastOutputValue !== fromAccount.outputAmount) {
        return false;
    }

    fromAccount.outputAmount += tx.value;
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
};