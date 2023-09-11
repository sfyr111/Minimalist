---
layout: http
title: HTTP相关系统知识
date: 2018-10-26 23:22:06
tags: http
categories: http
---
![](https://upload-images.jianshu.io/upload_images/2155778-00f4024cb110f446.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

![](https://upload-images.jianshu.io/upload_images/2155778-8233ea18c19cee84.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

## 因特网协议五层协议

+ 物理层 
定义物理设备如何传输数据

+ 数据链路层
在通信的实体间建立数据链路连接

+ 网络层
为数据在节点之间传输创建逻辑链路

+ 传输层
向用户提供可靠的端到端服务
传输层向高层屏蔽了下层数据通信的细节

+ 应用层
为应用软件提供了更多服务
构建于 TCP 协议之上
屏蔽网络传输相关细节

## HTTP 历史

+ HTTP / 0.9
只有一个命令 GET 
没有HEADER 等描述数据的信息
服务器发送完毕就关闭 TCP 连接

+ HTTP / 1.0
增加了很多命令
增加 status code 和header
多字符集的支持、多部分发送、权限、缓存

+ HTTP / 1.1
持久连接
pipeline(同一个连接里发送多个请求)
增加 host 和其他命令 (物理服务、集群里 host 区分部署的 web 服务)

+ HTTP2
所有数据以二进制传输
同一个连接里发送多个请求不再需要按照顺序(并行)
头信息压缩以及推送提高效率的功能(资源返回和 ajax 并行)

## URI 、URL、URN

+ URI
Uniform Resource Identifier / 统一资源标识符
用来标识互联网上唯一的信息资源
包括 URL、URN

+ URL
Uniform Resource Locator / 统一资源定位器
http、ftp 协议都是同一个格式
`http://user:pass@host.com:80/path?query=string#hash `
schema: http:// file:// https:// 
host: 找到物理服务器
端口: 定位 web 服务器
path: 路由、资源目录
query: 查询参数
hash: 文档片段、锚点定位

+ URN
永久统一资源定位符
在资源移动之后还能被找到
不成熟

## HTTP 请求
+ 报文
![](https://upload-images.jianshu.io/upload_images/2155778-0a44fcd3f9abd715.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

+ HTTP 方法
用来定义对于资源的操作
常用 GET、POST、DETEL、PUT、PATCH
有各自的语义

+ HTTP code
定义服务器对请求的处理结果
各个区间的 code 各自的语义
好的 HTTP 服务可以通过 code 判断结果

## 命令行发送请求
+ curl
```
curl -v url
```

## 同源限制
`Access-Control-Allow-Origin`

### CORS 预请求

+ 允许方法
`GET HEAD POST`

+ 允许的Content-Type
`text/plain`
`multipart/form-data`
`application/x-www-form-urlencoded`

+ 其他限制
自定义 header 限制
XMLHttpRequestUpload 对象没有注册时间监听
请求中没有使用 ReadableStream 对象

## HTTP 缓存
![](https://upload-images.jianshu.io/upload_images/2155778-f66b44d1c430c628.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

### 强缓存 Cache-Control

#### 可缓存性
`public`: 任何地方都可缓存，http 代理服务器、发出请求的客户端浏览器都可缓存
`private`: 发起请求的客户端浏览器才可缓存
`no-cache`: 任何节点都不可使用缓存(可缓存但服务器指定其不使用)

#### 到期
`max-age=<seconds>`: 缓存时间
`s-maxage=<seconds>`: 会代替 max-age 只在代理服务器生效
`max-stale=<seconds>`: max-age 过期后仍然使用过期缓存，发起请求的客户端设置(浏览器不常用)

#### 资源重新验证
`must-revalidate`: 过期后会去原服务端验证是否过期
`proxy-revalidate`: 指定的缓存服务器验证是否过期

#### 其他
`no-store`: 本地不可缓存
`no-transform`: 常用于 proxy 服务器里, 资源不可转换压缩

### 协商缓存

#### 验证 header
+ Last-Modified
+ Etag

#### Last-Modified
配合 `If-Modified-Since` 或 `If-Unmodified-Since` 使用
对比上次修改时间验证资源是否需要更新

#### Etag
文件完整性 hash 数据签名
配合 `If-Match` 或  `If-Non-Match` 使用
对比资源的 hash 签名是否一致决定是否使用缓存

### cookie &  session

#### cookie
`Set-Cookie` 设置
同源下再次请求会自动带上
键值对形式，可以设置多个

#### cookie 属性
`max-age` 和 `expires` 设置过期时间
`Secure` 只在 https 请求的时候才发送 cookie
`HttpOnly` 无法通过 document.cookie 访问 cookie
`domain` 设置二级域名可访问的 cookie (domain=yang.com，a.yang.com, b.yang.com 都可以访问)

## 长连接
`Connection`: `keep-alive | close`
http/1.1 无法并发，在网速慢的情况下还是会创建多个 ConnectionID

## 数据协商

### 分类
**MIME types**
+ 请求
+ 响应

### 请求 header - Accept
`Accept`: 想要的数据类型
`Accept-Encoding`: 什么样的编码方式传输, 用于数据压缩格式
`Accept-Language`: 数据语言
`User-Agent`: 浏览器信息判断

###  响应 header - Content
`Content-Type`: 返回的数据格式
`Content-Encoding`: 对应客户端请求的 `Accept-Encoding`
`Content-Language`: 对应客户端请求的 `Accept-Language`

### 数据压缩
`zlib 压缩`
`zlib.gzipSync(buffer)`
`Content-Encoding: gzip`
没压缩前
![没压缩前](https://upload-images.jianshu.io/upload_images/2155778-5afe01229914904e.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)
压缩后
![zip 压缩后](https://upload-images.jianshu.io/upload_images/2155778-956289a5b202cf8c.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

### 文件数据协商
`Content-Type: multipart/form-data`

## 重定向 redirect
响应 header :  `Location: /url`
响应 CODE: `302 301` 才可以跳转
```
    response.writeHead(301, {
      'Location': '/new',
    })
```

### 301 302 区别
+ 302 临时跳转
请求 `/` 重定向到 `/new`
每次后台都会收到两次请求
![](https://upload-images.jianshu.io/upload_images/2155778-bb5a7cb72d262697.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

+ 301 永久跳转
浏览器会尽量长的缓存 301 请求，需要慎重设置, 浏览器如果不清缓存会造成一直跳转![](https://upload-images.jianshu.io/upload_images/2155778-ffc8e98f9c1f3b8f.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

请求 `/` 重定向到 `/new`
后台第一次会收到两次请求
第二次只会收到`/new`
![](https://upload-images.jianshu.io/upload_images/2155778-916b6f721227ff1e.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

## 内容安全策略 CSP
`Content-Security-Policy: `
限制资源获取
报告资源获取越权

### 限制方式
default-src 限制全局
制定资源类型

### 资源类型
[MDN](https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Headers/Content-Security-Policy__by_cnvoid)
connect-src / img-src / style-src / script-src 等

### 设置 CSP
```
// 服务端设置
      'Content-Security-Policy': 'default-src http: https:' // 只能根据外链
      'Content-Security-Policy': 'script-src http: https:' // 只限制script
      'Content-Security-Policy': 'default-src \'self\' https://cdn.bootcss.com' // 只根据本域名, 增加 cdn.bootcss.com 域名
      'Content-Security-Policy': 'default-src \'self\'' // 只根据本域名
      'Content-Security-Policy': 'default-src \'self\'; form-action \'self\'' // 限制表单提交
      'Content-Security-Policy': 'default-src \'self\'; form-action \'self\'; report-uri /report' // 服务器上报
      'Content-Security-Policy-Report-Only': 'default-src \'self\'; form-action \'self\'; report-uri /report' // 服务器只上报，但是课加载
```
```
// meta 标签设置
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; form-action 'self'; report-uri /report">
```
被 csp 禁止![](https://upload-images.jianshu.io/upload_images/2155778-d096021edee9b638.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)
![](https://upload-images.jianshu.io/upload_images/2155778-87c1a85a19d701bd.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

设置 connect-src 可以限制 ajax 发送![](https://upload-images.jianshu.io/upload_images/2155778-bef2bd92061c5126.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

## nginx

### 统一配置文件
nginx.conf
```
  include servers/*; // 此目录下的所有 .conf 文件
```

### 代理
访问 yang.com 下的 / 路径代理到本地 8888 端口
```
server {
  listen      80;
  server_name yang.com; # 要配置 host 不然就访问外网了

  location / {
    proxy_pass http://127.0.0.1:8888;
    proxy_set_header Host $host; # host配置
  }
}
```

### 代理缓存
```
# 缓存
proxy_cache_path cache levels=1:2 keys_zone=my_cache:10m; # levels=1:2 是否创建二级文件夹, keys_zone 缓存大小

server {
  listen      80;
  server_name yang.com; # 要配置 host 不然就访问外网了

  location / {
    proxy_cache my_cache; # 配置的缓存名
    proxy_pass http://127.0.0.1:8888;
    proxy_set_header Host $host; # host配置
  }
}
```
```
'Cache-Control': 'max-age=5, s-maxage=20' 浏览器缓存 5s 代理服务器缓存 20s
'Cache-Control': 'max-age=5, s-maxage=20, private' // 只可浏览器缓存
'Cache-Control': 'max-age=5, s-maxage=20, no-store' // 都不可缓存
'Vary': 'X-Test-Cache'  // 指定的 X-Test-Cache 头才可缓存，比如 req header 发了 X-Test-Cache： user-agent， 
```
> + `s-maxage` 代理服务器缓存，对应多个客户端请求加速
> + `Vary` 当 `req.header`: `X-Test-Cache` 为 1 时发送后，代理缓存了 `X-Test-Cache` 为 1 这个请求，下次其他客户端请求 `X-Test-Cache` 为 1 则使用代理服务器缓存。可以使用 **user-agent** 进行代理服务器的设备缓存。

## HTTPS
![](https://upload-images.jianshu.io/upload_images/2155778-8fff24b9b3e28b3c.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

### 生成密钥
```
openssl req -x509 -newkey rsa:2048 -nodes -sha256 -keyout test-privkey.pem -out test-cert.pem
```

### nginx 生成 https 服务
```
server {
  listen      443;
  server_name yang.com; # 要配置 host 不然就访问外网了

  ssl on;
  ssl_certificate_key /usr/local/etc/openssl/test/test-privkey.pem; # 密钥路径
  ssl_certificate /usr/local/etc/openssl/test/test-cert.pem; # 密钥路径

  location / {
    proxy_cache my_cache; # 配置的缓存名
    proxy_pass http://127.0.0.1:8888;
    proxy_set_header Host $host; # host配置
  }
}
```

### http 跳转到 https
```
# http 跳转到 https
server {
  listen      80 default_server;
  listen      [::]:80 default_server;
  server_name yang.com;
  return 302  https://$server_name$request_uri; # 进行 302 跳转
}
```

## HTTP2
开启 https 才可使用 http2

### 优势
信道复用、分帧传输: 并发的 TCP 连接只创建一个 TCP
Server Push: 服务端主动发送

### server 编写 http2 
```
// ...
  if (request.url === '/') {

    response.writeHead(200, {
      'Content-Type': 'text/html',
      'Connection': 'close',
      'Link': '</carbon.png>; as=image; rel=preload' // http2 需要进行服务端推送
    })

    response.end(html)
  }
// ...
```

### nginx 将 http2 转为 http1.1
nginx 可以将 http2 转成 1.1 版本传输给服务端
```
server {
  listen             443 http2;
  server_name        yang.com; # 要配置 host 不然就访问外网了
  http2_push_preload on; # 开启服务器推送

  ssl on;
  ssl_certificate_key /usr/local/etc/openssl/test/test-privkey.pem;
  ssl_certificate     /usr/local/etc/openssl/test/test-cert.pem;

  location / {
    proxy_cache my_cache; # 配置的缓存名
    proxy_pass http://127.0.0.1:8888;
    proxy_set_header Host $host; # host配置
  }
}
```

### 推送结果
![](https://upload-images.jianshu.io/upload_images/2155778-34c3f8e5f7461c30.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)
[测试 HTTP2 性能](https://http2.akamai.com/demo/http2-lab.html)
```
$ curl -v https://yang.com 
$ curl -v -k https://yang.com // 打开不安全 ssl 限制
$ curl -v -k --http1.1 https://yang.com // 指定 http1.1 访问
```