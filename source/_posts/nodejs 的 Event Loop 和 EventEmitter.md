---
title: nodejs 的 Event Loop 和 EventEmitter
date: 2018-09-07 19:25
tags: nodejs
categories: nodejs
---
## nodejs 的 Event Loop
nodejs 执行环境的 Event Loop 与浏览器上的不同，nodejs 使用 V8 作为 JS 的解释器，在 I/O 处理方面使用自己设计的 libuv，libuv 封装了不同 OS 平台的 I/O 操作，提供一致的异步(asynchronous) 、非阻塞(non-blocking) API、事件循环方式。![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401694615060781.png)

### nodejs 的单线程
nodejs 的单线程不是绝对的，在用户界面视图上的 js 是单线程的，但是使用 nodejs 创建应用程序是多线程的。
nodejs 需要维持一个线程池用来委托同步任务，同时 V8 会为垃圾回收创建自己的线程。
> The famous statement ‘Node.js runs in a single thread’ is only partly true. Actually only your ‘userland’ code runs in one thread. Starting a simple node application and looking at the processes reveals that Node.js in fact spins up a number of threads. This is because Node.js maintains a thread pool to delegate synchronous tasks to, while Google V8 creates its own threads for tasks like garbage collection.

### Event Loop 模型

![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401694615061489.png)

### Event Loop 的特点
> + 每个 phase 阶段都有存放与自己相关回调的 queue
> + 进入一个 phase 后，都会执行完自己 queue 的回调才会进入下一个 phase
> + 在回调中执行长时间任务会被阻塞
> + 在每次运行的事件循环之间，Node.js 检查它是否在等待任何异步 I/O 或计时器，如果没有的话，则关闭干净, 事件循环就结束了

> 比如 app.js 里只有简单的运行代码，执行完后进事件循环就结束了。
```
// app.js
console.log('event loop start!')

console.log('event loop stop')
```
![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401694615062092.png)

> 如果启动了一个 http.createServer().listen 就会一直执行，底层开启了 socket 一直等待 I/O 事件, 直到进行 close
```
// app.js
const http = require('http')

const server = http.createServer()

console.log('event loop start!')

setTimeout(() => server.close(), 2000) // timers 阶段

let t = null

// 启动 I/O 事件
server.listen(3000, () => {
  console.log('poll running')
  t = setInterval(() => console.log('poll'), 500) // 进行轮询
})

// close callbacks 阶段
server.on('close', () => {
  clearInterval(t)
  console.log('event loop stop')
})

```
![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401694615062686.png)



### Event Loop 各阶段说明
> + timers 阶段：执行已经准备好的 setTimeout、setInterval 回调。
> + pending callbacks 阶段：执行被延迟到下一个 event loop 的I/O回调。如网络、stream、tcp错误回调
> + idle, prepare 阶段：内部使用。
> + poll 阶段：取出新的 I/O 事件回调执行，(除: close 事件、setImmediate、timers 回调) node 程序将在这个阶段阻塞。
> + check 阶段：setImmediate() 将在这个阶段调用。
> + close callbacks 阶段：close 事件的回调将在这执行，如 socket.on('close', ...)

### 事件轮询机制

![轮询](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401694615063295.png)

nodejs 事件循环的轮询阶段跟浏览器上的 event loop 相似，区别在于置入回调队列的任务是 连接、数据、输入等。有关轮询中有关 promise 等 MicroTask MacroTask 执行顺序可以查看下面两篇
[事件循环中的 MacroTask与 MicroTask](https://www.jianshu.com/p/88043a9f5464)
[浏览器的事件循环](https://www.jianshu.com/p/4d6d5ba20105)

### setTimeout() 与 setImmediate() 对比

+ setTimeout() 属于 timers phase，设计在定时完成后执行。
+ setImmediate() 属于 check phase。每次 poll phase 后执行。
+ 如果在 I/O 循环中调用，setImmediate 一定先执行 (因为下一个阶段就是 check 阶段)。否则 setImmediate() 与 setTimeout(cb, 0) 的执行顺序不可预测

> 两者在执行顺序上不能确定
```
setImmediate(() => {
  console.log('immediate');
});

setTimeout(() => {
  console.log('timeout');
}, 0);
```
![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401694615063907.png)
![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401694615064503.png)

>  如果处于 IO 循环，setImmediate() 回调的执行一定先于 setTimeout()
```
const fs = require('fs');

fs.readFile(__filename, () => {
  setTimeout(() => {
    console.log('timeout');
  }, 0);
  setImmediate(() => {
    console.log('immediate');
  });
});
```
![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401694615065089.png)

### 理解 process.nextTick()
+ process.nextTick() 不属于 Event Loop 的各个阶段
+ process.nextTick() 的回调在每个阶段结束后进入下个阶段前同步执行
+ 绝不可在 process.nextTick 的 callback 中执行 long-running task
+ 不要执行会返回process.nextTick 的函数，不然这个阶段会一直认为还有回调需要执行，事件循环会被阻塞在这个阶段。

```
let bar;

function someAsyncApiCall(callback) { callback(); }

someAsyncApiCall(() => {
  // 同步的执行，但此时变量还没赋值
  console.log('bar', bar); // undefined
});

bar = 1;
```
```
let bar;

function someAsyncApiCall(callback) {
  process.nextTick(callback);
}

someAsyncApiCall(() => {
  // process.nextTick 使此回调在阶段结束后才执行
  console.log('bar', bar); // 1
});

bar = 1;
```
```
const EventEmitter = require('events');

class MyEmitter extends EventEmitter {
  constructor() {
    super()
    this.emit('event'); // 不会正常触发，事件还没绑定
  }
}

const myEmitter = new MyEmitter();

myEmitter.on('event', () => {
  console.log('an event occurred!');
});
```
```
const EventEmitter = require('events');

class MyEmitter extends EventEmitter {
  constructor() {
    super()
    process.nextTick(() => {
      this.emit('event'); // 会正常触发，因为是在继承阶段结束后才执行
    })
  }
}

const myEmitter = new MyEmitter();

myEmitter.on('event', () => {
  console.log('an event occurred!');
});
```

### process.nextTick() 与 setImmediate() 对比

+ process.nextTick() 不属于 Event Loop 的各个阶段
+ process.nextTick() 的回调在每个阶段结束后进入下个阶段前同步执行
+ process.nextTick() 在同一个阶段立即执行。
+ setImmediate() 只每次 poll phase 后进入 check phase 才执行。
+ process.nextTick() 比 setImmediate() 触发得更直接。
+ setImmediate() 更容易理解，如果需要拆分 long-running task 请使用 setImmediate()

## EventEmitter
nodejs 的大多模块(如HTTP request、response 和 stream)都继承了 EventEmitter 模块，它们可以触发和监听事件。

### Events 模块核心实现
Events 模块的核心实现非常简单，让你可以创建一个 event pattern 的工具，是 nodejs 事件驱动的核心，但它本身跟 nodejs 的 Event Loop 没有任何关系。
```
class MyEventEmitter {
  constructor () {
    this.events = {} // 事件对象
  }

  listeners (type) {
    return this.events[type]
  }

  addListener (type, listener) {
    if (this.events[type])
      this.events[type] = [ ...this.events[type], listener ]
    else
      this.events[type] = [ listener ]
  }

  once (type, listener) {
    this.addListener(type, _onceWrap(this, type, listener))
    return this
  }

  removeListener (type, listener) {
    if (this.events[type].length > 0)
      this.events[type] = this.events[type].filter(item => item !== listener)
    return this
  }

  removeAllListener (type) {
    delete this.events[type]
  }

  emit (type, ...args) {
    if (type === 'error' && !this.events[type].length) throw new Error('emit error event !~')
    this.events[type] && this.events[type].forEach(listener => Reflect.apply(listener, this, args))
  }

  get on() {
    return this.addListener
  }

  get off() {
    return this.removeListener
  }

}

function _onceWrap(target, type, listener) {
  const wrapped = (...args)
    => target.removeListener(type, wrapped) && Reflect.apply(listener, target, args)
  return wrapped
}
```

### Events 是同步的
Events 的调用非常简单
```
e.on('event')
e.emit('event', cb)
```
Events 仅仅只是简单的执行了事件的回调函数，它是同步执行的。
每一次的 emit，都是同步的执行了所绑定事件 queue 里的回调 。而 EventEmitter 本身与 nodejs 的 Event Loop 没有关系，也不存在异步执行的代码，是否异步只跟传入的回调函数有关。

```
EE.on('data', function (data) {
  console.log(data);
});
fs.readFile(__filename, (err, data) => {
  if (!err) EE.emit('data', data);
});
```

### EventEmitter 需要注意的地方

下面代码会造成 `Maximum call stack size exceeded` 报错, 因为所有的回调都是同步的，会在一个 poll phase 阶段不停执行下去，一直到系统崩溃.
```
const EventEmitter = require("events")
const EE = new EventEmitter()
EE.on('event1', function () {
  console.log('event1 fired!');
  EE.emit('event2');
})
EE.on('event2', function () {
  console.log('event2 fired!');
  EE.emit('event3');
})
EE.on('event3', function () {
  console.log('event3 fired!');
  EE.emit('event1');
})
EE.emit('event1');
```

换成 setImmediate() 来调用 emit ，会发现这段程序不会崩溃，setImmediate 把回调放入了每次轮询的下个阶段才进行，一个真正的通过 events 模块创建的异步代码.
```
const EventEmitter = require("events")
const EE = new EventEmitter()
EE.on('event1', function () {
  console.log('event1 fired!');
  setImmediate(() => {
    EE.emit('event2');
  })
})
EE.on('event2', function () {
  console.log('event2 fired!');
  setImmediate(() => {
    EE.emit('event3');
  })
})
EE.on('event3', function () {
  console.log('event3 fired!');
  setImmediate(() => {
    EE.emit('event1');
  })
})
EE.emit('event1');
```

### EventEmitter 中使用 process.nextTick()

如果把上面的代码 setImmediate() 换成 process.nextTick() 讲会报错，因为 process.nextTick() 是在当前阶段结束时且在下个阶段前执行，而在 process.nextTick() 里触发回调会导致程序一直认为当前阶段还有任务需要执行而出错的，这个阶段将会有无法清除的 nextTick 需要执行。

[参考1](https://nodejs.org/en/docs/guides/event-loop-timers-and-nexttick/)
[参考2](https://medium.freecodecamp.org/understanding-node-js-event-driven-architecture-223292fcbc2d)
[参考3](https://medium.com/sivann-com-tw/%E9%9D%9E%E5%90%8C%E6%AD%A5%E7%A8%8B%E5%BC%8F%E7%A2%BC%E4%B9%8B%E9%9C%A7-node-js-%E7%9A%84%E4%BA%8B%E4%BB%B6%E8%BF%B4%E5%9C%88%E8%88%87-eventemitter-809432976c1b)
