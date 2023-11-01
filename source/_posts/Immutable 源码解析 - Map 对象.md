---
title: Immutable 源码解析 - Map 对象
date: 2019-05-13 20:41:02
tags:
---
## Trie 树高的压缩
Trie  压缩是基于标准的 Trie, 通过把某个节点至最终找到结果节点的 path 路径连接起来。使得原来 Trie 的空间复杂度 O(树的高度) （树的高度由字符串的总个数决定) 降低为 O(树的单词数) 由 Trie 中形成单词的个数决定，比如 100个 字符串形成 40个结果，O(100) > O(40)，最终体现在 Trie 树高的压缩上

+ 标准 Trie![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401698854032733.png)


+ 压缩后的 Trie![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401698854033478.png)


## Map 构建
```
const Immutable = require('immutable')
var n = 65
var obj = {}
for (let i = n; i < (n + 64); i++) {
  obj[String.fromCharCode(i).repeat((Math.random()+1)*10|0)] = i;
}
debugger
let map = Immutable.Map(obj);
debugger
console.log(map);
```
Map 存的都是 [key, value] 的 entry， key 都是字符串，Immutable 使用 hash 算法把每个 key 都转化成一串唯一的数字
```
 function hash(o: string): number { }
```


## Map 的创建
```
    function Map(value) {
      return value === null || value === undefined ? emptyMap() :
        isMap(value) && !isOrdered(value) ? value :
        emptyMap().withMutations(function(map ) {
          var iter = KeyedIterable(value);
          assertNotInfinite(iter.size);
          iter.forEach(function(v, k)  {
            return map.set(k, v)
          });
        });
    }
```

### 生成 Map 空对象
Map 对象只有 _root 结构, 同样也是在 makeMap 创建空对象时才有 ownerID
```
  var EMPTY_MAP;
  function emptyMap() {
    return EMPTY_MAP || (EMPTY_MAP = makeMap(0));
  }

  function makeMap(size, root, ownerID, hash) {
    var map = Object.create(MapPrototype);
    map.size = size;
    map._root = root;
    map.__ownerID = ownerID;
    map.__hash = hash;
    map.__altered = false;
    return map;
  }
```

## ArrayMapNode size 小于等于 8 生成
对象元素 size 小于等于 8 时
```
    Map.prototype.set = function(k, v) {
      return updateMap(this, k, v);
    };
```

### udpateMap
![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401698854034154.png)

### new ArrayMapNode
ArrayMapNode 结构简单，this.entries 数组只有 8 个 key value 元素
```
    function ArrayMapNode(ownerID, entries) {
      this.ownerID = ownerID;
      this.entries = entries;
    }
```

### updateNode
updateNode 方法就是执行 当前 map._root 结构的 prototype.update 方法![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401698854034813.png)

### ArrayMapNode.prototype.update
+ 通过遍历 entries  来判断是否存在当前设置的 key value 值
+ 通过判断 size 是否大于等于 8 来决定是否需要改变结构![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401698854035497.png)
+ ArrayMapNode 的操作就是简单的数组结构索引操作![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401698854036172.png)

## BitmapIndexedNode
+ 当 key value 的 entry 的 8 <= size < 16 时使用这个结构。
+ 节点只有 ValueNode 或 BitmapIndexedNode

### createNodes 生成 BitmapIndexedNode
把新设置的值生成一个 ValueNode，遍历map._root ，把 ArrayMapNode 上的 entry  更新到这个 ValueNode 上，同时 ValueNode 在更新时变为 BitmapIndexedNode
```
  function createNodes(ownerID, entries, key, value) {
    if (!ownerID) {
      ownerID = new OwnerID();
    }
    var node = new ValueNode(ownerID, hash(key), [key, value]);
    for (var ii = 0; ii < entries.length; ii++) {
      var entry = entries[ii]; // ArrayMapNode 原 8 个 ValueNode 元素都需要更新
      node = node.update(ownerID, 0, undefined, entry[0], entry[1]);
    }
    return node;
  }
```

### ArrayMapNode 改变为 BitmapIndexedNode 的更新
+ 遍历 _root.entries 与新的 node 进行合并，第一次合并时 node 是 ValueNode![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401698854036831.png)
+ ValueNode.prototype.update 也只在改变结构为 Bitmap 时才调用, 进入 mergeIntoNode![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401698854037488.png)
+ 构建确定这些 entry 所在 Trire 上的序号，通过 + SHIFT = 5 来模拟新的一层结构,  其实这里 map 并没有像 list 一样增加一层结构，而是通过 SHIFT 来调整位置或与其他 ValueNode 或 Bitmap 节点进行合并压缩![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401698854038152.png)
+ 这里的 this.bitmap 是首次创建 Biamap 对象时传入的 (1<< idx1) | (1 << idx2)![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401698854038817.png)


### BitmapIndexedNode 的更新
![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401698854039502.png)
+ 直接进入 BitmapIndexedNode.prototype.update![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401698854040170.png)
+ 最后更新当前 Bitmap 的 entries 返回新的 Bitmap 对象![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401698854040850.png)

### popCount
+ popCount 的作用是计算二进制数中 1 数量, Bitmap 通过这个方法计算出数组的下标, 也就是 key 在 Bitmap 中的位置,
+ bitmap & (bit - 1) 即 010101110111010000111011100010100 & 1111111111111 = 1011100010100
+ 计算出有 6 个 1，idx 就是 6
```
function popCount(x) {
  x -= (x >> 1) & 0x55555555;
  x = (x & 0x33333333) + ((x >> 2) & 0x33333333);
  x = (x + (x >> 4)) & 0x0f0f0f0f;
  x += x >> 8;
  x += x >> 16;
  return x & 0x7f;
}
```

## HashArrayMapNode
+ 当 key value 的 entry 的 size >= 16 时使用这个结构
+ 由 HashArrayMapNode 、BitmapIndexedNode 、ValueNode 三种结构组成
+ HashArrayMapNode 最多存 32个元素，结合  HashArrayMapNode 、BitmapIndexedNode 、ValueNode  三种结构可以存储非常多的数据

### expandNodes 生成 HashArrayMapNode 结构
```
      if (!exists && newNode && nodes.length >= MAX_BITMAP_INDEXED_SIZE) {
        return expandNodes(ownerID, nodes, bitmap, keyHashFrag, newNode);
      }
```
![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401698854041531.png)

### HashArrayMapNode.prototype.update
+ HashArrayMapNode 已经是一个跟 List 差不多的 32 位长度的 Trie 树结构
+ Trie 在 32 位一层中的更新已经不需要压缩算法，直接 + SHIFT 进入下一层的结构中
+ 而下一层结构中有可能是 BitmapIndexedNode, ValueNode，仍然可能出现压缩算法的结构创建
  ![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401698854042218.png)

### 参考
[https://segmentfault.com/a/1190000017130413#articleHeader3](https://segmentfault.com/a/1190000017130413#articleHeader3)

[https://juejin.im/post/5ba4a6b75188255ca1537b19](https://juejin.im/post/5ba4a6b75188255ca1537b19)

[https://cdn.oreillystatic.com/en/assets/1/event/259/Immutable%20data%20structures%20for%20functional%20JavaScript%20Presentation.pdf](https://cdn.oreillystatic.com/en/assets/1/event/259/Immutable%20data%20structures%20for%20functional%20JavaScript%20Presentation.pdf)

[https://www.zcfy.cc/article/immutable-js-persistent-data-structures-and-structural-sharing-4292.html](https://www.zcfy.cc/article/immutable-js-persistent-data-structures-and-structural-sharing-4292.html)
