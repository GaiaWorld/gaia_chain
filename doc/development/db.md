
# 数据库表

数据库表分为：文件表 和 内存表

## 区块头表 文件表 BlockHeader

作用：区块头hash到区块头数据的映射

Key: U256; // 块头数据的Hash，U256

Value 区块头的内容；字段

* headerSign: U520;  // 锻造者对块头的其余数据的签名，v 1B，s 32B, r 32B
* parentHash: U256;  // 父块哈希，用keccak算法
* 
* version: U32;      // 区块版本，以后解决硬分叉问题
* timestamp: U64;    // 时间戳，创建时候的Unix时间
* 
* forgeAddr: U160;   // 锻造者地址
*   
* blsRandom: H256;   // bls随机数，必要性？
* blsPubkey: H256;   // bls随机公钥，必要性？
*     bls的作用和算法接口不了解，需要调研？
* 
* txMerkle: U256;    // 交易merkle根，用keccak算法
* 
* index: U64;        // 快速索引；
* totalWeight: U64;  // 快速索引；
* groupNumber: U32;  // 同步可选；
* headerHash: U256;  // 不同步；

## 区块表 文件表 BlockTransaction

问题：分叉环境下，如何快速定位分叉，形成链条？需不需要建立 区块链表？

作用：区块头hash 到 该区块的交易的映射

Key: U256; // 块头数据的Hash，U256

Value 该区块关联的交易数组

交易完整信息，和交易表冗余，加快速度；

* nonce: U64;    // 账户发出的交易数量，用于验证是否重复发送
* fee: U64;      // U64, 为执行交易所需要的价格, 以 yGaia 为单位
* to: H160;      // 接收者地址
* value: U64;    // 转账额度，以 yGaia 为单位
* sign: U520;    // 交易发送者的签名，v 1B，s 32B, r 32B
* 
* type: TXType;   // 类型 {Default, AddForge, RemoveForge}
* userData: [U8]; // 用户数据，根据类型决定
* 
* txHash: H256;   // 上面的数据的hash
* from: H160;     // 交易的发送者地址
* lastBlockHash: U64;   // ？必要性 256-bit hash of the block todo
* lastBlockNumber: U64; // ？必要性 the block index  


## 内存池表 内存表 Mempool

作用：在内存池的交易的hash的集合；

内存池：尚未打包在区块的交易的集合；

功能需求：按交易费用进行排序，锻造者优先打包交易费用高的？

Key: U256;   // 交易数据的Hash

Value: 交易数据

## 账户表 文件表

目前可以先不考虑分叉的情况。

写时复制技术，每个区块的执行之后，状态表都有有所不同

Key: U160;  // 账号地址

Value：状态 

* address: H160;   // 地址
* nonce: U32;      // 发送过的交易数
* balance: U64;    // 余额，拥有多少 yGaia
* // 以后会有智能合约需要存储的数据

## 临时账户表 内存表

用于高层解决回滚区块技术；

每个孤立块一张表，用于记录该块已经改过的账户

每个分叉的头部会带一张这样的表，用于保存这个分叉上的改动过的账户数据。
查找的时候，如果尾端找不到账户数据，就递归往上找，找到主链为止；

Key: U256;  // 块头hash

Value：状态 

* address: H160;   // 地址
* nonce: U32;      // 发送过的交易数
* balance: U64;    // 余额，拥有多少 yGaia
* // 以后会有智能合约需要存储的数据

## 区块高度索引表 文件表 BlockHeight

作用：快速从区块高度命中区块

问题：如果不用写时复制的方案，那么如何处理分叉问题？
    每个高度的可以用多个block索引？
    下一步，可以参考：比特币，以太坊？

Key：U64;   // 区块高度

Value 区块hash

* blockHash: U256; // block的hash

## 锻造者表 Forge 文件表

作用：地址到锻造者的映射

问题1：如何保证锻造节点一定会将合法的锻造者加入委员会，还是说个别节点不让锻造者加入委员会也不重要？

    如果一定要保证：将所有委员的内容计算梅克尔hash，放到区块头？

问题2：如何发起退款；

Key：U160;  // 锻造者地址

Value 

* deposit: U64;        // 保证金
* blsRandom: U256;     // bls随机数
* blsPubKey: U256;     // 随机数对应的公钥
* isRemove: bool;      // 是否已经申请退出
* removeBlock: U256;   // 申请退出的那笔交易所在的区块Hash，离这个区块256000个高度之后才将钱退给该地址
* addBlock: U256;      // 锻造者加入或者离开区块时的区块Hash，离这个区块25600个高度之后才能加入委员会
* groupNumber: U32;    // 当前分配到的组号，0-255
* blsprivKey: U256;    // 对于节点自己的锻造者，保存自己的私钥
* weight: U64;         // 锻造者的当前的总权重

## 锻造委员会 内存数据结构

问题1：需不需要事务？需要事务就建立内存表，不需要就建立内存数据结构？

问题2：分叉时候，需要维护多个委员会？因为随机数是由上一个块提供的？

// 锻造组
ForgeGroup {
    forges: Forge[];      // 参与的锻造者，按权重排序，应该要 大堆？
}

// 委员会
Committee {
    groups: ForgeGroup[]; // 锻造组
    currentGroup: U32;    // 当前锻造者分组
    currentRandom: U256;  // 当前随机数
}

## 交易表 文件表 Transaction

文件表；

作用：交易hash 到 交易数据的集合

Key: U256; // 交易数据的Hash

Value 交易数据

* blockID: U256;  // 此字段不参与hash计算；交易所在区块的hash，如果分叉区块同时有这笔交易？？
* 
* nonce: U64;    // 账户发出的交易数量，用于验证是否重复发送
* fee: U64;      // U64, 为执行交易所需要的价格, 以 yGaia 为单位
* to: H160;      // 接收者地址
* value: U64;    // 转账额度，以 yGaia 为单位
* sign: U520;    // 交易发送者的签名，v 1B，s 32B, r 32B
* 
* type: TXType;   // 类型 {Default, AddForge, RemoveForge}
* userData: [U8]; // 用户数据，根据类型决定
* 
* txHash: H256;   // 上面的数据的hash
* from: H160;     // 交易的发送者地址
* 
* lastBlockHash: U64;   // ？必要性 256-bit hash of the block todo
* lastBlockNumber: U64; // ？必要性 the block index  
*    问题：上面两个字段的作用我还是不理解，需要调研以太坊？
