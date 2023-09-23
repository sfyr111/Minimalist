---
title: react 内部原理
date: 2022.01.21 14:40:33
tags: react
categories: react
---
## 内部原理
JSX 语法、内部数据结构、协调器对比算法、算法优化的假设条件、setState 更新、合成事件、Fiber

## JSX 语法

## 内部数据结构
1. React Element
   React.createElement 的结果
```
ReactElement {
    _owner: null, // parent internal instance
    _store: Object {},
    key: null,
    props: Object {},
    ref: null,
    type: Function|string
}
```
2. Public Instance
   component 组件实例 this
```
Component {
    _reactInternalInstance: ReactCompositeComponentWrapper,
    context: Object,
    props: Object,
    refs: Object,
    state: Object,
    updater: Object,
    __proto__: ReactComponent {
        constructor: Function,
        componentWillMount: Function,
        render: Function,
        componentDidMount: Function,
        componentWillReceiveProps: Function,
        shouldComponentUpdate: Function,
        componentWillUpdate: Function,
        componentDidUpdate: Function,
        componentWillUnmount: Function,
        __proto__: {
            constructor: Function,
            forceUpdate: Function,
            setState: (partialState, callback)
        }
    }
}
```
3. Internal Instance
   组件的额外信息
```
ReactCompositeComponent {
    _compositeType: Impure|Pure|StatelessFunctional,
    _context: Object,
    _currentElement: ReactElement,
    _instance: ***Public Instance***,
    _isOwnerNecessary: false,
    _mountImage: null,
    _mountIndex: 0,
    _mountOrder: 2,
    _pendingCallbacks: null,
    _pendingElement: null,
    _pendingStateQueue: null,
    _renderedComponent: ***ReactDOMComponent***,
    _rootNodeID: ".0",
    _topLevelWrapper: ***ReactCompositeComponentWrapper***,
    _warnedAboutRefsInRender: false
}
ReactCompositeComponent.prototype {
    _checkPropTypes: Function,
    _instantiateReactComponent: Function,
    _maskContext: Function,
    _performComponentUpdate: Function,
    _processChildContext: Function,
    _processContext: Function,
    _processPendingState: Function,
    _processProps: Function,
    _renderValidatedComponent: Function,
    _renderValidatedComponentWithoutOwnerOrContext: Function,
    _replaceNodeWithMarkupByID: Function,
    _updateRenderedComponent: Function,
    attachRef: Function,
    construct: Function,
    constructor: Function,
    detachRef: Function,
    getName: Function,
    getPublicInstance: Function,
    mountComponent: Function,
    performUpdateIfNecessary: Function,
    receiveComponent: Function,
    unmountComponent: Function,
    updateComponent: Function,
}
```
4. Rendered Component
   component 组件实例 render 方法的返回结果 ReactDOM
```
ReactDOMComponent {
    _currentElement: ReactElement
    _isOwnerNecessary: false
    _mountImage: null
    _mountIndex: 0
    _nodeWithLegacyProperties: null
    _previousStyle: null
    _previousStyleCopy: null
    _processedContextDev: Object
    _renderedChildren: null
    _rootNodeID: ".0"
    _tag: "div"
    _topLevelWrapper: null
    _unprocessedContextDev: Object
    _warnedAboutRefsInRender: false
    _wrapperState: null
}
```


## 协调器算法(对比算法)
1. 标记组件 dirty 是否需要更新
2. 渲染所有实例等待更新
3. 通过 对照变化 reconcile change 构建 新的变化 mutation list（new fiber tree）
4. 更新 DOM
   ![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401695481216878.png)


## 对比算法的优化
https://www.zhihu.com/question/66851503
两颗 tree diff 遍历比较差异 O(n2) 再计算最小转化成本还要遍历一次，就是O(n3)。

### react 通过假设只要遍历一遍 O(n)：
1. 不同类型的元素不需要比较，直接删除
2. 元素不能垂直移动
3. 列表通过 key 进行重用
   ![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_620_6201695481217580.png)
   ![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_620_6201695481218162.png)


## setState
只有 setState 和 ReactDOM.render 能触发更新

### 从 setState 调用到 DOM更新的完整内部生命周期
![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_620_6201695481218755.png)

### batchedUpdates
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

### requestWork
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
    if (isUnbatchingUpdates) { // unbatchedUpdates API 调用 
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
```

## 合成事件
1. 事件跨浏览器跨平台兼容
2. 事件池便于事件对象复用
3. document 顶层事件委托
   ![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_620_6201695481219345.png)

### react 17 改成 root 委托
![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_620_6201695481219939.png)

### event.persist() v16版本
https://deepscan.io/docs/rules/react-missing-event-persist

### event pool
react v17 不再使用事件池，现代浏览器不需要重用不同事件之间的事件对象以提高旧浏览器的性能，并将它们之间的所有事件字段设置为 null。
https://stackoverflow.com/questions/36114196/what-is-event-pooling-in-react/36115815

## Fiber
https://stackoverflow.com/questions/45341423/what-is-difference-between-react-vs-react-fiber

### 什么是 fiber
Fiber 是重新实现了 reconciler 更新机制的新架构。
一种虚拟堆栈帧，每个 fiber 都是一个任务一个帧。
可暂停/可优先/可记忆/可中止
本身不关心渲染，尽管 renderers 需要更改以支持并利用 fiber。

### 为什么用 fiber
1. 动画、用户输入（动画流畅、UI 响应）， 需要主线程 16ms 运行一次，当 script 执行任务时就会阻塞主线程直到 script 任务完成。
2. 16版本之前的协调器算法一旦开始就停止不了，很大程度上 reconciler 依赖于**递归**调用, 所以很难使它停止再继续。
```
function reconcile(parentDom, instance, element) {
  if (instance == null) {
    // Create instance
    // ..
    return newInstance;
  } else if (instance.element.type === element.type) {
    // Update instance
    //..
    instance.childInstances = reconcileChildren(instance, element);
    return instance;
  } else {
    // Replace instance ..
  }
}

function reconcileChildren(instance, element) {
   //...
  for (let i = 0; i < count; i++) {
   //...
    const newChildInstance = reconcile(dom, childInstance, childElement); // reconcile 递归
  }
  return newChildInstances;
}
```
3. 通过重写协调器算法，可以确定工作的优先级并加快整体帧速率。
   [基于 fiber 的reconciler 更新](https://engineering.hexacta.com/didact-fiber-incremental-reconciliation-b2fe028dcaec)
   ![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401695481220555.png)


### fiber 结构关系
![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_620_6201695481221143.png)

### fiber 优先级
```
ReactPriorityLevel {
  NoWork: 0, // No work is pending.
  SynchronousPriority: 1, // For controlled text inputs. Synchronous side-effects.
  AnimationPriority: 2, // For controlled text inputs. Synchronous side-effects.
  HighPriority: 3, // Interaction that needs to complete pretty soon to feel responsive.
  LowPriority: 4, // Data fetching, or result from updating stores.
  OffscreenPriority: 5, // Won't be visible but do the work in case it becomes vis
};
```
![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_620_6201695481221733.png)


### fiber 会出现的问题
1. componentWillUpdate 可能在 componentDidUpdate 之前被多次调用
2. 没有哪个帧会保证何时会发生更新
3. 可暂停/可优先/可记忆/可中止导致
> 在 async mode 模式下，组件更新/渲染可能会被推迟，因此 react 可以提供一些高优先级的东西。这意味着每次 react 开始在你的组件上工作时都会调用 willUpdate，但它可能不会完成完整的更新，因此每次它开始在这个组件上工作时都会调用 willUpdate，但只会在这个过程完成后调用一次 didUpdate。
https://stackoverflow.com/questions/54533907/react-componentwillupdate-getting-called-twice
> 从 v16.3.0 开始，componentWillUpdate 命周期方法已被弃用，鼓励在 componentDidUpdate 中处理任何副作用，这将在 render 方法之后触发

## 参考
https://github.com/pomber/didact

