// cpos implemention
// need snapshot every round 
import { MAX_TIME_STAMP, VERSION } from '../params/constants';
import { Tr as Txn } from '../pi/db/mgr';
import { DEFAULT_FILE_WARE } from '../pi_pt/constant';
import { buf2Hex, hex2Buf, number2Uint8Array, verify } from '../util/crypto';
import { Logger, LogLevel } from '../util/logger';
import { calcHeaderHash } from './header';
import { Forger, ForgerCommittee, Header, Height2ForgersIndex } from './schema.s';

const logger = new Logger('CPOS', LogLevel.DEBUG);

// Get forgers at specific height, this is primarily used to verify block author
export const getForgersAtHeight = (txn: Txn, height: number, chainId: number): Forger[] => {
    const forgers = txn.query(
        [{ ware: DEFAULT_FILE_WARE, tab: Height2ForgersIndex._$info.name
            , key: `${buf2Hex(number2Uint8Array(height))}${buf2Hex(number2Uint8Array(chainId))}` }]
        , 1000
        , false
    );

    if (forgers) {
        return <Forger[]>forgers[0].value;
    }
    logger.warn(`Can not find forger snapshot at heigth ${height}`);
};

// snapshot forgers at specific height
export const writeForgersIndexAtHeight = (txn: Txn, height: number, chainId: number): void => {
    // TODO: hard code 256
    const key = `${buf2Hex(number2Uint8Array(height % 256))}${buf2Hex(number2Uint8Array(chainId))}`;
    const forgers = txn.query(
        [{ ware: DEFAULT_FILE_WARE, tab: ForgerCommittee._$info.name, key: key }], 1000, false
    );

    // height => Forgers index
    const key2 = `${buf2Hex(number2Uint8Array(height))}${buf2Hex(number2Uint8Array(chainId))}`;
    if (forgers) {
        txn.modify(
            [{ ware: DEFAULT_FILE_WARE, tab: Height2ForgersIndex._$info.name
                , key: key2, value: <Forger[]>forgers[0].value }]
            , 1000
            , false
        );
    }
    logger.warn(`No forgers at height ${height}, chainId ${chainId}`);
};

export const verifyHeader = (txn: Txn, header: Header, chainId: number): boolean => {
    if (header.version !== VERSION) {
        return false;
    }

    // check turn
    const forgers = getForgersAtHeight(txn, header.height - 1, chainId);
    if (forgers.map((f: Forger) => f.address).indexOf(header.forger) < 0) {
        logger.warn(`wrong turn to mine block, forger pubkey ${header.pubkey}`);
    }

    if (!verify(hex2Buf(header.signature), hex2Buf(header.pubkey), hex2Buf(header.bhHash))) {
        logger.warn(`wrong signature for block hash ${header.bhHash}, height ${header.height}`);

        return false;
    }

    if (calcHeaderHash(header) !== header.bhHash) {
        logger.warn(`header hash do not match`);

        return false;
    }

    if (Date.now() + MAX_TIME_STAMP <  header.timestamp) {
        logger.warn(`the timestamp is in the future`);

        return false;
    }

    return true;
};