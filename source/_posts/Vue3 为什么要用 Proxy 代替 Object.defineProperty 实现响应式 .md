---
title: Vue3 为什么要用 Proxy 代替 Object-defineProperty 实现响应式
date: 2020-04-19 23:30:02
tags:
---
## Object.defineProperty 劫持数据
> 只是对对象的属性进行劫持
+ 无法监听新增属性和删除属性
  需要使用 vue.set, vue.delete
+ 深层对象的劫持需要一次性递归
```
var obj = {
  a: 1,
  o: {
    b: 2,
    o1: {}
  }
}
```
+ 劫持数组时需要重写覆盖部分 Array.prototype 原生方法

## Proxy 劫持数据
> 真正的对对象本身进行劫持
+ 可以监听到对象新增删除属性
+ 只在 getter 时才对对象的下一层进行劫持(优化了性能)
+ 能正确监听原生数组方法
+ 无法 polyfill 存在浏览器兼容问题

## Object.defineProperty 实现响应式
```
function defineReactive(target, key, value) {
	observer(value) // 对 value 深层监听
	
	Object.defineProperties(target, key, {
		get() {
			// dep.addSubs(watcher) // 添加到监听队列
			return value
		},
		set(newValue) {
			if (newValue !== value) {
				observer(newValue) // 再次劫持新 value
				
				value = newValue
				// dep.notify() // 通知依赖触发监听队列的更新
			}
		}
	})
}

function observer(target) {
  if (typeof target !== 'object' || !target) {
  	return target
  }
  
  if (Array.isArray(target)) {
  	target.__proto__ = newArrProto
  }
  
  for (let key of target) {
  	defineReactive(target, key, target[key])
  }
}

const oldArrProto = Array.prototype

const newArrProto = Object.create(oldArrProto)
['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse'].forEach(methodName => {
	newArrProto[methodName] = function(...args) {
		// dep.notify()
		oldArrProto[methodName].apply(this, args)
	}
})
```
Dep 和 Watcher 具体实现可以参考之前的文章 [实现响应式原理](https://www.jianshu.com/p/26e24ce84c4b)

## Object.defineProperty 缺点
+ 无法监听新增属性和删除属性
  需要使用 vue.set, vue.delete
+ 深层对象的劫持需要一次性递归
```
function observer(target) {
  ...
  for (let key of target) {
    defineReactive(target, key, target[key])
  }
}

function defineReactive(target, key, value) {
  observer(target) // 首次监听时就对 value 的属性进行递归
  ...
}
```
+ 监听原生数组的部分方法需要重写覆盖 Array.prototype
  `['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse']` 会改变原数组的原生方法不会被 Object.defineProperty 劫持，需要重新写数组的原生方法添加更新触发

## Proxy 实现响应式
```
function reactive(target = {}) {
	if (typeof target !== 'object' || target == null) {
		return target
	}
	
	const proxyConfig = {
		get(target, key, receiver) {
			const ownKeys = Reflect.ownKeys(target)
			if (ownKeys.includes(key)) {
			  // dep.subs(watcher) // 添加监听
			}
			const result = Reflect.get(target, key, receiver)
			return reactive(result) // 只在 getter 时才再次劫持
		},
		set(target, key, val, receiver) {
		  if (val === target[key]) {
		  	return
		  }
			
			const ownKeys = Reflect.ownKeys(target)
			if (ownKeys.includes(key)) {
			  // 已有值
			} else {
			  // 新增值
			}
			
			const result = Reflect.set(target, key, val, receiver)
			// dep.noitfy() // 通知监听队列进行更新
			return result
		},
		deleteProperty(target, key) {
			const result = Reflect.deleteProperty(target, key)
			return result
		}
	}
	
	const observed = new Proxy(target, proxyConfig)
	return observed
}
```

## Proxy 解决的问题
+ 可以监听到对象新增删除属性
+ 只在 getter 时才对对象的下一层进行劫持(优化了性能)
```
        get(target, key, receiver) {
            const ownKeys = Reflect.ownKeys(target)
            if (ownKeys.includes(key)) {
              // dep.subs(watcher) // 添加监听
            }
            const result = Reflect.get(target, key, receiver)
            return reactive(result) // 只在 getter 时才再次劫持
        },
```
+ 能正确监听原生数组方法

## 总结
Object.defineProperty 是对对象**属性**的劫持
Proxy 是对整个**对象**劫持

Object.defineProperty 无法监听新增和删除
Object.defineProperty 无法监听数组部分方法需要重写
Object.defineProperty 性能不好要对深层对象劫持要一次性递归

Proxy 能正确监听数组方法
Proxy 能正确监听对象新增删除属性
Proxy 只在 getter 时才进行对象下一层属性的劫持 性能优化
Proxy 兼容性不好

Object.defineProperty 和 Proxy
在 getter 时进行添加依赖 `dep.addSub(watcher)` 比如 绑定 view 层，在函数中使用
在 setter 时触发依赖通知 `dep.notify()` 比如 修改属性
