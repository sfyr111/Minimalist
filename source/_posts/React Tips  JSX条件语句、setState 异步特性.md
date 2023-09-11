---
title: React Tips  JSX条件语句、setState 异步特性
date: 2018-03-22 18:51:29
tags: React Tips
categories: React
---
## JSX 条件语句

### 三元表达式
```
const Test = function(props) {
  const { flag1, flag2 } = props
  return (
    <div>
      {flag1 && flag2
        ? <h1>11111</h1>
        : <h1>22222</h1>
      }
    </div>
  )
}
```

### 立即执行函数
```
const Test = function(props) {
  const { flag1, flag2 } = props
  return (
    <div>
      {
        (() => {
          if (flag1 && flag2) {
            return <h1>11111</h1>
          } else {
            return <h1>22222</h1>
          }
        })()
      }
    </div>
  )
}
```

### 条件语句
```
const Test = function(props) {
  const { flag1, flag2 } = props
  const condition = flag1 && flag2
  if (condition) return <h1>111111</h1>
  if (!condition) return <h1>222222</h1>
  return <h1>333333</h1>
}
```

### do 表达式(stage0新提案)
```
const Test = function(props) {
  const { flag1, flag2 } = props
  return (
    <div>
      {
        do {
          if (flag1 && flag2) {
            <h1>11111</h1>
          } else {
            <h1>22222</h1>
          }
        }
      }
    </div>
  )
}
```
## setState() 异步

> + setState 时 函数会创建一个暂态的state作为过渡state，而不是立即修改this.state。 如果在调用setState()函数之后尝试去访问this.state，你得到的可能还是setState()函数执行之前的结果。
> + setState 在执行多次state 更新时会合并成一次更新，这时setState 会显示为异步函数
> + 而有些浏览器 API 会造成 state 更新同步化 `addEventListener setTimeout fetch` 等
> + 当setState() 函数执行的时候，函数会创建一个暂态的state作为过渡state，而不是立即修改this.state。 如果在调用setState()函数之后尝试去访问this.state，你得到的可能还是setState()函数执行之前的结果。

```
class TestComponent extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      count: 0
    }
  }

  componentDidMount() {
      this.setState({count: this.state.count + 1})
      console.log(this.state.count) // 0 state 更新为异步

      this.setState({count: this.state.count + 1})
      console.log(this.state.count) // 0 state 更新为异步

      setTimeout(() => {
        console.log(this.state.count) // 1 state 更新异步被合并, 只更新了一次

        this.setState({count: this.state.count + 1})
        console.log(this.state.count) // 2 state 更新同步化
        
        this.setState({count: this.state.count + 1})
        console.log(this.state.count) // 3 state 更新同步化
      })
  }
}
```

> + 当和addEventListener, setTimeout 函数或者发出ajax call的时候，调用setState, state会发生改变。并且render函数会在setState()函数被触发之后马上被调用。
> + addEventListener setTimeout ajax call 在事件循环里都只是属于浏览器层面的 API ，这些 API 的回调函数将会在浏览器资源里执行完成再进入队列最后通过事件循环进入 script 里执行。
> + 浏览器层面的API 的上下文环境已经不属于 React 中了，React 无法控制这些这些回调函数，无法合并他们导致的state 更新, 于是使用同步化策略及时更新，确保在这些函数执行之后的其他代码能拿到正确的数据
> + 而在 JSX 中通过props 绑定 onClick 的事件则仍然是在 React 上下文中，React 仍然可以控制这类事件回调函数

```
class TestComponent extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      count: 0
    }
  }

  componentDidMount() {
    document.getElementById('button1').addEventListener('click', this.onClickHandler1);

    setTimeout(this.onTimeoutHandler, 10000);

    fetch('https://api.github.com/users')
      .then(this.onAjaxCallback);
  }

  onClickHandler1 = () => {
    console.log('State before (onClickHandler1): ' + JSON.stringify(this.state));
    this.setState({
      count: this.state.count + 1
    });
    console.log('State after (onClickHandler1): ' + JSON.stringify(this.state));
  }

  onClickHandler2 = () => {
    console.log('State before (onClickHandler2): ' + JSON.stringify(this.state));
    this.setState({
      count: this.state.count + 2
    });
    console.log('State after (onClickHandler2): ' + JSON.stringify(this.state));
  }

  onTimeoutHandler = () => {
    console.log('State before (timeout): ' + JSON.stringify(this.state));
    this.setState({
      count: this.state.count + 3
    });
    console.log('State after (timeout): ' + JSON.stringify(this.state));
  }

  onAjaxCallback = (err, res) => {
    console.log('State before (AJAX call): ' + JSON.stringify(this.state));
    this.setState({
      count: this.state.count + 4
    });
    console.log('State after (AJAX call): ' + JSON.stringify(this.state));
  }

  render() {
    console.log('State in render: ' + JSON.stringify(this.state));

    return (
      <div>
        <button
          id="button1"
        >
          'addEventListener'
        </button>

        <button
          id="button2"
          onClick={this.onClickHandler2}>
          'props bind in jsx'
        </button>
      </div>
    );
  }
}

```