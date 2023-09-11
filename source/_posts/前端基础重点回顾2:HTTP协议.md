---
title: 前端基础重点回顾2:HTTP协议
date: 2018-01-24 16:50:04
tags: http
categories: Font-End Basis
---
## HTTP协议的主要特点
+ 简单快速
URI固定，处理简单
+ 灵活
http协议可以通过修改header 指定传输的数据类型，一个http 传输可以完成不同数据类型的传输
+ 无连接
http协议每次传输后连接都会断开
+ 无状态
客户端和服务端是两块，客户端再次访问服务端是无法区分客户端的(单从http 协议上是无法区分客户端身份的)

## HTTP报文组成
### 请求报文
+ 请求行
http方法、请求地址、http协议版本
+ 请求头
header：key value 格式
+ 空行(CR+LF)
用于识别请求头和请求体的分隔符，CR+LF 回车+换行符
+ 请求体

### 响应报文
+ 状态行
状态码、http协议版本
+ 响应头
header：key value 格式
+ 空行(CR+LF)
用于识别响应头和响应体的分隔符，CR+LF 回车+换行符
+ 响应体
响应的实体内容

## HTTP方法
+ get 获取
+ post 传输
+ put 更新
+ delete 删除
+ header 获得报文首部
+ options 对服务器预先请求告知

## GET / POST 区别
+ get产生的url地址可以被收藏，post不可以
+ get会被浏览器主动缓存，post不会，除非手动设置
+ get只能进行url编码，post支持多种编码方式
+ get参数会被完整保留在浏览器历史记录里，post参数不会保留
+ get在url中参数有长度限制2kb，post没有限制
+ 参数的数据类型：get只接受ASCII字符，post没有限制
+ get参数直接暴露在url上，不能传递敏感信息
+ get通过url传递，post放在request body中

## HTTP状态码
#### 1xx: 指示信息 - 请求已接收

#### 2xx: 成功 - 请求被成功接收
>+ 200 OK
>+ 206 Partiaml Content 客户端发送了一个带Range头多get请求，服务器完成了它(音频、视频应用)

#### 3xx: 重定向
>+ 301 Moved Permanently 所请求的资源已经转移至新的url地址
>+ 302 Found 所请求的资源临时转移至新url地址
>+ 304 Not Modified 客户端有缓存的文档并发出了一个条件性请求，服务器告诉客户端原来缓存的资源文件可以继续使用

#### 4xx: 客户端错误
>+ 400 Bad Request 客户端存在语法错误，服务器无法理解
>+ 401 Unauthorized 请求未授权 必须和www-Authenticate 报头域一起使用(JWT鉴权应用)
>+ 403 Forbidden 请求被禁止访问(只能通过服务器端访问)
>+ 404 Not Found 请求的资源不存在

#### 5xx: 服务器错误
>+ 500 Internal server Error 服务器错误
>+ 503 Server Unavailable 请求未完成或服务器临时过载当机

## HTTP持久连接
HTTP协议采用“请求-应答”模式，每进行一次http连接就会断开TCP连接

### Keep-Alive
>+ Keep-Alive 模式，只要有一方未明确表示断开连接则保持TCP连接状态，此功能避免重复建立连接
>+ HTTP/1.0 未标准化
>+ HTTP/1.1 版本默认支持

### HTTP管线化
在HTTP/1.1 版本使用Keep-Alive 下可以使用管线化(pipelining)方式发送请求

```
// 未使用管线化 单个请求
req1 > server
res1 < server

req2 > server
res2 < server

req3 > server
res3 < server
```
```
// 使用管线化 打包发送
req1 > server
req2 > server
req3 > server

res1 < server
res2 < server
res3 < server
```

>+ 管线化只通过Keep-Alive 完成，http/1.1 才支持
>+ 只有get 和head 方法请求才可以，post 有限制
>+ 初次创建连接不启动管线化机制，因为对方服务器不一定支持http/1.1
>+ 管线化不会影响服务器响应顺序
>+ http/1.1 要求服务端支持管线化处理不失败即可
>+ chrmoe firefox 默认未开启管线化支持，因为管线化功能不一定能带来性能提升，服务器支持也不好。

### Cookie 维持客户端访问状态
浏览器每次访问会携带cookie 信息，服务器可以设置cookie，通过这个特性可以创建带状态(session)的http 访问连接
```
// 客户端首次访问服务端
client -----------无cookie------------> server
client <-----set-cookie: sid=user1----- server
// 客户端再次访问服务端
client -----cookie: sid=user1---------> server
client <--------确认是user1访问---------- server
```
session 就是服务端手动维护每个客户端访问的cookie，可以维护在内存里也可以维护在redis 缓存中。