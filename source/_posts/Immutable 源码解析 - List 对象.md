---
title: Immutable 源码解析 - List 对象
date: 2019-05-09 21:58:08
tags:
---
## 什么是 Trie
![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_600_6001698854044384.png)
+ 查询每个条目的复杂度跟树中的元素个数无关
+ 查询复杂度只跟深度有关 O(deep)
+ 修改某个节点可以轻松记录查找的路径

## Immutable.List 的 Trie
+ Immutable.List 的 Trie 结构是一个 32 叉宽的结构
  ![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401698854045074.png)


## List 构建
```
// 示例代码，创建一个 1100 长度的 list
const Immutable = require('immutable')
let arr = [];
for (let i = 0; i < 1100; i++) {
  arr[i] = i;
}
const list = Immutable.List(arr)
debugger;
console.log(list)
```

## 创建空的 List 对象
![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401698854045734.png)
**只有在创建空 List 时才调用 makeList，这时的 list 才会有 ownerID 属性, lilst.ownerID 用于标识需要进行 VNode 对象引用比较，VNode 的 ownerID 用于判断引用 === ，在初始化空 list 时防止多次创建，list 创建完毕后会删除 list.ownerID，再次更新 list 时就必须返回新的 VNode 变为可变对象**
```
// 生成一个空的 List 对象
  var EMPTY_LIST;
  function emptyList() {
    return EMPTY_LIST || (EMPTY_LIST = makeList(0, 0, SHIFT));
  }

  function makeList(origin, capacity, level, root, tail, ownerID, hash) {
    var list = Object.create(ListPrototype);
    list.size = capacity - origin;
    list._origin = origin;
    list._capacity = capacity;
    list._level = level;
    list._root = root;
    list._tail = tail;
    list.__ownerID = ownerID; // 只在空 list 初始化时存在
    list.__hash = hash;
    list.__altered = false;
    return list;
  }
```

## 设置 List 的边界
### 根据传入数组的长度来决定如何构建树的深度和结构
![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401698854046399.png)

### setListBounds 根据 List 的 size 设置容量、_root、_tail 的信息
![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401698854047079.png)

### 描述 trie 树尺寸的常量
```
  // Constants describing the size of trie nodes.
  var SHIFT = 5; 
  var SIZE = 1 << SHIFT; // 32
  var MASK = SIZE - 1; // 31
```

### 创建 list 结构
```
function setListBounds(list, begin, end) {
  // ...

  var newCapacity = 
  var newLevel = list._level; // 初始 1 层结构是 5
  var newRoot = list._root;

  var oldTailOffset = getTailOffset(oldCapacity);
  var newTailOffset = getTailOffset(newCapacity); // 根据容量计算 _tail 的位置，offset 为 32 的倍数

  // New size might need creating a higher root. SHIFT = 5, 这里 1 <<< (5 + 5) = 1024, 也是 32 * 32 的倍数，此时一层最大就只有 1024 个，加一层结构
  while (newTailOffset >= 1 << (newLevel + SHIFT)) { // newTailOffset >= (1 << (newLevel + SHIFT))
    newRoot = new VNode(newRoot && newRoot.array.length ? [newRoot] : [], owner);
    newLevel += SHIFT; // 加一层结构
  }

    // Locate or create the new tail. // 创建 _tail
    var oldTail = list._tail;
    var newTail = newTailOffset < oldTailOffset ?
      listNodeFor(list, newCapacity - 1) :
      newTailOffset > oldTailOffset ? new VNode([], owner) : oldTail;

    // ...

    // 初始化 list 结构
    if (list.__ownerID) {
      list.size = newCapacity - newOrigin;
      list._origin = newOrigin;
      list._capacity = newCapacity;
      list._level = newLevel;
      list._root = newRoot;
      list._tail = newTail;
      list.__hash = undefined;
      list.__altered = true;
      return list;
    }
}
```

### 最后得到的 list 结构
![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401698854047738.png)

### getTailOffset 找到 tail 的起始位置
如果 size 小于 32 就是从 0 开始，size - 1 向左移 5 位再向右移 5 位，会得到一个小于 size 中倍数 32 的最大数。size = 1100, 得出 1088, 得出的数就是 tail 开始的位置
```
  var SHIFT = 5; 
  var SIZE = 1 << SHIFT; // 32

  function getTailOffset(size) {
    return size < SIZE ? 0 : (((size - 1) >>> SHIFT) << SHIFT);
  }
```

构建 _root，根据 size 决定 trie 的深度，1 << (newLevel + SHIFT)，第一次 1 << 10 = 1024， 也就是 32 * 32 一层的数量，size 超过一层的空间 SHIFT + 5，增加一层深度
```
    // 初始 SHIFT = 5, 这里 1 <<< (5 + 5) = 1024, 也是 32 * 32 的倍数，此时一层最大就只有 1024 个，加一层结构
    while (newTailOffset >= 1 << (newLevel + SHIFT)) { // newTailOffset >= (1 << (newLevel + SHIFT))
      newRoot = new VNode(newRoot && newRoot.array.length ? [newRoot] : [], owner);
      newLevel += SHIFT; // 加一层q结构
    }
```

## List.set

### withMutations
List.set 在 withMutations 回调中可以暂时使用可变对象的操作方式，执行 updateList 方法进行赋值
![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401698854048322.png)
![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401698854048907.png)

withMutaions 在回调给 fn 传了一个可以进行可变操作的 list，操作完后返回新对象
```
export function withMutations(fn) {
  const mutable = this.asMutable();
  fn(mutable);
  return mutable.wasAltered() ? mutable.__ensureOwner(this.__ownerID) : this;
}
```

### updateList 更新 list
```
  function updateList(list, index, value) {
    index = wrapIndex(list, index); // 确定好 index 

    if (index !== index) {
      return list;
    }

    if (index >= list.size || index < 0) {
      return list.withMutations(function(list ) {
        index < 0 ?
          setListBounds(list, index).set(0, value) : // 小于 0 头部加一个
          setListBounds(list, 0, index + 1).set(index, value) 
      });
    }

    index += list._origin; // 找到在 list 上的位置

    var newTail = list._tail;
    var newRoot = list._root;
    var didAlter = MakeRef(DID_ALTER);
    // 更新的 index, 在 _tail 还是 _root 中, 分别更新
    if (index >= getTailOffset(list._capacity)) { // index 在 _tail 中 更新 _tail
      newTail = updateVNode(newTail, list.__ownerID, 0, index, value, didAlter); // 在范围外的的用 tail 结构
    } else { // index 在 _root 中
      newRoot = updateVNode(newRoot, list.__ownerID, list._level, index, value, didAlter); // 在范围内的 root 结构
    }

    if (!didAlter.value) {
      return list;
    }
    // 初始化的时候有 ownerID 防止多次创建，创建完了后就设置为 undefined
    if (list.__ownerID) {
      list._root = newRoot;
      list._tail = newTail;
      list.__hash = undefined;
      list.__altered = true;
      return list;
    }
    return makeList(list._origin, list._capacity, list._level, newRoot, newTail);
  }
```
这里看下 List 结构的更新，root 为 trie 结构上，更新时传入树深度的 level，而更新 tail 这种扁平化数组结构不需要深度 level
```
    // 更新的 index, 在 _tail 还是 _root 中, 分别更新
    if (index >= getTailOffset(list._capacity)) { // index 在 _tail 中 更新 _tail
      newTail = updateVNode(newTail, list.__ownerID, 0, index, value, didAlter); // 在范围外的的用 tail 结构
    } else { // index 在 _root 中
      newRoot = updateVNode(newRoot, list.__ownerID, list._level, index, value, didAlter); // 在范围内的 root 结构
    }
```

## updateNode
updateVNode 分两段逻辑，一段是更新 root 的 trie 树，一段是更新扁平化 VNode 数组逻辑比如 tail 结构或者是 root trie 树的最后一层。

### updateNode 更新扁平化结构
通过换位找到 index 在当前层级数组上的 idx 后， tail 这种扁平化的 VNode 会通过 editableVNode 拷贝一个新的 newNode 用来更新，返回的也是这个 newNode 新的 VNode，替换掉原来的 tail 或者 root 的最下层 VNode![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401698854049566.png)

### updateNode 更新 trie 树结构
通过换位运算来找到 index 在当前层级下的 idx 索引,  当 level > 0 时表示此时的 VNode 不是最下层，通过递归 updateVNode 找到最下一层进行操作![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401698854050229.png)

### editableVNode
![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401698854050883.png)

###  换位运算
```
// 十进制 index = 1000, level = 10, MASK = 31
// 二进制 MASK 011111
var idx = (index >>> level) & MASK
```
第一轮位运算, 得到 index 的位置在 trie 上第一层 VNode.array 的序号
```
// 十进制 1000, 二进制 11111 01000 向右移 10 位得到 0, 再 & MASK 还是 0 
// 十进制 1088, 二进制 1 00010 00000 向右移 10 位得到 1, 再 & MASK 是 1
```
第二轮位运算，level - 5 = 5 得到 index 在下一层 VNode.array 的序号
```
// 递归 level - 5 = 5
// 十进制 1000, 二进制 11111 01000 向右移 10 位得到 11111, 再 & MASK 还是 7
// 十进制 1088, 二进制 1 00010 00000 向右移 10 位得到 100010 , 再 & MASK 是 10 
```
此时 level - 5 = 0 不会进入 if (level > 0) 的递归操作中，代表已经找到了 root 中 trie 的最下一层，index 的位置，进入操作扁平化数组的逻辑中，不断返回到上一层进行路径的回溯创建一直到 root 上返回新的 root。

## List.get
根据 index 找到扁平化内容的 VNode，index & MASK 结果是 0 - 31 得到序号从 VNode.array 中找到 value![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401698854051543.png)

### listNode
先确认是不是在 tail 上，在 root 上就 level - 5 进行循环找到最后一层 VNode![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401698854052224.png)

## 参考
+ [https://cdn.oreillystatic.com/en/assets/1/event/259/Immutable%20data%20structures%20for%20functional%20JavaScript%20Presentation.pdf](https://cdn.oreillystatic.com/en/assets/1/event/259/Immutable%20data%20structures%20for%20functional%20JavaScript%20Presentation.pdf)

+ [https://segmentfault.com/a/1190000017130003?utm_medium=hao.caibaojian.com&utm_source=hao.caibaojian.com&share_user=1030000000178452#articleHeader2](https://segmentfault.com/a/1190000017130003?utm_medium=hao.caibaojian.com&utm_source=hao.caibaojian.com&share_user=1030000000178452#articleHeader2)

+ [https://www.zcfy.cc/article/immutable-js-persistent-data-structures-and-structural-sharing-4292.html](https://www.zcfy.cc/article/immutable-js-persistent-data-structures-and-structural-sharing-4292.html)

+ [https://juejin.im/post/5b9b30a35188255c6418e67c#heading-1](https://juejin.im/post/5b9b30a35188255c6418e67c#heading-1)

+ [https://io-meter.com/2016/09/03/Functional-Go-persist-datastructure-intro/](https://io-meter.com/2016/09/03/Functional-Go-persist-datastructure-intro/)
