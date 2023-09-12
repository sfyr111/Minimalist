---
title: http 缓存
date: 2018-01-22 12:27:35
tags: http
categories: http
---
## 4种缓存方式
[HTTP缓存控制参考](http://imweb.io/topic/5795dcb6fb312541492eda8c)

### 分类和区别
规定了过期时间：

| 响应header   | 描述              | 常用响应返回内容     | 推荐 | 特点     | 缺点              | 场景            |
|--------------|-------------------|----------------------|------|---------|-------------------|-----------------|
| Cache-Control| 在多少秒内进行缓存| public, max-age=秒   | 是   | 固定时间|                   |                 |
| Expires      | 在此时间前进行缓存| 格林威治时间        | 否   | 绝对时间| 受客户端时间影响  | 兼容http1.0     |


需进行比较，会返回304状态码：

| 响应header   | 请求header        | 描述                | 常用响应返回内容     | 推荐 | 特点             | 缺点            | 场景     |
|--------------|-------------------|---------------------|----------------------|------|-----------------|-----------------|----------|
| ETag         | If-None-Match     | 固定字符串          | md5                  | 是   | 检测文件完整性   |                 |          |
| Last-Modified| If-Modified-Since | 在某时间后没再更改  | 格林威治时间        | 否   | 浏览器根据返回的时间自己决定缓存 | 浏览器差异 |          |


Tips：
`Cache-Control`与`Expires`一样，都是在某个时间未到来前进行缓存
默认第一个请求(主页)的请求头里会自动加上`Cache-Control: max-age=0`，这个请求无论响应头的`Cache-Control`是什么设置都不会缓存，减少请求次数同时减少下载次数
`ETag`方式通过检查`request.headers`里的`if-None-Match`里的32位md5字符串来检测文件完整性决定是否更新, 如果md5匹配成功则返回304，只减少下载次数

### Cache-Control 与 Last-Modified / if-Modified-Since 比较
>对于所有可以缓存的资源都可以同时使用这两种策略进行缓存
Cache-Control/Expires的优先级要高于Last-Modified/ETag

*  Cache-Control: 
1设置固定过期时间
2文件在过期时间没到之前都不进行请求也不进行下载更新
3解决方法只能通过加时间戳改变文件名解决

*  Last-Modified / if-Modified-Since:
1通过给文件内容进行哈希算法来确定文件内容版本
2通过对请求头`if-Modified-Since`的字符串来检测文件内容有没改变
3文件内容没改变则不更新资源，跟请求资源的文件名关系不大但每次都需要请求
4可以通过标识文件版本名、加长缓存时间的方式来减少304响应。

### 结论
> 1需要兼容HTTP1.0的时候需要使用Expires，不然可以考虑直接使用Cache-Control
2需要处理一秒内多次修改的情况，或者其他Last-Modified处理不了的情况，才使用ETag，否则使用Last-Modified。
3对于所有可缓存资源，需要指定一个Expires或Cache-Control，同时指定Last-Modified或者Etag。
4可以通过标识文件版本名、加长缓存时间的方式来减少304响应。
[HTTP缓存控制参考](http://imweb.io/topic/5795dcb6fb312541492eda8c)


## MD5
hash算法
任何文件或数据都可以通过MD5算法转化成一个32位的固定字符串
场景： 
1检查缓存的文件内容是否有变化
2检查下载文件是否下载完毕(`cat xxx.mp4 | md5`)
