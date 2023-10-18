---
title: webpack 源码 - seal hook 之代码生成
date: 2019-04-11 11:09:30
categories: webpack
ags: webpack
---
## compilation.seal 实例方法

### 功能
+ 执行 this.hooks.seal
+ 进行大量 hooks ，部分 hook 是空的可以用插件来拦截![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_930_9301697644537403.png)
+ 执行 this.hooks.optimizeTree 
+ 在 this.hooks.optimizeTree 中生成代码 this.createChunkAssets()，和压缩代码this.hooks.optimizeChunkAsset
+ 最后执行 this.hook.afterSeal

### 核心功能
+ 生成代码 this.createChunkAssets()
+ 压缩代码 this.hooks.optimizeChunkAsset

## 生成代码 createChunkAssets()

createChunkAssets 是 compilation 实例方法

### createChunkAssets 主要流程
![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401697644538107.png)

+ 读取 webpack 的输出配置 outputOptions
+ 使用 mainTemplate 实例生成 manifest , `const manifest = template.getRenderManifest({ 配置 })`
+ 根据 manifest 生成文件名 `file = this.getPath(filenameTemplate, fileManifest.pathOptions);`
+ 根据 manifest 生成代码 `source = fileManifest.render();`
+ 生成对应的 assets 资源 `this.assets[file] = source;`
+ 调用 hook 生成 chunk 资源 `this.hooks.chunkAsset.call(chunk, file);`

## getRenderManifest,  mainTemplate 实例生成 manifest
+ getRenderManifest 中创建 result 数组再调用 renderManifest hook ![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401697644538722.png)
+ renderManifest hook 最重要的就是给 result(manifest) 添加 mainTemplate 实例的 render 函数![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401697644539310.png)

### 什么是 manifest
manifest 保存着 chunk 对应相关 module 的映射信息, 可以看到这个 manifest 中的 chunk0 包含了所有生成它的 module 信息，还添加了通过 modules 生成 chunk 代码的 render 函数![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401697644539894.png)

## 生成代码 source , fileManifest.render
`source = fileManifest.render(); ` 执行到 MainTemplate 的 render 实例方法中，这个方法通过 render hook 生成一个 source,  source.children 数组中可以看出是与 webpack 最终生成代码相似的内容了，不过其中文件 module 用了 // CONCATENATED MODULE 注释标识，源码也在 ReplaceSource 实例对象中![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401697644540497.png)

## manifest.render 流程
+ MainTemplate.js - constructor 实现 this.hooks.render
+ this.hooks.render - 对 source 进行 add 添加固定格式的代码，最后通过 modules hook 添加对应的 module 代码`ReplaceSource 实例和 CONCATENATED MODULE 标记`![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401697644541103.png)

+ this.hooks.modules - 对 module 进行解析，生成包裹源码的 ReplaceSource 实例
  在 JavascriptModulesPlugin 中实现，调用静态方法 Template.renderChunkModules
  ![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401697644541698.png)

### Template.renderChunkModules 生成 ReplaceSource 实例标记 CONCATENATED MODULE
![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401697644542288.png)

+ Template.renderChunkModules 中的 allModule
  allModule 数组内容就是每个 module 对应的 CONCATENATED MODULE 的标记和包裹 module 源码的 ReplaceSource

+ allModule 核心是通过 moduleTemplate.render 创建 source ![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_930_9301697644542895.png)


### moduleTemplate.render
通过 module.source 创建 moduleSource， 这里就是我们需要的 module 代码内容, 最后打包返回到 compoilation.js 赋值给对应的 assets[file]
![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401697644543490.png)

### module.source 收集 module 信息,  返回 module 对应代码
收集 module 信息 modulesWithInfo![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401697644544093.png)

遍历 modulesWithInfo 组装 module 代码 `ReplaceSource 实例标记 CONCATENATED MODULE`![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401697644544700.png)



### 赋值 assets
source 由 fileManifest.render 最终生成赋值到 compoilation 实例的 assets[file] 上，最后调用 chunkAsset hook 对 source 源码进行压缩![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401697644545296.png)

### 总结 webpack 的代码生成
+ compilateion.seal：
  1执行 hooks seal，运行大量 hooks 用于编写拦截插件
  2执行 this.hooks.optimizeTree，生成代码 this.createChunkAssets()，和压缩代码this.hooks.optimizeChunkAsset
  3结束 seal 执行 hooks.afterSeal

+ 生成代码 createChunkAssets
  1读取 webpack 的输出配置 outputOptions
  2生成 chunk 映射 module 的 manifest, 并添加通过 module 生成 chunk 代码的 render 函数
  3manifest 的 render 函数， MainTemplate 的 render 实例方法生成 source 源码
  4createChunkAssets 生成 source 源码结束返回 compilation 上赋值给 assets[file]
