---
title: React 源码解析 - commitRoot 更新任务 dom 节点
date: 2019-08-23 16:35:46
tags: react
---
## commitRoot 三个阶段
+ 准备 commit 阶段

+ commit 阶段的三次循环

+ commit 后收尾工作


## commitRoot 准备阶段

### 核心任务
+ 标记全局变量, 保存 root.pendingCommitExpirationTime 正在等待提交的任务的 expirationTime
+ 标记 fiberRoot 子树最早更新时间 root.nextExpirationTimeToWorkOn 和 root.expirationTime
+ 检查 finishedWork 是否也有 effect ，如有插入 effect 链表中

### 标记全局变量
![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401695136719302.png)

### 标记 fiberRoot 的
![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401695136719928.png)
> markCommittedPriorityLevels 方法主要是找到子树中 NoWork 的节点，对 任务完成后剩余时间 root.nextExpirationTimeToWorkOn 和 root.expirationTime 进行更新，同时更新 root 下子树最早更新和最晚更新的 [ root.earliestPendingTime, root.latestPendingTime ] 区间

### 检查 finishedWork 是否也有 effect ，如有插入 effect 链表中
finishedWork 就是当前 commit 处理的任务

effectTag 列表![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401695136720649.png)

根据 finishedWork 自身是否有 effect 构建成最后的 nextEffect 链表![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401695136721408.png)

## commitRoot 第一次循环执行

### 核心任务
在 class 组件中通过 prevProps, prevState 获取状态快照，用于 componentDidUpdate 生命周期
状态快照的获取通过 getSnapshotBeforeUpdate 生命周期 (旧 componentWillUpdate) 执行后的返回值
这个循环中，这个节点即将更新但是还没更新。

### getSnapshotBeforeUpdate 生命周期
> componentDidUpdate 第三个参数的 snapshot 就是 getSnapshotBeforeUpdate 的返回值

![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401695136722202.png)

### commitBeforeMutationLifecycles
commitRoot 的第一次循环主要是对 nextEffect 链表的任务执行  commitBeforeMutationLifecycles![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401695136722989.png)

commitBeforeMutationLifecycles 根据 nextEffect.effectTag 是否有 Snapshot 把  nextEffect.alternate fiber 对象和 nextEffect 传入 commitBeforeMutationLifeCycles 中![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401695136723771.png)

commitBeforeMutationLifeCycles 中只有在更新任务是 classComponent 时才有工作，
根据 current(nextEffect.alternate) 是否存在判断是否是初次加载，
组件初次加载执行 DidMount 生命周期函数不走 DidUpdate 不需要保存快照对象，最后快照对象保存在 instance.__reactInternalSnapshotBeforeUpdate 上![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401695136724617.png)

## commitRoot 第二次循环执行

### 核心任务
重置文本节点
操作 ref
执行 插入、更新、删除的 effect 操作
真正的对 dom 进行操作

### commitAllHostEffects
对 nextEffects 链表任务开始第二次循环![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401695136725414.png)

commitAllHostEffects 中对不同 effectTag 进行不同操作![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401695136726209.png)

### commitPlacement 插入节点
+ 首先通过 getHostParentFiber 找到 finishedWork 的父节点 parentFiber![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401695136726989.png)
+ 再从 finishedWork 当前 commit 的节点开始进行深度优先遍历
+ parentFiber  有 HostComponent(dom 标签)、HostRoot(fiberRoot)、HostPortal(portal api)
+ 操作 dom 使用 insertBefore api 找到需要操作 insertBefore 的 dom 节点 before![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401695136727778.png)
+ 当遍历到 class 组件时候，before 通过 node.child 指定![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401695136728566.png)
+ 从 finishedWork 开始遍历三种类型的 node.tag 进行操作，有 before 进行 insertBefore，没有 before 进行 append
+ 如果遍历的 node.tag 不是上面三种类型，还有 node.child, 那就是 class 组件，这时 node = node.child 开始下一次循环，因为这里 class 组件的操作就是对 child, 组件第一个包裹的 dom 标签操作
  ![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401695136729348.png)

### commitWork 更新节点
+ commitWork 只会更新 HostComponent(dom 节点) 和 HostText(文本节点)
+ 对于更新 HostComponent 会从当前任务 finishWork 中取出 updateQueue 、newProps、oldProps、和 dom 内容传入 commitUpdate 中更新到 dom 上
  ![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401695136730108.png)
+ 通过 commitUpdate 更新 dom 属性![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401695136730890.png)
+ updateProperties 对属性进行 diff ![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401695136731658.png)
+ updateDOMProperties 把 updateQueue: [k1, v1, k2, v2] 结构的内容进行更新![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401695136732432.png)

### commitDeletion 删除节点
+ commitDeletion ![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401695136733173.png)

+ 对子树进行深度优先遍历标记变量，标记所有要处理节点 tag，遇到 HostComponent 节点进行 commitNestedUnmounts 然后删除节点, 遇到 HostPortal 继续循环删除 portal 内的内容, 都不满足条件就是 class 组件，直接 commitUnmount。 ![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401695136733937.png)

+ commitNestedUnmounts 遍历内容进行 commitUnmount![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401695136734638.png)

+ commitUnmount 卸载 ref， 执行 componentWillUnmount 生命周期![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401695136735421.png)

## commitRoot 第三次循环执行

### 核心工作
首次渲染执行componentDidMount
更新渲染执行 componentDidUpdate
执行 setState 的 callback 回调函数
捕获错误

### 源码流程
+ 执行 commitAllLifeCycles![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401695136736205.png)

+ commitAllLifeCycles![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401695136736957.png)

+ commitLifeCycles 根据 current 来判断首次渲染和更新渲染执行不同的生命周期，最后执行 commitUpdateQueue![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401695136737653.png)

+ commitUpdateQueue 会找到此次更新 setState 的回调进行执行，当更新中有捕获错误的回调函数也会在这里执行![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401695136738406.png)

+  回顾一下捕获错误的回调为啥在这里有执行![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401695136739180.png)

+ commitLifeCycles HostRoot 在 ReactDOM.render 中的操作![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401695136739937.png)

## commitRoot 收尾工作
结束 commitRoot 还原变量，通知 开发工具，如果生命周期中产生了新的更新会更新 rooFiber 树的子树中的更新最早最晚区间![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401695136740736.png)
