---
title: TCP 滑动窗口原理
date: 2019-01-14 19:21:06
tags: http
categories: http
---
## TCP 滑动窗口
TCP 使用滑动窗口做流量控制与乱序重排

## RTT 和 RTO

+ RTT
  发送一个数据包到收到对应的 ACK，所花费的时间

+ RTO
  定时器，重传时间间隔
  没有回应 ACK 则等到 RTO 到期进行重传，根据 RTT 计算出来

### TCP 使用滑动窗口做流量控制与乱序重排
+ 保证TCP 的可靠性
+ 保证TCP 的流量控制特性
  ![Window 字段](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401695050200904.png)
  window 字段的流量控制：用于接收方通知发送方自己还有多少缓冲区可以接收数据，发送方根据接收方的处理能力来发送数据，不会导致接收方处理不过来。
  滑动窗口机制体现了tcp面向字节流的设计




### 窗口数据的计算过程
左右为发送方接收方缓冲区
![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401695050201501.png)


+ 发送方
  LastByteWritten: 发送方上层应用写出的数据长度
  LastByteSent: 通过 TCP 最后发送到接收方的数据位置
  LastByteAcked: 已经收到接收方的连续最大 ACK 的位置(二次握手)

+ 接收方
  MaxRcvBuffer: 最大缓冲区
  LastByteRead: 接收方上层应用在 TCP 缓冲区中已经读完的最后一个字节的位置
  NextByteExpected: 收到的连续最大 Seq 包的位置(排好序可以读的数据)
  LastByteRcvd: 已收到的最后一个字节的位置
  NextByteExpected 与 LastByteRcvd 之间会有部分空隙表示这些数据还无法读或者应用无法读到。

+ 接收方窗口 AdvertisedWindow 接收方还能够接收的数据量
  AdvertisedWindow = MaxRcvBuffer – (LastByteRcvd - LastByteRead)
  接收方把 AdvertisedWindow 告知发送方，发送方 LastByteSent - LastByteAcked 不能大于 AdvertisedWindow 接收方还能接收的量

+ 发送方窗口 EffectiveWindow 发送方窗口内剩余可发送的大小
  EffectiveWindow = AdvertisedWindow - (LastByteSent - LastByteAcked) 保证接收方可以处理数据
  LastByteSent - LastByteAcked 发送方可以发送的数据减去已经确认好可发送的数据就是发送方将要发送的数据，这个数据不能大于接收方还能够接收的数据量。

接收方还能够接收的数据量 AdvertisedWindow = MaxRcvBuffer – (LastByteRcvd - LastByteRead)，接收方把 AdvertisedWindow 告知发送方，发送方 LastByteSent - LastByteAcked 不能大于 AdvertisedWindow 接收方还能接收的量。
发送方窗口内剩余可发送的大小 EffectiveWindow = AdvertisedWindow - (LastByteSent - LastByteAcked) 保证接收方可以处理数据

## 滑动窗口基本原理

### TCP 发送方
+ 发送方来看数据分为四类
  1.得到服务器确认且已经发送的
  2.还没得到服务器确认但已经发送的
  3.未发送但服务器允许发送的
  4.未发送且因为达到了 window 的大小不允许发送的数据
  [2-3]就是发送方的滑动窗口
  ![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401695050202088.png)
+ 滑动窗口在被连续确认后才进行滑动
  当 ACK 连续被确认，比如32-36连续确认4为后才开始把分类2的数据发送，同时扩大分类3向右的范围
  ![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401695050202683.png)

### TCP 接收方
+ 接收方缓存内三种状态
  1.已接收并且已经发送 ACK 回执的数据
  2.未接收但可以接收状态 - 接收窗口 滑动方式一致
  3.未接收且不能接收的状态 - 达到窗口阈值
  ACK 直接由 TCP 回复，默认没有应用延迟，不存在已接收未回复 ACK 的状态
  [2]就是接收窗口
  ![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401695050203256.png)

## 总结
TCP 最基本的传输可靠性来源于确认重传机制，TCP 的滑动窗口机制也是建立在确认重传基础上的。
发送窗口收到接收端对于本段窗口内字节的 ACK 确认才会移动发送窗口的左边界。
接收窗口只有在前面所有的段都确认的情况下才会移动左边界，当前面还有字节未接收但收到后面字节的情况下(乱序)窗口是不会移动的，并不对后续字节确认, 确保这段数据重传。
可以根据滑动窗口的调整进行流量控制。

+ 参考
  [参考1](https://monkeysayhi.github.io/2018/03/07/%E6%B5%85%E8%B0%88TCP%EF%BC%881%EF%BC%89%EF%BC%9A%E7%8A%B6%E6%80%81%E6%9C%BA%E4%B8%8E%E9%87%8D%E4%BC%A0%E6%9C%BA%E5%88%B6/)
  [参考2](https://monkeysayhi.github.io/2018/03/07/%E6%B5%85%E8%B0%88TCP%EF%BC%882%EF%BC%89%EF%BC%9A%E6%B5%81%E9%87%8F%E6%8E%A7%E5%88%B6%E4%B8%8E%E6%8B%A5%E5%A1%9E%E6%8E%A7%E5%88%B6/)
