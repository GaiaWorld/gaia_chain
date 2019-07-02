import { buf2Hex, genKeyPairFromSeed, getRand, hex2Buf, num2Buf, pubKeyToAddress, sha256, sign } from '../util/crypto';
import { ForgerCommitteeTx, PenaltyTx, Transaction, TxType } from './schema.s';

// don't serialize tx.hash, tx.signature
export const serializeTx = (tx: Transaction): Uint8Array => {
    const buf = [];
    pushBuf(buf, new TextEncoder().encode(tx.from));
    pushBuf(buf, num2Buf(tx.gas));
    pushBuf(buf, num2Buf(tx.lastOutputValue));
    pushBuf(buf, num2Buf(tx.nonce));
    pushBuf(buf, tx.payload);
    pushBuf(buf, num2Buf(tx.price));
    pushBuf(buf, new TextEncoder().encode(tx.to));
    pushBuf(buf, num2Buf(tx.value));
    pushBuf(buf, tx.pubKey);
    pushBuf(buf, num2Buf(tx.txType));

    switch (tx.txType) {
        case TxType.SpendTx:
            return new Uint8Array(buf);
        case TxType.ForgerGroupTx:
            pushBuf(buf, serializeForgerCommitteeTx(tx.forgerTx));

            return new Uint8Array(buf);
        case TxType.PenaltyTx:
            pushBuf(buf, serializePenaltyTx(tx.penaltyTx));

            return new Uint8Array(buf);

        default:
    }
};

export const serializeForgerCommitteeTx = (tx: ForgerCommitteeTx): Uint8Array => {
    const buf = [];
    pushBuf(buf, new TextEncoder().encode(tx.address));
    pushBuf(buf, num2Buf(tx.stake));

    return new Uint8Array(buf);
};

export const serializePenaltyTx = (tx: PenaltyTx): Uint8Array => {
    const buf = [];
    pushBuf(buf, num2Buf(tx.loseStake));

    return new Uint8Array(buf);
};

export const calcTxHash = (serializedTx: Uint8Array): string => {
    return buf2Hex(sha256(serializedTx));
};

export const signTx = (privKey: Uint8Array, tx: Transaction): void => {
    tx.txHash = calcTxHash(serializeTx(tx));
    tx.signature = sign(privKey, hex2Buf(tx.txHash));
};

const pushBuf = (dest: Number[], src: Uint8Array): void => {
    for (const elem of src) {
        dest.push(elem);
    }
};

const testSerializeTx = (): void => {
    const [privKey, pubKey] = genKeyPairFromSeed(getRand(32));

    const tx = new Transaction();
    tx.from = pubKeyToAddress(pubKey);
    tx.gas = 1000;
    tx.lastOutputValue = 1000;
    tx.nonce = 1;
    tx.payload = new TextEncoder().encode('abc');
    tx.price = 10;
    tx.pubKey = pubKey;
    tx.to = pubKeyToAddress(pubKey);
    tx.txType = TxType.SpendTx;
    tx.value = 100;

    signTx(privKey, tx);
    console.log('txHash: ', tx.txHash);
    console.log('tx sig: ', buf2Hex(tx.signature));
};
