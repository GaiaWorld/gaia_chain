import { buf2Hex, genKeyPairFromSeed, getRand, hex2Buf, num2Buf, pubKeyToAddress, sha256, sign } from '../util/crypto';
import { ForgerCommitteeTx, PenaltyTx, Transaction, TxType } from './schema.s';

// don't serialize tx.hash, tx.signature
export const serializeTx = (tx: Transaction): Uint8Array => {
    const buf = [];
    append2Buf(buf, new TextEncoder().encode(tx.from));
    append2Buf(buf, num2Buf(tx.gas));
    append2Buf(buf, num2Buf(tx.lastOutputValue));
    append2Buf(buf, num2Buf(tx.nonce));
    append2Buf(buf, tx.payload);
    append2Buf(buf, num2Buf(tx.price));
    append2Buf(buf, new TextEncoder().encode(tx.to));
    append2Buf(buf, num2Buf(tx.value));
    append2Buf(buf, tx.pubKey);
    append2Buf(buf, num2Buf(tx.txType));

    switch (tx.txType) {
        case TxType.SpendTx:
            return new Uint8Array(buf);
        case TxType.ForgerGroupTx:
            append2Buf(buf, serializeForgerCommitteeTx(tx.forgerTx));

            return new Uint8Array(buf);
        case TxType.PenaltyTx:
            append2Buf(buf, serializePenaltyTx(tx.penaltyTx));

            return new Uint8Array(buf);

        default:
    }
};

export const serializeForgerCommitteeTx = (tx: ForgerCommitteeTx): Uint8Array => {
    const buf = [];
    append2Buf(buf, new TextEncoder().encode(tx.address));
    append2Buf(buf, num2Buf(tx.stake));

    return new Uint8Array(buf);
};

export const serializePenaltyTx = (tx: PenaltyTx): Uint8Array => {
    const buf = [];
    append2Buf(buf, num2Buf(tx.loseStake));

    return new Uint8Array(buf);
};

export const calcTxHash = (serializedTx: Uint8Array): string => {
    return buf2Hex(sha256(serializedTx));
};

export const signTx = (privKey: Uint8Array, tx: Transaction): void => {
    tx.txHash = calcTxHash(serializeTx(tx));
    tx.signature = sign(privKey, hex2Buf(tx.txHash));
};

export const append2Buf = (dest: Number[], src: Uint8Array): void => {
    for (const elem of src) {
        dest.push(elem);
    }
};

export const merkleRootHash = (txHashes: Uint8Array[]): string => {
    let hashes = [];
    for (const tx of txHashes) {
        hashes.push(tx);
    }

    if (hashes.length % 2 === 1) {
        hashes.push(hashes[hashes.length - 1]);
    }

    // tslint:disable-next-line:no-constant-condition
    while (true) {
        const newHashes = [];
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
    const buf = [];
    append2Buf(buf, h1);
    append2Buf(buf, h2);

    return sha256(new Uint8Array(buf));
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
