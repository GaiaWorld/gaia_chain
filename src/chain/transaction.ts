import { BonBuffer } from '../pi/util/bon';
import { buf2Hex, genKeyPairFromSeed, getRand, hex2Buf, pubKeyToAddress, sha256, sign } from '../util/crypto';
import { ForgerCommitteeTx, PenaltyTx, Transaction, TxType } from './schema.s';

// don't serialize tx.hash, tx.signature
export const serializeTx = (tx: Transaction): Uint8Array => {
    const bon = new BonBuffer();
    bon.writeUtf8(tx.from)
        .writeBigInt(tx.gas)
        .writeBigInt(tx.lastOutputValue)
        .writeBigInt(tx.nonce)
        .writeBin(tx.payload)
        .writeBigInt(tx.price)
        .writeUtf8(tx.to)
        .writeBigInt(tx.value)
        .writeBin(tx.pubKey)
        .writeInt(tx.txType);

    switch (tx.txType) {
        case TxType.SpendTx:
            return bon.getBuffer();
        case TxType.ForgerGroupTx:
            bon.writeBin(serializeForgerCommitteeTx(tx.forgerTx));

            return bon.getBuffer();
        case TxType.PenaltyTx:
            bon.writeBin(serializePenaltyTx(tx.penaltyTx));

            return bon.getBuffer();

        default:
    }
};

export const serializeForgerCommitteeTx = (tx: ForgerCommitteeTx): Uint8Array => {
    const bon = new BonBuffer();
    bon.writeUtf8(tx.address)
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
    tx.signature = sign(privKey, hex2Buf(tx.txHash));
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
    const bon = new BonBuffer();
    bon.writeBin(h1).writeBin(h2);

    return sha256(bon.getBuffer());
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

const testMerkleRootHash = (): void => {
    const h1 = sha256(new TextEncoder().encode('abc'));
    const h2 = sha256(new TextEncoder().encode('def'));
    const h3 = sha256(new TextEncoder().encode('ghi'));

    const root = merkleRootHash([h1, h2]);

    console.log('root hash: ', root);
};
