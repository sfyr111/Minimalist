---
title: React 合成事件 SyntheticEvent
date: 2020-05-04 18:41:35
tags: react
categories: react
---
## 合成事件在 react 中的机制
1.原生事件冒泡到 document
2.document 执行事件监听回调，把原生事件在 dispatchEvent 里派发合成事件
3.通过 event.target 找到组件和元素
4.dispatchEvent 中执行 batchUpdate `batchUpdate (fn, a) => fn(a), fn 是组件元素绑定的方法，a 是 event 合成事件实例`
5.react 会在事件池 eventPool 中重复使用 event 实例。

[React事件初探](https://imweb.io/topic/5774e361af96c5e776f1f5cd)


## 为什么要用合成事件
1. 浏览器兼容，顶层事件代理机制，能报保证事件冒泡一致性，可以跨浏览器执行
2. 更好的跨平台，不同平台事件模拟成合成事件
3. document 事件代理只在内存中开辟了一块空间，节省资源同时减少了dom操作，提高性能
4. 对于新添加的元素也会有之前的事件
5. 避免频繁解绑, 只在组件销毁时解绑
6. 方便事件的统一管理和事务机制

## react 合成事件流程
![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401695481239018.png)

## 合成事件在 react 中的表现
合成事件对象模拟了 `event.preventDefault` `event.stopPropagation` 方法，同时为了提高性能在事件池重复使用 `event` 对象，每次重复使用后都会把 `event` 对象信息清空，在 `setState` 和异步 api 中可以使用 `event.persist` 方法或暂存值 `onChange={({ value }) => handle(value)}` 的方式获取正确的属性。
[Synthetic Events in React](https://medium.com/@mrewusi/synthetic-events-in-react-4f3de0c827f)
[event.persist()](https://deepscan.io/docs/rules/react-missing-event-persist)
[React SyntheticEvent reuse](https://medium.com/trabe/react-syntheticevent-reuse-889cd52981b6)
[官方 event-pooling 应用示例](https://github.com/facebook/react/tree/master/fixtures/dom/src/components/fixtures/event-pooling)



## 合成事件源码分析

### dispatch 分发事件
顶层监听
```
export function trapBubbledEvent(
  topLevelType: DOMTopLevelEventType,
  element: Document | Element,
) {
  if (!element) {
    return null;
  }
  const dispatch = isInteractiveTopLevelEventType(topLevelType)
    ? dispatchInteractiveEvent
    : dispatchEvent;
  // 原生 dom 事件监听
  addEventBubbleListener(
    element, // document 对象
    getRawEventName(topLevelType),
    // Check if interactive and wrap in interactiveUpdates
    dispatch.bind(null, topLevelType),
  );
}
```

dispatchEvent, 这里的 bookkeeping 是重用的，与 eventpool 重用相似。
```
export function dispatchEvent(
  topLevelType: DOMTopLevelEventType,
  nativeEvent: AnyNativeEvent,
) {
  if (!_enabled) {
    return;
  }

  const nativeEventTarget = getEventTarget(nativeEvent); // 找到 event.target 触发事件的元素
  let targetInst = getClosestInstanceFromNode(nativeEventTarget); // 找到 fiber 实例
  if (
    targetInst !== null &&
    typeof targetInst.tag === 'number' &&
    !isFiberMounted(targetInst)
  ) {
    // If we get an event (ex: img onload) before committing that
    // component's mount, ignore it for now (that is, treat it as if it was an
    // event on a non-React tree). We might also consider queueing events and
    // dispatching them after the mount.
    targetInst = null;
  }
  // 复用 bookKeeping，保存了事件触发的相关实例信息
  const bookKeeping = getTopLevelCallbackBookKeeping(
    topLevelType,
    nativeEvent,
    targetInst,
  );

  try {
    // Event queue being processed in the same cycle allows
    // `preventDefault`.
    batchedUpdates(handleTopLevel, bookKeeping); // 批量处理的方式进行分发
  } finally {
    releaseTopLevelCallbackBookKeeping(bookKeeping); // 推入 pool
  }
}
```
batchedUpdates(handleTopLevel, bookKeeping);  中的 handleTopLevel
```
// EventPluginHub.js
function handleTopLevel(bookKeeping) {
  let targetInst = bookKeeping.targetInst;
  // ... 确定 bookKeeping 上的组件信息
  for (let i = 0; i < bookKeeping.ancestors.length; i++) {
    targetInst = bookKeeping.ancestors[i];
    runExtractedEventsInBatch(  // 在触发的组件实例上执行批量事件
      bookKeeping.topLevelType,
      targetInst,
      bookKeeping.nativeEvent,
      getEventTarget(bookKeeping.nativeEvent), // 统一不同浏览器的事件名
    );
  }
}
```
runExtractedEventsInBatch 最终会执行到 executeDispatchesAndRelease 方法
```
/**
 * Dispatches an event and releases it back into the pool, unless persistent.
 * dispatch 事件并将其释放回池中，除非是持久的。
 * @param {?object} event Synthetic event to be dispatched.
 * @param {boolean} simulated If the event is simulated (changes exn behavior)
 * @private
 */
const executeDispatchesAndRelease = function(
  event: ReactSyntheticEvent,
  simulated: boolean,
) {
  if (event) {
    executeDispatchesInOrder(event, simulated);
    // 如果合成事件没有 persist ， 才推入到 eventPool 中进行复用
    if (!event.isPersistent()) {
      event.constructor.release(event);
    }
  }
};
```

### SyntheticEvent 合成事件对象
SyntheticEvent.js
```
function SyntheticEvent(
  dispatchConfig,
  targetInst,
  nativeEvent,
  nativeEventTarget,
) {
  // ...
  persist: function() {
    this.isPersistent = functionThatReturnsTrue;
  },

  isPersistent: functionThatReturnsFalse,
// ...
function getPooledEvent(dispatchConfig, targetInst, nativeEvent, nativeInst) {
  const EventConstructor = this;
  if (EventConstructor.eventPool.length) { // 重用合成事件
    const instance = EventConstructor.eventPool.pop();
    EventConstructor.call(
      instance,
      dispatchConfig,
      targetInst,
      nativeEvent,
      nativeInst,
    );
    return instance;
  }
  return new EventConstructor( // 如何合成事件持久化了则创建新的合成事件
    dispatchConfig,
    targetInst,
    nativeEvent,
    nativeInst,
  );
}
// 只在未持久化 isPersistent 为 false 才用到
function releasePooledEvent(event) {
  const EventConstructor = this;
  invariant(
    event instanceof EventConstructor,
    'Trying to release an event instance into a pool of a different type.',
  );
  event.destructor(); // 重置合成事件，属性全设置为 null
  if (EventConstructor.eventPool.length < EVENT_POOL_SIZE) {
    EventConstructor.eventPool.push(event); //
  }
}

function addEventPoolingTo(EventConstructor) {
  EventConstructor.eventPool = []; // 事件池
  EventConstructor.getPooled = getPooledEvent; // 获取事件池事件进行使用和复用
  EventConstructor.release = releasePooledEvent; // 发布事件到事件池中
}
}
export default SyntheticEvent;
```

## 总结
合成事件是 react 模拟原生 dom 事件所有能力的一个事件对象，用于兼容浏览器**方便 react 统一管理**。

react 合成事件是通过模拟不同浏览器事件差异，顶层监听在 document 上**保证了事件冒泡的统一性**。

当事件原生 dom 事件触发**冒泡至 document** 时，react 通过 event.target 找到事件触发的组件实例，并 dispatchEvent 派发合成事件 event ，把 event 通过 batchUpdates 交由绑定事件的处理函数。

react 会重复使用合成 event，如果 event 已经 persisted 则不会推入 eventPool 中每次处理 handle 时都会重新生成一个 event。

**react 合成事件兼容模拟浏览器事件差异，使用事件代理方式节省了内存只开辟一块空间，在组件销毁时解绑，避免频繁解绑方便事件的统一管理。**
