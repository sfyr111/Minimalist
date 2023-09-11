---
title: 实现一个 Vue (1) 实现响应式原理
date: 2018-04-11 19:28:09
tags: Vue
categories: Vue
---
![](https://upload-images.jianshu.io/upload_images/2155778-4554860907a963c2.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

> + new Vue(options) 创建 Vue 实例

> + observer() 将处理 options.data 
> 1 创建 dep = new Dep()(订阅者) 闭包等待依赖收集 watcher(观察者)
> 2 创建 getter 函数等待 options.data 被 getter 后执行依赖收集
> 3 创建 setter 函数等待 options.data 改变时遍历 dep.subs: watcher[] 通知每个 watcher 进行更新

> + Vue 构造函数 init 执行 compile() 
> + compile() 时执行了 observer(options.data) 的 getter 函数进行 dep 对 watcher 的依赖收集


## 创建实例 / 更新数据
> + 方便演示为 options.data 定义 testA testB 待响应数据
> + 创建实例执行 Vue 按顺序执行 observer
> + 更新 testA testB 响应数据通过 setter -> dep.subs -> watcher -> update 更新

```
// vm.js
let vm = new Vue({ // 实例初始化
  el: '#app',
  data: {
    testA: 'i am testA',
    testB: 'i am testB',
  },
})

// 对观察者数据更新
vm._data.testA = 'testA change'
vm._data.testB = 'testB change'
```

## Dep 订阅者依赖收集
> + var dep = new Dep() 创建一个订阅者
> + subs 为 watcher[] 类型的数组 
> + dep.notify 会通知每个 watcher 进行更新

```
// dep.js
export default class Dep {
  constructor() {
    this.subs = []
  }

  addSub(sub) {
    this.subs.push(sub)
    console.log(this.subs)
  }

  notify() {
    this.subs.forEach(sub => {
      sub.update()
    })
  }
}
```

## Watcher 观察者 被用来收集
> + new Watcher 时 给 Dep.target 指向为一个 watcher 实例对象
> + 为 dep.subs addSub 时只需要增加 Dep.target
> + update 为响应数据更新时的需处理的逻辑

```
// watcher.js
import Dep from './dep'

export default class Wathcher {
  constructor() {
    Dep.target = this
  }

  update() {
    console.log('wathcher updating!')
  }
}
```

## 实现 observer

```
// observer.js
import Dep from './dep.js'

export function observer(data) {
  if (!data || typeof data !== 'object') {
    return
  }
  Object.keys(data).forEach(key => {
    defineReactive(data, key, data[key])
  })
  Dep.target = null // Watcher 添加完毕
}

function defineReactive(data, key, val) {
  observer(val) // 对子属性进行绑定

  const dep = new Dep() // 创建一个订阅者
  Object.defineProperty(data, key, {
    enumerable: true,
    configurable: true,
    get: function proxyGetter() {
      // view 层绑定几次 addSub 注册几个 Watcher 绑定完了Dep.target = null 继续绑定注册下个数据
      Dep.target && dep.addSub(Dep.target)
      return val
    },
    set: function proxySetter(newVal) {
      if (val === newVal) return
      val = newVal
      dep.notify() // 响应数据更新后此数据的 dep 订阅者通知所有 watcher 观察对象
    }
  })
}
```

## mvvm
> + Vue 构造函数的 compile 为 view 层绑定数据逻辑
> + compile 会触发响应数据的 getter 

```
// mvvm.js
import Watcher from './watcher'
import { observer } from './observer'

export default class Vue {
  constructor(options) {
    this._data = options.data
    observer(this._data)
    new Watcher()
    this._init()
  }

  _init() {
    this._compile(this._data)
  }

  _compile(data) {
    // 每次 log 模拟绑定一次视图， 触发一次响应数据的 getter 
    console.log('view 层绑定', data.testA)
    console.log('view 层绑定', data.testA)
    console.log('view 层绑定', data.testA)

    console.log('view 层绑定', data.testB)
    console.log('view 层绑定', data.testB)
  }
}
```

![](https://upload-images.jianshu.io/upload_images/2155778-35e7cc9960609709.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)
