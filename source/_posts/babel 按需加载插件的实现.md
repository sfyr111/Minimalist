---
title: babel 按需加载插件的实现
date: 2018-01-22 13:07:54
tags: [JavaScript]
categories: JavaScript
---

## 实现按需加载
babel 插件根据 AST 分析 import 语法
对 ES6 Module import 语法进行转换
```
 // import { uniq } from "lodash"
 import uniq from "lodash/uniq"
```
三方库目录要支持 ` import uniq from "lodash/uniq"` 方式
babel 通过 'babel-core' 的 transform 方法
babel-types 通过 AST 识别 import 语句
webpack 对 babel 后的代码的 import 的模块再加载资源


### 按需加载的目的：ES6 Module import 语法转换
ImportSpecifier 和 ImportNamespaceSpecifier 转化成 ImportDefaultSpecifier

![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401711727513383.png)

```
 // import { uniq } from "lodash"
 import uniq from "lodash/uniq"
```

### 实现思路
+ webpack 对 .js 文件使用 babel-loader
+ 使用 babel 插件对 js 文件进行转义
  1 babel 通过 babylon 解释器把 js 转成 ast
  2 babel-traverse 对 AST 树进行解析遍历出整个树的path
  3 使用 plugin 对 path 操作解析出新的 AST 树
+ 工具
  babel-core提供transform方法将代码字符串转换为AST树
  babel-types提供各种操作AST节点的工具库

### babel 插件实现
+ 语法转换用 babel，写 babel 插件
+ 插件的 vistior 对象
+ ImportDeclaration 方法 - 专门解析 import 操作符
+ path 参数 AST 树
+ 最后 path.replacereplaceWithMultiple 多节点替换单节点当前操作的语法片段
+ replaceWith 单节点替换单节点
```
// 配置 .babelrc { "plugins": ["meimport"] }
var types = require('babel-types');

const visitor = {
  /*
   * ImportDeclaration 只对 import 操作符转化
   * path @AST ast 语法树
   * opt  @object 配置参数
   * return @AST
   */
  ImportDeclaration(path, opt){
    const specifiers = path.node.specifiers;
    const source = path.node.source;
    // 判断是 import {} from '' 的语法
    if (!types.isImportDefaultSpecifier(specifiers[0]) && !types.isImportNamespaceSpecifier(specifiers[0])) {
      var declarations = specifiers.map((specifier) => {      // 遍历  uniq extend flatten cloneDeep
        return types.ImportDeclaration(                         // 创建importImportDeclaration节点
          [types.importDefaultSpecifier(specifier.local)], // 创建 import default 操作符
          types.StringLiteral(`${source.value}/${specifier.local.name}`) // lodasha/uniq 
        )
      })
      console.log(JSON.stringify(declarations, null, 2))
      path.replaceWithMultiple(declarations)

    }
  }
};

module.exports = function (babel) {
  return {
    visitor
  };
}
```
```
// 使用 babel.transform 转换
var babel = require('babel-core'); // transform 把代码转成 AST
const code = `import {uniq, extend, flatten, cloneDeep } from "lodash"`;

const result = babel.transform(code, {
  plugins: [
    // [ { visitor }, { opt1: 1, opt2: 2 }]
    { visitor }
  ]
})
```

https://astexplorer.net/ AST 解析
[参考](https://juejin.im/post/5a17d51851882531b15b2dfc)
[代码](https://github.com/sfyr111/babel-plugin-import-demo)

## 总结
为了让代码中的 `import { uniq } from "lodash"` 导入语法能被 webpack 识别，加载正确的资源路径。
虽然我们库中导出的没问题不过 webpack 只能识别 `import uniq from "lodash/uniq"` 这种绝对路径。
这种 import 语法之间的转换可以使用 babel 插件的形式来解决。
为 babel-core 的 transform 方法写一个插件，使用 babel-types 来识别 JS 被 babel 转化后 AST 中的 import 语句，把符合 `import { uniq } from "loadsh"` 的语句转成 `import uniq form "lodash/uniq"`。
转化后的 import 语句的资源就可以被 webpack 正确识别，避免加载不必要的代码。

