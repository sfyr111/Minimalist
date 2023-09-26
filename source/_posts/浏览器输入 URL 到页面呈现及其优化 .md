---
title: 浏览器输入 URL 到页面呈现及其优化
date: 2019-10-30 16:33:09
tags:
---
## 输入 url: 浏览器先检查缓存，然后解析本地-路由器-全网 dns，指向服务器 ip
+ 强缓存 request Cache-Control
  1.max-age=0，只 if-none-match 协商 etag 的 hash
  2.no-cache, 都不缓存
+ 强缓存 response Cache-Control
  1.max-age=0, no-cache, 只 etag 对 if-none-match 协商 hash
  2.no-store 都不缓存 隐私
+ DNS 缓存
  1.浏览器缓存的 dns
  2.本机 host 文件的映射
  3.路由器的映射
  4.网络服务商的映射 (本地DNS服务器为止)
  5.root 域名服务器
  6.顶级域名-主域名服务器-结果缓存在本地DNS服务器
+ 默认访问 http 重定向到 https
  HSTS 策略: response headers: **Strict-Transport-Security: max-age=31536000** 把所有请求都访问为 https，首次访问不知道配置可以注册在公网上。

## 请求远程服务器: 建立 TLS 连接2次RTT， TCP 三次握手RTT，nginx 转发到对应的资源上，服务器检查缓存
+ 优化 TLS 2次 RTT, 浏览器缓存对称密钥
  1.client 发送 k1 和加密方案列表
  2.server 发送 k2、证书、公钥、确定的加密方案
  3.client 验证证书、公钥加密 k3 发送
  4.server 密钥解 k3
  5.client server 使用 k1 k2 k3 对称加密通信
```
ssl_session_tickets on;
ssl_session_ticket_key current.key;
ssl_session_ticket_key previous.key;
```
+ 优化 TCP 三次握手 RTT
    1. request header：**connection: keep-alive**
    2. 重用 TCP 连接
+ 管线化 http 1.1
    1. keep-alive 基础上
    2. 请求一次发出
    3. 响应按顺序 还是有阻塞可能
+ 管线化和多路复用区别
    1. 管线化在 keep-alive 基础上复用 TCP 3次握手
    2. 管线化一次发送多个请求返回仍是一个个的顺序不变
    3. 多路复用是 http2 多个请求响应都是并行

## 服务器断开连接的四次挥手
+ 客户端请求断开连接
+ 服务端确认断开请求
+ 服务端发送完毕剩下的数据 close
+ 客户端close 回复


## 浏览器检查状态码，304 协商缓存，301，302 重定向
+ 304 req:if-none-match, res:etag 协商 hash
+ 301 永久重定向会浏览器缓存
+ 302 临时重定向浏览器不缓存

## 解析返回内容，重排重绘
+ 页面生成过程
1. html 解析成 dom 树
2. css 解析成 cssom
3. 结合 dom 树和 cssom 生成 render tree
4. 进行布局 flow 将 渲染树的 节点进行合成
5. 进行绘制 paint 至屏幕上

+ 文档解析过程的事件触发
  1 开始解析 html 文档
  触发 readystatechange: load
  2 DOMContentLoaded 事件，原始 html 解析
  不包含样式资源加载, 同时触发 readystatechange: interactive
  3 load 事件，资源加载完毕
  样式资源加载完毕后才触发, 同时触发 readystatechange: complete
> + defer async 资源的script 都不阻塞，
    普通 script 下载阻塞再执行阻塞
    defer 先下载 html 解析完后执行，没什么阻塞
    async 下载好后直接执行，阻塞执行阶段

+ 重排
  1.dom 的增删改查
  2.浏览器窗口的变化滚动
  3.用户的输入
  4.dom的形状大小动画
  5.重排必定发生重绘
  6.影响范围大，最好固定 dom 容器大小不影响到其他 dom

+ 重绘
  1.dom 的颜色背景
  2.dom border 样式 如圆角内陷
  3.每次重绘前执行 requestAnimationFrame

## 重排重绘优化
+ 目标 dom 父容器固定大小，重排不会影响其他 dom
```
// 改变 p 里的 dom 也会影响 h5 和 h4，固定 p 的大小
<body>
  <div class="hello">
    <h4>h4</h4>
    <p><strong>Name:</strong>BDing</p>
    <h5>h5</h5>
  </div>
</body>
```
+ 读写操作分离
```
// 只发生一次重绘重排, 读取操作在写入操作完成后才进行, 有的浏览器低下仍会进行4次
div.style.left = '10px';
div.style.top = '10px';
div.style.width = '20px';
div.style.height = '20px';
console.log(div.offsetLeft);
console.log(div.offsetTop);
console.log(div.offsetWidth);
console.log(div.offsetHeight);
```
+ 样式集中改变
```
// 使用添加 className 和 cssText 的方式一次操作
el.className += " otherclass"
el.style.cssText += "; left: " + left + "px; top: " + top + "px;";
```
+ 缓存布局信息
```
// bad 同时又读写操作 强制刷新 触发两次重排
div.style.left = div.offsetLeft + 1 + 'px';
div.style.top = div.offsetTop + 1 + 'px';
// good 缓存布局信息 读写分离
var curLeft = div.offsetLeft;
var curTop = div.offsetTop;
div.style.left = curLeft + 1 + 'px';
div.style.top = curTop + 1 + 'px';
```
+ dom 离线更改
```
dom.display = 'none'
// 修改dom样式
dom.display = 'block'
----
const fragment = document.createDocumentFragment();
// DocumentFragment 上批量操作 dom
list.appendChild(fragment);
----
复制 dom，操作完后替换掉原 dom
var p = document.getElementById("para1"),
var p_prime = p.cloneNode(true);
```
+ 绝对定位 固定定位
  position属性为absolute或fixed 的dom 重排消耗小
+ 优化动画
  动画移动 1px 增加为 3px 减少 重排
  启动 GPU 操作

+ react 调度优化 [ 调度模块原理 - 实现 requestIdleCallback 
  ](https://www.jianshu.com/p/87533d64626a)
    1. 重绘的一帧 16.67，性能低是 33.33
    2. rAF 计算出当前帧开始时间和下一帧开始时间
    3. 把 react 更新任务推入 addEventLisnter 队列中
    4. 每一帧更新顺序：队列 react 任务 -> UI 渲染动画 -> idle 回调
    5. 每一次循环队列开始根据 react 任务过期时间判断是否过期，过期了执行 react 更新，再执行 UI 操作

[参考](https://juejin.im/post/5c15f797f265da61141c7f86
)
