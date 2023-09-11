---
title: Vue.nextTick的实现
date: 2018-01-22 13:04:21
tags: Vue
categories: Vue
---
这是一篇继event loop和MicroTask 后的vue.nextTick API实现的源码解析。

## 预热，写一个sleep函数
```
function sleep (ms) {
  return new Promise(resolve => setTimeout(resolve, ms)
}
async function oneTick (ms) {
  console.log('start')
  await sleep(ms)
  console.log('end')
}
oneTick(3000)
```

+ 解释下sleep函数
async 函数进行await PromiseFn()时函数执行是暂停的，我们也知道现在这个PromiseFn是在microTask内执行。当microTask没执行完毕时，后面的macroTask是不会执行的，我们也就通过microTask在event loop的特性实现了一个sleep函数，阻止了console.log的执行
+ 流程
1执行console.log('start')
2执行await 执行暂停，等待await函数后的PromiseFn在microTask执行完毕
3在sleep函数内，延迟ms返回
4返回resolve后执行console.log('end')


## nextTick API
+ vue中nextTick的使用方法

```
vue.nextTick(() => {
  // todo...
})
```

了解用法后看一下源码

```
const nextTick = (function () {
  const callbacks = []
  let pending = false
  let timerFunc // 定时函数

  function nextTickHandler () {
    pending = false
    const copies = callbacks.slice(0) // 复制
    callbacks.length = 0 // 清空
    for (let i = 0; i < copies.length; i++) {
      copies[i]() // 逐个执行
    }
  }

  if (typeof Promise !== 'undefined' && isNative(Promise)) {
    var p = Promise.resolve()
    var logError = err => { console.error(err) }
    timerFunc = () => {
      p.then(nextTickHandler).catch(logError) // 重点
    }
  } else if ('!isIE MutationObserver') {
    var counter = 1
    var observer = new MutationObserver(nextTickHandler) // 重点
    var textNode = document.createTextNode(string(conter))

    observer.observe(textNode, {
      characterData: true
    })
    timerFunc = () => {
      counter = (counter + 1) % 2
      textNode.data = String(counter)
    }
  } else {
    timerFunc = () => {
      setTimeout(nextTickHandler, 0) // 重点
    }
  }


  return function queueNextTick (cb, ctx) { // api的使用方式
    let _resolve
    callbacks.push(() => {
      if (cb) {
        try {
          cb.call(ctx)
        } catch (e) {
          err
        }
      } else if (_resolve) {
        _resolve(ctx)
      }
    })
    if (!pending) {
      pending = true
      timerFunc()
    }
    if (!cb && typeof Promise !== 'undefined') {
      return new Promise((resolve, reject) => {
        _resolve =resolve
      })
    }
  }
})() // 自执行函数
```

大致看一下源码可以了解到nextTick api是一个自执行函数
既然是自执行函数，直接看它的return类型，return function queueNextTick (cb, ctx) {...} 

```
return function queueNextTick (cb, ctx) { // api的使用方式
    let _resolve
    callbacks.push(() => {
      if (cb) {
        try {
          cb.call(ctx)
        } catch (e) {
          err
        }
      } else if (_resolve) {
        _resolve(ctx)
      }
    })
    if (!pending) {
      pending = true
      timerFunc()
    }
    if (!cb && typeof Promise !== 'undefined') {
      return new Promise((resolve, reject) => {
        _resolve =resolve
      })
    }
  }
```

只关注主流程queueNextTick函数把我们传入的() => { // todo... } 推入了callbacks内

```
  if (typeof Promise !== 'undefined' && isNative(Promise)) {
    var p = Promise.resolve()
    var logError = err => { console.error(err) }
    timerFunc = () => {
      p.then(nextTickHandler).catch(logError) // 重点
    }
  } else if ('!isIE MutationObserver') {
    var counter = 1
    var observer = new MutationObserver(nextTickHandler) // 重点
    var textNode = document.createTextNode(string(conter))

    observer.observe(textNode, {
      characterData: true
    })
    timerFunc = () => {
      counter = (counter + 1) % 2
      textNode.data = String(counter)
    }
  } else {
    timerFunc = () => {
      setTimeout(nextTickHandler, 0) // 重点
    }
  }
```

这一段我们可以看到标注的三个点表明在不同浏览器环境下使用Promise, MutationObserver或setTimeout(fn, 0) 来执行nextTickHandler

```
function nextTickHandler () {
    pending = false
    const copies = callbacks.slice(0) // 复制
    callbacks.length = 0 // 清空
    for (let i = 0; i < copies.length; i++) {
      copies[i]() // 逐个执行
    }
  }
```  
nextTickHandler就是把我们之前放入callbacks的 () => { // todo... } 在当前tasks内执行。

## 写一个简单的nextTick
源码可能比较绕，我们自己写一段简单的nextTick

```
const simpleNextTick = (function () {
  let callbacks = []
  let timerFunc

  return function queueNextTick (cb) {
    callbacks.push(() => { // 给callbacks 推入cb()
      cb()
    })

    timerFunc = () => {
      return Promise.resolve().then(() => {
        const fn = callbacks.shift()
        fn()
      })
    }
    timerFunc() // 执行timerFunc，返回到是一个Promise
  }
})()

simpleNextTick(() => {
  setTimeout(console.log, 3000, 'nextTick')
})
```

我们可以从这里看出nextTick的原理就是返回出一个Promise，而我们todo的代码在这个Promise中执行，现在我们还可以继续简化

```
const simpleNextTick = (function () {
  return function queueNextTick (cb) {
    timerFunc = () => {
      return Promise.resolve().then(() => {
        cb()
      })
    }
    timerFunc()
  }
})()

simpleNextTick(() => {
  setTimeout(console.log, 3000, 'nextTick')
})
```

直接写成这样。

```
const simpleNextTick = function queueNextTick (cb) {
    timerFunc = () => {
      return Promise.resolve().then(() => {
        cb()
      })
    }
    timerFunc()
  }

simpleNextTick(() => {
  setTimeout(console.log, 3000, 'nextTick')
})
```

这次我们把自执行函数也简化掉

```
const simpleNextTick = function queueNextTick (cb) {
      return Promise.resolve().then(cb)
  }

simpleNextTick(() => {
  setTimeout(console.log, 3000, 'nextTick')
})
```

现在我们直接简化到最后，现在发现nextTick最核心的内容就是Promise，一个microtask。

现在我们回到vue的nextTick API官方示例

```
<div id="example">{{message}}</div>
var vm = new Vue({
  el: '#example',
  data: {
    message: '123'
  }
})
vm.message = 'new message' // 更改数据
vm.$el.textContent === 'new message' // false
Vue.nextTick(function () {
  vm.$el.textContent === 'new message' // true
})
```

原来在vue内数据的更新后dom更新是要在下一个事件循环后执行的。
nextTick的使用原则主要就是解决单一事件更新数据后立即操作dom的场景。

既然我们知道了nextTick核心是利用microTasks，那么我们把简化过的nextTick和开头的sleep函数对照一下。


```
const simpleNextTick = function queueNextTick (cb) {
      return Promise.resolve().then(cb)
  }

simpleNextTick(() => {
  setTimeout(console.log, 3000, 'nextTick') // 也可以换成ajax请求
})
```
```
function sleep (ms) {
  return new Promise(resolve => setTimeout(resolve, ms) // 也可以换成ajax请求
}
async function oneTick (ms) {
  console.log('start')
  await sleep(ms)
  console.log('end')
}
oneTick(3000)
```

我们看出nextTick和我么写的oneTick的执行结果是那么的相似。区别只在于nextTick是把callback包裹一个Promise返回并执行，而oneTick是用await执行一个Promise函数，而这个Promise有自己包裹的webapi函数。

那在用ajax请求的时候我们是不是直接这样使用axios可以返回Promise的库

```
async function getData () {
	const data = await axios.get(url)
	// 操作data的数据来改变dom
	return data
}
```

这样也可以达到同nextTick同样的作用

最后我们也可以从源码中看出，当浏览器环境不支持Promise时可以使用MutationObserver或setTimeout(cb, 0) 来达到同样的效果。但最终的核心是microTask
