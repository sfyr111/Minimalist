---
title: 学习并实现react1
date: 2018-03-09 18:37:23
tags: React
categories: React
---
### 搭建学习环境
```
npm install -g parcel-bundler
```
package.json
```
{
  "name": "myReact",
  "version": "1.0.0",
  "description": "",
  "main": "index.js",
  "scripts": {
    "start": "parcel index.html",
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "dependencies": {
    "babel-preset-env": "^1.6.1",
    "babel-preset-es2015": "^6.24.1",
    "parcel-bundler": "^1.6.2"
  },
  "devDependencies": {
    "babel-plugin-transform-react-jsx": "^6.24.1"
  }
}
```
### 支持 JSX 
在 js 文件中我们是不能写 jsx 语法的，必须使用一种 babel 插件 transform-react-jsx 才能使用。
新建.babelrc
```
{
  "presets": ["env"],
  "plugins": [
    ["transform-react-jsx", {
      "pragma": "createElement"
    }]
  ]
}
```
这样我们在写React 组件时 babel 会帮我们自动编译成![](http://upload-images.jianshu.io/upload_images/2155778-b80405e1ab2aa020.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/620)

### 实现一个 createElement
.babelrc 文件中使用了`transform-react-jsx` 插件，告诉babel 解析 jsx 需要 `createElement`方法，也就是 babel 编译后的`React.createElement`![](http://upload-images.jianshu.io/upload_images/2155778-b80405e1ab2aa020.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/620)

createElement 有三个参数
```
function createElement(type, props, ...args) {
    props = props || {}
    let children = []
    for (let i = 0; i < args.length; i++) {
        if (Array.isArray(args[i])) {
          children = [ ...children, ...args[i] ]
        } else {
          children = [ ...children, args[i] ]
        }
    }

  return { type, props, children }
}
```
然后我们来试验下createElement 结果
```
import { createElement } from './src/react'

const React = {}
React.createElement = createElement
React.Component = class Component {}

class App extends React.Component {
  render() {
    return (
      <div>
        <span>App</span>
        <span>component</span>
      </div>
    )
  }
}

const app = new App().render()
console.log(app)
```
![](http://upload-images.jianshu.io/upload_images/2155778-8da00c5e8402a857.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/620)

`new App().render()` 这种格式跟 react 组件区别有些大，再实现一个`renderVDOM(<App />)` 的格式
```
function reactVDOM(vnode) {
    if (typeof vnode === 'string') return vnode // 文本节点
    if (typeof vnode.type === 'string') { // type 为标签名 - dom节点
        let ret = {
            type: ret.type,
            props: ret.props,
            children: []
        }
        for (let i = 0; i < vnode.children.length; i++) {
            ret.children.push(reactVDOM(vnode.children[i])) // 递归children
        }
        return ret 
    } 
    if (typeof vnode.type === 'function') { // type 为 class 组件
        let func = vnode.type
        let inst = new func(vnode.props) // 把 props 传入
        let innerVNODE = inst.render()
        return reactVDOM(innerVNODE) // 递归渲染后的组件
    }
}
```
```
import { createElement } from './src/react'
import { renderVDOM } from './src/renderVDOM'

const React = {}
React.createElement = createElement
React.Component = class Component {}

class App extends React.Component {
  render() {
    return (
      <div>
        <span>App</span>
        <span>component</span>
      </div>
    )
  }
}

const app = renderVDOM(<App />)
console.log(app) // 与 new App().render() 一样
```
父子组件
```
class ChildrenChild extends React.Component {
  render() {
    return (
      <div>
        children-child
      </div>
    )
  }
}

class Children extends React.Component {
  render() {
    return (
      <div>
        children
        <ChildrenChild />
      </div>
    )
  }
}

class App extends React.Component {
  render() {
    return (
      <div>
        <span>App</span>
        <span>component</span>
        <Children />
      </div>
    )
  }
}

const app = renderVDOM(<App />)
```
![](http://upload-images.jianshu.io/upload_images/2155778-2ec534f0b7128657.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/620)
结果中组件的文本内容、dom、组件实例都在children 数组里，React.render 时只需要识别这些children 就可以做到真实渲染

### 实现 render 
改写 renderVDMO 加入真实 dom 操作
```

function render(vnode, parent) {
  let dom
  if (typeof vnode === 'string') { // 文本节点直接渲染
    dom = document.createTextNode(vnode)
    parent.appendChild(dom)
  }
  
  if (typeof vnode.type === 'string') { // dom 节点
    dom = document.createElement(vnode.type)
    setAttrs(dom, vnode.props) // props 已经被createElement 解析成对象
    parent.appendChild(dom)

    for(let i = 0; i < vnode.children.length; i++) {
      render(vnode.children[i], dom) // 递归 render children
    }
  }

  if (typeof vnode.type === 'function') { // class 组件
    let func = vnode.type
    let inst = new func(vnode.props) // props 已经被createElement 解析成对象
    let innerVNode = inst.render()
    render(innerVNode, parent)
  }
}

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
把上面例子换一下
```
// app.js
class ChildrenChild extends React.Component {
  render() {
    return (
      <div>
        children-child
      </div>
    )
  }
}

class Children extends React.Component {
  render() {
    return (
      <div>
        children
        <ChildrenChild />
      </div>
    )
  }
}

class App extends React.Component {
  render() {
    return (
      <div>
        <span>App</span>
        <span>component</span>
        <Children />
      </div>
    )
  }
}

render(<App />, document.getElementById('app'))

// index.html
<body>
  <div id="app"></div>
  <script src="./app.js"></script>
</body>
```
![结果](http://upload-images.jianshu.io/upload_images/2155778-b60fd251a6287b11.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/620)

### 实现props 和state
```
class Color extends React.Component {
  render() {
    return (
      <div style={{ color: this.props.color }}>color is: {this.props.color}</div>
    )
  }
}

const colorArr = ['red', 'blue', 'black', 'green', 'gray']
class App extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      color: 'black'
    }
  }
  handleClick() {
    console.log("handleClick")
    this.setState({
      color: colorArr[Math.random() * 5 | 0]
    })
  }
  render() {
    return (
      <div onClick={this.handleClick.bind(this)}>
        <Color color={this.state.color} />
      </div>
    )
  }
}
render(<App />, document.getElementById('app'))
```
目的: 我们要通过点击 App 组件中的元素来改变 Color 文字的颜色
步骤: 把新的state 传入 this.setState  来更新组件 - 调用render 方法

#### setState
```
export default class Component {
  constructor(props) {
    this.props = props
  }

  setState(state) {
    setTimeout(() => {
      this.state = state
      // ...render()
    })
  }
}
```
回忆 render 函数有两个参数，`vnode`， `parent`，`vnode` 我们可以使用 `this.render()` 获取当前组件，但我们要知道需要更新dom 内容的 `parent` 就需要在首次render 时记录。

#### 改写 render
给render 增加参数，`comp`(当前更新组件)， `olddom`(当前组件曾经的dom)
拿首次渲染举例:  `parent - document.getElementById('app')`, `comp - <App />`, `olddom -   当App组件更新时就是App 首次渲染的dom`
```
export function render(vnode, parent, comp, olddom) {
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

  if (typeof vnode.type === 'function') { // class 组件
    let func = vnode.type
    let inst = new func(vnode.props) // props 已经被createElement 解析成对象

    comp && (comp.__rendered = inst) // 这里记录的是 Component 实例

    let innerVNode = inst.render()
    render(innerVNode, parent, inst, olddom)
  }
}
```
在这里我们每次render 的时候都会判断这次render 是否是class 组件触发的render，如果是组件触发的render 我们就会在这个组件`comp` 上增加 `__rendered` 记录当前渲染的 dom 或 当前渲染的组件 (组件追溯到顶层也是dom) ，这时候我们需要一个方法来获得olddom 
```
function getDOM (comp) {
  let rendered = comp.__rendered
  while (rendered instanceof Component) {
    rendered = rendered.__rendered
  }
  return rendered
}
```
##### 实现 setState
```
import { getDOM } from './util'
import { render } from './render'

export default class Component {
  constructor(props) {
    this.props = props
  }

  setState(state) {
    setTimeout(() => {
      this.state = state
      const vnode = this.render()
      let olddom = getDOM(this) // 获取渲染此实例的 olddom
      render(vnode, olddom.parentNode, this, olddom)
    })
  }
}
```
##### 实现效果
```
import { render, createElement, Component } from './src/code1/react'

const React = {}
React.createElement = createElement
React.Component = Component


class Color extends React.Component {
  render() {
    return (
      <div style={{ color: this.props.color }}>color is: {this.props.color}</div>
    )
  }
}

const colorArr = ['red', 'blue', 'black', 'green', 'gray']
class App extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      color: 'black'
    }
  }
  handleClick() {
    console.log("handleClick")
    this.setState({
      color: colorArr[Math.random() * 5 | 0]
    })
  }
  render() {
    return (
      <div onClick={this.handleClick.bind(this)}>
        <Color color={this.state.color} />
      </div>
    )
  }
}

render(<App />, document.getElementById('app'))

```