
#[path=../util/]
use number_struct.s::{NumberStruct};

struct BlockStruct {
    key: NumberStruct,        // BlockHeader's Hash
    txHashes: [NumberStruct], // array of block's transaction hash
} 
