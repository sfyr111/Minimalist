---
title: 前端基础重点回顾1:CSS盒模型、DOM、数据类型
date: 2018-01-22 21:42:52
tags: [css, dom]
categories: Font-End Basis
---
## CSS盒模型
### 标准模型与IE模型的区别
>计算高度宽度不同

标准盒模型的width 是以盒模型的content 来计算的![box-sizing: content-box](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401694537042369.png)
IE盒模型的width 是以盒模型的border + padding + content 来计算的![box-sizing: border-box](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401694537042963.png)

### CSS如何设置这两种模型
>通过设置元素的box-sizing 属性

标准盒模型设置为box-sizing: content-box
IE盒模型设置为box-sizing: border-box

### JS如何设置获取盒模型对应的宽和高
```
// 获取内联样式
dom.style.width / height 
```
```
// 获取渲染后的属性 IE 支持
dom.currentStyle.width / height
```
```
// 获取元素渲染后计算完毕的样式，所有浏览器支持
window.getComputedStyle(dom).width / height
```
```
// 计算元素的绝对位置
dom.getBoundingClientRect().width / height
```
dom.getBoundingClientRect() 函数不仅可以得到元素的宽高还能获得此元素在页面中的位置。[图片上传失败...(image-a1291e-1516628501105)]

### BFC
#### 什么是BFC
BFC(block formatting context) 是一个块级格式化上下文，它形成了一个独立的布局环境。
#### 怎么创建一个BFC
1 设置float，值不为”none”
2 设置overflow，值不为”visible”（hidden，auto，scroll）
3 设置display的值为 “table-cell”, “table-caption”,或 “inline-block”
4 设置position，值不为 “static” 或 “relative”（absolute，fixed）

#### BFC 有什么特点
1 BFC 元素内的各元素会在垂直方向上从顶部一个接一个的放置。
2 BFC中的元素的布局是不受外界的影响,内外元素不会互相影响。
3 BFC元素不会与浮动元素的区域重叠
4 计算BFC元素高度的时候浮动元素也会参与计算 [代码](http://js.jirengu.com/linipukiwu/4/edit)
5 属于同一个BFC的两个相邻Box的margin会发生叠加 [代码](http://js.jirengu.com/linipukiwu/4/edit)

#### BFC 的使用场景
+ 解决margin叠加问题  [代码](http://js.jirengu.com/linipukiwu/11/edit)
+ 用于布局 [代码](http://js.jirengu.com/linipukiwu/8/edit)
+ 用于清除浮动  [代码](http://js.jirengu.com/linipukiwu/5/edit)

## DOM
### DOM事件的级别
```
// DOM0级
el.onclick=function(){}
```
```
// DOM2级
el.addEventListenter('click', function(){}, '是否捕获阶段触发': boolean)
```
```
// DOM3级 区别DOM2级增加了更多的事件类型
el.addEventListenter('keyup', function(){}, '是否捕获阶段触发': boolean)
```

### DOM事件模型
+ 事件捕获
+ 事件冒泡

### DOM事件流
DOM事件流(event flow)三阶段
>事件触发(触发元素) => 事件捕获阶段(事件下传) => 处于目标阶段(达到目标元素) => 事件冒泡阶段(事件上传)


### 描述DOM事件捕获的具体流程
```
// IE 只有冒泡流程
window => document => html(document.documentElement) => body => ... => 目标元素
```
### 如何自定义事件
#### Event 对象
```
// 创建
var event = new Event('custome')
// 注册
el.addEventListener('custome', function(){
    console.log('custome')
})
el.dispatchEvent(event) // 触发
```
#### CustomEvent 对象
```
var event = new CustomEvent('build', { 'detail': elem.dataset.time });
function eventHandler(e) {
  console.log('The time is: ' + e.detail);
}
el.addEventListener('custome', eventHandler)
el.dispatchEvent(event) // 触发
```

### Event对象的常见应用
```
event.preventDefault() // 阻止默认
event.stopPropagation() // 阻止冒泡
event.stopImmediatePropagation() // 按钮绑定两个click，A点击时候不出发B，A会成功阻止B, 事件响应优先级
event.target // 可以用于事件委托，由父级注册事件
event.currentTarget
```
#### currentTarget vs target
target在事件流的目标阶段；currentTarget在事件流的捕获，目标及冒泡阶段。只有当事件流处在目标阶段的时候，两个的指向才是一样的， 而当处于捕获和冒泡阶段的时候，target指向被单击的对象而currentTarget指向当前事件活动的对象（一般为父级）。![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401694537043529.png)

## 类型转换
+ 数据类型
  + 原始类型
  > Boolean, String, Number, Null, Undefined, Symbol
  + 复杂类型(对象)
  > Object
+ 显式类型转换
  Number函数
  > 简单类型: 直接转换end
  > 复杂类型: valueOf() => 简单类型 => 直接转换end || 复杂类型 => toString() => 简单类型 =>
 直接转换end

  String函数
  > 简单类型: 直接转换end
  > 复杂类型: toString() => 简单类型 => 直接转换end  || 复杂类型 => valueOf() => 简单类型 =>
 直接转换end || 复杂类型error

  Boolean函数 
  > 空字符串、Null、undefined、false、0 转化为false