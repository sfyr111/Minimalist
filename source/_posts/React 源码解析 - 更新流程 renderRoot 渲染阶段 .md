---
title: React 源码解析 - 更新流程 renderRoot 渲染阶段
date: 2019-06-03 18:05:11
tags: react
---
## 往期回顾
[React 源码解析 React 的更新
](https://www.jianshu.com/p/bd3fd953167a)
[React 源码解析 - React 创建更新回顾和 React 的批量更新
](https://www.jianshu.com/p/e18fbb17b900)
[React 源码解析 - 调度模块原理 - 实现 requestIdleCallback 
](https://www.jianshu.com/p/87533d64626a)
[React 源码解析 - reactScheduler 异步任务调度
](https://www.jianshu.com/p/4a3a09925a28)


## renderRoot 入口
+ ReactFiberScheduler.js
```
function renderRoot(root: FiberRoot, isYieldy: boolean, isExpired: boolean) {
  // ...
  if ( // 将要执行的任务 root 和 expirationTime 和 nextRenderExpirationTime、nextRoot 预期的不一样， 应该是之前任务被高优先级的任务打断了。
    expirationTime !== nextRenderExpirationTime ||
    root !== nextRoot ||
    nextUnitOfWork === null // 更新结束 fiber 的 child，下一个节点, 首次 = null
  ) {
  // 初始化的内容
    resetStack(); // 重置
    nextRoot = root;
    nextRenderExpirationTime = expirationTime; // root.nextExpirationTimeToWorkOn;
    nextUnitOfWork = createWorkInProgress( // 拷贝了一份 fiber 对象操作
      nextRoot.current,
      null,
      nextRenderExpirationTime,
    );
    root.pendingCommitExpirationTime = NoWork; // 设置成 NoWork
  // ...
  }
// 开始进入 workLoop 
  do {
    try {
      workLoop(isYieldy); // 进行每个节点的更新
    } catch (thrownValue) {
      // ...
      break; // 遇到了某种错误跳出
    }   while(true)

}
```
workLoop 中所有发生的错误都会被 render 阶段 catch，render 阶段会根据捕获的错误具体内容进行相应的操作
```
function workLoop(isYieldy) {
  if (!isYieldy) { // 不可中断 Sync 和 超时任务不可中断
    // Flush work without yielding
    // nextUnitOfWork 是 fiber 对象，为 null 已经是 root 节点 fiber return 的 null 了
    // 用于记录render阶段Fiber树遍历过程中下一个需要执行的节点。在resetStack中分别被重置,他只会指向workInProgress
    while (nextUnitOfWork !== null) { // 不停的更新，不为 null 就不停执行 next 的 child 的更新
      nextUnitOfWork = performUnitOfWork(nextUnitOfWork); // 进行更新
    }
  } else {
    // Flush asynchronous work until the deadline runs out of time.
    while (nextUnitOfWork !== null && !shouldYield()) { // 判断 shouldYield = false 当前时间片是否有时间更新
      nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
    }
  }
}
```
workLoop 只是根据时间片是否有任务调用 performUnitOfWork 进行更新,  只有当 nextUnitOfWork === null 时才代表任务已经更新完了
![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401695136654833.png)
performUnitOfWork 在 beginWork 中对当前 fiber 进行更新，更新到此 fiber 的最后时会去找兄弟节点，最后返回给 workLoop 中的 while(nextUnitOfWork) 中继续执行

## beginWork

### 核心功能
+ 验证当前 fiber 树是否需要更新
+ 更新传入的节点类型进行对应的更新
+ 更新后调和子节点

### 第一步验证当前 fiber 树是否需要更新
+ 比较当前节点 props 是否有变化
+ 检查当前节点是否有更新或是否比当前 root 的更新优先级大
+ 没更新或优先级低就跳过，bailoutOnAlreadyFinishedWork
+ bailoutOnAlreadyFinishedWork 可以判断 current 是否有 child 更新
  ![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401695136655465.png)
+ bailoutOnAlreadyFinishedWork 会判断这个 fiber 的子树是否需要更新，如果有需要更新会 clone 一份到 workInProgress.child 返回到 workLoop 的 nextUnitOfWork, 否则为 null
  ![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401695136656226.png)

### 根据 fiber 的 tag 类型进行更新
进行更新先把当前 fiber 的 expirationTime 设置为 NoWork，根据 tag 进行不同组件的更新
![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_660_6601695136657013.png)
+ ClassComponent: class 组件
+ HostRoot: <div id="root" />
+ HostComponent: html 标签
+ HostText: 文本内容
  ...

## workInProgress 更新所用到的 fiber 对象属性
+ type
  当函数组件时是 function
  当为 class 组件时就是 class 构造函数
  当 dom 原生组件时就是标签 div 这种字符串
+ pendingProps
  fiber 更新带来的新 props

### 更新函数会用到的参数
+ current
  workInProgress.alternate，指向当前 fiber 没更新的对象
+ Component
  workInProgress.type，此时 fiber 节点组件的类型，function，class，标签 字符串
+ nextProps
  workInProgress.pendingProps，此次更新带来的新 props
+ renderExpirationTime
  fiberRoot.expirationTime，fiberRoot 上最大优先级的值

## FunctionComponent 更新
```
function updateFunctionComponent(
  current,
  workInProgress,
  Component,
  nextProps: any,
  renderExpirationTime,
) {
  // ... context 相关
  let nextChildren;
  // Component 组件方法，这里就是我们声明组件的方式 function(props, context) {}
  nextChildren = Component(nextProps, context); 
  // 把 nextChildren 这些 ReactElement 变成 Fiber 对象, 在 workInProgress.child 挂载 fiber  
  reconcileChildren( 
    current,
    workInProgress,
    nextChildren,
    renderExpirationTime,
  );
  return workInProgress.child;
}
```

## reconcileChildren

### 核心点
+ 根据 props.children 生成 fiber 子树
+ 判断 fiber 对象是否可以复用, 在第一次渲染就渲染了 fiber 子树，state 变化可能会导致不能复用，但是大部分是可以复用的
+ 列表根据 key 优化

### 根据首次渲染或更新渲染进行操作
+ current === null 首次渲染, mountChildFibers
+ current !== null 更新渲染, reconcileChildFibers
  ![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_660_6601695136657780.png)
+ mountChildFibers 和 reconcileChildFibers 都是由 ChildReconciler 返回的函数，区别只在参数不同
```
export const reconcileChildFibers = ChildReconciler(true);
export const mountChildFibers = ChildReconciler(false);
```

### reconcileChildFibers
+ reconcileChildFibers 是 ChildReconciler 返回的最终函数
+ 先判断 newChild 是不是 Fragment 节点
+ typeof newChild === object 是函数组件和 class 组件返回的 jsx - reconcileSingleElement
+ typeof newChild === string 是 textNode - reconcileSingleTextNode
+ 判断 newChild 是个数组
+ 判断是 iterator 函数
+ 都不符合抛错
+ 提醒组件没有合法的返回值
+ 最后删除所有的节点 return deleteRemainingChildren(returnFiber: new, currentFirstChild: old);![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401695136658541.png)

### placeSingleChild
![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_660_6601695136659528.png)
更新渲染时 placeSingleChild 会把新创建的 fiber 节点标记为 Placement, 待到提交阶段处理
![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_660_6601695136660355.png)
其中 ReactElement, Portal, TextNode 三种类型的节点需要进行处理x

### reconcileSingleElement 更新 ReactElement
调和单个子节点
### 第一段逻辑，从原 fiber 节点的兄弟节点遍历，比较 fiber 节点和 nextChilren key 值
![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_800_8001695136661179.png)
+ 符合复用条件，标记此 fiber 节点的所有兄弟节点 effect 在提交阶段删除达到只复用干净的这个 fiber 节点的目的，返回这个可以复用的节点
+ 如果 key 相等，不符合复用条件直接跳出, 进入第二段逻辑
+ 如果 key 不相等逐渐标记删除遍历的 fiber 节点, 进入第二段逻辑
+ 这里调和单个子节点, 如果 key 不存在为 null 我们也认为他是相等的，判断 type 和 elementType 来看他们是否一是个组件函数
+ deleteChild 标记删除![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401695136662002.png)
+ deleteRemainingChildren 删除多余的兄弟节点![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401695136663121.png)

#### 第二段逻辑，没有可以复用的节点，根据 elment nextChildren 的类型创建 Fragment 或者 Element 类型的 fiber。
![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_660_6601695136663929.png)

### reconcileSingleTextNode 更新 textNode
![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_660_6601695136664756.png)
+ currentFirstChild 原 fiber 节点 child 是文本节点符合复用条件
+ currentFirstChild 不是文本节点，现在要更新为文本节点删除后重新创建

### useFiber 创建复用的节点
![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_660_6601695136665530.png)
![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_660_6601695136666282.png)

## reconcileChildrenArray  调和数组 children
+ react 新老 children 对比的过程算法
+ 尽量减少节点的遍历次数来达到判断节点是否可复用的过程

### 第一次遍历(优化加速)
+ 找到新老节点中不能复用的节点才跳出
+ 判断新老节点的 index
+ 判断新老 key 是否相同来复用
+ 不能复用就 break 跳出当前遍历
+ 能复用就构建链表结构
  ![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401695136667055.png)

### updateSlot
+ 根据 newChild 的类型和 oldChild.key 进行判断操作
+ 返回 null 表示后面都不能复用了直接跳出

#### textNode 文本节点
+ oldFiber 不是 textNode 还有 key 值，是在数组里的，新的 textNode 不能复用返回 null![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_660_6601695136667853.png)
+ oldFiber 不是 textNode 创建新的 textNode 否则直接更新 textNode 内容![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_660_6601695136668656.png)

#### ReactElement 节点和 isArray 数组节点
![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_660_6601695136669462.png)

+ ReactElement 时 updateElement![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_660_6601695136670233.png)

+ Fragment 时与 ReactElement 的处理相似，复用处理的内容为 newChild.props.children

### break 或者遍历完毕后的情况
+ newIdx === newChildren.length
+  新的 children 已经在 updateSlot 中创建新的对象了, 新数组操作完成了, 所有新节点都已经创建
+ oldFiber === null
+ 老的已经被复用完了, 新的节点还有部分没有创建, 找到最后没有能复用的节点了
+ 直接创建剩下的新节点构建链表

#### 情况一
+ 按新数组 newChildren.length 的长度遍历完了
+ 这时 updateSlot 没有返回 null，所有节点都复用或新建的，都标记好了位置
+ 这个情况是最快的，如果 oldFiber 老节点还有没遍历完的就删掉![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401695136671024.png)

#### 情况二
+ 老的节点已经被复用完了, 新的节点还有部分没有创建, 遍历到最后没有能复用的节点了
+ newChildren 剩下的节点就直接创建，同时进行同样的 place 标记构建链表结构![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_660_6601695136671831.png)

### 核心通用操作，构建 map 复用
+ newChildren 没有创建完，oldFiber 又有兄弟节点，数组存在顺序的变
+ 根据老节点的 key 或 index 构建 map 对象
+ 遍历剩下的 newChildren
+ 根据 key 或 index 直接在 map 里找可以复用的对象或创建新的对象
+ 再构建链表![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401695136672628.png)

## 更新 classComponent 组件
![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401695136673443.png)
+ 首次渲染 instance === null
    + constructClassInstance 生成实例
    + mountClassInstance 挂载实例
+ 渲染被中断 instance !== null, current === null
    + resumeMountClassInstance 复用实例但还是调用首次渲染的生命周期
+ 更新渲染 instance !== null, current !== null
    + updateClassInstance，调用 didUpdate 和 componentWillReceiveProp 生命周期
+ 都是复用或创建 instance，通过 processUpdateQueue 计算新的 state 赋值到 fiber workInProgress.memoizedState 和 instance 上面记录
+ 最终执行 finishClassComponent, 进行错误判断的处理和判断是否可以跳过更新的过程，重新调和子节点 reconcileChildren

### 首次渲染 class 组件
+  instance === null

#### constructClassInstance 创建实例
+ instance 赋值在 workInProgress.stateNode 上
```
function constructClassInstance(
  workInProgress: Fiber,
  ctor: any,
  props: any,
  renderExpirationTime: ExpirationTime,
): any {
  // ...
  // 从这里开始，ctor 就是 element.type 的 Compnent，这里生成 class 组件实例
  const instance = new ctor(props, context);
  const state = (workInProgress.memoizedState = // memoizedState 为实例的 state, 没有就为 null
    instance.state !== null && instance.state !== undefined
      ? instance.state
      : null);
  adoptClassInstance(workInProgress, instance);
  // ...
  return instance;
}
```
+ 为 instance.updater 赋值 classComponentUpdater, 用于组件通过何种方式进行 ReactDOM.render 和 setState 进行更新
```
// 为实例确定 updater 对象
function adoptClassInstance(workInProgress: Fiber, instance: any): void {
  instance.updater = classComponentUpdater; // 给 class 组件实例的 updater 设置
  workInProgress.stateNode = instance; // instance 赋值给当前 workInProgress.stateNode
  ReactInstanceMap.set(instance, workInProgress); // 给 instance._reactInternalFiber 赋值当前的 fiber 对象
}
```
####  mountClassInstance 首次挂载实例
![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401695136674214.png)
+ 初始化 class 组件创建 updateQueue 计算更新 state
+ 判断和执行 getDerivedStateFromProps, componentWillMount  生命周期，都会更新当前 state
+ 可以看到 componentWillMount 完全可以进行 setState，会创建 updateQueue 计算更新当前 state
+ 最后标记 componentDidMount 生命周期，待到提交阶段更新完 dom 后执行

#### processUpdateQueue 计算更新 state
+ updateQueue 的更新都是通过 baseState 计算的，执行 queue 的更新会检查这次更新的优先级，优先级低待到下次更新![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_660_6601695136674971.png)
+ 每个 update 都会计算出当前的 state 结果，如果 setState 有第二个参数 callback 会标记 effect 待到提交阶段执行，这样 callback 就能得到准确的 state![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_660_6601695136675744.png)
+ getStateFromUpdate 根据 update.tag 计算 state 的结果，会判断 setState 传入的函数或对象两种情况
  1 函数时会指定上下文，传入 prevState, nextProps
  2 对象时就是最终要更新的 state 对象
  3 最后通过 Object.assign 生成新的 state 对象
  ![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_660_6601695136676511.png)

#### resumeMountClassInstance 复用实例
+ 中断后恢复的组件复用实例仍然按新组件挂载来执行![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_660_6601695136677303.png)
+ 检查得到 shouldUpdate，执行 willMount 和标记 didMount ![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_660_6601695136678089.png)
+ shouldUpdate 由组件的 shouldComponentUpdate 判断，pureComponent 会自动比较 props![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_660_6601695136678882.png)

#### updateClassInstance 更新实例
+ 过程与 resumeMountClassInstance 相似, 不过执行的是 willUpdate, 标记 didUpdate, getSnapshotBeforeUpdate
  ![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_660_6601695136679690.png)

### finishClassComponent 完成 class 组件更新

#### 没错误捕获又不需要更新
+ 没错误捕获也没更新直接跳过
+ effect 的错误标记会在外侧 catch 中添加![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_800_8001695136680458.png)

#### 捕获错误的操作
+ class 组件没有 getDerivedStateFromError， nextChildren = null
+ class 组件有 getDerivedStateFromError ，直接执行 instance.render() 获得最新的 nextChildren, getDerivedStateFromError 在函数外 catch 到错误并且执行立即更新为正确的 state, 所以可以执行 instance.render()
+ 没捕获错误 执行 instance.render()
  ![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401695136681261.png)

#### 最后执行的 reconcileChildren
![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_660_6601695136682153.png)

## IndeterminateComponent 更新
+ fiber 刚创建的时候 fiberTag 都为 IndeterminateComponent 类型，只有当 class 组件有 construct 才为 class 组件类型![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_660_6601695136682999.png)
+ 符合 class 组件条件按 class 组件更新![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_660_6601695136683816.png)
+ 否则就按函数组件类型更新![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_660_6601695136684581.png)
+ 只存在于首次更新的时候，只有首次更新的时候不确定 fiberTag 类型

##  更新 HostComponent 原生 dom 标签

+ 原生标签 小写的 标签
+ 判断标签内容是不是纯文本
+ 是纯文本没子节点，不是纯文本根据之前的 props 标记更新
+ 跟 classCompnent 一样有 makeRef 能使用 ref

### updateHostComponent
![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401695136685346.png)
+ dom 标签内是纯文本 nextChildren 为 null，直接渲染文本内容
+ 原 props 是文本，现在换成节点标记 effect  提交阶段操作
+ 和 classComponent 一样可以使用 ref 的原因是都有 markRef
+ 判断 concurrentMode 异步组件是否有 hidden 属性，异步组件 hidden 永不更新
+ 最后进行 reconcileChildren

### shouldSetTextContent
![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401695136686165.png)
+ 特殊标签 textarea，option，noscript 直接渲染文本
+ props.children 为 string，number 直接渲染
+ dangerouslySetInnerHTML 属性 直接渲染

## HostText 文本节点

### updateHostText
文本内容不需要构建 fiber 结构，直接在提交阶段更新就行了
```
function updateHostText(current, workInProgress) {
  if (current === null) {
    tryToClaimNextHydratableInstance(workInProgress);
  }
  // Nothing to do here. This is terminal. We'll do the completion step
  // immediately after.
  return null; // 文本没有子节点不需要调和, 到 提交阶段直接就更新了
}
```

## ForwardRef 更新
![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401695136686942.png)
+ 实现了 React.forwardRef((props, ref) => { 传入了 ref }) 传递 ref 的功能

## Mode 组件
+ React 提供的组件
+ <ConCurrentmode /> 标签
+ <StaticMode /> 标签
+ updateMode 执行，const nextChildren = workInProgress.pendingProps.children;
  ![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401695136687790.png)


## Memo 组件
+ functionComponent 具有 pureComponent 功能
+ memo 组件 Component.type 就是 传入的function组件， memo(function(props) {})
+ memo 组件的 props 都要作用于 function 组件内
+ memo 组件意义不多只是进行了一次包裹的比较
+ 创建的 child 没有调和 reconcileChildren

### 初次渲染
![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401695136688565.png)
+ 根据 React.memo() 传入的函数组件进行判断
+ SimpleFunctionComponent 的判断, 没有 defaulteProps, 不是构造函数, 简单函数组件只进行浅比较
```
export function isSimpleFunctionComponent(type: any) {
  return (
    typeof type === 'function' &&
    !shouldConstruct(type) &&
    type.defaultProps === undefined
  );
}
```
+ updateSimpleMemoComponent![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401695136689339.png)

### 更新渲染
+ 优先级低，进行 PureComponent 功能的比较
+ 有必要更新直接创建节点，构建 fiber 树  
  ![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401695136690091.png)

### 没有调和 reconcileChildren
![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_660_6601695136691359.png)
reconcileChildren 也是把 nextChildren 结果的 ReactElement 生成 fiber 后赋值给 workInprogress.child 上不过多了很多 类型的判断, memo 组件有必要更新是直接创建后 赋值在 workInprogress.child 上了，memo 组件编写只会返回常规的 ReactElement 组件内容

## completeUnitOfWork
+ 根据是否中断调用不同的处理方法
+ 当一侧的子节点被 beginWork 更新组件完了执行
+ beginWork 完成各个组件的 update，然后返回他的 child
+ 判断是否有兄弟节点来执行不同的操作
+ 完成节点之后复 effect 链

### 完成节点更新，重置 childExpirationTime
![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401695136692143.png)

### 构建 effect 链，供 commitRoot 提交阶段使用
![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401695136692941.png)

### 单侧节点查找向上寻找节点
![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401695136693747.png)

### performUnitOfWork 遍历 fiber 树的顺序
![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_660_6601695136694528.png)

## 总结
+ renderRoot 阶段，通过 fiberRoot.current 构建 nextUnitOfWork
+ 在 workLoop 中对 nextUnitOfWork 的每个节点进行更新，从 fiberRoot 应用的第一个子节点开始
+ workLoop 中 while 循环 执行 nextUnitOfWork = performUnitOfWork(nextUnitOfWork)
+ performUnitOfWork 中以 nextUnitOfWork.alternate 和 nextUnitOfWork 做两个 fiber 的对照，通过 beginWork 依次遍历复用和创建 fiber 构建成新的 nextUnitOfWork.child ，再返回 workLoop 中的 performUnitOfWork
+ beginWork 根据 tag 属性判断当前 nextUnitOfWork 的节点类型与 alternate 对照来进行对应组件的复用更新，最后构建成新的 fiber 树，对节点上的操作进行 effect 标记
+ 当 beginWork 遍历完单侧子树后会通过 completeUnitOfWork 构建 effect 更新链，方便 commit 提交阶段更新
+ completeUnitOfWork 在构建完此侧边树的 effect 链后, 向上寻找当前 workInProgress 的 兄弟节点，继续 beginWork。
+ completeUnitOfWork 中如果找不到 workInProgress  的兄弟节点就继续找父节点的兄弟节点，直到找到 root 节点顶点返回 null，进入 commitRoot 提交阶段
+ renderRoot 通过前后 fiberRoot.current 的对照逐层的复用更新，构建出一个新的 fiber 树，标记节点 effect 等到提交阶段操作

## 参考文章
[实现 fiber 架构](https://zhuanlan.zhihu.com/p/37098539)
