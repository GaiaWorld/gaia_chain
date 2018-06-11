# 验证

## 功能概述

* 验证交易
* 验证块

## 验证交易

### 数据结构

``` ts

class Transaction {
    count: U64;    // 当前from账号已发出的交易序号，一定要和当前全局状态的保持连续
    fee: U64;      // 交易费
    to: U160;      // 接收者地址
    value: U64;    // 转账费用
    
    txType: U8;    // Default=1, AddForge=2, RemoveForge=3
    userData: Uint8Array; // userData，具体数值跟txType有关
    
    sign: U520;    // 发送者签名，不参与hash计算
    
    // 下面字段作为索引，不发送到网络

    txHash: U256;   // 交易hash，计算时，排除掉sign
    from: U160;     // 发送者地址，可以从sign中恢复
}

```

* 交易集合：都是和分支相关的状态，注意！
    + 孤儿交易集：用来放不连续的count的交易
    + 内存池：该链 没有的交易

### tx验证流程 

* MAX_COIN_COUNT GAIA币的最大值，以yGAIA为单位；

不满足下面任何一条“验证”，有无特殊说明，则直接扔掉tx

01. 验证：fee > 0, fee <= MAX_COIN_COUNT； 
02. 验证：value >= 0, value <= MAX_COIN_COUNT；
03. 验证：txType是1，2，3之一；当为1或3时，userData必须为null；
04. 计算 txHash；
05. ？验证：在 内存池 和 ？？的区块里 找 不 到 txHash；（当前链，问题：切换链时怎么处理）
06. 验证：对txHash的签名sign
07. 从txhash和sign还原发送者的地址from；
08. 验证：from是有效的地址，符合checksum
09. 验证：to是有效的地址，符合checksum
10. ？验证：在 主链？ 或者 内存池 找 from 对应的账户 FromAccount，符合：count == 1 + FromAccount.count
   * 如果找不到FromAccount，将tx扔到孤儿交易集合中；退出验证流程；
11. ？如txType = 2，代表是锻造者申请加入
   * 验证：userData.length == ？？？
12. 如txType = 3，代表是锻造者申请退出
   * 验证：userData == null
13. 对 孤儿交易池 中的 每笔交易t，如 t.from == tx.from && t.count == tx.count+1，对t进行递归验证交易流程

## 收到块头时的验证

### 数据结构

``` ts

class BlockHeaderStruct {
    parentHash: U256;  // hash of parent's header

    version: U32;      // version of the block
    timestamp: U64;    // unix time stamp

    blsRandom: U256;   // bls random ?
    blsPubkey: U256;   // bls public key ?
    txMerkle: U256;    // merkle hash of the block's transparents

    headerSign: U520;  // Forge's signature for the headers

    // the follow feild is use for index

    height: U64;       // hegiht of block
    totalWeight: U64;  // total weight from generic to this block
    groupNumber: U32;  // the group number of the forge which generate the block
    headerHash: U256;  // the header's hash
    forgeAddr: U160;   // the address of forge
}

```

### 区块 验证

不满足下面任何一条“验证”，有无特殊说明，则直接扔掉

* BLOCK_VERSION = "BLOCK_1"   // 块协议的版本字符串  
* MIN_FORGE_DELTA = 2 * 1000; // 最短出块时间，单位：毫秒

01. 验证：version == BLOCK_VERSION
02. 去掉headerSign，对非index字段计算headerHash
03. 验证: headerSign的正确性
04. 从headerSign和headerHash恢复forgeAddr
05. 验证：根据parentHash找父区块ParentHeader (到所有分支的全局状态找)
   * 找不到，放到孤儿块集合，退出验证流程；
06. 验证：timestamp >= ParentHeader + MIN_FORGE_DELTA / 2
07. 验证：timestamp < localTime + 10 * MIN_FORGE_DELTA
08. 验证：根据ParentHeader，blsRandom，blsPubkey验证blsRandom的正确性；
09. 验证：块交易符合txMerkle
10. 将块加入链，对于块中的每笔交易tx：
    01. 将所有的状态数据切换到链：parentHeader所在的分支
    02. 验证：执行 “tx验证流程”
    03. 从tx.from找FromAccount
    04. 验证：tx.count = FromAccount.count + 1
    05. 验证：FromAccount.balance >= tx.fee + tx.value
    06. 如果没有toAccount，则创建之
    07. 如 txType == AddForge，则：
       01. userData.1000Gaia，被没收掉；
    原因：只需要tx验证时候，直接过滤掉小于1000GAIA的币即可，没必要没收掉。
    问题：谁将那笔加入交易打到区块的，谁就获得那笔没收掉的保证金。

加入后，需要等40000个区块高度后，才能参与选举；
    08. 如 txType == RemoveForge，则：