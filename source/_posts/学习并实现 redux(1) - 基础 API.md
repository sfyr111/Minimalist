---
title: 学习并实现 redux(1) - 基础 API
date: 2018-04-03 21:50:27
tags: Redux
categories: React
---
## redux 基础 API
> + createStore 创建 store (对外直接暴露 createStore(reducer))
> + getState 获取 store 当前 state，(store.getState())
> + subscribe 注册监听器函数(listener)，(store.subscribe(listener))
> + dispatch 触发 action，(store.dispatch({ type: 'actionType' }))

## reducer / listener / action
> + reducer 由createStore(reducer) 创建store，用来被 store.dispatch({ type: 'TYPE' })命中更改 state

```
// reducer
function counter(state = 0, action) {
  console.log(state, action) // log 每次action 

  switch (action.type) {
    case 'ADD':
      return state + 1
    case 'SUB':
      return state - 1
    default:
      return 10 // { type: @@redux/INIT } 命中
  }
}
```
> + listener 由store.subscribe(listener) 注册监听函数，每次 action 时都会执行
> + action 由store.dispatch(action) 触发通知 reducer 命中后更改store 的state

## redux 应用流程图
![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401694537027273.png)

## 根据流程图实现 redux
```
// redux.js
export function createStore(reducer) {
  let currentState = {} // state
  let currentListeners = [] // 监听器

  function getState() { // store.getState() 获取 state
    return currentState
  }

  function subscribe(listener) { // store.subscribe(listener) 注册listener
    currentListeners.push(listener)
  }

  function dispatch(action) {
    currentState = reducer(currentState, action) // 更改 state
    currentListeners.forEach(v => v()) // 执行listeners
    return action // 返回action 
  }

  dispatch({ type: '@@redux/INIT' }) // store 初始化时命中 reducer default
  return { getState, subscribe, dispatch } // 暴露store API
}
```
> 定义 reducer 创建 store

```
import { createStore } from './redux'

// reducer
function counter(/*initState*/state = 0, action) {
  console.log(state, action) // log 每次action 

  switch (action.type) {
    case 'ADD':
      return state + 1
    case 'SUB':
      return state - 1
    default:
      return 10 // { type: @@redux/INIT } 命中
  }
}

// store
const store = createStore(counter)
const init = store.getState()
console.log('initCount:' + init)
```
> 注册listener

```
// listener
function listener() {
  const current = store.getState()
  console.log('listener - currentCount:' + current)
}
store.subscribe(listener)
```
> 执行 store.dispatch 命中reducer 

```
// action
const ADD = 'ADD'
const SUB = 'SUB'

store.dispatch({ type: ADD })
store.dispatch({ type: ADD })
store.dispatch({ type: SUB })
store.dispatch({ type: ADD })
store.dispatch({ type: SUB })
```
> 控制台输出

![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_620_6201694537027913.png)


