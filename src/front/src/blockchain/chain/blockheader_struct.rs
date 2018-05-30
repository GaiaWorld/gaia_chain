
#[path=../util/]
use number_struct.s::{NumberStruct};

struct BlockHeaderStruct {
    headerSign: NumberStruct,
    parentHash: NumberStruct,

    version: u32,    
    timestamp: NumberStruct,

    forgeAddr: NumberStruct, 

    blsRandom: NumberStruct, 
    blsPubkey: NumberStruct, 
    txMerkle: NumberStruct, 
}