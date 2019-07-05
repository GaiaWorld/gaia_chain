import { BonBuffer } from '../pi/util/bon';
import { buf2Hex, sha256 } from '../util/crypto';
import { Header } from './schema.s';

export const serializeHeader = (header: Header): Uint8Array => {
    const bon = new BonBuffer();
    bon.writeUtf8(header.blockRandom)
        .writeUtf8(header.forger)
        .writeUtf8(header.forgerPubkey)
        .writeInt(header.groupNumber)
        .writeInt(header.height)
        .writeUtf8(header.prevHash)
        .writeUtf8(header.receiptRoot)
        .writeBigInt(header.timestamp)
        .writeBigInt(header.totalWeight)
        .writeUtf8(header.txRootHash)
        .writeUtf8(header.version)
        .writeBigInt(header.weight)
        .writeUtf8(header.signature);

    return bon.getBuffer();
};

export const calcHeaderHash = (header: Header): string => {
    // fill bhHash filed
    header.bhHash = buf2Hex(sha256(serializeHeader(header)));

    return header.bhHash;
};
