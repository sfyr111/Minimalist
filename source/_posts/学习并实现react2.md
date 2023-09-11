---
title: 学习并实现react2
date: 2018-03-13 21:09:05
tags: React
categories: React
---
### 组件列表渲染场景
```
// app.js
class App extends Component {
  constructor(props) {
    super(props)
    this.state = {
      number: 10000
    }
  }

  render() {
    const list = new Array(this.state.number).fill('item')
    return (
      <div
        width={100}>
        <button onClick={e => {
          this.setState({
            number: this.state.number
          })
        }}>click me</button>
        {list.map((item, index) => <div key={item + index} style={listStyle}>{`${item}:${index}`}</div>)}
      </div>
    )
  }
}
const startTime = new Date().getTime()
render(<App />, document.getElementById('app'))
console.log("duration for render:", new Date().getTime() - startTime)
```
```
// component.js
  setState(state) {
    setTimeout(() => {
      this.state = state
      const vnode = this.render()
      let olddom = getDOM(this) // 获取渲染此实例的 olddom
      const startTime = new Date().getTime()
      render(vnode, olddom.parentNode, this, olddom)
      console.log("duration for setState:", new Date().getTime() - startTime)
    }, 0)
  }
```
在这里组件首次渲染(render)和更新状态(setState)后都将渲染10000 条列表, 用时平局150ms![](https://upload-images.jianshu.io/upload_images/2155778-364680721a893e65.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

### DOM复用
> react 的重点在于首次渲染和更新渲染，现在考虑更新渲染如何复用DOM 让渲染更有效率.

#### 分析更新前后的 vnode 结构
```
const beforeVnode = {
  tagName: 'div',
  props: {
        width: '20px',
        className: 'before'
  },
  chilren: [child1, child2]
}

const afterVnode1 = {
    tagName: 'div',
    props: {
        width: '30px',
        className: 'after1'
    },
    children:[child1, child2, child3]
}

const afterVnode2 = {
    tagName: 'span',
    props: {
        width: '20px',
        className: 'after2'
    },
    children:[child1, child2]
}
```
>beforeVnode vs afterVnode1: **tagName 仍然是 div ，只改变了props 和children**
beforeVnode vs afterVnode2: **tagName 由 div -> span** 

>更新原则: 
>1. dom 节点不变则更新 props 属性，复用 children
>2. dom 节点改变则创建新节点
 
#### 更改 render 函数
> render 函数复用 DOM 的情况只存在于文本节点及 DOM 节点

> + 更改前文本节点与 DOM 节点在首次渲染及更新都是 create 或 replace 一个新的节点

```
// code1/render.js
function render(vnode, parent, comp, olddom) {
  let dom
  if (typeof vnode === 'string') { // 文本节点直接渲染
    dom = document.createTextNode(vnode)
    comp && (comp.__rendered = dom)

    if (olddom) parent.replaceChild(dom, olddom)
    else parent.appendChild(dom)
  }

  if (typeof vnode.type === 'string') { // dom 节点
    dom = document.createElement(vnode.type)

    comp && (comp.__rendered = dom)
    setAttrs(dom, vnode.props) // props 已经被createElement 解析成对象

    if (olddom) parent.replaceChild(dom, olddom)
    else parent.appendChild(dom)

    for(let i = 0; i < vnode.children.length; i++) {
      render(vnode.children[i], dom, null, null) // 递归 render children
    }
  }
  ...
}
```

> + 文本节点我们增加了一个对olddom value 的比较
> + 标签节点的渲染逻辑分为首次渲染的 createNewDom 和更新的 diffDOM

```
// code2/render.js
function render(vnode, parent, comp, olddom) {
  let dom
  if (typeof vnode === 'string' || typeof vnode === 'number') { // 文本节点直接渲染
    if (olddom && olddom.nodeType === 3) { // 是一个文本节点
      if (olddom.nodeValue !== vnode) olddom.nodeValue = vnode
    } else {
      dom = document.createTextNode(vnode)

      if (olddom) parent.replaceChild(dom, olddom)
      else parent.appendChild(dom)
    }
  }

  if (typeof vnode.type === 'string') { // dom 节点
    if (!olddom || olddom.nodeName !== vnode.type.toUpperCase()) {
      createNewDom(vnode, parent, comp, olddom)
    } else {
      diffDOM(vnode, parent, comp, olddom)
    }
  }
  ...
}
```
#### createNewDom
> 抽离 DOM 节点首次渲染方法，首次渲染为每个节点添加 vnode 标记。

```
function createNewDom(vnode, parent, comp) {
  let dom = document.createElement(vnode.type)

  dom.__vnode = vnode // 为 DOM 节点对象增加 vnode 标记，diffDOM 时会用到
  comp && (comp.__rendered = dom)
  setAttrs(dom, vnode.props)

  parent.appendChild(dom)

  for (let i = 0; i < vnode.children.length; i++) {
    render(vnode.children[i], dom, null, null)
  }
}
```

#### diffDOM 设计思路
> + diffObject 比较新旧vnode 的属性
> + 然后通过新旧vnode 的差异更改 olddom 的属性
> + 比较新children 与olddom 的子节点进行递归渲染
> + 最后记得删除 olddom

```
/**
 *
 * @param vnode {object} 即将更新的vnode
 * @param olddom {HTMLElement}
 *          __vnode (object) 渲染olddom 的vnode 标记
 */
function diffDOM(vnode, olddom) {
  const { onlyInLeft, onlyInRight, bothIn } = diffObject(vnode.props, olddom.__vnode.props)
  setAttrs(olddom, onlyInLeft) // 添加新属性
  removeAttrs(olddom, onlyInRight) // 删除旧属性
  diffAttrs(olddom, bothIn) // 比较且更新新旧属性的不同

  let olddomChild = olddom.firstChild
  for (let i = 0; i < vnode.children.length; i++) {
    // 顺序固定，有缺点，原来是replaceChild，现在对dom 或 text 节点进行重新render
    render(vnode.children[i], olddom, null, olddomChild)
    olddomChild = olddomChild && olddomChild.nextSibling
  }

  while (olddomChild) { // 递归后删除所有 olddom
    let next = olddomChild.nextSibling
    olddom.removeChild(olddomChild)
    olddomChild = next
  }

  olddom.__vnode = vnode
}
```
```
/**
 *
 * @param leftProps {object} newProps
 * @param rightProps {object} oldProps
 */
function diffObject(leftProps, rightProps) {
  const onlyInLeft = {}, // 只存在于left
        onlyInRight = {}, // 只存在于right
        bothLeft = {}, // 两者都有
        bothRight = {} // 两者都有

  for (let key in leftProps) {
    if (!rightProps[key]) {
      onlyInLeft[key] = leftProps[key]
    } else {
      bothLeft[key] = leftProps[key]
      bothRight[key] = rightProps[key]
    }
  }

  for (let key in rightProps) {
    if (!leftProps[key]) {
      onlyInRight[key] = rightProps[key]
    }
  }

  return {
    onlyInRight,
    onlyInLeft,
    bothIn: {
      left: bothLeft,
      right: bothRight
    }
  }
}
```
```
function setAttrs(dom, props) {
  Object.keys(props).forEach(k => {
    const v = props[k]

    if (k === 'className') {
      dom.setAttribute('class', v)
      return
    }

    if (k === 'style') {
      if (typeof v === 'string') dom.style.cssText = v
      if (typeof v === 'object') {
        for (let i in v) {
          dom.style[i] = v[i]
        }
      }
      return
    }

    if (k[0] === 'o' && k[1] === 'n') { // onClick of onClickCapture
      const capture = k.indexOf('Capture') !== -1
      dom.addEventListener(k.replace('Capture', '').substring(2).toLowerCase(), v, capture)
      return
    }

    dom.setAttribute(k, v)
  })
}
```
```
function removeAttrs(dom, props) {
  Object.keys(props).forEach(k => {
    const v = props[k]

    if (k === 'className') {
      dom.removeAttribute('class', v)
      return
    }

    if (k === 'style') {
      dom.style.cssText = ''
      return
    }

    if (k[0] === 'o' && k[1] === 'n') { // onClick of onClickCapture
      const capture = k.indexOf('Capture') !== -1
      dom.removeEventListener(k.replace('Capture', '').substring(2).toLowerCase(), v, capture)
      return
    }

    dom.removeAttribute(k)
  })
}
```
```
function diffAttrs(dom, { left: newProps, right: oldProps }) {
  Object.keys(newProps).forEach(k => {
    let nv = newProps[k] // newValue
    let ov = oldProps[k] // oldValue
    if (nv === ov) return

    if (k === 'className') {
      dom.setAttribute('class', nv)
      return
    }

    if (k === 'style') {
      if (typeof nv === 'string') {
        dom.style.cssText = nv
      } else if (typeof nv === 'object' && typeof ov === 'object') {
        Object.keys(nv).forEach(nk => {
          if (nv[nk] !== ov[nk]) dom.style[nk] = nv[nk]
        })
        Object.keys(ov).forEach(ok => {
          if (!nv[ok]) dom.style[ok] = ''
        })
      } else if (typeof nv === 'object' && typeof ov === 'string') {
        dom.style = {}
        Object.keys(nv).forEach(nk => dom.style[nk] = nv[nk])
      }
      return
    }

    if (k[0] === 'o' && k[1] === 'n') {
      const capture = k.indexOf('Capture') !== -1
      const eventKey = k.replace('Capture', '').substring(2).toLowerCase()
      dom.removeEventListener(eventKey, ov, capture)
      dom.addEventListener(eventKey, nv, capture)
      return
    }

    dom.setAttribute(k, nv)
  })
}
```
![](https://upload-images.jianshu.io/upload_images/2155778-ae9c0b16acdbf251.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)
通过diffDOM 实现了复用 DOM 节点，更新渲染的速度更快。
不过这里没实现react 的key 值比较，children 的属性依赖 olddom 的顺序。
