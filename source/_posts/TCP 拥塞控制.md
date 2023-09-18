---
title: TCP 拥塞控制
date: 2019-05-21 17:41:52
tags: http
categories: http
---
## TCP 拥塞控制

### 背景
+ 作用于网络，防止过多的包发送到网络中，避免网络负载过大，网络拥塞的情况
+ 检测网络传输的情况进行动态控制

### 作用
+ TCP 通过维护一个拥塞窗口来进行拥塞控制
+ 网络中没有出现拥塞，拥塞窗口的值就可以再增大一些，以便把更多的数据包发送出去
+ 网络出现拥塞，拥塞窗口的值就应该减小一些，以减少注入到网络中的数据包数。

### 名词
+ ACK 确认，确认方收到包后的确认报文
+ 拥塞窗口值 cwnd，
+ ssthresh （slow start threshold）慢启动阈值
+ MSS (Maximum segment size) 最大分段大小
+ RTT (round-trip time) 往返时间，来回通信延迟
+ RTO (retransmission timeout) 重传超时

### 拥塞控制的三种情况
+ 收到正确的 ACK 确认，表明当前单次发送量小于网络的承载量
+ 收到三条同一分组的确认，重复的三条确认，单次发送量一般大于3
    + 发送 0 10 20 30 40 ，20序号丢失
    + 返回 0 10 20 20 20 , 得到3个20的重复确认
+ 对某条分组的确认超时未收到确认
    + 发送 0 10 20 30 40 , 30序号丢失
    + 返回 0 10 20 30 30 , 2次重复，单次发送大于3，更繁忙

### 慢启动
+ TCP 刚建立连接，逐渐提速试探网络承受能力
  1 慢启动初始启动时设置拥塞窗口值（cwnd）为1、2、4或10个MSS
  2 cwnd 大小每当收到一个ACK增加，每个 RTT 内成倍增加, 呈指数上升
  3 当达到慢启动阈值 ssthresh 时 cwnd >= ssthresh，进入拥塞避免算法-线性增长阶段

### 拥塞避免
+ 拥塞窗口值 cwnd >= ssthresh 慢启动阈值时，cwnd 进入线性增长阶段
+ cwnd 大小每当收到一个ACK增加，每个 RTT 只增加 1, 呈线性上升

### 快速重传
> Tahoe：如果收到三次重复确认——即第四次收到相同确认号的分段确认，并且分段对应包无负载分段和无改变接收窗口——的话，Tahoe算法则进入快速重传，将慢启动阈值改为当前拥塞窗口的一半，将拥塞窗口降为1个MSS，并重新进入慢启动阶段。

+ 设置 ssthresh 为当前 cwnd 的一半
+ cwnd 变为 1MSS，
+ 重新进入慢启动 - 指数上升再线性上升
+ 对于RTO，将拥塞窗口降为1个MSS，然后进入慢启动阶段

### 快速恢复
> Reno：如果收到三次重复确认，Reno算法则进入快速重传，只将拥塞窗口减半来跳过慢启动阶段，将慢启动阈值设为当前新的拥塞窗口值，进入一个称为“快速恢复”的新设计阶段。

+ 设置 ssthresh 为当前 cwnd 的一半
+ cwnd 也设置为 ssthresh 大小
+ 进入拥塞避免阶段 - 线性上升
+ 对于RTO，将拥塞窗口降为1个MSS，然后进入慢启动阶段

### 快速重传 Tahoe，快速恢复 Reno 图解
![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401695050205341.png)

### 参考
https://zh.wikipedia.org/wiki/TCP%E6%8B%A5%E5%A1%9E%E6%8E%A7%E5%88%B6
https://zh.wikipedia.org/wiki/%E6%8B%A5%E5%A1%9E%E6%8E%A7%E5%88%B6
https://juejin.im/entry/5b7fcd13f265da4372473199
https://zhuanlan.zhihu.com/p/59656144
https://blog.csdn.net/lpjishu/article/details/51366691
https://blog.csdn.net/Go_hack/article/details/79850183
