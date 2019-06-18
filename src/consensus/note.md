1. 作恶惩罚数据结构
2. 区块大小字段哪里
3. 是否还有其他交易类型

1. 初始阶段的分组从gensis配置文件预定义加载
2. 调整分组的方法
3. 什么时候应该产生区块，未及时收到区块的处理
4. 根据区块号来判断应该谁出块 （如果有一个分组再极端情况下确实没有出块，该怎么办？)
5. 与其他模块的通信（新区块到来，挖到了新区块广播)
6. 新加入节点如何同步委员会？？？
7. 孤儿块池

1. 分叉很多的时候委员会的修改回退问题
2. 处理块，手续费

## 目前的进度

1. 完成了锻造委员会，参考了其他区块链项目处理分叉的细节，原先定的多mgr处理分叉的方法有待商榷
2. 简单的事件分发器，区块链状态的改变由事件驱动，比如说来了新的交易，来了新的区块，挖到了新的区块，长生了分叉等事件
3. 区块链的骨架
4. 仿照以太坊抽象出了存储接口


## unresolved questions

1. 矿工每次出块完了之后调整分组的必要性？
    - 矿工趋利，委员会的投票权重会达到自动平衡，不需要再分组打乱
    - 当前矿工出块之后，投票权变为初始值，当前分组下的矿工投票权重重新排序
    - 即使这样也无法解决富者越富，穷者越穷的问题，因为权重的计算和持有的token数量有关

2. 新加入矿工同步委员会的复杂性
    - 同步

3. 分叉
    - 诚实节点总是选择权重最高的链
    - 以太坊处理分叉
    - grin处理分叉

4. js运行后台任务

#### 参考链接

1. [Grin是如何同步的](https://github.com/mimblewimble/grin/blob/master/doc/chain/blocks_and_headers.md)
2. [DPoS的工作原理](https://steemit.com/dpos/@dantheman/dpos-consensus-algorithm-this-missing-white-paper)
3. [bitshares DPoS](https://bitshares.org/technology/delegated-proof-of-stake-consensus/)
4. [go-ethereum处理分叉代码](https://github.com/ethereum/go-ethereum/blob/d6ccfd92f736bdfac1a9ed094d201d2a3256dfb2/core/blockchain.go#L1797)