---
title: 学习并实现react4
date: 2018-03-16 16:30:41
tags: React
categories: React
---
## 实现生命周期

### 生命周期介绍
```
componentWillMount // 组件挂载前
componentDidMount // 组件挂载后
componentWillReceiveProps // 组件props 变化时
shouldComponentUpdate //  (props / state) 变化时
componentWillUpdate // 组件更新前
componentDidUpdate // 组件更新后
componentWillUnmount // 组件即将销毁
```

> React 生命周期图

![](https://upload-images.jianshu.io/upload_images/2155778-272700fd6657ca2c.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/620)

> React 子组件在父组件下的生命周期流程

![](https://upload-images.jianshu.io/upload_images/2155778-dd4218cc505dc997.jpg?imageMogr2/auto-orient/strip%7CimageView2/2/w/620)

### 实现 componentWillMount, componentDidMount, componentDidUpdate
#### componentWillMount
在组件实例新建时执行
#### componentDidMount、componentDidUpdate
相同点：组件render 执行完成后执行的
不同点：新建的实例render 后执行componentDidMount， 已创建的实例组件再次render 则调用componentDidUpdate
```
function render(vnode, parent, comp, olddomOrComp, myIndex) {
  ...
  if (typeof vnode.type === 'function') {
    let func = vnode.type
    let inst
    if (olddomOrComp && olddomOrComp instanceof func) {
      inst = olddomOrComp
      inst.props = vnode.props
    } else {
      inst = new func(vnode.props)
      // 新建组件实例执行 componentWillMount
      inst.componentWillMount && inst.componentWillMount.call()

      if (comp) comp.__rendered = inst
      else parent.__rendered[myIndex] = inst // dom 渲染
    }

    let innerVNode = inst.render()
    render(innerVNode, parent, inst, inst.__rendered, myIndex)

    // render 后进行判断调用 componentDidUpdate componentDidMount
    if (olddomOrComp && olddomOrComp instanceof func) {
      inst.componentDidUpdate && inst.componentDidUpdate.call()
    } else {
      inst.componentDidMount && inst.componentDidMount.call()
    }
  }
}
```

### 实现 componentWillReceiveProps， shouldComponentUpdate， componentWillUpdate

#### componentWillReceiveProps
```
componentWillReceiveProps(nextProps) {
  console.log(nextProps) // 变化后的 props
  console.log(this.props) // 变化前的 props
}
```
componentWillReceiveProps 具有一个 nextProps 参数，表示改变后的新props，而在componentWillReceiveProps 内执行的 this.props 还是指向未改变的 oldProps
```
  if (typeof vnode.type === 'function') {
    let func = vnode.type
    let inst
    if (olddomOrComp && olddomOrComp instanceof func) {
      inst = olddomOrComp
      // 父组件改变时 inst.props 改变前 调用 componentWillReceiveProps
      inst.componentWillReceiveProps && inst.componentWillReceiveProps(vnode.props)
      
      inst.props = vnode.props
    } else {
      inst = new func(vnode.props)
      inst.componentWillMount && inst.componentWillMount.call()

      if (comp) comp.__rendered = inst
      else parent.__rendered[myIndex] = inst // dom 渲染
    }

    let innerVNode = inst.render()
    render(innerVNode, parent, inst, inst.__rendered, myIndex)
    
    if (olddomOrComp && olddomOrComp instanceof func) {
      inst.componentDidUpdate && inst.componentDidUpdate.call()
    } else {
      inst.componentDidMount && inst.componentDidMount.call()
    }
  }
```

#### shouldComponentUpdate / componentWillUpdate
```
shouldComponentUpdate(nextProps, nextState) {
  return boolean
}
componentWillUpdate(nextProps, nextState) {}
```
> + 组件setState 或props 后决定组件是否更新，返回一个 true 或 false 通知组件是否执行 componentWillUpdate - render - componentDidUpdate, 组件不存在shouldComponentUpdate 则直接更新
> + componentWillUpdate 只有当shouldComponentUpdate 返回值是true 时才会调用

```
// render.js 父组件props 改变时
  if (typeof vnode.type === 'function') {
    let func = vnode.type
    let inst
    if (olddomOrComp && olddomOrComp instanceof func) {
      inst = olddomOrComp
      inst.componentWillReceiveProps && inst.componentWillReceiveProps(vnode.props)

      let shouldUpdate // ture or false
      if (inst.shouldComponentUpdate) {
        shouldUpdate = inst.shouldComponentUpdate(vnode.props, olddomOrComp.state) // 进行比较
      } else {
        // 组件实例不存在shouldComponentUpdate 为true
        shouldUpdate = true
      }

      // 这里调用componentWillUpdate
      shoudUpdate && inst.componentWillUpdate && inst.componentWillUpdate(inst.props, olddomOrComp.state)
      inst.props = vnode.props
      if (!shouldUpdate) return // 无需更新时阻止组件 render
    } else {
      inst = new func(vnode.props)
      inst.componentWillMount && inst.componentWillMount.call()

      if (comp) comp.__rendered = inst
      else parent.__rendered[myIndex] = inst // dom 渲染
    }

    let innerVNode = inst.render()
    render(innerVNode, parent, inst, inst.__rendered, myIndex)

    if (olddomOrComp && olddomOrComp instanceof func) {
      inst.componentDidUpdate && inst.componentDidUpdate.call()
    } else {
      inst.componentDidMount && inst.componentDidMount.call()
    }
  }
```
```
// component.js 当组件本身调用 setState
class Component {
  constructor(props) {
    this.props = props
  }

  setState(state) {
    setTimeout(() => {
      let shouldUpdate
      if (this.shouldComponentUpdate) { // state 改变时
        shouldUpdate = this.shouldComonentUpdate(this.props, state)
      } else shouldUpdate = true

      this.state = state
      if (!shouldUpdate) return // 判断是否组织render

      const vnode = this.render()
      let olddom = getDOM(this) // 获取渲染此实例的 olddom
      const myIndex = getDOMIndex(olddom)
      render(vnode, olddom.parentNode, this.__rendered, myIndex)
      this.componentDidUpdate && this.componentDidUpdate.call() // 最后执行componentDidUpdate 
    }, 0)
  }
}
```

### componentWillUnmount
componentWillUnmount 调用的场景
1组件实例销毁时
2组件实例不被复用时
3包裹组件的dom 不被复用时 `<div><Comp /></div>`
```
function recoveryComp(comp) {
  if (comp instanceof Component) {
    comp.componentWillUnmount && comp.componentWillUnmount.call()
    recoveryComp(comp.__rendered)
  } else if (comp.__rendered instanceof Array) { // 包裹的dom，<div> / <span>
    comp.__rendered.forEach(el => recoveryComp(el))
  } else return // 文本节点
}
``` 
> + recoveryComp 对传入的参数进行判断
> + 当为组件实例时调用 componentWillUnmount 然后递归调用 comp.__rendered
> + 当comp.__rendered 为数组时comp 为dom 节点，对__rendered 里的各元素进行 recoveryComp(el)
> + 最后如果是文本节点则不操作

```
function diffDOM(vnode, parent, comp, olddom) {
  const { onlyInLeft, onlyInRight, bothIn } = diffObject(vnode.props, olddom.__vnode.props)
  setAttrs(olddom, onlyInLeft) // 添加新属性
  removeAttrs(olddom, onlyInRight) // 删除旧属性
  diffAttrs(olddom, bothIn) // 比较且更新新旧属性的不同

  const willRemoveArr = olddom.__rendered.slice(vnode.children.length) // 将要删除的 dom
  const renderedArr = olddom.__rendered.slice(0, vnode.children.length)

  olddom.__rendered = renderedArr
  for (let i = 0; i < vnode.children.length; i++) {
    // 顺序固定，有缺点，原来是replaceChild，现在对dom 或 text 节点进行重新render
    _render(vnode.children[i], olddom, null, renderedArr[i], i)
  }

  willRemoveArr.forEach(el => {
    recoveryComp(el) // 当组件不被复用时进行 调用recoveryComp
    olddom.removeChild(getDOM(el))
  })

  olddom.__vnode = vnode // 不忘重新标记
}
```
现在我们把生命周期都加入了。

首次挂载到根节点时
```
// document.getElementById('app') dom 节点也需要初始化__rendered 和 myIndex
render(<App />, document.getElementById('app'))
```
```
export function render(vnode, parent) {
  parent.__rendered = [] // 为 document.getElementById('root') 初始化__rendered
  _render(vnode, parent, null, null, 0)
}

function _render(vnode, parent, comp, olddomOrComp, myIndex) {
  ...
}
```
