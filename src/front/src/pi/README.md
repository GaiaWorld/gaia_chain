# 一个比VUE更好的前端框架

vue基本流程介绍:
![vue](./wikiimg/vueLifecycle.svg)


pi基本流程介绍:
![pi](./wikiimg/piLifecycle.svg)


## 我们的优势

dom生成机制：  
- vue：先错误dom再正确dom  
- pi:直接生成正确的dom  

渲染机制：
- vue:不区分帧，直接渲染
- pi:通过帧调度机制进行渲染

dom比较机制：
- vue:只区分动态节点和静态节点逐层扫描比较，遍历所有节点
- pi:直接比较hash值，不需要层层遍历

数据到渲染:
- vue:所有数据都添加getter/setter方法，通过观察者模式调用update方法进行更新
- pi:数据改变之后手动更新数据

事件传递机制：
- vue:封装addeventlistern方法
- pi:封装addeventlistern方法

语法支持：
- for if
- for if while

## 我们的劣势

模板支持：
- vue:可以在html中正常显示
- pi: 无法在html中正常显示

生态系统：
- vue:打包+加载+路由+IDE+浏览器插件
- pi:打包+加载+编辑器
- 测试工具

一体化：
- vue:只需要懂js就能运行
- pi:还需要erlang服务端

组件：
- vue:较丰富的第三方组件库
- pi:组件较少

文档：
- 丰富的官方和第三方文档
- 几乎没有正式文档

社区：
- 活跃的社区
- 。。。

调试：
- 精确地报错，IDE级别的错误提示
- 报错过于模糊，难于查找原因

# 组件系统

## 为什么需要组件系统？

1. 提高代码的复用,减少重复工作
	- 组件级别的复用(提供通用组件)
	- 脚本的复用
	- 模板的复用
	- 样式的复用(提供了常用的样式库/动画库)

例如：加载一个计算器

`<div><calendar></calendar></div>`

2. 提高编码效率
	- 提供了样式的局部作用域
	- 提供可编程模板
	- 数据和显示的分离=>更好的前端分工，写逻辑的人只关心数据变化，不管关心界面变化
	- 无需手动操作DOM=>代码更简介，不要关注烦人的dom操作


3. 提高显示效果
	- 高效的帧管理，要么全部更新，要么不更新，保证画面不会闪烁
	- 精确的DOM更新，保证只刷新真正需要刷新的部分

## 一个最简单的组件

hello_world.tpl

![hello_world_tpl](./wikiimg/hello_world_tpl.png)
![hello_world_show](./wikiimg/hello_world_show.png)

## 组件实例

一个组件由4部分组成，只有tpl是必须的，其他是可选的

- xxx.tpl:定义了模板,每一个组件都必须有tpl
- xxx.css:定义了局部样式,对于没有局部样式的组件则不需要
- xxx.ts:用于对数据进行操作，如果没有数据，或者没有逻辑则不需要
- xxx.widget：定义了一个组件的名称和对应的tpl/css/ts文件路径，如果没有改文件，则会使用默认组件名(默认组件名为全路径，同java)和默认路径下的文件

组件是可以嵌套的
![multi_wgt](./wikiimg/multi_wgt.png)   
![multi_wgt_show](./wikiimg/multi_wgt_show.png)


__模板__

模板用来组织界面的展现方式。模板可以处理显示逻辑，理论上所有的页面展示都应该是通过模板完成的。不应该使用JS去直接操作dom

模板的逻辑处理能力：

1. 定义变量   
	`{{let x = 2}}`

2. 执行代码   
	`{{: list[0] = 1}}`

3. 循环   
	`{{for key, value of it.arr}}`   
	`...`   
	`{{end}}`

4. 条件判断  

    `{{if it.isOK}}`   
	 `...`   
	`{{elseif it.size + 1 > x}}`   
	 `...`   
	`{{else}}`   
	 `...`   
	`{{end}}`   

5. 注释   
	`{{% 我是注释}}`

6. 输出表达式的值   
	`{{(i > 0) ? 1 : 0 }}`

模板的高级功能：

1. 获取当前路径   
	`{{_path}}`
2. 获取模块   
	`{{: _get("my_module").func1()}}`
3. 获取配置表(我也没用过~~~~(>_<)~~~~)   
	`{{_cfg}}`

4. 声明默认数据   
	`{{:it = it || {index:1, start:2}}}`

__样式__

包括全局样式和局部样式

全局样式是指通过index.html直接引入的普通css

局部样式是指写在WCSS中的样式，语法同css，但是只支持class选择器

局部样式的用法(参见example 6)：

1. 优先级 style > ~clazz > class
	
	test.wcss   
	`.redColor{background-color:red;}`

	test.css   
	`.blueColor{background-color:blue;}`

	test.tpl   
	`<div ~clazz="redColor" class = "blueColor" style="background-color:yellow">i am yellow</div>`


2. 局部作用域
	- 从子组件向上查找，找到的第一个同名class即为 class
	- 同一属性，父wcss > 子wcss

	father.wcss   
		`.a{background-color:red;}`   
		`.b{font-size:80px;}`

	father.tpl
		`略`

	child.wcss  
		`.a{backgournd-color:blue;font-size:40px;}`

	child.tpl   
		`<div ~clazz = "a b"> i am blue, and 80px</div>`

__脚本__

本质上是继承自Widget模块的普通TS模块
1. 事件响应
2. 数据处理

__双循环和生命周期函数__

![双循环](./wikiimg/双循环.png)

## 数据绑定和传递

#### 有两种类型的数据props和state

1. 在模板中只有子组件的props属性才能收到父组件传递过来的值
2. 模板中it代表props，it1代表state
3. props和state的值都可以在脚本中进行设置，props的值也可以通过父组件传递而得到
4. 理论上我们希望props上绑定是需要在tpl上传递的数据，state保存组件自己的数据，如果你非不这么做，其实影响也不大~~~~(>_<)~~~~


#### 数据可以直接通过tpl向下传递(参见example debug_data_pass)

![data_pass](./wikiimg/data_pass.png)

![data_pass_show](./wikiimg/data_pass_show.png)


## 事件处理

同时原生事件和自定义事件

原生事件是指H5本来就支持的事件类型

- 所有的而原生事件都以on-/cap-开头
- on-代表传递方式为冒泡
- cap-代表传递方式为捕获

自定义事件是指用户自己定义的事件

- 自定义事件以ev-开头
- notify函数用来发送自定义事件

![event](./wikiimg/event.png)


1. 上手困难 => 
2. 例子跑不起来 =>
3. 例子缺乏文档 =>
4. 代码库太重了 =>