---
title: EventLoop事件循环中的 MacroTask与 MicroTask
date: 2018-01-22 12:34:47
tags: JavaScript
categories: Font-End Basis
---
## 问题来源
在学习Promise时在stackoverflow上看到一个解释Promise运行顺序回答。
之前在[学习异步编程](http://www.jianshu.com/p/dbd0329077fa)中讲解了MacroTask和MicroTask， 但在最近深入EventLoop后又有了更多的了解
> ![](http://upload-images.jianshu.io/upload_images/2155778-56260f7068aaf973.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/620)

## EventLoop、MacroTask、MicroTask之间的关系
> + macrotasks 与 microtasks 各自的 API
**macrotasks**: setTimeout, setInterval, setImmediate, requestAnimationFrame, I/O, UI rendering
**microtasks**: process.nextTick, Promises, Object.observe, MutationObserver

+ 一张图先了解microtasks 与macrotasks 在eventloop队列里的位置![](http://upload-images.jianshu.io/upload_images/2155778-b88b043ab349ff4b.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/620)![](http://upload-images.jianshu.io/upload_images/2155778-a00c309940108114.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/620)
这里用了上一章EventLoop 事件循环文章里的图，并在回调队列里标注里microtask的位置。

### microtasks 与macrotasks 在eventloop 里的流程

在没有引入microtasks 概念前事件循环是这样执行的
```
while (queue是否有task) {
   执行task
}
```

引入microtasks 概念后
```
while (queue是否有macrotasks) {
  if (microtasks) 执行空microtasks
  再执行macrotasks
}
```

### microtasks 与macrotasks 在eventloop 里实际执行结果
```
// 例1
console.log('script start');

setTimeout(function() {
  console.log('setTimeout');
}, 0);

Promise.resolve().then(function() {
  console.log('promise1');
}).then(function() {
  console.log('promise2');
});

console.log('script end');
```
```
// 结果
script start
script end
promise1
promise2
setTimeout
// 当前循环结束
// 进入下一个循环
```
从webapi在Eventloop的执行环境我们可以知道setTimeout在当前事件循环中将会在script end后执行，这是没问题的。
而promise作为microtasks将会在当前事件循环内的macrotasks之前执行完毕。
setTimeout作为macrotasks在例1中是最后执行的。

```
例2
setImmediate(function(){
    console.log(1);
},0);
setTimeout(function(){
    console.log(2);
},0);
new Promise(function(resolve){
    console.log(3);
    resolve();
    console.log(4);
}).then(function(){
    console.log(5);
});
console.log(6);
process.nextTick(function(){
    console.log(7);
});
console.log(8);
```
```
// 执行顺序
3 4 6 8 7 5 2 1
```
例2
process.nextTick在node环境中，属于microtask
setImmediate在macrotasks，优先级小于setTimeout
定义new Promise() 是同步代码，在栈内先执行

```
例3
const p = new Promise((res, rej) => {
  res(1)
  console.log('定义new Promise - 同步')
}).then(val => {
  console.log('microtask start')
  console.log('执行then，enqueue micarotask 1')
  console.log(val) // 1
})

Promise.resolve({
  then(res, rej) {
    console.log('执行then，enqueue micarotask 2')
    res(5)
  }
}).then(val => {
  console.log('执行then，enqueue micarotask 3')
  console.log(val) // 5
})

console.log('逐行执行1 - 同步')
console.log('逐行执行2 - 同步')
console.log(3) // 3

setTimeout(console.log, 0, 'macrotask start') // 4 
setTimeout(console.log, 0, 4) // 4
```
```// 执行结果如下
定义new Promise - 同步
逐行执行1 - 同步
逐行执行2 - 同步
3
// 同步队列执行完毕为空 进入下一个栈

microtask start
执行then，enqueue micarotask 1
1
执行then，enqueue micarotask 2
执行then，enqueue micarotask 3
5
// microtask执行完毕为空 进入下一个栈

macrotask start
4
// macrotask执行完毕为空 结束
```
例3
定义new Promise是同步函数
Promise.resolve等api为异步micarotask

```
例4
<div class="outer">
  <div class="inner"></div>
</div>

var outer = document.querySelector('.outer');
var inner = document.querySelector('.inner');

new MutationObserver(function() {
  console.log('mutate');
}).observe(outer, {
  attributes: true
});

function onClick() {
  console.log('click');

  setTimeout(function() {
    console.log('timeout');
  }, 0);

  Promise.resolve().then(function() {
    console.log('promise');
  });

  outer.setAttribute('data-random', Math.random());
}

inner.addEventListener('click', onClick);
outer.addEventListener('click', onClick);
```
```
// 同时点击到两个div时执行结果
click
promise
mutate
click
promise
mutate
timeout
timeout
```
[例4执行效果](http://js.jirengu.com/cecawiziqi/3/edit)
没点击前：
1绑定new MutationObserver 存入浏览器资源
2绑定两个div元素的click事件 存入浏览器资源

3触发outer元素click的onClick 存入浏览器资源
4触发inner元素click的onClick 存入浏览器资源
5先执行outer的回调
6输出click
7执行setTimeout - macrotask存入浏览器资源
8执行outer.setAttribute('data-random', Math.random())，触发MutationObserver -  marcotask 等待microtask先执行
9执行Promise.resolve - microtask 输出promise
10microtask 执行完毕，执行MutationObserver输出mutate
-----下面执行的并不是outer回调里的setTimeout------
11执行inner的回调
12输出inner回调的click
13执行inner回调的setTimeout - macrotask存入浏览器资源
14执行inner回调outer.setAttribute('data-random', Math.random())，触发MutationObserver -  marcotask 等待microtask先执行
15执行inner回调的Promise.resolve - microtask 输出promise
16microtask 执行完毕，执行MutationObserver输出mutate
--最后因为两个setTimeout都是在触发inner回调后存入浏览器资源的--
所以最后两个setTimeout回调完成排入队列执行.
