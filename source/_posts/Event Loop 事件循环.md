---
title: Event Loop 事件循环
date: 2018-01-22 12:32:59
tags: JavaScript
categories: Font-End Basis
---
## 名词解释
>"event-loop": 事件循环
"non-blocking": 非堵塞
"callback": 回调函数
"asynchronous": 异步
"single-threaded": 单线程
"concurrency": 并发
"web-api": DOM, ajax, setTimeout...
## JS在浏览器中的环境
先看一张图![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401694537074040.png)

> 图片出自: https://www.youtube.com/watch?v=6MXRNXXgP_0

### V8引擎内的JS
根据上图，首先可以得到的JS在V8引擎中有一个堆(heap)和栈(stack)的概念
堆(heap): 对象被分配的区域
栈(stack): 函数调用形成的栈帧

#### 问题1: 执行JS时候发生了什么
`代码1`
```javascript
var a, b
function foo () {
  return a +=1
}
function bar () {
  return b += 2
}
function baz () {
  bar ()
  foo ()
  console.log( a + b )
}
baz()
```
`解释1`
>栈内：
1执行baz() 进入栈
2执行bar() 进入栈 - bar() return 退出栈
3执行foo() 进入栈 - foo() return 退出栈
4执行console.log 进入栈 无return并退出栈
5baz() 执行完毕退出栈

### JS操作WebApi
根据图中WebApi所在的位置我们发现它并没有在V8引擎内，而是由stack内执行后再V8资源外层出现然后进入回调队列，并进行了一次event loop的事件
 
#### 问题2: JS操作WebApi发生了什么?WebApi的执行不在V8内那在哪里?
`代码2`
```javascript
console.log('hi')
setTimeout(function () {
  console.log('ha')
}, 5000)
console.log('heng')
```
`解释2`
>栈内:
1执行console.log('hi') 进入栈 - 退出栈
2执行setTimout 进入栈 - 把回调函数cb放入浏览器资源内(相对V8) - 退出栈
3执行console.log('heng')进入栈 - 退出栈
4当前栈清空当前事件循环(event loop)结束

>栈外:
5通过while(queue.length)不停的检查队列(queue)是否为空
6存放在浏览器资源内的setTimeout回调cb在5秒完成后进入队列(queue)
7事件循环while(queue.length)检查到队列(queue)有回调cb
8在当前循环内把cb推入栈内

>栈内:
9执行cb，console.log('ha')进入栈 - 退出栈 
10清空栈

#### 问题3: 如果setTimeout(cb, 0) 会是什么情况?
`代码3`
```javascript
console.log('hi')
setTimeout(function () {
  console.log('ha')
}, 0)
console.log('heng')
```
`解释3`
>同解释2，但是再第6步: 存放在浏览器资源内的setTimeout回调cb在5秒完成后进入队列(queue)
**应该变为cb直接进入队列(queue)**

#### 问题4: ajax是什么情况?
`代码4`
```javascript
console.log('hi')
$.get(url, function (data) {
  console.log(data)
})
console.log('heng')
```
`解释4`
>同解释2，但是再第6步: 存放在浏览器资源内的setTimeout回调cb在5秒完成后进入队列(queue)
**应该变为ajax取得数据后cb进入队列()**
所以这也解释了为什么使用setTimeout来模拟ajax

#### 问题5: WebApi中Event事件是什么情况？
`代码5`
```javascript
console.log('start')
$el.on('click', function fn() {
    console.log('clicked')
})
setTimeout(function cb() {
    console.log('timeout')
}, 5000)
console.log('done')
```
`解释5`
>栈内:
1执行console.log('start')进入栈 - 退出栈
2执行$el.on('click')进入栈 - 整个click事件包括回调函数fn放入浏览器资源内 - 退出栈
3执行setTImeout 进入栈 - 把回调函数cb放入浏览器资源内 - 退出栈
4执行console.log('done')进入栈 - 退出栈

>栈外:
5通过while(queue.length)不停的检查队列(queue)是否为空
6存放在浏览器资源内的setTimeout回调cb在5秒完成后进入队列(queue)
7事件循环while(queue.length)检查到队列(queue)有回调cb
8在当前循环内把cb推入栈内

>栈内:
9执行cb，console.log('ha')进入栈 - 退出栈
10清空栈

>浏览器中:
11用户点击$el触发'click' 事件，回调函数fn进入队列中
12事件循环while(queue.length)检查到队列(queue)有回调fn
13在当前循环内把fn推入栈内执行并清空


#### 问题6 - 列表滚动优化与Debounce去抖函数
从问题5中可以知道，当我们连续不停的点击$el触发click时，队列(queue)内将会排满回调函数，这就是页面造成卡顿的原因。
造成这种情况出现最多的就是列表滚动scroll事件, 窗口resize事件。
常用的优化方法就是使用debounce去抖函数, 先看一下他的实现方法:
```javascript
function debounce(fn, delay) {
    var timer
    return function() {
        var context = this
        var args = arguments
        clearTimeout(timer)
        timer = setTimeout(function() {
            fn.apply(context, args)
        }, delay)
    }
}
```
`分析debounce`
debounce函数里有一个重点，就是clearTimeout(timer)
现在模拟一个绑定事件
```javascript
document.addEventListener('scroll', debounce(
function() {
    console.log('scroll')
}, 1000), false);
```
>当scroll事件在栈内执行回调函数被注册到浏览器资源后，当我们触发scroll事件时，我们都会把`debounce(function(){console.log('scroll')}, 1000)`排到队列(queue)里，在通过事件循环放入栈内执行。

>如果1秒内只触发1次，那么debounce函数的回调就会因为内部的setTimeout放入浏览器资源等到1秒到后排如队列内在推入栈内执行。

>但1秒内我们不停的触发scroll事件呢，那么debounce函数内部的`clearTimeout(timer)`将起到关键作用: **把前一次触发scroll事件放入浏览器资源的setTimeout回调给清空掉并放入新的setTimeout回调**直到最后一次触发scroll，把浏览器资源内的setTimeout回调都清空只留下最后一个，等待1秒后回调排入队列(queue)等待推入栈内执行。

此方法相比问题5中的情况大大减少了浏览器资源的占用，使得在固定时间内队列(queue)内都只有一个回调在等待而不是一大堆。

## 异步执行
```javascript
代码1
[1,2,3,4].forEach(function (i) {
    console.log(i)
})
代码2
[1,2,3,4].forEach(function (i) {
    setTimeout(function (i) {
        console.log(i)
    }, 0, i)
})
```
`分析`
代码1中打印1，2，3，4 很明显它们都是直接在栈内执行console.log()输出的
代码2页打印相同的结果，但是不同的是每次console.log的执行都是通过setTImeout放入队列(queue)内再推入栈内执行的，这就通过浏览器资源和V8资源的区别实现了一段异步执行的代码
我们可以第二段代码改写成这样, 制作一个异步执行的forEach
```javascript
function asyncForEach(arr, cb) {
    arr.forEach(function (i) {
        setTimeout(cb, 0, i)
    })
}
asyncForEach([1,2,3,4], function(i) {
    console.log(i)
})
```
