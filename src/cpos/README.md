
# 流程

## 节点 同步协议

下面所有的数字都可以通过实验来调整。

都是tcp连接，如果发现tcp连接的对方迟迟不给回应也没有广播，又没有断开连接，那么断开连接，再随机选取一个连上。
    如果连续超过一定次数对方还是这样，加入黑名单。

节点发现完成后每分钟随机选取几个节点，建立连接，互相交换当前最新区块的高度
    通过签名可以验证头部信息的正确性；

如果发现别人发过来的区块高度大于自己的区块高度，发请求获取相应范围内的区块头；
    最多只能请求200个区块的区块头；

收到区块头后，如果校验成功（比如能穿起来一条链，链头就是创世区块）
    1. 多个节点申请更多的区块头（如果还需要的话）
    2. 随机节点一段一段的申请需要的区块体（一次最多10个），必须连续
        收到的块体如果没有对应的头，直接扔掉
    3. 同时在线的连接全是TCP，而且不能超过100个，以防止网络攻击

锻造者出块后，随机选择若干节点，广播整个区块（头 + 体）

    被动收到别人的区块后，验证无误（必须能练成链），随机再选取几个节点广播区块头

    收到区块头的节点，验证无误（必须能练成链），随机在选择4个节点广播区块头
        同时如果需要，再向发送方要区块体

网络消息：具体消息需要画图确定，序列化-反序列化方法

    1. version：握手，将自己最新的块的索引给对方
        问题：具体细节，比如加密？参考以太坊wiki
    2. version-ack：回应，将最新的块的索引给对方
    
    . getheaders: rpc request, 请求一段范围内的块头，不能超过上限200，否则对方不会处理
    . getBodys： rpc request，请求一段范围的块体，不能超过20，否则对方不会处理
    . getTxs rpc 取特定hash对应的交易，一次有个上限

    . transaction，给peer发送交易
    . header，给peer发送头部
    
## 区块链的验证

1. 验证块头，和比特币一样，待补充

2. 拿到一个新块之后，需要验证的点

    块的交易hash == 快头的merkle根
    每笔交易的合法性：待补充
        签名正确，
        交易次数要和当前全局状态的交易次数相等，
        如果是加入委员会的交易，检查保证金，将他加入委员会；
            同时记住当前区块高度
        如果是移除委员会的交易，转移到移除等待队列
            同时记住当前区块高度
    如果当前新加入的等待锻造者有距离申请时25600个区块，一定 要进入委员会
        加入全局状态的merklehash，用来保证锻造者的一致性
    如果当前退出等待的锻造者有距离申请时25600个区块，一定要发起一笔退款交易，如果没发现有退款交易，该块直接作废扔掉，需要惩罚改块的锻造者吗？
        问题：当时加入委员会的交易地址是啥？
        问题：是哪个人发起了交易申请？

## 委员会的方法，供节点调用

1. addForge(随机私钥?，随机公钥，地址，保证金，当前区块高度)
    加入到节点组；
    如果有私钥，就是节点自己的地址；否则，就是收到块里面的地址

2. removeForge(地址)
    移除到等待队列

3. 验证块锻造者的合法性 checkValid(地址，当前块索引，这个块的随机) {
    判断地址是个合法的锻造者
    判断hash的正确性：上一个块的hash + 该地址的公钥
    判断组的合法性，已经该块在一个组的order，和下面函数的部分功能重复，需要抽出一部分函数出来
}

3. 可以到我出块了吗，canGenBlock(currentBlockIndex, lastBlockRanom) {
    var r = [{
        order: 次序
        address:  地址
        random： 这时候计算出来的随机数
    }];

    var targetID = currentBlockIndex % 256;
    
    for forge: 属于我的锻造者地址（必须再链上而且高度达到要求） {
        let random = lastBlockRanom + forge.randPubKey;
        let id = (currentBlockIndex.hash + random.hash + forge.address.hash) % 256;
        if (id == targetID) {
            r.push(...);
        }
    }
    return r;
}

节点：将区块链，p2p，委员会串起来的模块

1. 申请加入委员会：(地址，保证金地址，随机私钥，随机公钥，保证金)
    将私钥存；
    将地址，随机公钥，保证金，保证金地址 作为一笔交易，广播出去。
    
2. 申请退出委员会：(地址)
    将地址 作为一笔普通交易，广播出去。
    别的节点，发现地址无效，不会再次广播。

3. 节点通信和同步，以及收到别人发送的包之后的处理代码，见上面

4. 创造区块：

    每收到一个块，验证合法性后，调用canGenBlock() {
        
    }

---------------------

1. 网络同步
    从头开始，和从中间开始，有什么区别；
    如何保证信息能广播全网
    数据是从多个节点请求还是单个节点；
        如果多个，请求策略？全数据-分开？
    收到的数据分叉时的处理流程？数据同步流程。

2. cpos 

2. 验证要点：头，交易，锻造

3. 加密，随机


1. 调研网络同步 4d

2. cpos+网络同步 伪代码3d

3. 验证 + 加密 + 随机 伪代码2d
==
4. 了解平台接口层 2d
===
1. cpos+同步 6d

2. 验证要点：头，交易，锻造

3. 加密，随机

4. 调试

------------------------------

同步阻塞：6d

虚拟机复用：启动性能，可以考虑协程；1-2d
性能优化：调研1-2d
异步回调：6d

计算资源的统计：指令，内存，智能合约做准

-------------- 小燕

联调虚拟机：pi_serv 2d
编译工具测试底层库：网络，存储，虚拟机 （ts，rust） 12d
平台独立库的实现：

-------------- 罗彬

数据库联调和重构：
代码review：没有错误和警告，符合编码规范,rust格式化工具，和编码规范的编写：
维护文档:
数据库/网络长期任务: 开发和维护

Hi Stancia,
    I am sorry to tell you that I have to suspend learning English from you. We hired an American employee who graduated from the University of California, Berkeley with a doctorate. We think he is the better person to speak abroad, as I am busy and English speech is not my strength. Maybe teacher Huang will give you more details this weekend. You are a good teacher, and I am so glad to meet you. Thank you very very much. I hope you have all the best in China.

    Sure, we share the same opinion. I will still improve my English. Thank you, Stancia


    
    1. 我们的分叉会在几个区块以内结束
    2. 我们需要初始投入的资金应该占据总资金量的百分之多少才是绝对安全的
    3. 如果恶意节点想要控制整个网络，需要使用多大的资金量和采取何种手段
    4. 我们能够避免长程攻击