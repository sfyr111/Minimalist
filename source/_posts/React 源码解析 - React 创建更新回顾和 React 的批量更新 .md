---
title: React 源码解析 - React 创建更新回顾和 React 的批量更新
date: 2019-02-23 23:23:53
tags: react
---
##  回顾 React 更新

### 创建更新

+ ReactDOM.render 初始渲染
  每次调用都通过传入的 `<App />, getElementById('app')` 构建 root 节点，每个 rootFiber 都有独立的 updateQueue 和 fiberTree，最后调用 ReactRoot.prototypye.render 来创建更新。

+ setState & forceUpdate 更新渲染
  都是 Component 构造函数的原型方法，目的都是给节点的 fiber 对象上创建更新，区别在于更新的类型不同。
  创建更新 update，记录当前时间，计算 expirationTime，设置当前更新的 payload，再把 update 推入 fiber 对象的 updateQueue 属性上, 之后进入调度流程。
  

### expirationTime
由 ReactFiberReconciler.js 包，updateContainer 中的 ` const expirationTime = computeExpirationForFiber(currentTime, current);` 计算出
```
function computeExpirationForFiber(currentTime: ExpirationTime, fiber: Fiber) {
  let expirationTime;
// ...
    if (fiber.mode & ConcurrentMode) {
      if (isBatchingInteractiveUpdates) {
        // This is an interactive update 高优先级
        expirationTime = computeInteractiveExpiration(currentTime);
      } else {
        // This is an async update 低优先级
        expirationTime = computeAsyncExpiration(currentTime);
      }
    } else {
      // This is a sync update
      expirationTime = Sync;
    }
}
```
+ 简化 computeExpirationForFiber 函数
+ 发现 expirationTime 正常情况是 Sync = 1 同步的
+ 只有在 fiber.mode 存在并且使用 ConcurrentMode 新版本的异步更新模式时才会真正的计算 expirationTime
+ ConcurrentMode 模式下还会根据 isBatchingInteractiveUpdates 全局变量判断当前更新的上下文环境来决定 expirationTime 是高优先级还是低优先级的运算结果。(isBatchingInteractiveUpdates 在 batchedUpdates 中讲解）

## scheduleWork 开始调度

### 核心功能
+ 找到更新对应的 FiberRoot 节点
  setState 时传入的都是组件的 Fiber 节点而不是 FiberRoot 节点
+ 符合条件时 - 重置 stack
  具有公共变量，用于调度和更新
+ 符合条件时 - 请求工作调度

### 回顾 FiberTree
+ FiberTree 属性
  1 child 为第一个子节点
  2 sibling 为兄弟节点
  3 return 为父节点，只有 RootFiber 对象 renturn 为 null
  4 FiberRoot.current 和 RootFiber.stateNode 互相引用
+ ![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401695136743025.png)

+ 执行操作时的 Fiber 对象
  1 点击组件上的元素
  2 执行组件的原型方法调用 setState
  3 把 RootFiber 加入到调度中
+ ![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401695136743666.png)

### scheduleWork 进入调度队列
> 每一次进入调度队列的只有 FiberRoot 对象, 更新也是从 FiberRoot 对象上开始的。

```
function scheduleWork(fiber: Fiber, expirationTime: ExpirationTime) {
  // 找到 root 更新 FiberTree 上的所有 expirationTime
  const root = scheduleWorkToRoot(fiber, expirationTime);
  if (root === null) { // 没有 FiberRoot 暂停
    return;
  }

  if (
    !isWorking && // 没有执行渲染
    nextRenderExpirationTime !== NoWork && // 任务是个异步的，执行到一半了，交还给浏览器执行
    expirationTime < nextRenderExpirationTime // 新的任务优先级高于现在的任务
  ) {
    // This is an interruption. (Used for performance tracking.)
    interruptedBy = fiber; // 记录
    resetStack(); // 优先执行高优先级任务
  }
  markPendingPriorityLevel(root, expirationTime);
  if (
    !isWorking || // 没有正在工作
    isCommitting || // 或者正在提交，也就是更新dom 树的渲染阶段
    nextRoot !== root // 不同的 root 一般不存在不同
  ) {
    const rootExpirationTime = root.expirationTime;
    requestWork(root, rootExpirationTime); // 请求工作
  }
  if (nestedUpdateCount > NESTED_UPDATE_LIMIT) {
    // Reset this back to zero so subsequent updates don't throw.
    nestedUpdateCount = 0;
    invariant( false, 超出最大更新深度。 当组件在componentWillUpdate或componentDidUpdate中重复调用setState时，可能会发生这种情况。 React限制嵌套更新的数量以防止无限循环。  );
  }
}
```

### scheduleWorkToRoot 通过 Fiber 对象找到 RootFiber 对象进行调度
> + 根据传入的 Fiber 对象向上寻找到 RootFiber 对象
> + 同时更新所有子树上面的 expirationTime
```
function scheduleWorkToRoot(fiber: Fiber, expirationTime): FiberRoot | null {
  // ...
  if (  // 更新 fiber 对象上 expirationTime
    fiber.expirationTime === NoWork || // 没有任何更新操作的
    fiber.expirationTime > expirationTime // 有更新产生，但是优先级低于新计算的 expirationTime
  ) { // 设置成最新的 expirationTime
    fiber.expirationTime = expirationTime;
  }
  let alternate = fiber.alternate;
  if (
    alternate !== null &&
    (alternate.expirationTime === NoWork ||
      alternate.expirationTime > expirationTime)
  ) {
    // 逻辑和上面一样，更新 alternate 的expirationTime
    alternate.expirationTime = expirationTime;
  }
 // 通过 FiberTree 的属性向上寻找 FiberRoot 并更新每个子 fiber 对象的 expirationTime
  let node = fiber.return; // renturn 父节点，
  let root = null;
  // node === null 就是 FiberRoot 对象
  if (node === null && fiber.tag === HostRoot) {
    root = fiber.stateNode;
  } else {
    // 循环查找 FiberRoot
    while (node !== null) {
      alternate = node.alternate;
      if ( // 更新 expirationTime
        node.childExpirationTime === NoWork ||
        node.childExpirationTime > expirationTime
      ) {
        node.childExpirationTime = expirationTime;
        if (
          alternate !== null &&
          (alternate.childExpirationTime === NoWork ||
            alternate.childExpirationTime > expirationTime)
        ) {
          alternate.childExpirationTime = expirationTime;
        }
      } else if (
        alternate !== null &&
        (alternate.childExpirationTime === NoWork ||
          alternate.childExpirationTime > expirationTime)
      ) {
        alternate.childExpirationTime = expirationTime;
      }
      // 找到 FiberRoot 结束循环
      if (node.return === null && node.tag === HostRoot) {
        root = node.stateNode;
        break;
      }
      // 继续向父节点查找
      node = node.return;
    }
  }
```

### resetStack
> + 当发现当前任务的优先级大于下一个任务的优先级时，把下个任务的优先级重置执行当前任务
> + resetStack 在重置下个任务时，会先记录这个任务，等待以后执行，并且使用 unwindInterruptedWork 来重置这个任务 fiber 上级的状态
```
  if (
    !isWorking && // 没有执行渲染
    nextRenderExpirationTime !== NoWork && // 任务是个异步的，执行到一半了，交还给浏览器执行
    expirationTime < nextRenderExpirationTime // 新的任务优先级高于现在的任务
  ) {
    // This is an interruption. (Used for performance tracking.)
    interruptedBy = fiber; // 记录
    resetStack(); // 优先执行高优先级任务
  }
```
```
function resetStack() {
  // nextUnitOfWork 被打断的任务
  if (nextUnitOfWork !== null) {
    // 记录，等待以后执行
    let interruptedWork = nextUnitOfWork.return;
    while (interruptedWork !== null) {
      // 退回任务
      unwindInterruptedWork(interruptedWork);
      interruptedWork = interruptedWork.return;
    }
  }

  // 变回初始值，进行新任务更新
  nextRoot = null;
  nextRenderExpirationTime = NoWork;
  nextLatestAbsoluteTimeoutMs = -1;
  nextRenderDidError = false;
  nextUnitOfWork = null;
}
```

## 何时执行 requestWork
isWorking, isCommitting 是 react 渲染的两个不同阶段，
+ isWorking
  working 包含 committing(不可打断)
+ isCommitting
  fiberTree 的更新已经结束，正在提交也就是更新dom 树的渲染阶段, 不可打断
```
  if (
    !isWorking || // 没有正在工作
    isCommitting || // 或者正在提交，也就是更新dom 树的渲染阶段
    nextRoot !== root // 不同的 root 一般不存在不同
  ) {
    const rootExpirationTime = root.expirationTime; // 重新查找 root expirationTime，因为可能会改变
    requestWork(root, rootExpirationTime); // 请求工作
  }
```

## requestWork

### 核心功能
+ 将 root 节点加入到 root调度队列中
+ 判断是否是批量更新
+ 最后根据 expirationTime 的类型判断调度的类型

### requestWork 流程
```
function requestWork(root: FiberRoot, expirationTime: ExpirationTime) {
  addRootToSchedule(root, expirationTime); // 把当前 root设置为最高优先级
  // isRendering 调度已经在执行了, 循环已经开始了
  if (isRendering) {
    return;
  }

  // 批量处理相关
  // 调用 setState 时在 enqueueUpdates 前 batchedUpdates 会把 isBatchingUpdates 设置成 true
  if (isBatchingUpdates) {
    // Flush work at the end of the batch.
    if (isUnbatchingUpdates) {
      // ...unless we're inside unbatchedUpdates, in which case we should
      // flush it now.
      nextFlushedRoot = root;
      nextFlushedExpirationTime = Sync;
      performWorkOnRoot(root, Sync, true);
    }
    return; // isBatchingUpdates true // 普通的 setState 在进入 enqueueUpdates 时在这里直接不执行了，下面其实没进入调度
  }

  // TODO: Get rid of Sync and use current time?
  if (expirationTime === Sync) { // 同步的调用 js 代码
    performSyncWork();
  } else { // 异步调度 独立的 react 模块包，利用浏览器有空闲的时候进行执行，设置 deadline 在此之前执行
    scheduleCallbackWithExpirationTime(root, expirationTime); // 在 secheduler 文件夹下的单独模块
  }
}
```

### addRootToSchedule
> + 判断当前 root 是否调度过,  单个或多个 root 构建成单向链表结构
> + 如果调度过，设置当前任务优先级最高
```
function addRootToSchedule(root: FiberRoot, expirationTime: ExpirationTime) {
  // root.nextScheduledRoot 用来判断是否有异步任务正在调度, 为 null 时会增加 nextScheduledRoot
  // 这个 root 还没有进入过调度
  if (root.nextScheduledRoot === null) {
    root.expirationTime = expirationTime;
    // lastScheduledRoot firstScheduledRoot 是单向链表结构，表示多个 root 更新
    // 这里只有一个 root 只会在这里执行
    if (lastScheduledRoot === null) {
      firstScheduledRoot = lastScheduledRoot = root;
      root.nextScheduledRoot = root;
    } else { // 有个多个root 时进行单向链表的插入操作
      lastScheduledRoot.nextScheduledRoot = root;
      lastScheduledRoot = root;
      lastScheduledRoot.nextScheduledRoot = firstScheduledRoot;
    }
  } else { 
    // 传入的 root 已经进入过调度, 把 root 的优先级设置最高
    const remainingExpirationTime = root.expirationTime;
    // 如果 root 的 expirationTime 是同步或者优先级低，增加为计算出的最高优先级
    if (
      remainingExpirationTime === NoWork ||
      expirationTime < remainingExpirationTime
    ) {
      root.expirationTime = expirationTime; // 把当前 root 的优先级设置为当前优先级最高的
    }
  }
}
```

## batchedUpdates 批量更新
> + 每次 react 创建更新都会执行 requestWork。如: setState
> + 在 requestWork 中决定 react 的更新是异步调度还是同步执行

### setState 的调用
```
import React from 'react'
import { unstable_batchedUpdates as batchedUpdates } from 'react-dom'

export default class BatchedDemo extends React.Component {
  state = {
    number: 0,
  }

  handleClick = () => {
    // 方法一
    // 事件处理函数自带`batchedUpdates`
    // this.countNumber() // 执行的结果是 0, 0, 0

    // 方法二
    // 主动`batchedUpdates`
   setTimeout(() => {
      this.countNumber() // 执行的结果是 1，2，3
    }, 0)
    // 方法三
    // setTimeout中没有`batchedUpdates`
    // setTimeout(() => {
    //   batchedUpdates(() => this.countNumber())  // 执行的结果是 0, 0, 0
    // }, 0)

  }

  countNumber() {
    const num = this.state.number
    this.setState({
      number: num + 1,
    })
    console.log(this.state.number)
    this.setState({
      number: num + 2,
    })
    console.log(this.state.number)
    this.setState({
      number: num + 3,
    })
    console.log(this.state.number)
  }

  render() {
    return <button onClick={this.handleClick}>Num: {this.state.number}</button>
  }
}
```

####  requestWork
+ 当 setState 创建更新后进入调度，执行到 requestWork 里时会判断一个 isBatchingUpdates 的全局变量。 
+ 在 requestWork 中断点
```
function requestWork(root: FiberRoot, expirationTime: ExpirationTime) {
  debugger
  // ...
  if (isRendering) {
    return;
  }

  // 批量处理相关
  // 调用 setState 时在 enqueueUpdates 前 batchedUpdates 会把 isBatchingUpdates 设置成 true
  if (isBatchingUpdates) {
    if (isUnbatchingUpdates) {
      nextFlushedRoot = root;
      nextFlushedExpirationTime = Sync;
      performWorkOnRoot(root, Sync, true);
    }
    return; // isBatchingUpdates true // 普通的 setState 在进入 enqueueUpdates 时在这里直接不执行了，下面其实没进入调度
  }
  // 只有异步模式任务时才会执行
  }
```
+ 在 requestWork 中断点，发现在判断 isBatchingUpdates 变量时就直接返回了，虽然 expirationTime 是 Sync 但是下面的 performSyncWork() 并不会执行。
+ setState 时先执行了一个 batchedUpdates 的函数。
  ![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401695136744298.png)
+ 多次的 setState 在 enqueueUpdates 函数中，fiber 对象的 baseState 仍然是 0, 但是 fiber 对象上的 updateQueue 更新队列上已经记录好了多次 update 对象将要更新 state 的 payload。
  ![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401695136744966.png)


### batchedUpdates 的源码
+ setState 在 batchedUpdates 中先把 isBatchingUpdates 暂存为 previousIsBatchingUpdates, 再设置为 true 防止在 requestWork 中执行。
+ 在 try 代码块中执行组件的方法 fn，fn 不论执行多少次 setState  执行完了都会通过 finally 进入把 isBatchingUpdates 再设置回 false。
+ 最后通过执行 performSyncWork() 方法，而不是在 requestWork 中调用。
```
function batchedUpdates<A, R>(fn: (a: A) => R, a: A): R {
  const previousIsBatchingUpdates = isBatchingUpdates; // 初始为 false
  isBatchingUpdates = true;
  try {
    return fn(a); // 执行组件绑定的方法, 走到 requestWork 里
  } finally {
    // setState 最终 enqueueUpdates 全部走到 requestWork 后变回 false 再一同 performSyncWork 才真正的执行并改变 state
    isBatchingUpdates = previousIsBatchingUpdates; // 变回 false
    // 如果是 setTimeout(() => { this.setState }) setTimeout 走到这里后才执行 this.setState 这时上下文环境是 window isBatchingUpdates 已经 false，setState 就是同步的
    if (!isBatchingUpdates && !isRendering) {
      performSyncWork(); // 当所有 setState 执行完全部enqueueUpdates 后代替 requestWork 来调度
    }
  }
}
```

#### 方法二 setTimout 执行方式
```
 setTimeout(() => {
   batchedUpdates(() => this.countNumber())
 }, 0)
```
+ setTimeout 等浏览器 API 执行的方式结果都会把三次 setState 结算的结果打印出来，像是一种同步的执行方式
+ 再次 debugger ，这时在 batchedUpdates 函数中的 fn 的执行内容只是 setTimeout。
+ 当 setTimeout 执行完后直接进入了 finally 代码块中，isBatchingUpdates 变回了 false![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401695136745608.png)
+ 当 setTimeout 结束执行回调中的 setState 进入 requestWork 时 isBatchingUpdates 已经变为 false，requestWork 将会执行下去，最终执行自己 performSyncWork()
+ 三次 setState 都会通过 requestWork 执行 performSyncWork()，而不是之前通过 batchedUpdates 执行一次，所以每次 setState 的 update 都会立刻改变 state，结果也是同步的输出。![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401695136746243.png)

#### 方法三 使用 batchedUpdates API
> batchedUpdates 让 setState 的更新仍然为批量更新
```
 setTimeout(() => {
   batchedUpdates(() => this.countNumber())
 }, 0)
```

+ batchedUpdates API 其实就是 batchedUpdates 函数
+ setTimeout 执行回调时 batchedUpdates API 又把 isBatchingUpdates 设置为 true，让 多次的 setState 又能进行批量更新。
```
function batchedUpdates<A, R>(fn: (a: A) => R, a: A): R {
  const previousIsBatchingUpdates = isBatchingUpdates; // 初始为 false
  isBatchingUpdates = true;
  try {
    return fn(a); // 执行组件绑定的方法, 走到 requestWork 里
  } finally {
    isBatchingUpdates = previousIsBatchingUpdates; // 变回 false
    if (!isBatchingUpdates && !isRendering) {
      performSyncWork(); // 当所有 setState 执行完全部enqueueUpdates 后代替 requestWork 来调度
    }
  }
}
```

## 总结 setState 是同步还是异步
> + setState 本身的方法调用时同步的，但是调用 setState 不表示 state 立即更新的，state 的更新是根据我们执行环境的上下文来判断的。
> + 如果处于批量更新的情况下 state 就不是立即更新的，如果不处于批量更新情况下有可能立即更新.
> + 现在有 asyncMode 异步渲染的情况，state 也不是立即更新的，需要进入异步调度的过程。

