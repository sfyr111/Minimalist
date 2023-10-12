---
title: webpack 源码-资源加载
date: 2019-04-01 17:02:21
tags: webpack
categories: webpack
---
## 准备编译的代码资源
一共四个文件资源
```
// index.js
import { varA, varB } from './mod1'
import m2 from './mod2'

let b = 'bbb'
console.log(varA, varB, m2)

// mod1.js
export const varA = 'aaa'
export const varB = 'bbb'

// mod2.js
import { c } from './modc.js'
export default {
  m1: 'm1',
  m2: 'm2'
}

// modc.js
export const c = 'cccc'
```

## webpack 资源加载 - 主流程
### 1.Compiler.js - run，在 run 方法中执行 this.compile()
![Compiler.js - run](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_620_6201697125982183.png)

### 2.Compiler.js - compile，生成 Compiltaion 实例执行 make hooks
![Compiler.js - compile](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401697125982984.png)
make  hooks 的实现在 SingleEntryPlugin 插件里，生成 SingleEntryDependency 调用 compilation 实例的 addEntry 方法.
![SingleEntryPlugin.js](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401697125983572.png)
![SingleEntryDependency](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401697125984157.png)


### 3.Compilation.js - addEntry - 处理入口 entry 执行 _addModuleChain
addEntry 中把 SingleEntryPlugin 生成的 dep 也就是 entry 传入执行 _addModuleChain，发现执行的 _addModuleChain 回调有在 this.entries 中 push 一个 module 的线索
![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401697125984735.png)


### 4.Compilation.js - _addModuleChain - factory 创建 module - addModule 到 this.modules
_addModuleChain 创建 module，此时第一个 module 出现，这个 module 是以为 entry 创建的
![_addModuleChain 创建module](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401697125985315.png)

### 5.Compilation.js - _addModuleChain - addModule 把 module push 到 this.modules 中
![执行 addModule](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_930_9301697125985890.png)

![addModule 中 this.modules.push module 并返回](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401697125986471.png)

### 5.Compilation.js - _addModuleChain - buildModule - 对 entry 的 module 进行 Loader 处理
buildModule 由 NormalModule.js 实现，对远吗执行 loader 并收集依赖
![buildModule](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401697125987054.png)
此时 compilation 实例中 enties 和 modules 各自有一个 module , 这个 module 都是 entry 入口文件生成的。
![此时 compilation 实例中 enties 和 module](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401697125987632.png)
此时 entry 的 module 已经分析出了 import 导入的模块语法
![module 的依赖](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401697125988205.png)
entry 的 module 的源码也被 babel-loader 处理成了 ES5 的代码
![module 的源码已经被 loader 处理](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401697125988782.png)

### 6.Compilation.js - _addModuleChain - afterBuild - 主入口 module 处理完毕
在 processModuleDependencies 中对 entry 的 module 的依赖进行递归调用 buildModule，分析出所有的 module 放入到 this.modules 中最后进入 seal 阶段。此时 modues 已经不止 entry 的 module 了，把所有 import 语句导入的 module 都收集完毕。
![资源加载收集完毕进入 seal 阶段](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401697125989361.png)

### Compilation.js - _addModuleChain 做了什么
1.传入 entry 信息
2.moduleFactory 创建 entry 的 module, 添加到 this.modules 和 this.enties 中
3.调用 buildModule，对 entry 的 module 进行 loader 调用、分析 entry 源码中的 import 导入模块语句分析出依赖信息。
4.执行 afterBuild 在 processModuleDependencies 中处理 entry module 的依赖文件，处理成 module 放入 this.modules 中，完成资源加载

## buildModule
buildModule 中执行当前 module 类型的 module.build
![执行 module.build ](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401697125989945.png)

进入 NormalModule.js 的 doBuild 执行 LoaderRunner.js 文件 runLoaders
![执行 doBuild 中的 runLoaders](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401697125990517.png)

这里遇到 LOADER_EXECUTION 函数，里面 的 fn 就是 loader， args 是 loader 处理前的源码
![babel-loader 前](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401697125991095.png)

到这一步中间就在 loader 中执行，经过 loader 出来后的代码就是 arguments， 这里已经转译成 ES5 了, 执行的 callback 是 doBuild 的回调
![babel-loader 后](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401697125991679.png)

带着 loader 处理后的源码回到 doBuild 回调中走this.parser.parse 中
![doBuild 回调执行 parse](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401697125992247.png)

带着 loader 处理后的源码进入 parse 出来 ast 对象
![带着 loader 处理后的源码进入 parse 出来 ast 对象](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401697125992828.png)

通过 acorn 三方模块对源码分析出 ast ，描述源码的语义
![ast 是源码的语义描述](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401697125993405.png)

parse 最后就是返回一个 state，这时 state 中 module.dependencies 还是空的
![parse 处理 ast](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401697125993980.png)

源码生成的 ast 经过 walker 的处理，在 state 上分析出了所有 import 文件的信息
![module.dependencies 分析完毕](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401697125994549.png)

用这种语法彻底描述出源码中的依赖关系
![用这种语法彻底描述出源码中的依赖关系](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401697125995135.png)

> 此时 entry 文件的就处理完了，此时 compilation 实例上的 this.modules 仍然只有一个 entry module，但是现在 webpack 已经通过 ast 解析出了所有 entry module 中的依赖模块的信息，后面就根据这些依赖信息生成各个模块

### 资源递归收集依赖
对依赖进行处理，发现是 import 语义的依赖才进行处理
![处理 ast 分析过的 module](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_930_9301697125995731.png)
处理收集 import 的依赖调用 addModuleDependencies，方法里与 buildModule 类似，工厂生成 module，addModule 加入到 this.modules 中，进行 loader 处理源码
![进入 addModuleDependencies ](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_930_9301697125996312.png)
最后进入 afterBuild 判断当前处理的 module 结果是否继续有依赖进行递归处理
![对结果分析进行递归](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_930_9301697125996903.png)

## 总结
1.Compiler.js - compiler.run 执行 this.compile()
2.Compiler.js - compile，生成 Compiltaion 实例执行 make hooks
3.Compilation.js - addEntry - 处理入口 entry 执行 _addModuleChain
4._addModuleChain 使用工厂函数创建 module，使用 module 自己的 build
5.build 在 NormalModule 中执行 doBuild 调用 LoaderRunner.js 的 runLoaders 使用 loader 处理源码
6.loader 处理完源码回到 doBuild 回调调用 Parser 的 parse
7.使用 acorn 分析源码成 ast ，给 module.dependencies 添加依赖关系
8.根据依赖关系在 afterBuild 中调用 processModuleDependencies 递归处理依赖文件
9.最后把所有处理好的 module 都放入 compilation 实例的 this.modules 中进入 seal 阶段

[参考资源加载](https://www.yuque.com/thzt/webpack/webpack-04#1ci7ld)
