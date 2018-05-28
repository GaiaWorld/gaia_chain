/*
 * block
 */

// ============================== import 

import {U64, U160, U256, U520} from "../util/number"

// ============================== export

export class Block {
    key: U256;        // BlockHeader's Hash
    txHashes: U256[]; // array of block's transaction hash
}

