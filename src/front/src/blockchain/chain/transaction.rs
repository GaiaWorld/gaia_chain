
#[path=../util/]
use number_struct.s::{NumberStruct};

struct TransactionStruct {
    count: NumberStruct,     // current transaction count
    fee: NumberStruct,       // the fee of transaction given the forge
    to: NumberStruct,        // the address of receiver
    value: NumberStruct,     // receiver's value
    sign: NumberStruct,      // sender's signature
    txType: u8,              // type
    userData: [u8],          // userData
} 