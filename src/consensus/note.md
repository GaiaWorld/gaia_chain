## 2019/7/1

- 验证交易是否合法的细节，如签名、余额等 (1d, 签名和验证的底层实现在调查问题)
    - 签名
    - 余额
    - nonce
    - ...
- 验证区块是否合法的细节, 如版本号、区块大、出块时间等 (1.5d, 需要引入计算默克尔哈希的外部库)
    - 版本号
    - 区块大小
    - 出块时间
    - 交易的默克尔哈希
    - 收据的默克尔哈希
    - 随机数
    - ...

- 交易池实现 (4h)
    - 交易排序策略
    - 不同交易类型的优先打包策略
    - 打包后的交易不超过区块大小的限制

- 根据上周五开会的结果调整一些数据结构（4h)

- 挖矿节点同步 (8h)
    - 根据握手信息判断区块是否与连接的节点中权重最高的节点同步
    - 同步完成之后如果是挖矿节点则构建矿工委员会
    - 启动挖矿流程

- 矿工委员会权重的调整方法重写(8h)
    - 初始为创世区块的矿工配置
    - 找到加入和退出矿工委员会的交易构建出最新的矿工委员会

- 出块 (2h)
    - 从交易池取未打包交易
    - 构造header
    - 构造body
    - 产生随机数
    - 签名
    - 广播区块

- 写脚本构造创世区块 (2h)
    - 初始矿工委员会
    - 初始账户信息

- 实现一个产生指定区块数量的测试函数 (2h)
    - 比如生成一个具有5个区块的区块链


#### 参考链接

1. [Grin是如何同步的](https://github.com/mimblewimble/grin/blob/master/doc/chain/blocks_and_headers.md)
2. [DPoS的工作原理](https://steemit.com/dpos/@dantheman/dpos-consensus-algorithm-this-missing-white-paper)
3. [bitshares DPoS](https://bitshares.org/technology/delegated-proof-of-stake-consensus/)
4. [go-ethereum处理分叉代码](https://github.com/ethereum/go-ethereum/blob/d6ccfd92f736bdfac1a9ed094d201d2a3256dfb2/core/blockchain.go#L1797)