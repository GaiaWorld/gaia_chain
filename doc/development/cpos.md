# cpos的处理流程

## 可验证的随机数 

每个区块的锻造者，都产生一个随机值；

高度为h的区块，随机值为：R(h) = Bls(R(h-1), h); R(0) = 写在代码的常量，比如0;

bls是签名算法，参数有: 私钥，Hash(消息(R(h-1), h))

每个区块都需要有如下信息：
    这个块的随机数

    生成这个随机数的私钥
    新的公钥：必要性，更安全

别人验证这个块的随机数的时候：
    找到上一个块的随机数
    该块的高度
    从块中取出私钥
    从锻造者账户中取出公钥
    验证: bls == 该块的随机数
    成功后：将新公钥放到锻造者账户中

## 奖励，惩罚，和共识

* 奖励
   + 块经过确认，其锻造者获得该块的交易费；
   + 举报的锻造者，获得被举报者的罚金，在块中产生一个举报交易
* 惩罚
   + 加入时，保证金不足1000GAIA，没收，必要性存疑？
   + 某个锻造者，在同一个区块高度，收到了同一个锻造者A发来的两个不同的区块，A的保证金没收；
      * 问题：其他节点无法验证，有可能其他节点根本没有同时收到A发来的两个不同区块，或者有延迟，需要一直保留消息；
         * 解决方法：举报交易，需要带那两个不同区块的头部信息，待其他节点验证；
* 共识
   + 主链：所有区块的 总投票权 加起来，最高的链，是主链；

## 创世区块

创世区块，生成并分配 一万亿 GAIA = 10^12 GAIA

* 9000亿 分配
* 1000亿 锻造者奖励，固定数值，每过x个区块高度就折半；
   + 问题：具体策略未定。
   + 问题：奖励过高会导致锻造者不想打包区块。
   
1 GAIA = 10^6 uGAIA 一万亿GAIA的总量已经到10^18次方，也就是2^59.7
   + 为了能让64位整数放的下，方便处理；最小单位是 uGAIA
   
## 数据结构

``` typescript

// 锻造者，一个特殊的账户
class Forge {
    address: U160;        // 地址
    deposit: U64;         // 保证金，yGaia，不小于 1000 GAIA
    blsPubKey: U256;      // bls随机数公钥
    groupNumber: U32;     // 当前所在组的组号
    
    initWeight:  U64;  // 初始权重，计算公式见下
    accWeight:   U64;  // 累计权重，供累加10次，此值相同的，地址越大越靠前
    rankWeight:  U64;  // 排名权重，前10名才有，其他的为0
    totalWeight: U64;  // 总权重 = rankWeight + accWeight
    lastBlockHeight: U64; // 上次调整accWeight时候的区块高度

    addBlockHeight: U64;  // 加入时的区块高度
    removeBlockHeight: U64; // 申请退出时的区块高度
}

// 锻造组，若干个锻造者分成一组
class ForgeGroup {
    members: Forge[];      // 该组的锻造者，按totalWeight排序，最多10个元素
}

// 锻造委员会
class ForgeCommittee {
    groups: ForgeGroup[256];   // 256组
    
    addWaits: Forge[];         // 还没有资格参与锻造的的Forge
    removeWaits: Forge[];      // 申请退出，还没有退款的Forge
}

```

## 锻造者 加入，删除

### 加入 作为特殊的交易AddForge打包到块上

加入时保证金小于10万Gaia；
    原因：只需要tx验证时候，直接过滤掉小于100,000GAIA的币即可，没必要没收掉。

加入后，需要等40,000个区块高度后，才能参与选举；

### 退出 作为特殊的交易RemoveForge打包到块上

申请退出后，需要等400,000个区块高度后，才能退回保证金；

## 参选

Forge首次参与选举时，组号是：地址最后1Byte

第 h%256 组 的锻造者 负责高度为 h 的区块的锻造；

序列化时候，需要考虑定点数格式。

accWeight = initWeight = H(R(h), h, address) * Log10(Deposit/100) ) );
    其中: H(x, y, z)的值是[1, 4]的浮点数
    具体计算公式：
        h = sha256(sha256(x...y...z);
        h = h % 128;
        随机数：1+3h/128;
            128可以改成任意2的冥（只要不超过double的整数表示），这样能保证定点分布。

下次轮到该组锻造时，对该组内距离上次256区块的锻造者，accWeight加一次，共加到10倍initWeight

``` js

    for (Forge in ForgeGroup) {
        if (Current - Forge.lastBlockHeight >= 256 && accWeight < 10 * initWeight) {
            Forge.lastBlockHeight = Current;
            accWeight += initWeight;
        }
    }

```

排序，确定排名：accWeight 从大到小；相同accWeight的，address 从大到小；

排名前10的，randWeight = 2^(11-R); // 第R个排名

totalWeight = accWeight + randWeight;

### 重新分组
    
如果某个区块被确认了，该区块的锻造者，以及totalWeight更大的锻造者，都要重新分组，并且重置initWeight和accWeight；

分组 = Hash(address..CurrentBlockHeight..CurrentBlockHash)[最后1Byte];
    accWeight = initWeight = 重新计算，公式同上;

## 区块发送策略

### 最短出块时间 timestamp约束

创世区块写死了最短出块时间 T = 2秒;

问题：如何防止出块时间过快？

**验证**：收到一个块，该块和上一块的时间差小于 T/2，该块无效

### 建议发送策略

问题：为了拿锻造奖励，没有交易，锻造者也会倾向于立即发块？

当前锻造组

第1名的锻造者，必须等到 满足 timestamp约束 之后才能发块；假设为等待时间为t

for i = 2 : 10: 
    第i名，在 t+i 秒 内没有收到同组前面锻造者发过来的区块，立即广播自己锻造的区块；

## 锻造委员会相关的验证

一个全节点，收到高度为H的块Block后，需要验证的，和委员会的要点如下

* addWaits 有没有高度为40,000的锻造者，如果有，加到自己的委员会。
* 如果退款交易的高度要超过400,000
* 出块时间：Block和上一块的时间差小于 T/2，该块无效；
* 随机值：通过计算，必须等于Block里面写出来的随机值；而且根据该随机值进行相关人员的重新分组和重置权重。
