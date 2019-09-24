// cpos implemention
// need snapshot every round 
import { Tr as Txn } from '../pi/db/mgr';
import { DEFAULT_FILE_WARE } from '../pi_pt/constant';
import { buf2Hex, number2Uint8Array } from '../util/crypto';
import { Logger, LogLevel } from '../util/logger';
import { Forger, ForgerSnapshot } from './schema.s';

const logger = new Logger('CPOS', LogLevel.DEBUG);

// Get forgers at specific height
export const getForgersAtHeight = (txn: Txn, height: number, chainId: number): Forger[] => {
    const forgers = txn.query(
        [{ ware: DEFAULT_FILE_WARE, tab: ForgerSnapshot._$info.name
            , key: `${buf2Hex(number2Uint8Array(height))}${buf2Hex(number2Uint8Array(chainId))}` }]
        , 1000
        , false
    );

    if (forgers) {
        return <Forger[]>forgers[0].value;
    }
    logger.warn(`Can not find forger snapshot at heigth ${height}`);
};