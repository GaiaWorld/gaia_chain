#[path=../../chain/]
use schema.s::{Transaction, Header, Body};
struct ShakeHandsInfo {
    strVersion:String,
    nStartingHeight:u32,
    nServiceFlags:u8,
    nNodeType:u8,
    strLocalClientAddr:String,
    strLocalServerAddr:String,
    nPublicKey:String,
    nLocalHostNonce:u32,
    bPing:bool,
    bPong:bool
}

struct TxArray{
    arr:&[Transaction]
}

struct HeaderArray{
    arr:&[Header]
}

struct BodyArray{
    arr:&[Body]
}

struct AddrArray{
    arr:&[String]
}

struct Inv{
    height:u32,
    hash: String,
    MsgType: String
}

struct InvArray{
    arr:&[Inv]
}

