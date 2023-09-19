---
title: React 源码解析 - reactScheduler 异步任务调度
date: 2019-02-27 22:07:11
tags: react
---
## reactScheduler 异步调度

### 核心功能
+ 维护时间片
+ 模拟浏览器 requestldleCallback API (会等待浏览器执行完其他任务后有空闲时再回来执行回调)
  [[requestIdleCallback MDN]](https://developer.mozilla.org/zh-CN/docs/Web/API/Window/requestIdleCallback), [[requestIdleCallback 后台任务调度]](http://www.zhangyunling.com/702.html)
+ 调度列表和超时判断

### 时间片概念
用户感觉流畅界面至少需要 1秒30帧的刷新频率，每一帧只有 33ms 来执行。
+ 一帧 33ms，react 更新需要 20ms, 浏览器执行动画或用户反馈的时间只有 13ms，但是这一帧仍然是可以执行浏览器的动作。
+ 如果 react 更新需要 43ms, 还需要向下一帧借用 10ms， 浏览器在这第一帧中就没有时间去执行自己的任务，就会造成卡顿。
+ requestldleCallback API 会在浏览器空闲时依次调用函数，让浏览器在每一帧里都有足够的时间去执行动画或用户反馈，防止 react 更新占用掉一帧的所有时间。

## scheduleCallbackWithExpirationTime 异步任务调度

### 进入 scheduleCallbackWithExpirationTime
在 requestWork 中如果判断是异步调度的方法就会执行 scheduleCallbackWithExpirationTime
```
function requestWork(root: FiberRoot, expirationTime: ExpirationTime) {
  // ...
  if (expirationTime === Sync) { // 同步的调用 js 代码
    performSyncWork();
  } else { // 异步调度 独立的 react 模块包，利用浏览器有空闲的时候进行执行，设置 deadline 在此之前执行
    scheduleCallbackWithExpirationTime(root, expirationTime); // 在 secheduler 文件夹下的单独模块
  }
}
```

### scheduleCallbackWithExpirationTime 源码
+ 把 FiberRoot 加入调度
```
// scheduler 调度
function scheduleCallbackWithExpirationTime(
  root: FiberRoot,
  expirationTime: ExpirationTime,
) {
  // callbackExpirationTime 是上一次调度的任务优先级
  if (callbackExpirationTime !== NoWork) {
    // A callback is already scheduled. Check its expiration time (timeout).
    if (expirationTime > callbackExpirationTime) { // 当前优先级比之前正在执行的优先级低就停止
      // Existing callback has sufficient timeout. Exit.
      return;
    } else { // 当前优先级更高
      if (callbackID !== null) {
        // Existing callback has insufficient timeout. Cancel and schedule a
        // new one. // 退出了
        cancelDeferredCallback(callbackID);
      }
    }
    // The request callback timer is already running. Don't start a new one.
  } else {
    startRequestCallbackTimer(); // 不看
  }

  callbackExpirationTime = expirationTime; // 保存当前任务
  const currentMs = now() - originalStartTimeMs; // originalStartTimeMs 是 react 加载的最初时间, 记录当前时间差
  const expirationTimeMs = expirationTimeToMs(expirationTime); // 转化成 ms
  const timeout = expirationTimeMs - currentMs; // 过期时间
  callbackID = scheduleDeferredCallback(performAsyncWork, {timeout}); // 赖在 Scheduler 模块 返回 id 用来 cancel
}
```
+ timeout 为当前任务的延迟过期时间，由过期时间 - 当前任务创建时间得出，超过时代表任务过期需要强制更新
+ 通过 scheduleDeferredCallback 生成一个 callbackID，用于关闭任务

## scheduleCallback
Scheduler 包中的 scheduleCallback

### 实现细节
+ 维护一个 firstCallbackNode 的任务环状链表结构
+ 比较当前任务的优先级对 firstCallbackNode 的链表任务进行排序
+ 对链表上的 callback 任务排好序后使用 ensureHostCallbackIsScheduled 进行调度
+ 当 firstCallbackNode 链表的首个任务改变时调用 ensureHostCallbackIsScheduled 进行调度，firstCallbackNode 没改变按原来的优先级执行
```
// scheduleDeferredCallback, 传入 performAsyncWork, { timeout }
function unstable_scheduleCallback(callback, deprecated_options) {
  var startTime =
    currentEventStartTime !== -1 ? currentEventStartTime : getCurrentTime(); // 其实就是 Date.now()

  var expirationTime;
  if (
    typeof deprecated_options === 'object' &&
    deprecated_options !== null &&
    typeof deprecated_options.timeout === 'number'
  ) {
    // expirationTime 的逻辑有可能全部搬到 Scheduler 包里
    expirationTime = startTime + deprecated_options.timeout; // Date.now() + timeout 只会进入这里
  } else { // 以后是这个逻辑
    switch (currentPriorityLevel) {
      case ImmediatePriority: // sync
        expirationTime = startTime + IMMEDIATE_PRIORITY_TIMEOUT;
        break;
      case UserBlockingPriority:
        expirationTime = startTime + USER_BLOCKING_PRIORITY;
        break;
      case IdlePriority:
        expirationTime = startTime + IDLE_PRIORITY;
        break;
      case NormalPriority:
      default:
        expirationTime = startTime + NORMAL_PRIORITY_TIMEOUT;
    }
  }

  var newNode = {
    callback, //  performAsyncWork
    priorityLevel: currentPriorityLevel, // 用不到
    expirationTime, // timeout + now()
    next: null, // 链表结构
    previous: null,
  };

 // firstCallbackNode 是维护的单向链表头部
  if (firstCallbackNode === null) { // 单向链表头部 null 还没有元素, 当前 callback 就是第一个
    // firstCallbackNode 链表 pre next 都为当前 callback 的 newNode
    firstCallbackNode = newNode.next = newNode.previous = newNode;
    ensureHostCallbackIsScheduled(); // firstCallbackNode 改变需要调用 进入调度过程
  } else { // 链表上已经有多个 newNode 了
    var next = null;
    var node = firstCallbackNode;
    do {
      // 根据 expirationTime 排序，把优先级大的放在前面, 这里是跟 firstCallbackNode 链表头比较
      if (node.expirationTime > expirationTime) {
        next = node; // next 变为 fristCallbackNode
        break;
      }
      node = node.next; // 循环
    } while (node !== firstCallbackNode);

    if (next === null) { // 当前优先级小，如果 node.expirationTime < expirationTime,  当前的优先级是最小的
      next = firstCallbackNode; // 当前优先级小，next 为原来的 firstCallbackNode
    } else if (next === firstCallbackNode) { // 当前优先级大，firstCallbackNode 优先级没有当前的大
      firstCallbackNode = newNode; // 当前优先级大， firstCallbackNode 为当前的
      ensureHostCallbackIsScheduled(); // firstCallbackNode 改变需要调用  进入调度过程
    }

    // next 为 fristCallbackNode 来看，把 next 放到原 firstCallbackNode 的位置，链表重新排序
    var previous = next.previous;
    previous.next = next.previous = newNode;
    newNode.next = next;
    newNode.previous = previous; // 形成环状的链表结构
  }

  return newNode;
}
```

### ensureHostCallbackIsScheduled
+ 检查是否用 callbackNode 正在执行，否则停止
+ 判断 hostCallback 是否在调度，已经调度就取消
+ 执行 requestHostCallback 方法
```
function ensureHostCallbackIsScheduled() {
  if (isExecutingCallback) { // 代表已经有个 callbackNode 调用了
    // Don't schedule work yet; wait until the next time we yield.
    return;
  }
  // Schedule the host callback using the earliest expiration in the list.
  var expirationTime = firstCallbackNode.expirationTime;
  if (!isHostCallbackScheduled) { // 判断这个 callback 有没有进入调度
    isHostCallbackScheduled = true;
  } else {
    // Cancel the existing host callback.
    cancelHostCallback(); // 已经有了就退出
  }
  // 执行
  requestHostCallback(flushWork, expirationTime);
}
```

### requestHostCallback
```
  requestHostCallback = function(callback, absoluteTimeout) {
    scheduledHostCallback = callback;
    timeoutTime = absoluteTimeout;
    // absoluteTimeout < 0 已经超时了，isFlushingHostCallback 强制执行
    if (isFlushingHostCallback || absoluteTimeout < 0) {
      // 不等了直接调用
      // Don't wait for the next frame. Continue working ASAP, in a new event.
      window.postMessage(messageKey, '*');
    } else if (!isAnimationFrameScheduled) { // isAnimationFrameScheduled = false 还没进入调度循环
      // If rAF didn't already schedule one, we need to schedule a frame.
      // TODO: If this rAF doesn't materialize because the browser throttles, we
      // might want to still have setTimeout trigger rIC as a backup to ensure
      // that we keep performing work.
      isAnimationFrameScheduled = true; // 进入调度循环
      requestAnimationFrameWithTimeout(animationTick); // 进入调度，竞争调用 animationTick
    }
  };
```

### requestAnimationFrameWithTimeout
+ requestAnimationFrameWithTimeout 里，把 animationTick callback 放入浏览器动画回调里，如果 100ms 后还没有执行就通过 timeout 自动执行。
```
// 100ms 内竞争调用 本地 localRequestAnimationFrame 和 localSetTimeout
var requestAnimationFrameWithTimeout = function(callback) {
  // localRequestAnimationFrame 执行了，就取消 localSetTimeout, 互相竞争的关系
  rAFID = localRequestAnimationFrame(function(timestamp) { // 浏览器的 api
    localClearTimeout(rAFTimeoutID);
    callback(timestamp); // 传入动画时间戳
  });
  // 如果 100ms localRequestAnimationFrame 里的 callback 没执行，就取消 localRequestAnimationFrame 自己执行
  rAFTimeoutID = localSetTimeout(function() {
    localCancelAnimationFrame(rAFID);
    callback(getCurrentTime()); // 传入当前时间
  }, ANIMATION_FRAME_TIMEOUT);
};
```

###  animationTick
+ 处于浏览器 requestAnimationFrame 的回调中，为了节约时间不停地调用自己
+ 通过 前后两次调用时间来判断当前浏览器的刷新频率
+  当 isMessageEventScheduled 变量为 false 后 通过 postMessage 发送事件给任务队列插入 react 任务，这才是一帧中做的事。
```
  // rafTime 就是 animationTick 调用的时间
  var animationTick = function(rafTime) {
    if (scheduledHostCallback !== null) {
      // 立马请求下一帧调用自己, 不停的调用, 队列有很多 callback
      requestAnimationFrameWithTimeout(animationTick);
    } else {
      // 没有方法要被调度
      isAnimationFrameScheduled = false;
      return;
    }
    // rafTime 调用的当前时间，frameDeadline 为 0， activeFrameTime 33 保持浏览器一秒 30 帧每一帧的执行时间-一帧完整的时间
    // 下一帧我可以执行的时间是多少
    var nextFrameTime = rafTime - frameDeadline + activeFrameTime;
    if (
      nextFrameTime < activeFrameTime &&
      previousFrameTime < activeFrameTime
    ) { // 如果连续两次帧的调用计算出来的时间是小于33ms 目前的帧时间的，就设置帧时间变小. 主要针对不同平台，比如 vr 120帧，设置平台的刷新平台设置 activeFrameTime
      if (nextFrameTime < 8) {
        nextFrameTime = 8;
      }
      activeFrameTime =
        nextFrameTime < previousFrameTime ? previousFrameTime : nextFrameTime;
    } else { //
      previousFrameTime = nextFrameTime;
    }
    frameDeadline = rafTime + activeFrameTime; // 第一个 frameDeadLine
    if (!isMessageEventScheduled) {
      isMessageEventScheduled = true;
      window.postMessage(messageKey, '*'); // 给任务队列插入 react 任务，等浏览器执行完自己的任务再执行这里队列里的
    }
  };
```

### idleTick
+ 接受判断 react 任务
+ 判断当前帧是否把时间用完了，帧时间用完了任务又过期了 didTimout 标志过期
+ 没用完继续或调用动画，保存任务等它过期再调用
+ 最后判断 callback 不为空，调用过期的 react 任务。
+ 这个方法保证了动画最大限度的执行，react 更新任务只有到时间才会执行
```
window.addEventListener('message', idleTick, false); // 接受 react 任务队列

  var idleTick = function(event) {
    // 判断 key，避免接收到其他非 react 的消息
    if (event.source !== window || event.data !== messageKey) {
      return;
    }

    isMessageEventScheduled = false;
    // 赋值再重置 scheduledHostCallback 是 requestHostCallback 传入的 flushWork
    var prevScheduledCallback = scheduledHostCallback;
    var prevTimeoutTime = timeoutTime;
    scheduledHostCallback = null;
    timeoutTime = -1;

    var currentTime = getCurrentTime();

    var didTimeout = false;
    // 浏览器动画或用户反馈操作超过 33ms, 把这一帧的时间用完了，react 没有时间去更新了
    if (frameDeadline - currentTime <= 0) {
      // prevTimeoutTime 也就是 timeoutTime <= currentTime，当前任务也已经过期了，需要强行更新了
      if (prevTimeoutTime !== -1 && prevTimeoutTime <= currentTime) {
        didTimeout = true; // 准备强制更新
      } else {
        // No timeout. 没过期直接调用 requestAnimationFrameWithTimeout
        if (!isAnimationFrameScheduled) {
          isAnimationFrameScheduled = true;
          requestAnimationFrameWithTimeout(animationTick);
        }
        scheduledHostCallback = prevScheduledCallback;
        timeoutTime = prevTimeoutTime;
        return;
      }
    }
    // callback 不为空
    if (prevScheduledCallback !== null) {
      isFlushingHostCallback = true; // 正在调用这个 callback
      try { // 强制执行
        prevScheduledCallback(didTimeout);
      } finally {
        isFlushingHostCallback = false; // 强制更新完恢复 false
      }
    }
  };
```

## flushWork
+ 通过判断 callback 已经过期或当前帧还有时间才开始真正执行
+ finally 最后 firstCallbackNode 不为空调 isHostCallbackScheduled 为 true , ensureHostCallbackIsScheduled 会执行 cancelHostCallback 重置所有的调度常量，老 callback 就不会被执行
```
// 强制执行过期任务
function flushWork(didTimeout) {
  isExecutingCallback = true; // 开始真正调用 callback
  deadlineObject.didTimeout = didTimeout;
  try {
    if (didTimeout) { // firstCallbackNode 已经过期
      // Flush all the expired callbacks without yielding.
      while (firstCallbackNode !== null) { 
        var currentTime = getCurrentTime();
        // 第一个 expirationTime 肯定小于 currentTime, 为过期任务
        if (firstCallbackNode.expirationTime <= currentTime) {
          do {
            // 执行的同时进行链表操作
            flushFirstCallback(); // 真正执行了回调, 一直到第一个没有过期的任务为止
          } while (
            firstCallbackNode !== null &&
            firstCallbackNode.expirationTime <= currentTime // 链表循环判断过期了
          );
          continue;
        }
        break;
      }
    } else {
      //继续刷新回调，直到帧中的时间不足为止。
      // Keep flushing callbacks until we run out of time in the frame.
      if (firstCallbackNode !== null) {
        do {
          flushFirstCallback();
        } while (
          firstCallbackNode !== null &&
          getFrameDeadline() - getCurrentTime() > 0 // 帧还有时间空闲才执行
        );
      }
    }
  } finally {
    isExecutingCallback = false;
    if (firstCallbackNode !== null) {
      ensureHostCallbackIsScheduled();// 这时候执行 isHostCallbackScheduled 为 true 会执行 cancelHostCallback 重置所有的调度常量，老 callback 就不会被执行
    } else {
      isHostCallbackScheduled = false;
    }
    flushImmediateWork();
  }
}
```


### deadlineObject.timeRemaining
+ deadlineObject 上 还有个 timeRemaining 属性 剩余时间
+ remaining 表示 这一帧的渲染是否超过 在 shouldYield 中使用并判断
```
var timeRemaining; // 剩余时间
if (hasNativePerformanceNow) {
  timeRemaining = function() {
    if (
      firstCallbackNode !== null &&
      firstCallbackNode.expirationTime < currentExpirationTime // 不成立 不看
    ) {
      return 0;
    }
    var remaining = getFrameDeadline() - performance.now();
    return remaining > 0 ? remaining : 0; // 这一帧的渲染是否超过 在 shouldYield 中使用并判断
  };
} else { // 不走这里
  timeRemaining = function() {
    // Fallback to Date.now()
    if (
      firstCallbackNode !== null &&
      firstCallbackNode.expirationTime < currentExpirationTime
    ) {
      return 0;
    }
    var remaining = getFrameDeadline() - Date.now();
    return remaining > 0 ? remaining : 0; // 判断这一帧是否已经超过
  };
}
```

### shouldYield
+ 用来 timeRemaining 剩余时间跟常量比较获取是否该跳出的判断
```
// 应该跳出了
function shouldYield() {
  if (deadlineDidExpire) {
    return true;
  }
  if (
    deadline === null ||
    deadline.timeRemaining() > timeHeuristicForUnitOfWork // 通过比较常量
  ) { // 当前帧 return false 还有剩余时间可以执行
    return false;
  }
  deadlineDidExpire = true; // 这一帧的渲染时间已经超时
  return true;
}
```

### flushFirstCallback
+ 处理链表后执行 callback
+   callbackID = scheduleDeferredCallback(performAsyncWork, {timeout});
```
function flushFirstCallback() {
  var flushedNode = firstCallbackNode;

  // Remove the node from the list before calling the callback. That way the
  // list is in a consistent state even if the callback throws.
  var next = firstCallbackNode.next;
  if (firstCallbackNode === next) { // 链表当前元素等于下一个，已经为空了
    // This is the last callback in the list.
    firstCallbackNode = null;
    next = null;
  } else {
    // 环状结构
    var lastCallbackNode = firstCallbackNode.previous;
    firstCallbackNode = lastCallbackNode.next = next;
    next.previous = lastCallbackNode;
  }

  flushedNode.next = flushedNode.previous = null;

  // Now it's safe to call the callback.
  var callback = flushedNode.callback;
  var expirationTime = flushedNode.expirationTime;
  var priorityLevel = flushedNode.priorityLevel;
  var previousPriorityLevel = currentPriorityLevel;
  var previousExpirationTime = currentExpirationTime;
  currentPriorityLevel = priorityLevel;
  currentExpirationTime = expirationTime;
  var continuationCallback;
  try {
    continuationCallback = callback(deadlineObject); // 执行 callback
  } finally {
    currentPriorityLevel = previousPriorityLevel;
    currentExpirationTime = previousExpirationTime;
  }
// ... 暂时没作用
}
```

## performWork
+ 调度完成回到 ReactDOM
+ performWork 通过 performAsyncWork 异步方式 和 performSyncWork 同步方式调用
+ 异步情况给 performWork 设置的 minExpirationTime 是 NoWork 0，并且会判断dl.didTimeout，这个值是指任务的 expirationTime 是否已经超时，如果超时了，则通过 didExpireAtExpirationTime 直接设置 newExpirationTimeToWorkOn 为当前时间，表示这个任务直接执行就行了，不需要判断是否超过了帧时间
+ 同步方式久比较简单了，设置 minExpirationTime 为 Sync 1
```
function performAsyncWork(dl) {
  // true
  if (dl.didTimeout) { // 任务过期，立即执行
    if (firstScheduledRoot !== null) {
      recomputeCurrentRendererTime(); // 设置当前渲染时间为当前时间
      let root: FiberRoot = firstScheduledRoot;
      do {
        // 标记 root 节点变量, 如果当前任务过期设置为当前时间为 expirationTime
        didExpireAtExpirationTime(root, currentRendererTime);
        root = (root.nextScheduledRoot: any); // 下一个 root
      } while (root !== firstScheduledRoot);
    }
  }
  performWork(NoWork, dl);
}

function performSyncWork() {
  performWork(Sync, null);
}
```

### 核心功能
+ 是否有 deadline 的区分
  时间片更新后还有没有时间
+ 循环渲染 Root 的条件
  循环不同 root 和不同优先级任务来更新
+ 超过时间片的处理
  dealine 这一帧的时间到了把执行权交回浏览器


### 源码
+ 通过 findHighestPriorityRoot  找到优先级最高的下一个需要渲染的 root: nextFlushedRoot 和对应的 expirtaionTime: nextFlushedExpirationTime
+ 根据 deadline 判断 performWorkOnRoot 参数
+ 相同部分
```
      nextFlushedRoot !== null && // 判断下一个输出节点不是 null
      nextFlushedExpirationTime !== NoWork && // 过期时间不是 NoWork
      (minExpirationTime === NoWork || // 超时时间是 NoWork
        minExpirationTime >= nextFlushedExpirationTime) && // 超时时间大于下个节点或
```
普通情况 minExpirationTime 应该就等于nextFlushedExpirationTime 因为都来自同一个 root，nextFlushedExpirationTime 是在 findHighestPriorityRoot 阶段读取出来的 root.expirationTime
+ 异步的判断
```
    while (
      nextFlushedRoot !== null &&
      nextFlushedExpirationTime !== NoWork &&
      (minExpirationTime === NoWork ||
        minExpirationTime >= nextFlushedExpirationTime) &&
        // deadlineDidExpire 判断时间片是否过期 shouldYield 中判断
      (!deadlineDidExpire || currentRendererTime >= nextFlushedExpirationTime) // currentRendererTime >= nextFlushedExpirationTime 超时了
      performWorkOnRoot(
        nextFlushedRoot,
        nextFlushedExpirationTime,
        currentRendererTime >= nextFlushedExpirationTime, // 超时了
      );
// ...
}
```
deadline 设置的 deadlineDidExpire 用来判断时间片是否到期的
当前渲染时间 currentRendererTime 比较 nextFlushedExpirationTime 判断任务是否已经超时
```
(!deadlineDidExpire || currentRendererTime >= nextFlushedExpirationTime)
```
+ 同步的判断
```
    while (
      nextFlushedRoot !== null &&
      nextFlushedExpirationTime !== NoWork &&
      (minExpirationTime === NoWork ||
        minExpirationTime >= nextFlushedExpirationTime)
    ) {
      performWorkOnRoot(nextFlushedRoot, nextFlushedExpirationTime, true);
// ...
}
```
+ 全部流程
```
// currentRendererTime 计算从页面加载到现在为止的毫秒数
// currentSchedulerTime 也是加载到现在的时间，isRendering === true的时候用作固定值返回，不然每次requestCurrentTime都会重新计算新的时间
function performWork(minExpirationTime: ExpirationTime, dl: Deadline | null) {
  deadline = dl;

  // 找到优先级最高的下一个需要渲染的 root: nextFlushedRoot 和对应的 expirtaionTime: nextFlushedExpirationTime
  findHighestPriorityRoot();

  if (deadline !== null) {
    recomputeCurrentRendererTime(); // 重新计算 currentRendererTime
    currentSchedulerTime = currentRendererTime;

    if (enableUserTimingAPI) {
      const didExpire = nextFlushedExpirationTime < currentRendererTime;
      const timeout = expirationTimeToMs(nextFlushedExpirationTime);
      stopRequestCallbackTimer(didExpire, timeout);
    }

    while (
      nextFlushedRoot !== null &&
      nextFlushedExpirationTime !== NoWork &&
      (minExpirationTime === NoWork ||
        minExpirationTime >= nextFlushedExpirationTime) &&
        // deadlineDidExpire 判断时间片是否过期 shouldYield 中判断
      (!deadlineDidExpire || currentRendererTime >= nextFlushedExpirationTime) // currentRendererTime >= nextFlushedExpirationTime 超时了
    ) {
      performWorkOnRoot(
        nextFlushedRoot,
        nextFlushedExpirationTime,
        currentRendererTime >= nextFlushedExpirationTime, // 超时了 true
      );
      findHighestPriorityRoot();
      recomputeCurrentRendererTime();
      currentSchedulerTime = currentRendererTime;
    }
  } else {
    while (
      nextFlushedRoot !== null &&
      nextFlushedExpirationTime !== NoWork &&
      (minExpirationTime === NoWork ||
        minExpirationTime >= nextFlushedExpirationTime)
    ) {
      performWorkOnRoot(nextFlushedRoot, nextFlushedExpirationTime, true);
      findHighestPriorityRoot();
    }
  }
```

### findHighestPriorityRoot
正常情况 React 应用只会有一个 root 执行下面逻辑
```
if (root === root.nextScheduledRoot) {
  // This is the only root in the list.
  root.nextScheduledRoot = null;
  firstScheduledRoot = lastScheduledRoot = null;
  break;
}
```
最后   // 找到优先级最高的下一个需要渲染的 root: nextFlushedRoot 和对应的 expirtaionTime: nextFlushedExpirationTime

## performWorkOnRoot
+ renderRoot 渲染阶段
+ completeRoot 提交阶段
+ 同步异步调用 renderRoot 区别在于 isYieldy
+ isYieldy = false 和 shouldYield = false 表示任务不可中断，执行的是同步任务或者已经过期的任务或时间片有剩余时间执行
+ 同步情况直接进入 renderRoot 渲染阶段再进入 completeRoot 提交阶段
+ 异步情况先进入 renderRoot 渲染阶段，然后根据 shouldYield(是否该暂停跳出) 判断是否需要中断
+ shouldYield = false 当前帧还有时间，进入 completeRoot 提交阶段，true 则当前帧没有时间待到下一次 requestIdleCallback 之后执行
+ 最后 isRendering = false
+ finishedWork 是已经完成 renderRoot 渲染阶段的任务，只有 renderRoot 后才不为 null
+ completeRoot 只有在 renderRoot 渲染阶段完成 finishedWork 不为 null 时才能执行
+ 判断 finishedWork !== null 是因为当前时间片可能 renderRoot 结束了没时间 completeRoot，如果新的时间片中有完成 renderRoot 的 finishedWork 就直接 completeRoot
```
function performWorkOnRoot(
  root: FiberRoot,
  expirationTime: ExpirationTime,
  isExpired: boolean,
) {
  isRendering = true;

  if (deadline === null || isExpired) {
    // 同步
    let finishedWork = root.finishedWork;
    // 因为有可能 renderRoot 执行完了 finishedWork != null 但是没时间 completeRoot， 所以每次都判断一下
    if (finishedWork !== null) {
      completeRoot(root, finishedWork, expirationTime);
    } else {
      root.finishedWork = null;
      const timeoutHandle = root.timeoutHandle;
      if (timeoutHandle !== noTimeout) {
        root.timeoutHandle = noTimeout;
        cancelTimeout(timeoutHandle);
      }
      const isYieldy = false;
      renderRoot(root, isYieldy, isExpired);
      finishedWork = root.finishedWork;
      if (finishedWork !== null) {
        completeRoot(root, finishedWork, expirationTime)
      }
    }
  } else {
    // 异步
    let finishedWork = root.finishedWork;
    if (finishedWork !== null) {
      completeRoot(root, finishedWork, expirationTime);
    } else {
      root.finishedWork = null;
      const timeoutHandle = root.timeoutHandle;
      if (timeoutHandle !== noTimeout) {
        root.timeoutHandle = noTimeout;
        cancelTimeout(timeoutHandle);
      }
      const isYieldy = true;
      renderRoot(root, isYieldy, isExpired);
      finishedWork = root.finishedWork;
      if (finishedWork !== null) {
        if (!shouldYield()) { // 不可以中断，进入 commit 阶段
          completeRoot(root, finishedWork, expirationTime);
        } else {
          // 可以中断，记录 finishedWork, 此时只执行了 render 阶段 renderRoot 没执行 commit 阶段 completeRoot 待到下个时间段进入 performWorkOnRoot 判断
          root.finishedWork = finishedWork;
        }
      }
    }
  }

  isRendering = false;
}
```

## renderRoot 的概览

### 核心功能
+ 进入 workLoop 进行循环单元更新
  对整颗 fiberTree 都遍历一遍
+ 更新时捕获错误并进行处理
+ 更新流程结束后的处理
+ nextUnitOfWork 是每个更新完的 fiber 的 child，也就是子节点
+ nextUnitOfWork = createWorkInProgress() 拷贝一份 fiber 节点，在 nextUnitOfWork 中修改，防止改变当前 fiberTree
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


###执行流程
+ 执行 workLoop
+ 在 performUnitOfWork 中执行 beginWork 进行更新
```
function workLoop(isYieldy) {
  if (!isYieldy) { // 不可中断 Sync 和 超时任务不可中断
    // Flush work without yielding
    // nextUnitOfWork 是 fiber 对象，为 null 已经是 root 节点 fiber return 的 null 了
    while (nextUnitOfWork !== null) {
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
+ workLoop 过程中的 catch
```
  do {
    try {
      workLoop(isYieldy); // 进行每个节点的更新
    } catch (thrownValue) {
      // ...
      break; // 遇到了某种错误跳出
    }   while(true)
```

+ workLoop 后的错误处理和提交
```
// 致命错误
if (didFatal) { }

// workLoop break 中断的错误
if (nextUnitOfWork !== null) { }

// 可处理的错误
if (nextRenderDidError) { }

// 准备提交
onComplete(root, rootWorkInProgress, expirationTime);plete()
```
