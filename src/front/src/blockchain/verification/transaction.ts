/**
 * verify tx 
 */

// ============================== import 

import { secp256k1, hash160 } from "../util/crypto"
import { Account } from "../chain/account"
import { Transaction, TransactionType } from "../chain/transaction"
import { MAX_UGAYA_COUNT } from "../chain/block"
import { BN } from "../util/bn"
import { Buffer } from "../util/buffer"
import { U64, U160, U256, U520 } from "../util/number"
import { Item } from "../../pi/db/db"
import { CSession } from "../../pi/db/client"
import DBTable from "../../blockchain/chain/db"

// ============================== export

/**
 * when the node receive tx
 */
export const verifyTransaction = (session: CSession, tx: Transaction, isInBlock = false) => {
    if (!isValidMoney(tx.fee)) {
        return false;
    }
    if (!isValidMoney(tx.value)) {
        return false;
    }
    if (!isValidType(tx)) {
        return false;
    }

    tx.computeHash();

    if (haveSameTx(session, tx.txHash)) {
        return false;
    }
    let pubKey = getPubKeyFromSign(tx.txHash, tx.sign);
    if (!pubKey) {
        return false;
    }
    tx.from = new BN(hash160(pubKey), 16, "le");

    if (!isValidAccount(session, tx.from.toBuffer("le"), tx.count)) {
        if(!isInBlock) {
            addOrphans(session, tx);
        }
        return false;
    }

    if (!isInBlock) {
        addPools(session, tx);
        verifyOrphanTransaction(session, tx.from, tx.count);
    }
    return true;
}

// ============================== implement

const isValidType = (tx: Transaction) => {
    switch (tx.txType.toNumber()) {
        case TransactionType.AddForge:
            if (!tx.blsPubKey) {
                return false;
            }
            break;
        case TransactionType.RemoveForge:
            if (tx.blsPubKey !== null) {
                return false;
            }
            break;
        case TransactionType.Default:
            if (tx.blsPubKey !== null) {
                return false;
            }
            break;
        default:
            return false;
    }
}

/**
 * return false if can find hash in pool and txs in current chain
 */
const haveSameTx = (session: CSession, hash: U256): boolean => {
    return session.read(dbTx => {
        let txs = dbTx.query([{
            tab: DBTable.POOL_TABLE,
            key: hash.toString(16)
        }, {
            tab: DBTable.TRANSACTION_TABLE,
            key: hash.toString(16)
        }], 10);
        return txs.length > 0;
    });
}

const isValidMoney = (money: U64) => {
    return money.isNeg() || money.gt(MAX_UGAYA_COUNT);
}

const getPubKeyFromSign = (hash: U256, sign: U520): Buffer => {
    let hashBuf = hash.toBuffer("le");
    let signBuf = sign.toBuffer("le");
    let pubKey = secp256k1.recover(hashBuf, signBuf);
    let r = secp256k1.verify(hashBuf, signBuf, pubKey);
    if (r) {
        return pubKey;
    }
}

/**
 * find address in current chain or pools
 * count === 1 + account.count from address
 */
const isValidAccount = (session: CSession, address: Buffer, count: BN) => {

    count = count.sub(new BN(1));

    // find account from TransactionTable 
    let accounts: Account[] = session.read(dbTx => {
        let addressStr = address.toString("hex");
        return dbTx.query([{
            tab: DBTable.ACCOUNT_TABLE,
            key: addressStr,
        }]);
    });

    if (accounts.length > 0) {
        return count.eq(accounts[0].count);
    }

    // find account from Pool
    let txs: Transaction[] = session.read(dbTx => {
        return dbTx.iter(DBTable.POOL_TABLE, "");
    });
    for (let tx of txs) {
        if (count.eq(tx.count)) {
            return true;
        }
    }

    return false;
}

const addOrphans = (session: CSession, tx: Transaction) => {
    session.write(dbTx => {
        let item = {
            tab: DBTable.ORPHAN_TX_TABLE,
            key: tx.txHash.toString(16),
            value: tx,
            time: 0
        } as Item;

        return dbTx.upsert([item], 10);
    }, 1);
}

const addPools = (session: CSession, tx: Transaction) => {
    session.write(dbTx => {
        let item = {
            tab: DBTable.POOL_TABLE,
            key: tx.txHash.toString(16),
            value: tx,
            time: 0
        } as Item;

        return dbTx.upsert([item], 10);
    }, 1);
}

const verifyOrphanTransaction = (session: CSession, address: U160, count: U64) => {
    count = count.add(new BN(1));

    let txs: Transaction[] = session.read(dbTx => {
        return dbTx.iter(DBTable.ORPHAN_TX_TABLE, "");
    });
    for (let tx of txs) {
        if (tx.from.eq(address) && count.eq(tx.count)) {
            verifyTransaction(session, tx);
            return;
        }
    }
}