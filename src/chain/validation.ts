import { getForgerWeight } from '../consensus/committee';
import { blsSignHash, buf2Hex, hex2Buf, pubKeyToAddress, sha256, verify } from '../util/crypto';
import { memoryBucket, persistBucket } from '../util/db';
import { calcTxRootHash } from './block';
import { Block, getHeaderByHeight, getVersion } from './blockchain';
import { calcHeaderHash } from './header';
import { Account, DBTransaction, Forger, Header, Transaction, TxPool, TxType } from './schema.s';
import { calcTxHash, serializeForgerCommitteeTx, serializeTx } from './transaction';

/**
 * 
 * @param consenseVersion 和本地版本进行比较，确认是否可以和对方通信
 */
export const checkVersion = (consenseVersion:string):boolean => {
    // TODO:
    
    return getVersion() === consenseVersion;
};

/**
 * 协议版本是否正确
 * hash是否正确
 * 签名是否正确
 * 时间戳是否低于当前时间戳+误差范围
 */
export const simpleValidateHeader = (header:Header):boolean => {
    // genesis block
    if (header.height === 1) {
        return true;
    }

    if (!checkVersion(header.version)) {
        console.log(`the consense version do not match`);

        return false;
    }
    if (calcHeaderHash(header) !== header.bhHash) {
        console.log(`header hash do not match`);

        return false;
    }
    if (!verify(hex2Buf(header.signature), hex2Buf(header.pubkey), hex2Buf(header.bhHash))) {
        console.log(`signature is wrong`);

        return false;
    }
    if (Date.now() + MAX_TIME_STAMP <  header.timestamp) {
        console.log(`the timestamp is in the future`);

        return false;
    }

    return true;
};

/**
 * 公钥和from地址是对应的
 * gas不小于系统允许的最小gas,price不小于系统允许的最小price
 * lastInputValue >= lastOutputValue + value + gas*price
 * 交易hash是否正确
 * 签名是否正确
 * 交易类型存在
 * 如果是其他交易还要检验其他交易的hash值
 * 如果是加入委员会则需要额外验证
 * to地址为上帝地址from地址和publickey是匹配的
 * value需要和stake一致
 * 如果是退出委员会则需要额外验证
 * from地址为上帝地址且to地址和publicKey是匹配的
 * 
 */
export const simpleValidateTx = (tx:Transaction):boolean => {
    const serTx = serializeTx(tx);

    if (tx.gas < MIN_GAS || tx.price < MIN_PRICE) {
        console.log(`gas price is too low`);

        return false;
    }
    if (tx.lastInputValue < tx.lastOutputValue + tx.value + tx.gas * tx.price) {
        console.log(`the account do not have enough money`);

        return false;
    }
    if (calcTxHash(serTx) !== tx.txHash) {
        console.log(`tx hash is not match`);

        return false;
    }
    if (!verify(hex2Buf(tx.signature), hex2Buf(tx.pubKey), hex2Buf(tx.txHash))) {
        console.log(`wrong signature`);

        return false;
    }
    const spendTxVerify = ():boolean => {
        if (pubKeyToAddress(hex2Buf(tx.pubKey)) !== tx.from) {
            console.log(`the pubkey do not match the from address`);
            
            return false;
        }

        return true;
    };
    const forgerTxVerify = ():boolean => {
        if (tx.forgerTx.stake < MIN_STAKE) {
            console.log(`the stake is too low`);

            return false;
        }
        if (buf2Hex(sha256(serializeForgerCommitteeTx(tx.forgerTx))) !== tx.forgerTx.forgeTxHash) {
            console.log(`forgeTxHash do not match`);

            return false;
        }

        if (tx.value !== tx.forgerTx.stake) {
            console.log(`stake and value do not match`);

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

    switch (tx.txType) {
        case TxType.SpendTx:
            return spendTxVerify();
        case TxType.ForgerGroupTx:
            return forgerTxVerify(); 
        case TxType.PenaltyTx:
            // TODO:暂未处理惩罚交易
            return false;
        default:
            return false;
    }
};

/**
 * bhHash正确
 * 交易数量不超过1000
 * 对应的区块头存在，且通过了简单验证
 * 简单验证所有交易 
 */
export const simpleValidateBlock = (block:Block):boolean => {
    // genesis block
    if (block.header.height === 1) {
        return true;
    }
    if (block.header.bhHash !== block.body.bhHash) {
        console.log(`the header and body hash do not match`);

        return false;
    }
    if (block.body.txs.length > MAX_BLOCK_TX_NUMBER) {
        console.log(`the txs amount is too large`);
        
        return false;
    }
    if (!simpleValidateHeader(block.header)) {
        console.log(`fail to verify the header`);

        return false;
    }
    for (let i = 0; i < block.body.txs.length; i++) {
        if (!simpleValidateTx(block.body.txs[i])) {
            console.log(`fail to verify the tx`);
            
            return false;
        }
    }

    return true;
};

/**
 * 父hash正确
 * 区块高度正确
 * 所有交易进行了严格验证
 * TODO:receiptRoot正确
 * forger正确&&权重正确&&总权重正确
 * 随机值正确
 * txrootHash正确
 */
export const validateBlock = (block:Block):boolean => {
    // don't need to check the gensis block
    if (block.header.height === 1) {
        return true;
    }

    if (!simpleValidateBlock(block)) {
        console.log(`simple veridate the block failed`);

        return false;
    }
    // const preHeaderTip = persistBucket(ChainHead._$info.name).get<string, [ChainHead]>(CHAIN_HEAD_PRIMARY_KEY)[0];
    const preHeader = getHeaderByHeight(block.header.height - 1);
    console.log(`################ preHeaderTip header ${JSON.stringify(preHeader)}\npreHeaderTip body ${JSON.stringify(1)}\ncurrentTip Header ${JSON.stringify(block.header)}\ncurrentTip body ${JSON.stringify(block.body)}`);

    if (block.header.prevHash !== preHeader.bhHash) {
        console.log(`Genesis hash not match`);

        return false;
    }
    
    if (preHeader.height + 1 !== block.header.height) {
        console.log(`height is wrong`);

        return false;
    }

    // const preHeader = persistBucket(Header._$info.name).get<string,[Header]>(preHeaderTip.headHash)[0];

    // if (preHeaderTip.headHash !== GENESIS.hash) {
    //     if (block.header.timestamp - preHeader.timestamp > MIN_TIME_INTERVAL * 1.5) {
    //         console.log(`the time interval is too small`);

    //         return false;
    //     }
    // }

    const forgerWeight = getForgerWeight(block.header.height, pubKeyToAddress(hex2Buf(block.header.pubkey)));
    if (forgerWeight < 0 || forgerWeight !== block.header.weight || preHeader.totalWeight + forgerWeight !== block.header.totalWeight) {
        console.log(`weight is wrong`);

        return false;
    }
    for (let i = 0; i < block.body.txs.length; i++) {
        if (!validateTx(block.body.txs[i])) {
            console.log(`fail to veridate the txs`);

            return false;
        }
    }

    if (calcTxRootHash(block.body.txs) !== block.header.txRootHash) {
        console.log(`\n\nthe txs do not match the headers \nexpect: ${calcTxRootHash(block.body.txs)}\ngot: ${block.header.txRootHash}\n\n`);

        return false;
    }

    // 随机值的验证
    const hash = blsSignHash(preHeader.blockRandom, block.header.height);
    if (!verify(hex2Buf(block.header.blockRandom), hex2Buf(block.header.forgerPubkey), hash)) {
        return false;
    }
    
    return true; 
};

/**
 * 区块放到主链上的时候需要执行严格验证
 * lastInputValue和lastOutputValue和账户信息对应
 * 如果是退出委员会则需要额外验证
 * 该用户是否在委员会中
 * 用户持有的资金是否和退出资金相同
 * 如果是加入委员会则需要额外验证
 * 该用户是否在委员会中
 */
export const validateTx = (tx:Transaction):boolean => {
    if (!simpleValidateTx(tx)) {
        console.log(`fail to simple verify the transaction`);

        return false;
    }
    let account = persistBucket(Account._$info.name).get<string,[Account]>(tx.from)[0];
    if (account === undefined) {
        account = new Account();
        account.address = tx.from;
        account.nonce = 0;
        account.inputAmount = 0;
        account.outputAmount = 0;
    }

    if (!persistBucket(DBTransaction._$info.name).get<string, [DBTransaction]>(tx.txHash)[0]) {
        console.log(`validateTx account: ${JSON.stringify(account)}\nTx: ${JSON.stringify(tx)}`);
        if (account.inputAmount !== tx.lastInputValue || account.outputAmount !== tx.lastOutputValue) {
            console.log(`the account balance do not match`);

            return false;
        }
    }

    if (tx.txType === TxType.ForgerGroupTx) {
        if (tx.forgerTx.AddGroup === true) {
            if (persistBucket(Forger._$info.name).get<string,[Forger]>(tx.from) !== undefined) {
                console.log(`this address already in forger, can not join in again`);

                return false;
            }
        } else {
            const forger = persistBucket(Forger._$info.name).get<string,[Forger]>(tx.from)[0];
            if (forger === undefined) {
                console.log(`the address is not in forger, can not exit forger`);

                return false;
            }
            if (tx.value !== forger.stake) {
                console.log(`the stake is wrong`);

                return false;
            }
        }
    }
    // TODO:暂时没有处理惩罚交易的问题

    return true;
};

export const addTx2Pool = (tx:Transaction):boolean => {
    const txPool = new TxPool();
    txPool.txHash = tx.txHash;
    txPool.tx = tx;
    memoryBucket(TxPool._$info.name).put(tx.txHash, txPool);
    console.log(`add tx ${JSON.stringify(tx.txHash)} to txpool`);

    return true;
};

export const getTxsFromPool = ():Transaction[] => {
    // 通过迭代返回pool里面的所有交易
    // TODO:
    const list:Transaction[] = [];
    const iter = memoryBucket(TxPool._$info.name).iter(null);
    let el = iter.next();
    while (el) {
        list.push((<TxPool>el)[1].tx);
        el = iter.next();
    }

    return list;
};

export const removeMinedTxFromPool = (txs: Transaction[]): void => {
    const txPoolBkt = memoryBucket(TxPool._$info.name);
    for (const tx of txs) {
        txPoolBkt.delete(tx.txHash);
    }
    console.log(`\nMined tx removed`);
};

const MAX_TIME_STAMP = 1000;// 允许一秒以内的时间戳误差
const MAX_BLOCK_TX_NUMBER = 1000;// 一个区块最多包含1000个交易
export const MIN_GAS = 1000;
const MIN_PRICE = 10;
export const GOD_ADDRESS = '00000000000000000000';
const MIN_STAKE = 100000;
const MIN_TIME_INTERVAL = 2000;
