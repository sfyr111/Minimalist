---
title: JavaScript 中的垃圾回收
date: 2018-04-17 01:12:31
tags: JavaScript
categories: Font-End Basis
---
```
内存的生命周期
javascript 的内存分配
javascript 垃圾回收的方法和方式
哪些操作会造成内存泄漏
```
### 内存的生命周期
1 分配所需要的内存
2 使用分配到的内存进行读写操作
3 不需要时将内存进行清除

### javascript 的内存分配
+ 变量初始化分配
```
var str = 'string' // 为字符串分配内存
var arr = [1, 2] // 为数组及数值分配内存
var obj = { // 为对象及承载的数值分配内存
  a: 1
}
function fn(a, b) { // 为可调用的函数变量 fn 对象分配内存
  return a + b
}
el.addEventListener('click', function() { // 函数表达式, 匿名函数分配内存
  el.style.color = 'red'  
})
```
+ 调用函数分配
```
var d = new Date(); // 为Date 对象值分配内存

var e = document.createElement('div'); // 为 DOM 对象分配内存
```

### javascript 垃圾回收的方法
+ 引用计数
+ 标记清除(常用)

#### 引用计数
引用计数垃圾回收算法
```
var o = { 
  a: {
    b:2
  }
}; 
// 两个对象被创建
// { b: 2 } 作为一个属性被引用  +1 = 1
// { a: { b: 2 } } 被分配给变量 o +1 = 1

var o2 = o; // o2变量是第二个对 { a: { b: 2 } } +1 = 2 的引用 

o = 1;      // 现在，{ a: { b: 2 } } 的原始引用o被o2替换了 -1 = 1

var oa = o2.a; // 引用 { a: { b: 2 } } + 1 = 2的a属性 { b: 2 } + 1 = 2
// 现在，{ a: { b: 2 } }  有两个引用了，一个是o2，一个是oa

o2 = "yo"; // { a: { b: 2 } } = 0 对象的原始引用被清除
 // 然而它的属性a的对象还在被oa引用，所以还不能回收

oa = null; // a属性 { b: 2 } 现在也是零引用了
// { a: { b: 2 } } 它可以被垃圾回收了
```
循环引用
```
function f(){
  var o = {}; + 1
  var o2 = {}; + 1
  o.a = o2; // o 引用 o2 + 1
  o2.a = o; // o2 引用 o + 1
  return "str";
}
f()
// var o = {}; var o2 = {}; 在栈中运行后该被清除 
// o.a, o2.a 都至少引用了一次 o 和 o2 无法被清除
```
```
var el;
window.onload = function(){
  el = document.getElementById("element");
  el.circularReference = el;
  el.lotsOfData = new Array(10000).join("*");
};
// 当element 元素被删除后应该被回收
// el.circularReference 循环引用了 el, 导致对此 dom 元素的引用无法被回收, el.lotsOfData 的数据无法释放
```

#### 标记清除(常用)
>在全局环境或函数环境声明变量时，进入执行环境，垃圾回收器将其标记为'进入环境'，当变量离开环境、函数执行结束后将其标记为'离开环境'。垃圾收集器会在运行时通过给存储在内存中的所有变量加上标记的方式决定是否应该清除，闭包只有'进入环境'标记。垃圾收集器运行时会对标记为'离开环境'的变量和全局环境无法访问到的对象进行清除。

标记清除的循环引用
```
// 函数内声明的 o 和 o2 因为在全局环境下无法访问会被清除
function f(){
  var o = {}; + 1
  var o2 = {}; + 1
  o.a = o2; // o 引用 o2 + 1
  o2.a = o; // o2 引用 o + 1
  return "str";
}
f()
```
```
// 当 element 被删除后或手动取消引用时，全局环境 el 变量为null，dom 对象占用的内存则被清除
var el;
window.onload = function(){
  el = document.getElementById("element");
  el.circularReference = el;
  el.lotsOfData = new Array(10000).join("*");
};
el = null // 全局环境无法访问到el.circularReference 被清除
```

### 哪些操作会造成内存泄漏
>settimeout的第一个参数使用字符串而非函数的话,会引发内存泄漏。意外的全局变量、闭包、控制台日志、遗留的定时器、在两个对象彼此引用且彼此保留
解决方法:
函数运行后手动设置 dom 为null， 手动 clear 定时器，避免循环引用。

### WeakMap
**WeakMap 作用**
>`WeakMap` `WeakSet`对于值的引用都是不计入垃圾回收机制的，表示这是弱引用。
>先新建一个 Weakmap 实例。然后，将一个 DOM 节点作为键名存入该实例，并将一些附加信息作为键值，一起存放在 WeakMap 里面。这时，WeakMap 里面对element的引用就是弱引用，不会被计入垃圾回收机制。
> 当我们想为对象添加数据但是又不想干扰垃圾回收机制就可以使用

```
const wm = new WeakMap();

const element = document.getElementById('example'); // 引用计数 + 1

wm.set(element, 'some information'); // 弱引用 - 引用计数不变
wm.get(element) // "some information" value 可以为对象
```
**WeakMap 示例**
当`called` 大于10后 进行 `report` 上报 `map` 对 `obj` 参数的引用仍然存在，造成了内存泄漏，而我们只是为`obj`添加了一些额外信息
```
var map = new Map(); // maps can have object keys
function useObj(obj){
    doSomethingWith(obj);
    var called = map.get(obj) || 0;
    called++; // called one more time
    if(called > 10) report(); // 应该手动清除 map 对 obj 的引用
    map.set(obj, called);
}
```
使用`WeakMap`用于处理为对象添加信息的场景
```
var map = new WeakMap(); // create a weak map
function useObj(obj){
    doSomethingWith(obj);
    var called = map.get(obj) || 0;
    called++; // called one more time
    if(called > 10) report(); // 无需清除引用
    map.set(obj, called);
}
```