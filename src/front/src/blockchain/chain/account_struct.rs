
#[path=../util/]
use number_struct.s::{NumberStruct};

struct AccountStruct {
    address: NumberStruct,    // the address of account
    count: u32,               // the count of transactions from the account
    balance: NumberStruct,    // the current uGaia of the account
}
 