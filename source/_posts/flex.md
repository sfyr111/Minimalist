---
title: flex布局
date: 2018-01-22 12:02:11
tags: [css]
categories: css
---
![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401694537048645.png)

## flex之前
*  文档流布局
*  float + clear
*  相对定位 + 绝对定位
*  display inline-block
*  负margin

## flex特点
*  布局与方向无关
*  空间自动分配、自动对齐
*  适用于简单的线性布局

## 基本概念
![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401694537049229.png)
[基本flex](http://js.jirengu.com/hobuditile/2/edit)

## flex container的六个属性(父元素)
![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401694537049808.png)
 在下面demo的父元素里审查元素加上各种属性试试
1[flex-direction](http://js.jirengu.com/hikakohaso/2/edit)
2[flex-wrap & flex-direction](http://js.jirengu.com/fugiciyuga/4/edit)
3缩写`flex-flow: [direction] [wrap]`

4[justify-content](http://js.jirengu.com/siqocafobi/11/edit)
5[align-items](http://js.jirengu.com/dicumiyiru/4/edit)
6[align-content](http://js.jirengu.com/siqocafobi/34/edit)
## flex item的六个属性
![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401694537050777.png)
1[flex-grow](http://js.jirengu.com/muxuwasoza/2/edit)
2[flex-shrink](http://js.jirengu.com/qamidapuvu/10/edit)
3[flex-basis](http://js.jirengu.com/qamidapuvu/15/edit)
4缩写`flex: [grow] [shrink] [basis]`
5[order](http://js.jirengu.com/qamidapuvu/13/edit)
6[align-self](http://js.jirengu.com/dicumiyiru/10/edit)
## demo
1[手机页面布局topbar+main+tabs](http://js.jirengu.com/mogajadamu/8/edit)`上下固定`
2[产品列表ul>li*9](http://js.jirengu.com/cosahasote/3/edit)`抛弃负margin`
3[PC页面布局](http://js.jirengu.com/qayiladizu/4/edit)`中间自适应抛弃双飞翼`
4[完美居中](http://js.jirengu.com/cisozonaja/4/edit)
## 参考
[css-tricks](https://css-tricks.com/snippets/css/a-guide-to-flexbox/)
[flex布局-阮一峰](http://www.ruanyifeng.com/blog/2015/07/flex-grammar.html)
