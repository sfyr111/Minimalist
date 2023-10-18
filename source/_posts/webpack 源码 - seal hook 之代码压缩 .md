---
title: webpack 源码 - seal hook 之代码压缩
date: 2019-04-15 10:39:54
categories: webpack
ags: webpack
---
## compilation.seal 上期回顾
compilation.seal 中执行了两个重要功能 生成代码 this. createChunkAssets() 和 压缩代码 this.hooks. optimizeChunkAsset。

### 生成代码 createChunkAssets
1读取 webpack 的输出配置 outputOptions
2生成 chunk 映射 module 的 manifest, 并添加通过 module 生成 chunk 代码的 render 函数
3manifest 的 render 函数， MainTemplate 的 render 实例方法生成 source 源码
4createChunkAssets 生成 source 源码结束返回 compilation 上赋值给 assets[file]
![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401697644547398.png)
最后带着图中压缩好的代码进入 this.hooks.optimizeChunkAsset 钩子中进行压缩

## optimizeChunkAsset hook

### 通过 optimizeChunkAsset hook 入口调试 tapable 代码
1.从这个 hook 中进入这个 hook![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401697644547989.png)

2.进入到 tapable hook 源码中, 在 this[name](...args) 中再次进入![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401697644548582.png)

3.进入 tapable 使用 new Function 构造函数生成的临时代码中，在函数执行中继续进入![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401697644549170.png)

4.进入到 optimizeChunkAsset hook 的实现位置。![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401697644549794.png)![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401697644550381.png)

## optimizeFn，optimizeChunkAsset hook 的实现功能
构建 runner 实例，提取源码 input 创建 task 任务在 runTasks 中执行
![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401697644550976.png)

### assets.source() 拼接后的 input 代码
![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401697644551553.png)
![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401697644552137.png)

## runner.runTasks

### runTasks 流程
遍历 tasks，把 task 中的代码在 boundWorkers 中使用 uglify-es 进行压缩, 最后把压缩后的代码传入 compilation.hooks.optimizeChunkAssets 中的回调里![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401697644552740.png)

### 缓存
![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401697644553340.png)

### 缓存内容
![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401697644553936.png)

### boundWorkers
![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401697644554538.png)

### 使用 ugify-es 模块进行压缩
![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401697644555131.png)

### runTasks 回调在 runTasks 回调中保存压缩后的代码, 最后执行  compilation.hooks.optimizeChunkAssets 回调，压缩代码结束
![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401697644555735.png)

## 压缩结束后的处理

### 回到 Compilation.js - seal
![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401697644556320.png)

### 回到 Compile.js - compile
![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401697644556906.png)

### 回到 onCompiled 回调中准备 emit
![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401697644557495.png)

## 代码压缩总结
+ webpack 在 Compilation - seal 中调用 this.hooks.optimizeChunkAssets.callAsync
+ this.hooks.optimizeChunkAssets 钩子的实现在 uglifyjs-webpack-plugin 中
+ 在 uglifyjs-webpack-plugin 的 runTasks 中对当前资源代码使用 worker-farm 多进程压缩和缓存压缩配置和压缩结果


