---
title: React 源码解析 - renderRoot 完成节点更新任务
date: 2019-06-21 18:08:07
tags: react
---
## completeUnitOfWork

当 beginWork 遍历到 fiber 树的单侧最下方时 next 为 null，这时候就会调用 completeUnitOfWork 完成节点并按遍历顺序设置新的 next 进行操作![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401695136696835.png)

### performUnitOfWork 遍历 fiber 树的顺序
![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_660_6601695136697475.png)

### 核心功能
+ 根据是否中断调用不同的处理方法
+ 当一侧的子节点被 beginWork 更新组件完了执行
+ beginWork 完成各个组件的 update，然后返回他的 child
+ 判断是否有兄弟节点来执行不同的操作
+ 完成节点之后复 effect 链

## completeUnitOfWork 没有报错的处理流程
+ 当 workInProgress.effectTag 标记的不是 Incomplete，没有错误捕获
```
if ((workInProgress.effectTag & Incomplete) === NoEffect) { //.. }
```
+ completetWork 完成节点更新
+ resetChildExpirationTime 重置 childExpirationTime
+ 构建 effect 链
+ 按照遍历 fiber 树的顺序确定下 next 节点

### resetChildExpirationTime 重置 workInProgress.childExpirationTime
+ 在 completeWork 完成节点更新后执行
+ 重置的是 workInProgress 上的 childExpirationTime 属性
+ 在当前节点上找到子节点把所有子节点中不是 NoWork 的最早过期时间赋值给当前节点的 childExpirationTime
+ childExpirationTime 来表示当前节点所有子节点中最高的更新的优先级![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401695136698102.png)

## completeWork 完成节点更新

### 核心功能
+ pop 出各种 context 相关功能
+ 对 HostComponent 进行初始化
+ 初始化监听事件
+ 对大部分 tag 不进行操作或者只是 pop context
+ 只有 HostComponent, HostText, SuspenseComponent 有操作

## HostComponent tag 的更新
tag 为 HostComponent 表示普通 dom 节点，如: div

### 核心功能
+ diffProperties 计算需要更新的内容
+ vdom 进行对比是否真的要更新
+ 不同 dom property 处理方式不同
+ 根据 current 原 fiber 节点和 workInProgress.stateNode 当前 dom 判断首次渲染还是更新渲染

### 初始更新
+ createInstance 根据当前更新的节点创建新的 dom 对象并记录创建的 fiber 和 props 属性
+ appendAllChildren 构建 dom 树，遍历顺序是从底向上只构建第一层的 child, child.sibling
+ finalizeInitialChildren 初始化属性，初始化事件监听
+ markUpdate 标记 effect = UPDATE，在 workInProgress.stateNode 上记录 instance ![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401695136698917.png)

### createInstance 创建 dom
+ 创建 dom 节点
+ 在 dom 节点对象上记录此次创建的 fiber 和 props 信息![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401695136699630.png)
+ createElement 创建 dom 对象![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401695136700391.png)

### appendAllChildren 构建 dom 树
构建 dom 树， 都是 append 第一层 child 和 child.sibling，不会 append 嵌套的，嵌套的会在他自己是 workInProgress 时 append![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401695136701089.png)

### finalizeInitialChildren 初始化属性，初始化事件监听
+ 事件监听初始化
+ 执行 setInitialProperties
+ 返回 shouldAutoFocusHostComponent 告知是否需要 auto focus
+ switch 必要标签的操作
+ 绑定事件 trapBubbledEvent, 区分事件类型实现不同的事件绑定
+ input option select textarea 交互组件有不同的操作
  [](https://upload-images.jianshu.io/upload_images/2155778-259ae7a1673dc7da.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)
+ 执行 setInitialProperties 对应不同标签绑定事件![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401695136701883.png)
+  再执行 setInitialDOMProperties
```
// ...
  setInitialDOMProperties(
    tag,
    domElement,
    rootContainerElement,
    props,
    isCustomComponentTag,
  );
```
+ setInitialDOMProperties 设置属性和事件绑定 ![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401695136702651.png)
+ ensureListeningTo 事件绑定![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401695136703403.png)
+ listenTo 进行绑定事件![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401695136704190.png)

## HostComponent 更新 DOM 时进行的 diff 判断
![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401695136704955.png)

### updateHostComponent
![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401695136706089.png)

### diffProperties
+ 根据不同的节点做不同的操作
+ 生成 updatePayload 赋值给 workInProgress.updateQueue
+ 最后标记 workInProgress.effect = UPDATE
+ 虚拟 dom 就是根据 props 描述生成的 dom 对象
+ 根据不同标签节点提取新老 props 准备比较![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401695136706875.png)
+ 第一次遍历老 props 把要删除的属性都设置为 null![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401695136707659.png)
+ 第二次遍历新 props![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401695136708436.png)
+ 比较 style 样式对象, 最后`(updatePayload = updatePayload || []).push(STYLE, styleUpdates);`![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401695136709212.png)
+ 最后 return  updatePayload:  `[k1,v1,k2,v2,k3,v3]` 的属性


## completeWork 对于 HostText 的更新
+ 核心是 document.createTextNode![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401695136709998.png)


## renderRoot 错误处理
![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401695136710777.png)


### 核心
+ 给报错的节点增加 Incomplete 副作用 effect
+ 给父链上具有 error boundary 的节点增加副作用
+ 创建错误相关的更新

### onUncaughtError
+ 致命错误设置为 NoWork，不构建 effect 链
+ nextFlushedRoot.expirationTime = NoWork;  取消当前 root 的更新

### throwException
+ 错误处理 给报错节点组件 增加 Incomplete effect，
+ 清空报错节点的 effect 链
+ suspened 异步组件抛出的 promise
+ 构建错误对象![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401695136711564.png)

### throwException 处理错误节点
+ 向上遍历 class 组件找可以处理错误的 class 组件生命周期
+ 一直找到 Root 节点执行内置错误处理
+ 给能处理错误的节点组件的 effect 都加了 ShouldCapture
+ 创建错误更新，入 workInProgress.updateQueue 更新队列来更新
+ getDerivedStateFromError 生命周期直接赋值在 update.payload 上
+ componentDidCatch 生命周期作为 callback 处理![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401695136712257.png)
+ createClassErrorUpdate 创建 class 组件处理错误的 update![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401695136713014.png)
+ createRootErrorUpdate 创建 root 节点处理错误的 update![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401695136713782.png)
+ 最后 enqueueCaptureUpdate，类似 enqueueUpdate 交给 react 更新

## completeUnitOfWork 处理报错节点
+ 报错的节点直接进入 completeUnitOfWork 完成
+ 不渲染子节点
+ 报错节点在 completeUnitOfWork 内走 unwindWork 流程
  ![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401695136714572.png)

### unwindWork 的处理
+ 类似 completeWork 对不同组件进行处理
+ 对 shouldCapture 组件设置 DidCapture effect 副作用
+ 大部分没动作， 其余也多是 pop context
+ 只有 HostComponent, HostText, SuspenseComponent 有操作
+ 与 completeWork 最大的区别就是会判断 ShouldCapture
+ throwException 处理错误节点时给能处理错误的节点组件的 effect 都加了 ShouldCapture
  ![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401695136715262.png)

### 当前报错组件能处理错误重新标记 effect
+ next 存在能处理错误保留 HostEffectMask 以上的 effect![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_600_6001695136716022.png)
