---
title: 学习并实现react3
date: 2018-03-15 22:36:00
tags: React
categories: React
---
### 复用组件
#####  React 组件书写规则
> + 组件可以直接渲染组件
> + 组件渲染多个children 时需要用 dom 元素进行包裹

```
class Parent extends Component {
  render() {
    return <Child />
  }
}

class Child extends Component {
  render() {
    return (
      <div>
        <SubChild />
        <SubChild />
        <SubChild />
      </div>
    )
  }
}

class SubChild extends Component {
  render() {
    return (
      <div>
       <span>SubChild</span>
      </div>
    )
  }
}
```
##### 组件复用策略
> + 每个组件渲染时都增加 `__rendered` 确定渲染元素的标记
> + 对于渲染多个组件(`children`)时 `children` 为数组，`__rendered` 标记每个`children` 元素
> + `__rendered` 标记组件或dom

**组件渲染树绝对不会出现下列情况**![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_310_3101694537015244.png)

**渲染多个组件(children)时 必须用 dom 元素包裹**![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_310_3101694537015910.png)

**最后正确渲染后的Tree**![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401694537016558.png)

#### 改造render
> + 为了复用组件 render 第四个参数由 olddom 改为 olddomOrComp 

```
function render(vnode, parent, comp, olddomOrComp) {
  let dom
  if (typeof vnode === 'string' || typeof vnode === 'number') { // 文本节点直接渲染
    if (olddomOrComp && olddomOrComp.nodeType === 3) { // 是一个文本节点
      if (olddomOrComp.nodeValue !== vnode) olddomOrComp.nodeValue = vnode
    } else {
      dom = document.createTextNode(vnode)

      if (olddomOrComp) parent.replaceChild(dom, olddomOrComp)
      else parent.appendChild(dom)
    }
  }

  if (typeof vnode.type === 'string') { // dom 节点
    if (!olddomOrComp || olddomOrComp.nodeName !== vnode.type.toUpperCase()) {
      createNewDom(vnode, parent, comp, olddomOrComp)
    } else {
      diffDOM(vnode, olddomOrComp)
    }
  }

  if (typeof vnode.type === 'function') {
    let func = vnode.type
    let inst = new func(vnode.props)

    comp && (comp.__rendered = inst)

    let innerVNode = inst.render()
    render(innerVNode, parent, inst, inst.__rendered) // 比较是否复用组件
  }
}
```
> + 修改前olddom 参数可以判断是否复用，也可以判断replace(newdom, olddom) 的替换位置
> + 当`<Parent /> __rendered = <Child1 />` -- setState变成 -- `<Parent /> __rendered = <Child2 />`, 而`<Child2 />` 这个组件实例的`inst.__rendered` 应该是 `undefined`
> + 原逻辑中 olddom  不存在时进行 `appendChild` 存在则进行`replacechild`
> + 现在olddomOrComp 在替换组件时为 `undefined` 只会操作`appendChild`
> + 为 render 函数增加第五个参数 myIndex 标识 dom 的位置

```
function setNewDom(parent, newDom, myIndex) {
    const old =  parent.childNodes[myIndex]
    if (old) {
        parent.replaceChild(newDom, old)
    } else {
        parent.appendChild(newDom)
    }
}
```
```
function render(vnode, parent, comp, olddomOrComp, myIndex) {
  let dom
  if (typeof vnode === 'string' || typeof vnode === 'number') { // 文本节点直接渲染
    if (olddomOrComp && olddomOrComp.nodeType === 3) { // 是一个文本节点
      if (olddomOrComp.nodeValue !== vnode) olddomOrComp.nodeValue = vnode
    } else {
      dom = document.createTextNode(vnode)

      setNewDom(parent, dom, myIndex) //
    }
  }

  if (typeof vnode.type === 'string') { // dom 节点
    if (!olddomOrComp || olddomOrComp.nodeName !== vnode.type.toUpperCase()) {
      createNewDom(vnode, parent, comp, olddomOrComp, myIndex)
    } else {
      diffDOM(vnode, parent, comp, olddomOrComp, myIndex)
    }
  }

  if (typeof vnode.type === 'function') {
    let func = vnode.type
    let inst = new func(vnode.props)

    comp && (comp.__rendered = inst)

    let innerVNode = inst.render()
    render(innerVNode, parent, inst, inst.__rendered, myIndex)
  }
}
```
```
function createNewDom(vnode, parent, comp, olddomOrComp, myIndex) {
    ...
    setAttrs(dom, vnode.props)

    setNewDom(parent, dom, myIndex) // 创建时根据myIndex 决定是append / replace

    for(let i = 0; i < vnode.children.length; i++) {
        render(vnode.children[i], dom, null, null, i)  // myIndex 其实就是 children 的 i
    }
}
function diffDOM(vnode, parent, comp, olddom) {
    ...
  const willRemoveArr = olddom.__rendered.slice(vnode.children.length) // 将要删除的 dom
  const renderedArr = olddom.__rendered.slice(0, vnode.children.length)

  olddom.__rendered = renderedArr
  for(let i = 0; i < vnode.children.length; i++) {
      render(vnode.children[i], olddom, null, renderedArr[i], i)  // 同样要增加 children 的 i
  }
    ...
}
```
#### 实现 __rendered 链
```
// __rendered 链场景
class Child extends Component {
  render() {
    return (
      <div> // 此处dom，__rendered 在这里应该为数组
        <SubChild 1/>
        <SubChild 2/>
        <SubChild 3/>
      </div>
    )
  }
}
```
> + 现在 __rendered 标识组件实例后再标识到 dom 节点就结束了。
> + 现在需要实现 div.__rendered 关联 SubChild 组件

![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401694537017227.png)
> + 确定__rendered 链的思想，当渲染的是dom 元素时(组件被根dom包裹), __rendered 为数组

```
function render(vnode, parent, comp, olddomOrComp, myIndex) {
  let dom
  if (typeof vnode === 'string' || typeof vnode === 'number') { // 文本节点直接渲染
    if (olddomOrComp && olddomOrComp.nodeType === 3) { // 是一个文本节点
      if (olddomOrComp.nodeValue !== vnode) olddomOrComp.nodeValue = vnode
    } else {
      dom = document.createTextNode(vnode)
      parent.__rendered[myIndex] = dom // comp 为 null 组件实例不会渲染文本节点

      setNewDom(parent, dom, myIndex)
    }
  }

  if (typeof vnode.type === 'string') { // dom 节点
    if (!olddomOrComp || olddomOrComp.nodeName !== vnode.type.toUpperCase()) {
      createNewDom(vnode, parent, comp, olddomOrComp, myIndex)
    } else {
      diffDOM(vnode, parent, comp, olddomOrComp)
    }
  }

  if (typeof vnode.type === 'function') {
    let func = vnode.type
    let inst
    if (olddomOrComp && olddomOrComp instanceof func) {
      inst = olddomOrComp
      inst.props = vnode.props
    } else {
      inst = new func(vnode.props)

      if (comp) comp.__rendered = inst
      else parent.__rendered[myIndex] = inst // dom 渲染
    }

    let innerVNode = inst.render()
    render(innerVNode, parent, inst, inst.__rendered, myIndex)
  }
}
```
```
function setNewDom(parent, newDom, myIndex) {
  const old = parent.childNodes[myIndex]
  if (old) parent.replaceChild(newDom, old)
  else parent.appendChild(newDom)
}

function createNewDom(vnode, parent, comp, olddomOrComp, myIndex) {
  let dom = document.createElement(vnode.type)

  dom.__rendered = [] // 创建dom 时 初始的 __rendered 未数组
  dom.__vnode = vnode

  if (comp) comp.__rendered = dom
  else parent.__rendered[myIndex] = dom

  setAttrs(dom, vnode.props)

  setNewDom(parent, dom, myIndex)

  for (let i = 0; i < vnode.children.length; i++) {
    render(vnode.children[i], dom, null, null, i) // 标记位置
  }
}
```
```
function diffDOM(vnode, parent, comp, olddom) {
  const { onlyInLeft, onlyInRight, bothIn } = diffObject(vnode.props, olddom.__vnode.props)
  setAttrs(olddom, onlyInLeft) // 添加新属性
  removeAttrs(olddom, onlyInRight) // 删除旧属性
  diffAttrs(olddom, bothIn) // 比较且更新新旧属性的不同

  // 比较__rendered 和children 删除多余的
  const willRemoveArr = olddom.__rendered.slice(vnode.children.length)
  const renderedArr = olddom.__rendered.slice(0, vnode.children.length)

  olddom.__rendered = renderedArr
  for (let i = 0; i < vnode.children.length; i++) {
    // 顺序固定，有缺点，原来是replaceChild，现在对dom 或 text 节点进行重新render
    _render(vnode.children[i], olddom, null, renderedArr[i], i)
  }

  willRemoveArr.forEach(el => olddom.removeChild(getDOM(el)))

  olddom.__vnode = vnode // 不忘重新标记
}
```
```
class Component {
  constructor(props) {
    this.props = props
  }

  setState(state) {
    setTimeout(() => {
      this.state = state
      const vnode = this.render()
      let olddom = getDOM(this) // 获取渲染此实例的 olddom
      const myIndex = getDOMIndex(olddom)
      const startTime = new Date().getTime()
      render(vnode, olddom.parentNode, this.__rendered, myIndex) // 传入此组件渲染的内容
      console.log("duration for setState:", new Date().getTime() - startTime)
    }, 0)
  }
}

function getDOMIndex(dom) {
  const nodes = dom.parentNode.childNodes
  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i] === dom) return i
  }
}
```
> 最后再看下这张图，setState 后也会尝试复用组件，完善 __rendered 链

![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401694537017849.png)
