---
title: 继异步编程的async/await函数补充
date: 2018-01-22 13:01:48
tags: JavaScript
categories: Font-End Basis
---
这个执行函数顺序的问题是继之前[EventLoop 和 MicroTask的文章](http://www.jianshu.com/p/88043a9f5464)的补充
```
async function async1() {
  console.log('async1 start'); // 问题1 async1 start 在script 里执行是什么样的
  await async2(); // 问题2 为什么async2 在promise1 前执行
  console.log('async1 end'); // 问题3 为什么async1 end 会在 promise2 后执行
}
async function async2() {
  console.log('async2');
}
console.log('script start');
setTimeout(function() {
    console.log('setTimeout');
}, 0);
async1();
new Promise(function(resolve) {
    console.log('promise1');
    resolve();
  }).then(function() {
    console.log('promise2');
  });
console.log('script end');
```
执行结果
```
1. script start
2. async1 start
3. async2
4. promise1
5. script end
6. promise2
7. async1 end
// stack 清空
8. setTimeout
```
#### 问题1 async1 start 在script 里执行是什么样的?
先看下async 函数 babel 后样子![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401694537005200.png)

可以看出async 函数只是执行了_asyncToGenerator 这个函数,  再看下_asyncToGenerator![_asyncToGenerator](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401694537005913.png)

原来_asyncToGenerator 函数只是返回了一个 new Promise()，async1() 的执行也就是在script 里执行里一个new Promise()


#### 问题2 为什么async2 在promise1 前执行
从问题1可以知道async2 () 也是一个new Promise() ，不过async2() 多了一个aiwait，看下mdn 的描述
>await 表达式会暂停当前 [`async function`](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Statements/async_function "调用 async 函数时会返回一个 Promise 对象。当这个 async 函数返回一个值时，Promise 的 resolve 方法将会处理这个值；当 async 函数抛出异常时，Promise 的 reject 方法将处理这个异常值。") 的执行，等待 Promise 处理完成。若 Promise 正常处理(fulfilled)，其处理结果作为 await 表达式的值，继续执行
 [`async function`](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Statements/async_function "调用 async 函数时会返回一个 Promise 对象。当这个 async 函数返回一个值时，Promise 的 resolve 方法将会处理这个值；当 async 函数抛出异常时，Promise 的 reject 方法将处理这个异常值。")。

再看一下babel 后的![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401694537006498.png)
babel 后只不过前面多了yield，await async()变成了yield new Promise()，yield 是一个暂停执行的标记而后面的语句是已经执行完了，async2 也就先于promise1 在script 中执行。

#### 问题3 为什么async1 end 会在 promise2 后执行
这里引用[阮一峰的对Generator-函数异步应用](http://es6.ruanyifeng.com/#docs/generator-async#Generator-函数)的解释
>传统的编程语言，早有异步编程的解决方案（其实是多任务的解决方案）。其中有一种叫做"协程"（coroutine），意思是多个线程互相协作，完成异步任务。
协程有点像函数，又有点像线程。它的运行流程大致如下。
第一步，协程A开始执行。
第二步，协程A执行到一半，进入暂停，执行权转移到协程B。
第三步，（一段时间后）协程B交还执行权。
第四步，协程A恢复执行。
上面流程的协程A，就是异步任务，因为它分成两段（或多段）执行。

这里的async1 end 与 promise2 的执行就是因为yield 的“协程”，我们这里改写一下问题，让问题更清晰
```
async function async1() {
  console.log('async1 start');
  new Promise(function(resolve) { // 我们把new Promise 放到async1内部
      console.log('promise1');
      resolve();
    }).then(function() { // await 通过yield 协程的功能 把上下两段分割
      console.log('promise2');
    });
  await async2(); // yield 协程分割，但是async2 先执行完毕
  console.log('async1 end'); // await 通过yield 协程的功能 把上下两段分割
}
async function async2() {
  console.log('async2');
}
console.log('script start');
setTimeout(function() {
    console.log('setTimeout');
}, 0);
async1();
console.log('script end');
```
从上面的改写看出await async2  通过协程把上promise2 和 async1 end 分割成两部分，这里将会把上半部分的microtask 的任务都执行完毕才会执行下一段的代码。

**这段代码的执行顺序不仅考察了异步执行主要考察了对async / await 函数的降级理解，了解到这一层后发现async / await 函数确实是js 异步执行的好方式。**

[babel编译](https://babeljs.io/repl/#?babili=false&browsers=&build=&builtIns=false&code_lz=IYZwngdgxgBAZgV2gFwJYHsI1JKBGACgEoYBvAKBhikxHQBsBTAOnvQHMCByHaPGEMmAAnZFyIBuStgDuwVMmzhoAJmJSqNCHSasO3XvhiMIAE3FSAvuUPwkUNJiW41JCptoMWbTj2VQVC3JrckQUDCwAfUMAFXQAcRNGYWBkdGECOAg3GGlhRmQEYSwwhwiYYjJcqioANxEYdhMYAF54CGZgAAcu-jACZAALVBAAGmxhdgQAWxNkEElqmvzC4pgIRhkYAAVhdGmRxkz7RywCfJ1axnH8gCtGBxzpGrtwp0FGLoIAa0YwcZE7CeLxeyGEYCqzxBdQaqAgcHQrUaJgA2r8wABdAiAxZQ6H1YQwer0BCMJFwhHMYmkiRLaGWaipKCDCrJPbCYHQ5aMe4OAhs9K4rnc1YQWl4moM1BwCoU9DMUyYRic4UXBhXAjU5Xi4UMxj0EBk0h0rkrIpYXb7Q7MNX0DVaojMIYmY5vM4OyHCl4fL4AIg2AA9kL7xg6dV7LONSqdWcIOZ6vVQfQRfUM9jIQ8Y40KIzn6SaqAyJWa1sn_Ywg768zBLDnLOLLEA&debug=false&circleciRepo=&evaluate=false&lineWrap=true&presets=es2017%2Creact%2Cstage-0&targets=&version=6.26.0)