import { BonBuffer } from '../pi/util/bon';
import { buf2Hex, genKeyPairFromSeed, getRand, hex2Buf, pubKeyToAddress, sha256, sign } from '../util/crypto';
import { persistBucket } from '../util/db';
import { Account, ForgerCommitteeTx, PenaltyTx, Transaction, TxType } from './schema.s';
import { GOD_ADDRESS } from './validation';

// don't serialize tx.hash, tx.signature
export const serializeTx = (tx: Transaction): Uint8Array => {
    const bon = new BonBuffer();
    bon.writeUtf8(tx.from)
        .writeBigInt(tx.gas)
        .writeBigInt(tx.lastInputValue)
        .writeBigInt(tx.lastOutputValue)
        .writeBigInt(tx.nonce)
        .writeUtf8(tx.payload)
        .writeBigInt(tx.price)
        .writeUtf8(tx.to)
        .writeBigInt(tx.value)
        .writeUtf8(tx.pubKey)
        .writeInt(tx.txType);

    switch (tx.txType) {
        case TxType.SpendTx:
            break;
            
        case TxType.ForgerGroupTx:
            bon.writeBin(serializeForgerCommitteeTx(tx.forgerTx));
            break;
        case TxType.PenaltyTx:
            bon.writeBin(serializePenaltyTx(tx.penaltyTx));
            break;

        default:
    }

    return bon.getBuffer();
};

export const serializeForgerCommitteeTx = (tx: ForgerCommitteeTx): Uint8Array => {
    const bon = new BonBuffer();
    bon.writeBool(tx.AddGroup)
        .writeUtf8(tx.blsPubKey)
        .writeUtf8(tx.address)
        .writeBigInt(tx.stake);

    return bon.getBuffer();
};

export const serializePenaltyTx = (tx: PenaltyTx): Uint8Array => {
    const bon = new BonBuffer();
    bon.writeBigInt(tx.loseStake);

    return bon.getBuffer();
};

export const calcTxHash = (serializedTx: Uint8Array): string => {
    return buf2Hex(sha256(serializedTx));
};

export const signTx = (privKey: Uint8Array, tx: Transaction): void => {
    tx.txHash = calcTxHash(serializeTx(tx));
    tx.signature = buf2Hex(sign(privKey, hex2Buf(tx.txHash)));
};

export const buildSignedSpendTx = (privKey: string, pubKey: string, fromAddr: Account, toAddr: string, value: number, gas: number, gasPrice: number, payload: string): Transaction => {
    const tx = new Transaction();
    tx.from = fromAddr.address;
    tx.gas = gas;
    tx.lastInputValue = fromAddr.inputAmount;
    tx.lastOutputValue = fromAddr.outputAmount;
    tx.nonce = fromAddr.nonce + 1;
    tx.payload = payload;
    tx.price = gasPrice;
    tx.pubKey = pubKey;
    tx.to = toAddr;
    tx.txType = TxType.SpendTx;
    tx.value = value;

    signTx(hex2Buf(privKey), tx);

    return tx;
};

export const buildSignedCommitteeTx = (privKey: string, pubKey: string, blsPubKey: string, fromAddr: Account, stake: number, addGroup: boolean, gas: number, gasPrice: number, payload: string): Transaction => {
    const tx = new Transaction();
    tx.from = fromAddr.address;
    tx.gas = gas;
    tx.lastInputValue = fromAddr.inputAmount;
    tx.lastOutputValue = fromAddr.outputAmount;
    tx.nonce = fromAddr.nonce + 1;
    tx.payload = payload;
    tx.price = gasPrice;
    tx.pubKey = pubKey;
    tx.to = GOD_ADDRESS;
    tx.txType = TxType.ForgerGroupTx;
    tx.value = stake;

    const fct = new ForgerCommitteeTx();
    fct.AddGroup = addGroup;
    fct.address = fromAddr.address;
    fct.stake = stake;
    fct.blsPubKey = blsPubKey;
    fct.forgeTxHash = buf2Hex(sha256(serializeForgerCommitteeTx(fct)));

    tx.forgerTx = fct;

    signTx(hex2Buf(privKey), tx);

    return tx;
};

// TODO:TM REVIEW
export const merkleRootHash = (txHashes: Uint8Array[]): string => {
    if (txHashes.length === 0) {
        return buf2Hex(sha256(new TextEncoder().encode('')));
    }
    let hashes = [];
    for (const tx of txHashes) {
        hashes.push(tx);
    }

    // tslint:disable-next-line:no-constant-condition
    while (true) {
        const newHashes = [];

        if (hashes.length % 2 === 1) {
            hashes.push(hashes[hashes.length - 1]);
        }

        for (let i = 0; i < hashes.length; i += 2) {
            newHashes.push(doubleSha256(hashes[i], hashes[i + 1]));
        }
        hashes = newHashes;
        if (hashes.length === 1) {
            break;
        }
    }

    return hashes[0];
};

const doubleSha256 = (h1: Uint8Array, h2: Uint8Array): Uint8Array => {
    const bon = new BonBuffer();
    bon.writeBin(h1).writeBin(h2);

    return sha256(bon.getBuffer());
};

export const testSerializeTx = (): void => {
    const [privKey, pubKey] = genKeyPairFromSeed(getRand(32));

    const tx = new Transaction();
    tx.from = pubKeyToAddress(pubKey);
    tx.gas = 1000;
    tx.lastOutputValue = 1000;
    tx.nonce = 1;
    tx.payload = 'abc';
    tx.price = 10;
    tx.pubKey = buf2Hex(pubKey);
    tx.to = pubKeyToAddress(pubKey);
    tx.txType = TxType.SpendTx;
    tx.value = 100;

    signTx(privKey, tx);
    console.log('txHash: ', tx.txHash);
    console.log('tx sig: ', tx.signature);

    const bkt = persistBucket(Transaction._$info.name);
    bkt.put(tx.txHash, tx);

    console.log(bkt.get(tx.txHash));
};

const testMerkleRootHash = (): void => {
    const h1 = sha256(new TextEncoder().encode('abc'));
    const h2 = sha256(new TextEncoder().encode('def'));
    const h3 = sha256(new TextEncoder().encode('ghi'));

    const root = merkleRootHash([h1, h2]);

    console.log('root hash: ', root);
};
