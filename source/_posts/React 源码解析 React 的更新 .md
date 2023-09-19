---
title: React 源码解析 React 的更新
date: 2019-02-02 23:06:55
tags: react
---
## React 的更新
只解析到创建更新进入调度器

### 创建更新的方式
+ 初始渲染
  ReactDOM.render
  ReactDOM.hydrate

+ 更新渲染
  setState
  forceUpdate (舍弃)

## ReactDOM.render

### 步骤
+ 创建 ReactRoot
  最顶点的对象
+ 创建 FiberRoot 和 RootFiber
+ 创建更新 update
  用来更新调度, 进入调度后 setState 或 ReactDOM.render 都的调度器去管理的

## 初始渲染

### ReactDOM.render
`ReactDOM.render(<App />, document.getElementById('root'))`
<App /> 只是调用了 createReactElement 生成了ReactElement
ReactDOM.render 把 这个 ReactElement 渲染成 dom tree

### 初始渲染
在 react-dom/client/ReactDOM.js 文件下, 有 render hydrate 两个方法， render 是用在浏览器环境内的，hydrate 用在服务器环境下，唯一的区别是调用 legacyRenderSubtreeIntoContainer 方法传入的第四个参数不同。
```
const ReactDOM = {
  // ...
  hydrate(element: React$Node, container: DOMContainer, callback: ?Function) {
    // TODO: throw or warn if we couldn't hydrate?
    return legacyRenderSubtreeIntoContainer(
      null,
      element,
      container,
      true,
      callback,
    );
  },

  render(
    element: React$Element<any>,
    container: DOMContainer,
    callback: ?Function,
  ) {
    return legacyRenderSubtreeIntoContainer(
      null,
      element,
      container,
      false,
      callback,
    );
  },
  
  // ...
}
```
+ legacyRenderSubtreeIntoContainer 中 container 就是首次渲染传入的<div id="root">, 这个dom 肯定不存在 _reactRootContainer 属性，所以 !root 内的就是初次渲染的逻辑
+ 而 root 是由首次渲染逻辑时 由 legacyCreateRootFromDOMContainer 生成的一个 Fiber 对象。
```
    root = container._reactRootContainer = legacyCreateRootFromDOMContainer(
      container,
      forceHydrate,
    );
```
```
function legacyRenderSubtreeIntoContainer(
  parentComponent: ?React$Component<any, any>,
  children: ReactNodeList,
  container: DOMContainer,
  forceHydrate: boolean,
  callback: ?Function,
) {
  // ...
 // container 就是首次渲染传入的<div id="root">, 这个dom 肯定不存在 _reactRootContainer 属性，所以 !root 内的就是初次渲染的逻辑
 let root: Root = (container._reactRootContainer: any);
  if (!root) {
    // Initial mount 初次渲染，进行 new ReactRoot, 创建一个 createFiberRoot 回来
    root = container._reactRootContainer = legacyCreateRootFromDOMContainer(
      container,
      forceHydrate,
    );
    if (typeof callback === 'function') {
      // 回调封装
    }
    // Initial mount should not be batched. unbatchedUpdates 批量更新
    DOMRenderer.unbatchedUpdates(() => {
      if (parentComponent != null) { // render, hydrate 传入的 parentComponent 都是 null
        // 批量更新回调, ReactDOM.render 不执行
      } else {
        root.render(children, callback); // 主要执行 ReactRoot 实例的 render
      }
    });
  } else { // 更新渲染的逻辑 }
  return DOMRenderer.getPublicRootInstance(root._internalRoot); // _internalRoot 是 new ReactRoot 生成的 Fiber 对象
}
```
+ legacyCreateRootFromDOMContainer 就是把 root  dom， container 内的其余节点清空创建一个 new ReactRoot 实例
```
function legacyCreateRootFromDOMContainer(
  container: DOMContainer, // ReactDOM.render 传入的 root
  forceHydrate: boolean, // render: false, hydrate: true, SSR 时进行节点复用，也是 render hydrate 唯一的区别
): Root {
  const shouldHydrate =
    forceHydrate || shouldHydrateDueToLegacyHeuristic(container);
  // First clear any existing content.
  if (!shouldHydrate) { // false 客户端渲染
    let warned = false;
    let rootSibling;
    // 把 root 的所有子节点删掉
    while ((rootSibling = container.lastChild)) {
     container.removeChild(rootSibling);
    }
  }
  // Legacy roots are not async by default. root 节点创建时同步的，isConcurrent: false
  const isConcurrent = false;
  return new ReactRoot(container, isConcurrent, shouldHydrate);
}
```
+ ReactRoot 生成实例创建了一个 root 实例属性，root 由 react-reconcile 模块包里的 createContainer 方法 调用 createFiberRoot 生成一个  Fiber 对象，最后挂载到实例的 _internalRoot 上
```
function ReactRoot(
  container: Container,
  isConcurrent: boolean,
  hydrate: boolean,
) {
  // 创建一个 createFiberRoot
  const root = DOMRenderer.createContainer(container, isConcurrent, hydrate);
  this._internalRoot = root;
}
// DOMRenderer.createContainer 
export function createContainer(
  containerInfo: Container,
  isConcurrent: boolean,
  hydrate: boolean,
): OpaqueRoot {
  return createFiberRoot(containerInfo, isConcurrent, hydrate);
}
```
+ legacyCreateRootFromDOMContainer  最终执行的 root.render 就是 new ReactRoot 的原型方法 ReactRoot.prototype.render ,  最终是调用 react-reconcile 模块包里的 updatecontainer
```
ReactRoot.prototype.render = function(
  children: ReactNodeList,
  callback: ?() => mixed,
): Work {
  const root = this._internalRoot; // 一个 fiber root
  const work = new ReactWork();
  callback = callback === undefined ? null : callback;

  if (callback !== null) {
    work.then(callback);
  }
  // render 的重点调用
  DOMRenderer.updateContainer(children, root, null, work._onCommit);
  return work;
};
```
+ DOMRenderer.updateContainer 中计算出一个 expirationTime 传入了 updateContainerAtExpirationTime.
```
export function updateContainer(
  element: ReactNodeList, // App
  container: OpaqueRoot, // 一个 fiber root
  parentComponent: ?React$Component<any, any>,
  callback: ?Function,
): ExpirationTime {
  const current = container.current;
  const currentTime = requestCurrentTime(); // 创建一个时间差
  // 计算出一个时间，ConcurrentMode 会用到
  const expirationTime = computeExpirationForFiber(currentTime, current);
  // 主要执行
  return updateContainerAtExpirationTime(
    element,
    container,
    parentComponent,
    expirationTime,
    callback,
  );
}
```
+ updateContainerAtExpirationTime 中调用 scheduleRootUpdate
```
export function updateContainerAtExpirationTime(
  element: ReactNodeList,
  container: OpaqueRoot,
  parentComponent: ?React$Component<any, any>,
  expirationTime: ExpirationTime,
  callback: ?Function,
) {
  // TODO: If this is a nested container, this won't be the root.
  const current = container.current;

  const context = getContextForSubtree(parentComponent);
  if (container.context === null) {
    container.context = context;
  } else {
    container.pendingContext = context;
  }

  return scheduleRootUpdate(current, element, expirationTime, callback);
}
```
+ scheduleRootUpdate 中
>  + 使用 createUpdate 创建 update 来标记 react 需要更新的点
> + 设置完 update 属性再调用 enqueueUpdate 把 update 放入更新队列里
    react 更新会在一个节点上整体进行很多个更新，这个更新 queue 就是管理多次更新的作用
> + 最后执行 scheduleWork  通知 react 进行调度，根据任务的优先级进行更新。
```
function scheduleRootUpdate(
  current: Fiber,
  element: ReactNodeList,
  expirationTime: ExpirationTime,
  callback: ?Function,
) {

  const update = createUpdate(expirationTime); // 用来标记 react 更新的节点
  // Caution: React DevTools currently depends on this property
  // being called "element".
  update.payload = {element};

  callback = callback === undefined ? null : callback;
  if (callback !== null) {
    warningWithoutStack(
      typeof callback === 'function',
      'render(...): Expected the last optional `callback` argument to be a ' +
        'function. Instead received: %s.',
      callback,
    );
    update.callback = callback;
  }
  // 把更新的对象加入到 fiber 对象上的 updateQueue 里， 会有很多更新在一个节点上产生
  enqueueUpdate(current, update);
  // 开始进行调度
  scheduleWork(current, expirationTime);
  return expirationTime;
}
```

### ReactDOM.render 阶段总结
+ 初次渲染 传入 APP 组件和 getElementById(root) 执行 ReactDOM.render
+ ReactDOM.render 返回并执行 legacyRenderSubtreeIntoContainer
    + legacyRenderSubtreeIntoContainer 内调用 legacyCreateRootFromDOMContainer 把返回值挂载到 root 节点的 _reactRootContainer 属性上
        + 而 legacyCreateRootFromDOMContainer 把  getElementById(root) 里的子节点清空，创建并返回 new ReactRoot 给  getElementById(root) 的 _reactRootContainer 属性上
        + ReactRoot 生成实例时调用 react-reconcile 模块的 createContainer 传入  getElementById(root) 执行 createFiberRoot 生成一个 FiberRoot 对象挂载到实例的 _internalRoot
    + legacyRenderSubtreeIntoContainer 最终调用 上面生成的 ReactRoot 实例的 ReactRoot.prototype.render 原型方法
        + ReactRoot.prototype.render 把子节点和实例生成的 _internalRoot Fiber 对象传入 react-reconcile 模块的 updateContainer 中
            + 在 updateContainer 中 react 计算出一个 expirationTime 传入 updateContainerAtExpirationTime 调用 scheduleRootUpdate 中做三件事
              1 使用 createUpdate 创建 update 来标记 react 需要更新的点
              2 设置完 update 属性再调用 enqueueUpdate 把 update 放入当前节点树整体的更新队列里
              3 最后执行 scheduleWork 通知 react 进行调度，根据任务的优先级进行更新。
+ ReactDOM.render 此时
    + 创建了一个 ReactRoot 对象挂载到 getElementById(root) 的 _reactRootContainer 属性上
    + 同时 在 ReactRoot 实例 _internalRoot 属性上生成了 Fiber 对象
    + 调用 ReactRoot.prototype.render 执行 react-reconcile 模块的 updateContainer 计算 expirationTime，通过 expirationTime 来创建 update 对象，推入 updateQueue 内，最后根据优先级进行调度。

## FiberRoot
+ 整个应用的起点
+ 包含了传入的 getElementById(root)
+ 记录整个应用更新过程的各种信息 containerInfo (包含了 root 节点等信息)

### FiberRoot 对象结构
> FiberRoot 是 ReactRoot 生成实例时调用 react-reconcile 模块的 createContainer 传入  getElementById(root) 执行 createFiberRoot 生成一个 FiberRoot 对象挂载到实例的 _internalRoot
```
export function createFiberRoot(
  containerInfo: any,
  isConcurrent: boolean,
  hydrate: boolean,
): FiberRoot { 
  const uninitializedFiber = createHostRootFiber(isConcurrent);
  return  root = ({
      current: uninitializedFiber, // Fiber 对象通过 new Fiber 创建，与 ReactElement 对应也是树状结构，这里树的顶点
      containerInfo: containerInfo, // 通过 render 方法传入的 root 节点, 应用挂载的节点
      pendingChildren: null, // ssr 用来复用节点的
      // 任务调度的时间标记优先级
      earliestPendingTime: NoWork,
      latestPendingTime: NoWork,
      earliestSuspendedTime: NoWork,
      latestSuspendedTime: NoWork,
      latestPingedTime: NoWork,
      // 标记渲染过程中是否有错误
      didError: false,
      // 正在等待提交的任务
      pendingCommitExpirationTime: NoWork,
      finishedWork: null, // 记录一次更新渲染过程完成的任务 Fiber 对象
      timeoutHandle: noTimeout, 
      context: null,
      pendingContext: null,
      hydrate,
      nextExpirationTimeToWorkOn: NoWork, // 标记此次更新要执行的是哪个优先级的任务
      expirationTime: NoWork, // 用在调度中
      firstBatch: null,
      nextScheduledRoot: null, // 链表属性

      interactionThreadID: unstable_getThreadID(),
      memoizedInteractions: new Set(),
      pendingInteractionMap: new Map(),
    }: FiberRoot);
}
```

## Fiber
+  FiberRoot.current 就是一个 Fiber 对象
+ 每一个 ReactElement 对应一个 Fiber 对象
+ 记录节点的各种状态
  class 组件的 this.state、this.props ，在 Fiber 更新后才会更新 class 组件上的 this.state, props，也是 hooks 实现的原理，function 组件是没有 this.state this.props 的，Fiber 有能力记录这些状态之后在 function 组件更新后拿到这些状态。
+ 串联整个应用形成的树结构
> ReactElement 对应的结构![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401695136649277.png)


### Fiber 的数据结构
FiberNode 有三个属性 return、child、sibling, 分别代表此 Fiber 对象的父节点，第一个子节点，自己的兄弟节点
```
function FiberNode(
  tag: WorkTag,
  pendingProps: mixed,
  key: null | string,
  mode: TypeOfMode,
) {
  // Instance
  this.tag = tag; // 标记不同的组件类型，不同的更新方式
  this.key = key;  // key
  this.elementType = null; // createElement 第一个参数，组件 或者 标签
  this.type = null; //  记录异步组件 resolved 后是 class 还是 function 组件
  this.stateNode = null; // 节点的实例，对应 class 组件或者 dom 节点，function 没有实例就没 stateNode

  // Fiber
  this.return = null; // 父亲节点
  this.child = null; // 第一个子节点
  this.sibling = null; // 自己的下一个兄弟节点
  this.index = 0;

  this.ref = null; // ref

  this.pendingProps = pendingProps; // 每个创建的新 props
  this.memoizedProps = null; // 老 props
  this.updateQueue = null; // 节点创建的 update 对象 queue 
  this.memoizedState = null; // 老 state，新 state 是由 updateQueue 计算出来的然后覆盖这里
  this.firstContextDependency = null;  // context 相关

  this.mode = mode; // 标记时创建，继承父节点 mod

  // Effects 副作用 
  this.effectTag = NoEffect; 
  this.nextEffect = null;

  this.firstEffect = null;
  this.lastEffect = null;

  this.expirationTime = NoWork; // 任务的过期时间
  this.childExpirationTime = NoWork; // 子节点更新的过期时间

  this.alternate = null; // Fiber 用来复制复用 Fiber 的。

  if (enableProfilerTimer) {
    this.actualDuration = 0;
    this.actualStartTime = -1;
    this.selfBaseDuration = 0;
    this.treeBaseDuration = 0;
  }
}
```
> Fiber 对象对应的结构![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401695136652682.png)

## update 和 updateQueue
+ 用于记录组件状态的改变
  记录改变的方式和内容
+ 存放在 updateQueue
  存放多个 update 用来计算出最终改变的结果
+ 多个 update 可以同时存在
  setState 三次会创建三个update，放到 updateQueue 里


### update 结构
在 legacyRenderSubtreeIntoContainer 最终调用 ReactRoot.prototype.render 时执行 scheduleRootUpdate 里执行 createUpdate
```
export function createUpdate(expirationTime: ExpirationTime): Update<*> {
  return {
    expirationTime: expirationTime, // 当前更新的过期时间

    tag: UpdateState, // 四个状态，更新updateState 0、替换replaceState 1、强制forceUpdate 2、throw 捕获 captureUpdate 3
    payload: null, // 实际操作内容，在外面赋值上去 update.payload = { element } 初次渲染传入的是元素，setState 可能传入的就是对象或者方法
    callback: null,

    next: null, // 下一个 update 单向链表
    nextEffect: null,
  };
}
```

### updateQueue 结构

```
export function createUpdateQueue<State>(baseState: State): UpdateQueue<State> {
  const queue: UpdateQueue<State> = {
    baseState, // 每次操作更新之后计算出的 state，作为下一次计算的基础
    firstUpdate: null,  // 记录链表结构
    lastUpdate: null, // 记录链表结构
    firstCapturedUpdate: null, // 记录链表结构
    lastCapturedUpdate: null, // 记录链表结构
    firstEffect: null,
    lastEffect: null,
    firstCapturedEffect: null,
    lastCapturedEffect: null,
  };
  return queue;
}
```

### enqueueUpdated 方法
enqueueUpdated 就是在 fiber 对象上创建一个 updateQueue，然后把 update 对象传入到这个 queue 里
```
export function enqueueUpdate<State>(fiber: Fiber, update: Update<State>) {
  // ...
  let queue1
  queue1 = fiber.updateQueue = createUpdateQueue(fiber.memoizedState);
  appendUpdateToQueue(queue1, update);
}
```
```
function appendUpdateToQueue<State>(
  queue: UpdateQueue<State>,
  update: Update<State>,
) {
  // Append the update to the end of the list.
  if (queue.lastUpdate === null) {
    // Queue is empty
    queue.firstUpdate = queue.lastUpdate = update;
  } else {
    queue.lastUpdate.next = update;
    queue.lastUpdate = update;
  }
}
```

## expirationTime
初次渲染最后执行 ReactDOM.render 调用 ReactRoot.prototype.render 中调用 react-reconcile 模块的 updateContainer 会计算一个 expirationTime 然后用这个时间创建 update 对象推入 updateQueue 内

### expirationTime 的计算
```
export function updateContainer(
  element: ReactNodeList, // App
  container: OpaqueRoot, // 一个 fiber root
  parentComponent: ?React$Component<any, any>, // null
  callback: ?Function,
): ExpirationTime {
  const current = container.current; // Fiber
  const currentTime = requestCurrentTime(); // 创建一个时间差
  // 计算出一个时间，ConcurrentMode 会用到, 计算出的是优先级时间
  const expirationTime = computeExpirationForFiber(currentTime, current);
  // 主要执行
  return updateContainerAtExpirationTime(
    element,
    container,
    parentComponent,
    expirationTime,
    callback,
  );
}
```
+ requestCurrentTime 方法返回一个固定的常量，调用 recomputeCurrentRendererTime 返回当前渲染时间直到 js 加载初的时间差值，差值小的值会在 msToExpirationTime 被计算成同一个常数
```
function requestCurrentTime() {
  // ...
  if ( // 没有调度时间，初次渲染
    nextFlushedExpirationTime === NoWork ||
    nextFlushedExpirationTime === Never
  ) {
    // If there's no pending work, or if the pending work is offscreen, we can
    // read the current time without risk of tearing.
    recomputeCurrentRendererTime();
    currentSchedulerTime = currentRendererTime;
    return currentSchedulerTime;
  }
  // ...
}
function recomputeCurrentRendererTime() {
  const currentTimeMs = now() - originalStartTimeMs; // js 加载到现在渲染的固定值
  currentRendererTime = msToExpirationTime(currentTimeMs);
}
export function msToExpirationTime(ms: number): ExpirationTime {
  // Always add an offset so that we don't clash with the magic number for NoWork.
  return ((ms / UNIT_SIZE) | 0) + MAGIC_NUMBER_OFFSET;
}
```
+ computeExpirationForFiber 方法会根据当前渲染的 currentTime 计算出一个优先级时间。
```

function computeExpirationForFiber(currentTime: ExpirationTime, fiber: Fiber) {
  let expirationTime;
  // ...
  if (fiber.mode & ConcurrentMode) { // 异步 mode 才计算 expirationTime
    if (isBatchingInteractiveUpdates) {
      // This is an interactive update
      expirationTime = computeInteractiveExpiration(currentTime);
    } else {
      // This is an async update
      expirationTime = computeAsyncExpiration(currentTime);
   }
 }
 // ...
 return expirationTime;
}
```
+ computeExpirationForFiber 的核心就是根据渲染方式的 mod 不同来创建不同优先级的 expirationTime，区别就在于传入 computeExpirationBucket 的参数不同
+ 最终的公式 `((((currentTime - 2 + 5000 / 10) / 25) | 0) + 1) * 25`, 公式用了 `| 0`取整，使得在 * 25 倍数之间很短的一段时间粒度里计算出的值是一样的
+ 在很短时间内 setState 多次调用更新时，也可以保证是同一优先级的更新。
```
export function computeAsyncExpiration(
  currentTime: ExpirationTime,
): ExpirationTime {
  return computeExpirationBucket(
    currentTime,
    LOW_PRIORITY_EXPIRATION,
    LOW_PRIORITY_BATCH_SIZE,
  );
}
export function computeInteractiveExpiration(currentTime: ExpirationTime) {
  return computeExpirationBucket(
    currentTime,
    HIGH_PRIORITY_EXPIRATION,
    HIGH_PRIORITY_BATCH_SIZE,
  );
}
```

## 不同的 expirationTime
Sync 模式 优先级高
Async 模式 会进行调度可能会被中断，会计算出 expirationTime 来分配优先级
指定 context

### 同步更新的 expirationTime
+ computeExpirationForFiber 在异步 mode 的情况下才根据 currentTime 来计算 expirationTime
+ expirationTime 等于 Sync 1， NoWork 0，还有就是计算出来的时间值
+ 在 expirationContext 不为 NoWork 时，expirationContext 会根据更新 api 方式的不同设置为 Sync 或者 计算出 Async 方式的优先级时间
```
function computeExpirationForFiber(currentTime: ExpirationTime, fiber: Fiber) {
  let expirationTime;
  if (expirationContext !== NoWork) {
    // An explicit expiration context was set;
    expirationTime = expirationContext;
  } else if (isWorking) {
    if (isCommitting) {
      // Updates that occur during the commit phase should have sync priority
      // by default.
      expirationTime = Sync;
    } else {
      // Updates during the render phase should expire at the same time as
      // the work that is being rendered.
      expirationTime = nextRenderExpirationTime;
    }
  } else {
    // No explicit expiration context was set, and we're not currently
    // performing work. Calculate a new expiration time.
    if (fiber.mode & ConcurrentMode) {
    // 异步逻辑
    } else {
      // This is a sync update
      expirationTime = Sync;
    }
  }
  return expirationTime;
}
```

## setState 和 forceUpdate
+ 给节点的 Fiber 创建更新
+ 更新的类型不同

### 来源
都是 Component 组件上的原型方法, 他们调用的 enqueueSetState 等方法都是由不同平台创建的 updater 对象上的，浏览器中的 updater 对象来自 ReactFiberClassComponent.js 里的 classComponentUpdater 对象上
```
function Component(props, context, updater) {
  this.props = props;
  this.context = context;
  this.refs = emptyObject;
  // 作为参数让不同的平台来控制属性更新的方式
  this.updater = updater || ReactNoopUpdateQueue;
}
Component.prototype.setState = function(partialState, callback) {
  // 仅仅调用了 updater 上的方法 updater 是初始化的第三个参数的实例属性，跟平台相关
  this.updater.enqueueSetState(this, partialState, callback, 'setState');
};
Component.prototype.forceUpdate = function(callback) {
  this.updater.enqueueForceUpdate(this, callback, 'forceUpdate');
};
```

### classComponentUpdater
+ enqueueSetState, enqueueForceUpdate 几乎是相同的，在这里我们只看 enqueueSetState
  1 从 Map 对象中获取 Fiber 对象
  2 创建当前时间
  3 优先级时间
  4 创建 update
  5 设置payload
  6 执行回调
  7 把 update 对象推入 Fiber 对象的 updateQueue 内
  8 进行调度
+ 发现 enqueueSetState 所执行的顺序跟 ReactFiberReconclier.js 的 updateContainer 几乎是一模一样的
  1 Fiber 对象是参数传进来的
  2 payload 是创建 update 对象后在外面赋值的
  3 最后也是创建 update 进入 Fiber 对象的 updateQueue 再进行调度
```
const classComponentUpdater = {
  isMounted,
  enqueueSetState(inst, payload, callback) {
    const fiber = ReactInstanceMap.get(inst); // 从 Map 对象中获取 Fiber 对象
    const currentTime = requestCurrentTime(); // 创建当前时间
    const expirationTime = computeExpirationForFiber(currentTime, fiber); // 优先级时间

    const update = createUpdate(expirationTime); // 创建 update
    update.payload = payload; // 设置payload
    if (callback !== undefined && callback !== null) {
      update.callback = callback; // 执行回调
    }

    enqueueUpdate(fiber, update); // 把 update 对象推入 Fiber 对象的 updateQueue 内
    scheduleWork(fiber, expirationTime); // 进行调度
  },
  enqueueReplaceState(inst, payload, callback) {
    // ...
  },
  enqueueForceUpdate(inst, callback) {
    // ...
  }
}; 
```

