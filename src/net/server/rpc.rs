#[path=../../chain/]
use schema.s::{Transaction, Header, Body};
struct ShakeHandsInfo {
    strNetAddr:String,
    nNodeType:u8,
    strVersion:String,
    nStartingHeight:u32,
    nStartingTotalWeigth:usize,
    strGensisHash:String,
    strPublicKey:String,
}

struct GetHeaderHeight{
    strNetAddr:String,
    from:usize,
    to:usize,
    heights:[usize],
}


struct TxArray{
    arr:&[Transaction]
}

struct HeaderArray{
    arr:&[Header],
    shortIDs: HashMap<String, Option<[String]>>,
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

struct InvNet{
    net:String,
    r:Inv
}

struct InvArray{
    arr:&[Inv]
}

struct InvArrayNet{
    net:String,
    r:InvArray
}

#[primary=key,db=memory]
struct SubTable{
    key:String,
    value:&[String]
}

struct PeerTable{
    ip:String,
}