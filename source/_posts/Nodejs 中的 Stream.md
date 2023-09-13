---
title: Nodejs 中的 Stream
date: 2018-10-29 02:35
tags: nodejs
categories: nodejs
---
## 什么是 Stream

> 在 Linux 中，文件实际上可以看做是字节的序列。所有的 I/O 设备也是用文件来表示的。

> 为了区别不同文件的类型，会有一个 type 来进行区别：
> + 普通文件：包含任意数据
> + 目录：相关一组文件的索引
> + 套接字 Socket：和另一台机器上的进程通信的类型

    >  + 打开文件(open): 返回文件描述符(file descriptor) `注意这里文件的概念`
         `fs.open(path, flags[, mode], callback) fs.openSync(path, flags[, mode])`
         `0: standard input(stdin)`
         `1: standard output(stdout)`
         `2: standar error(stderr)`


> + 关闭文件(close): 关闭文件描述符(file descriptor)
    `fs.close(fd, callback) fs.closeSync(fd)`

> + 读取文件(read): 在打开和关闭之间就是读取文件，实际上就是把文件中对应的字节复制到内存中，并更新文件指针到变量中.
    `fs.read(fd, buffer, offset, length, position, callback)`
    `fs.createReadStream(path[, options])`

> + 写入文件(write): 是把内存中的数据复制到文件中，并更新文件指针
    `fs.write(fd, buffer[, offset[, length[, position]]], callback)`
    `fs.createWriteStream(path[, options])`

> + 元数据(stats): 元数据是用来描述数据的数据，由内核维护
    `fs.statSync(path[, options])`
```
Stats {
  dev: 2114, // Device
  ino: 48064969, // inode
  mode: 33188, // Protection & file type
  nlink: 1, // Number of hard links
  uid: 85, // User ID of owner
  gid: 100, // Group ID of owner
  rdev: 0, // Device type (if inode device)
  size: 527, // Total size, in bytes
  blksize: 4096, // Blocksize for filesystem I/O
  blocks: 8, // Number of blocks allocated
  atimeMs: 1318289051000.1,
  mtimeMs: 1318289051000.1,
  ctimeMs: 1318289051000.1,
  birthtimeMs: 1318289051000.1,
  atime: Mon, 10 Oct 2011 23:24:11 GMT, // Time of last access
  mtime: Mon, 10 Oct 2011 23:24:11 GMT, // Time of last modification
  ctime: Mon, 10 Oct 2011 23:24:11 GMT, // Time of last change
  birthtime: Mon, 10 Oct 2011 23:24:11 GMT }
```

### 重定向
参考[操作系统输入输出](https://wdxtub.com/2016/04/16/thin-csapp-6/)
> 了解了具体的结构之后，我们来看看内核是如何表示已打开的文件的。其实过程很简单，每个进程都有自己的描述符表(Descriptor table)，然后 Descriptor 1 指向终端，Descriptor 4 指向磁盘文件，如下图所示：
![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401694615820021.png)

> 这里有一个需要说明的情况，就是使用 fork。子进程实际上是会继承父进程打开的文件的。在 fork 之后，子进程实际上和父进程的指向是一样的，这里需要注意的是会把引用计数加 1，如下图所示
![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401694615820691.png)

> 了解了这个，我们我们就可以知道所谓的重定向是怎么实现的了。其实很简单，只要调用 dup2(oldfd, newfd) 函数即可。我们只要改变文件描述符指向的文件，也就完成了重定向的过程，下图中我们把原来指向终端的文件描述符指向了磁盘文件，也就把终端上的输出保存在了文件中：
![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401694615821297.png)

> 标准 IO 会用流(stream)的形式打开文件，所谓流(stream)实际上是文件描述符(file descriptor)和缓冲区(buffer)在内存中的抽象

## Nodejs 中的 Stream

Stream 模块在 nodejs 中只是处理流数据的抽象接口(abstract interface)，Stream 模块只提供了基础的 API，使用者可以使用这些 API 构建实现流接口的对象。

### Stream 流的类型
+ Readable - 可读的流 (例如 fs.createReadStream()).
+ Writable - 可写的流 (例如 fs.createWriteStream()).
+ Duplex - 可读写的流 (例如 net.Socket).
+ Transform - 在读写过程中可以修改和变换数据的 Duplex 流 (例如 zlib.createDeflate()).
  Stream 模块还包含 pipeline 和 finished 公用功能

### nodejs 中使用到 Stream 接口的模块

> nodejs程序一般以标准输入流（stdin）、标准输出流（stdout）、标准错误流（stderr）分别对应 process.stdin、process.stdout、process.stderr 开始的

![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401694615821896.png)


### Stream 事件(event)

Stream 中 Readable 和 Writable
![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401694615822501.png)

+ Readable 发起的重要事件
    + `data` 产生数据
    + `end` 产生数据结束
+ Writable 发起的重要事件
    + `drain` 缓存区处理完毕
    + `finish` 处理结束

## 可读流 Readable Stream

### 创建一个可读流
```
const fs = require('fs')
// 创建一个可读流
const rs = fs.createReadStream('./package-lock.json', {
  // 相当于控制水桶大小
  highWaterMark: 1024 // 控制流每次 on data 的大小，默认是16kb
})
let onDataCount = 0
rs.on('data', chunk => { // 每挑桶一次
  console.log(chunk.toString('utf-8'))
  console.log(onDataCount++) // 挑桶多少次
})

rs.on('end', () => {
  console.log('end')
})
```

### 可读流的 flowing / paused 模式
> 如果我们‘挑‘来的水是需要‘喝’的，每次用桶‘挑’来的水需要‘喝掉’后再去挑下一桶水，那么上一桶水才不会浪费，不然上一桶水没消耗掉就挑来下一桶造成了数据传输的浪费。也就是数据传输时需要考虑到数据消费者的消费速度才能保证高利用率，而发送数据端就是‘生产者’， 接收数据端处理数据是‘消费者’。
> 消费者有：http 请求处理，文件写入处理，数据库处理等。
```
`消费者示例1`
const rs = process.stdin

let count = 0
rs.on('data', chunk => {
  console.log(chunk.toString())
  rs.pause() // 每次接收到数据后都暂停
  console.log(rs.isPaused())
  console.log('count: ', count++)
  // 这里我们模拟每次接收的数据处理3 秒再回复flowing 模式
  setTimeout(() => rs.resume(), 3000) 
})
```
上面的例子会导致每次在控制台输入数据后都需要等待3秒后, 再次输入的数据才能被可读流对象接收。在 pause 模式的这段时间里 rs 是不接收 onData 的数据的
```
`消费者示例2`
const fs = require('fs')

const rs = fs.createReadStream('./package-lock.json', {
  highWaterMark: 1024
})

console.log(rs.isPaused()) // 检查可读流当前的模式，已经注册

let onDataCount = 0
rs.on('data', (data)  => {
  console.log(data.toString('utf-8'))
  console.log(onDataCount++)
  rs.pause()
  console.log('on data=>', rs.isPaused())
  setTimeout(() => rs.resume(), 3000) // 恢复，控制流速，解决背压问题
})

console.log(rs.isPaused())

rs.on('end', () => {
  console.log('end')
})
```
上面是读取文件的情况，会发现每次读取足够 highWaterMark 的数据后会等待3 秒进行消费，消费结束会才会进行下一次 onData 事件。

### stream 的背压问题
> 一个 stream 数据的生产速度远大于 stream 的消费的速度，就会造成数据的堆积。
> 比如不停增长的日志文件(1秒产生100条)作为流的生产者，有个服务处理日志文件(3秒处理100条到数据库)作为消费者，如果没有 pause / flowing 模式就会撑爆内存造成浪费，让开发者对流的处理具有控制权。

### readable 事件精确控制可读流
> readable 区别于 data 事件, readable 事件回调内 rs.read(size) 方法就好像从桶中用瓢再一点点的取水一样，可以更精确的控制流数据的读取。但在此事件回调中无法使用paused / flowing 模式
```
// 此事件无法使用 paused resume， 因为不处理完是无法继续操作的.
rs.on('readable', () => {
  // 一次处理完成
  let dataChunk = rs.read()
  if (dataChunk) { // 判 null ，有数据后才开始读
    console.log(dataChunk.toString())
  }
})
```
```
rs.on('readable', () => {
  // 精准读取
  let dataChunk = rs.read(10)
  while (dataChunk) {
    rs.read(10) // 每次挑水到后使用一个 10字节的瓢进行少量读取
  }
})
```

## 可写流 Writeable Stream

### 创建一个可写流
```
const fs = require('fs')

const ws = fs.createWriteStream('./out.txt', {
  // highWaterMark: 3
})

for  (let i = 0; i < 1000; i++) {
  const drained = ws.write('hahahahaha\n') // 一个状态，有没有排干，是否写完这一段, highWaterMark 的大小决定
  console.log(drained) // 这个状态为false 时 highWaterMark 缓存已经满了，会发送 drain 事件
}
```


## 实现和使用 Stream 的各种流接口

### 可写流 Writeable

#### Writeable 使用
```
const { Writable } = require('stream');
const outStream = new Writable({ // 创建一个可写流实例
  write(chunk, encoding, callback) { // 定义写入数据的操作
    console.log(chunk.toString());
    callback();
  }
});
// process.stdin 可读流把控制台输入的数据通过 pipe 方法传输到 outStream 可写流里，调用 write 方法
process.stdin.pipe(outStream); 
```
+ write 方法有三个参数
    + **chunk** 默认为写入数据的 buffer
    + **encoding** 写入数据的编码，通常忽略
    + **callback** 在处理完 chunk  后需要调用，它通知写入操作成功执行。

#### 自定义 Writeable 实现
```
const { Writable }= require('stream')
const fs = require('fs')

class MyWriteable extends Writable {
  constructor (options) {
    super(options)
  }

  _write(chunk, encoding, callback) {
    fs.writeSync(1, chunk.toString() + '\n') // 1 为写入到命令行 和 console.log 一样
    setTimeout(() => callback(null), 100) // callback 传入 null 为正常，出错需要传入一个 Error 对象
  }

  _writev() {} // 并行写入，与_write 冲突
}

const ws = new MyWriteable()

for (let i = 0; i < 100; i++) {
  ws.write('hahahahah')
}
```

### 可读流 Readable

#### Readable 使用
```
const { Readable } = require('stream'); 
const inStream = new Readable({
  read() {}
});
inStream.push('ABCDEFGHIJKLM');
inStream.push('NOPQRSTUVWXYZ');
inStream.push(null); // 通知可读流不再输入数据
// inStream 可读流通过 pipe 输出到 process.stdout 可写流中输出到控制台上
inStream.pipe(process.stdout); 
```
```
const inStream = new Readable({
  // read 方法会在 inStream 可读流调用 pipe 建立通道时执行，不停的发送 data 事件
  read(size) {
    this.push(String.fromCharCode(this.currentCharCode++));
    if (this.currentCharCode > 90) {
      this.push(null);
    }
  }
});
inStream.currentCharCode = 65;
inStream.pipe(process.stdout);
```

#### 自定义 Readable 实现
> 自定义 Readable 只需要继承 Readable 并重写实现 _read() 方法就可以了
```
const { Readable } = require('stream');

// Readable里面有一个read()方法，默认掉_read()
// Readable中提供了一个push方法你调用push方法就会触发data事件
class MyReadable extends Readable {
  constructor(options) {
    super(options)
    this.count = 0
  }

    _read() {
      this.count++
      if (this.count > 10) {
        return this.push(null) // push null 就结束了
      }
    }
}

let rs = new MyReadable(); 
rs.on('data', function(data) {  // 当 rs 注册 onData 时就开始调用 _reade()
    console.log(data);
});
```

## 背压 back preesure
[wiki back presssure](https://en.wikipedia.org/wiki/Back_pressure#Backpressure_in_information_technology)
> 在数据传输过程中有一大堆数据在缓存之后积压着。每次当数据到达结尾又遇到复杂的运算，又或者无论什么原因它比预期的慢，这样累积下来，从源头来的数据就会变得很庞大，像一个塞子一样堵塞住。

### 实现背压
```
const { Readable, Writable }= require('stream')
const colors = require('colors');
const monent = require('moment')

class MyReadable extends Readable {
  constructor(options) {
    super(options)
    this.count = 0
  }

  _read(size) {
    if (this.count > 1000) {
      return this.push(null) // push null 就结束了
    }
    if (this.count === 0) console.log(colors.yellow('建立连接, 第一次 push 没返回'))
    this.count++
    let r
    setTimeout(() => {
      // push -> readQueue highWaterMark 缓存池, flowing 模式下才触发 onData 清理此缓存池
      r = this.push('...' + this.count) // 是否到达 readable 水位
      console.log(colors.yellow('=======reading call push ret======:', r, 'count: ', this.count + ' | ' + monent().format('mm:ss')))
    }, 100)

    if (!r) {
      // 暂停模式
      // 如果生产者的桶满了可以控制生产, 比如通过 size 记录位置
    }

  }
}

class MyWriteable extends Writable {
  constructor (options) {
    super(options)
  }

  _write(chunk, encoding, cb) {
    console.log(colors.blue('=======writing======:' + chunk.toString() + ' | ' + monent().format('mm:ss')))
    setTimeout(() => {
      console.log(colors.blue('=======write finish======:' + chunk.toString() + ' | ' + monent().format('mm:ss') + '\n'))
      cb(null)
    }, 500) // 延迟写完数据
  }
}

const rs = new MyReadable({
  highWaterMark: 50
})
const ws = new MyWriteable({
  highWaterMark: 50
})

rs.on('data', data => {
  console.log('=======on data ready for write======:', data.toString() + ' | ' + monent().format('mm:ss'))
  // write -> writeQueue highWaterMark 缓存池, writeQueue 任务清理完毕才触发 onDrain
  const drained = ws.write(data) // 返回 boolean 是否排空, rs 是否还能放更多的东西, 到达 ws 水位
  if (!drained) { // 没吸满20就暂停, 没排干, 桶里的水还没喝完
    console.log(colors.red('=======on data check drained is======:', drained, data.toString() + ' | ' + monent().format('mm:ss')))
    console.log(colors.red('=======on data pause for read======:' + monent().format('mm:ss') + '\n')
    )
    rs.pause()
  }
})

ws.on('drain', () => {
  console.log(colors.green('=======on drain with resume for read======:' + monent().format('mm:ss') + '')
  )
  rs.resume() // 吸满了，恢复
})
```
执行结果![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401694615823098.png)
上面代码，我们让 生产者 100 毫秒生产一次数据 push 到可读流 highWaterMark 缓存池，触发 onData 执行 可写流 write 存放到可写流的 highWaterMark 缓存池，让消费者 500 毫秒消耗一次可写流缓存池的数据，消耗完可写流缓存池的数据后触发 onDrain。
这个过程中，消费者消耗的速度远大于生产者的生产速度，当可读流的缓存池满时使可写流进入 pause 状态停止触发 onData 事件，直到可写流缓存池消耗完毕触发 onDrain 后才恢复可读流 flowing 事件。


## pipe 原理和实现
> pipe 可以有不同的目的地，pipe 就是解决了背压问题，实现方式就是在可读流上注册一个 onData 事件，达到阈值后进行 pause
[pipe 源码核心](https://github.com/nodejs/node/blob/master/lib/_stream_readable.js#L663-L681)

### 使用 pipe
> pipe 最大的作用是解决了背压的细节
```
const fs = require('fs')

const rs = fs.createReadStream('./package.json')
const ws = fs.createWriteStream('./out.txt')

rs.pipe(ws) // 解决了背压的细节
```

### 实现 pipe
看了 node 源码很简单，就是在可写流上注册 onData 和 onDrain 根据可写流的阈值和释放进行 pause flowing 的切换。因为实例是可写可读 pipe 到各个地方，这里的实例应该是个双工流
```
pipe(ws) {
    this.on('data', (chunk) => {
        let drained = ws.write(chunk);
        if (!drained) {
            this.pause();
        }
    });
    ws.on('drain', () => {
        this.resume();
    })
}
```

### 双工流 Duplex
> 双工流结合了可写流和可读流，同时做到读写互不干扰
[双工流 duplex 源码](https://github.com/nodejs/node/blob/master/lib/_stream_duplex.js#L31-L42)
继承了 Readable 同时拥有Writeable 方法
```
const util = require('util');
const Readable = require('_stream_readable');
const Writable = require('_stream_writable');

util.inherits(Duplex, Readable);

var keys = Object.keys(Writable.prototype);
for (var v = 0; v < keys.length; v++) {
  var method = keys[v];
  if (!Duplex.prototype[method])
    Duplex.prototype[method] = Writable.prototype[method];
}
```

#### Duplex 使用
```
const { Duplex } = require('stream');

const inoutStream = new Duplex({
  // 通过 pipe 通道进行写入操作时执行
  write(chunk, encoding, callback) {
    console.log('w-', chunk.toString());
    callback();
  },

  // 建立通道时执行 read
  read(size) {
    this.push(String.fromCharCode(this.currentCharCode++));
    if (this.currentCharCode > 90) {
      this.push(null);
    }
  }
});

inoutStream.currentCharCode = 65;
process.stdin.pipe(inoutStream).pipe(process.stdout);
```

### 转换流 Transform
> 转换流本质仍然是双工流，它的输入和输出是存在相互关联的，中间做了一次转换处理，它只需要实现一个transform方法用于转换。

#### Transform 使用
```
const { Transform } = require('stream');

const upperCaseTr = new Transform({
  transform(chunk, encoding, callback) {
    this.push(chunk.toString().toUpperCase());
    callback();
  }
});

process.stdin.pipe(upperCaseTr).pipe(process.stdout);
```

### Object Mode 对象流
默认 Stream 处理的数据是 Buffer 或者 String类型。我们可以设置 objectMode 让流可以接受任何JavaScript对象。

#### Object Mode 模式的使用
```
const { Transform } = require('stream');
const commaSplitter = new Transform({
  readableObjectMode: true,
  transform(chunk, encoding, callback) {
    this.push(chunk.toString().trim().split(','));
    callback();
  }
});
const arrayToObject = new Transform({
  readableObjectMode: true,
  writableObjectMode: true,
  transform(chunk, encoding, callback) {
    const obj = {};
    for(let i=0; i < chunk.length; i+=2) {
      obj[chunk[i]] = chunk[i+1];
    }
    this.push(obj);
    callback();
  }
});
const objectToString = new Transform({
  writableObjectMode: true,
  transform(chunk, encoding, callback) {
    this.push(JSON.stringify(chunk) + '\n');
    callback();
  }
});
process.stdin
  .pipe(commaSplitter)
  .pipe(arrayToObject)
  .pipe(objectToString)
  .pipe(process.stdout)
```
+ 参考
  [Stream 文档](https://nodejs.org/dist/latest-v10.x/docs/api/stream.html)
  [官方背压](https://nodejs.org/zh-cn/docs/guides/backpressuring-in-streams/)
  [系统输入输出](https://wdxtub.com/2016/04/16/thin-csapp-6/)
  [参考1](https://medium.freecodecamp.org/node-js-streams-everything-you-need-to-know-c9141306be93)
  [参考2](https://www.barretlee.com/blog/2017/06/06/dive-to-nodejs-at-stream-module/)
  [参考3-1](https://segmentfault.com/a/1190000014148205)
  [参考3-2](https://segmentfault.com/a/1190000014402530)
