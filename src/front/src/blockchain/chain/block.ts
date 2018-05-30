/*
 * block

 */

// ============================== import 

import { U64, U160, U256, U520 } from "../util/number"
import { CDB, CSession } from "../../pi/db/client"
import { Item, Transaction as DBTransaction, DB } from "../../pi/db/db"
import { BlockStruct } from "./block_struct.s"

// ============================== export

export class Block extends BlockStruct {
    key: U256;        // BlockHeader's Hash
    txHashes: U256[]; // array of block's transaction hash
}