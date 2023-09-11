---
title: React Tips 依赖注入、全局包裹Context
date: 2018-03-23 17:34:37
tags: React Tips
categories: React
---
## 依赖注入
### props 传递
> + props 层层传递
> + 很多组件并不需要使用 props
> + 不推荐

```
// Title.jsx
export default function Title(props) {
  return <h1>{ props.title }</h1>;
}
```
```
// Header.jsx
import Title from './Title.jsx';
export default function Header() {
  return (
    <header>
      <Title />
    </header>
  );
}
```
```
// App.jsx
import Header from './Header.jsx';
class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = { title: 'React Dependency Injection' };
  }
  render() {
    return <Header />;
  }
}
```

### HOC 高阶组件
```
// title.jsx
import React from 'react'

export default function Title(props) {
  return <h1>{ props.title }</h1>
}
```
```
// inject.jsx
import React from 'react'
export default function inject(Component) {
  return class Injector extends React.Component {
    render() {
      const { title } = this.props
      return (
        <Component
          {...this.state}
          {...this.props}
          {...this.children}
          title={ title }
        />
      )
    }
  }
}
```
```
// header.jsx
import React from 'react'
import inject from './inject'
import Title from './title'

const title = 'React Dependency Injection'
const EnhancedTitle = inject(Title)

export default function Header() {
  return (
    <header>
      <EnhancedTitle title={title} />
    </header>
  )
}
```

### 新版 Context API
```
// title.jsx
import React from 'react'
import { InjectContext } from './inject'

export default class Title extends React.Component {
  render() {
    return (
      <InjectContext.Consumer>
        {context => (
          <div>
            {console.log(context)}
            <h1>{context.title}</h1>
          </div>
        )}
      </InjectContext.Consumer>
    )
  }
}
```
```
// inject.jsx
import React from 'react'
export const InjectContext = React.createContext({})
```
```
// header.jsx
import React from 'react'
import Title from './title'
export default class Header extends React.Component {
  render() {
    return <Title />
  }
}
```
```
// App.js
import React, { Component } from 'react';
import Header from './header'
import { InjectContext } from './inject'

class App extends Component {
  render() {
    return (
      <InjectContext.Provider value={{ title: 'React Dependency Injection' }}>
        <Header />
      </InjectContext.Provider>
    );
  }
}

export default App;
```

## 全局包裹Context
### 新版Context API 实现
> 相比于单纯的数据对象，将context包装成一个提供一些方法的对象会是更好的实践。因为这样能提供一些方法供我们操作context里面的数据。

```
// dependcies.js
export default {
  data: {},
  get(key) {
    return this.data[key];
  },
  register(key, value) {
    this.data[key] = value;
  }
}
```
```
// header.jsx
import React from 'react'
import Title from './title.jsx'

export default function Header() {
  return (
    <header>
      <Title />
    </header>
  )
}
```
```
// inject.js
import React from 'react'

export const InjectContext = React.createContext({})
```
创建`dependcies`后可以用`dependencies.register` 注册数据
```
// App.js
import React, { Component } from 'react';

import dependencies from './dependencies'
import Header from './header'
import { InjectContext } from './inject'
dependencies.register('title', 'context-react-patterns')

class App extends Component {
  render() {
    return (
      <InjectContext.Provider value={dependencies}>
        <Header />
      </InjectContext.Provider>
    )
  }
}

export default App;
```
然后在 Title 组件中直接从 Context 获取数据
```
import React from 'react'
import { InjectContext } from './inject'

export default class Title extends React.Component {
  render() {
    return (
      <InjectContext.Consumer>
        {context => (
          <div>
            <h1>{context.get('title')}</h1>
          </div>
        )}
      </InjectContext.Consumer>
    )
  }
}
```

### 高阶组件 HOC 实现
```
// dependencies.jsx
import React from 'react'

let dependencies = {}

export function register(key, dependency) {
  dependencies[key] = dependency
}

export function fetch(key) {
  if (dependencies.hasOwnProperty(key)) return dependencies[key]
  throw new Error(`"${ key } is not registered as dependency.`)
}

export function wire(Component, deps, mapper) {

  return class Injector extends React.Component {
    constructor(props) {
      super(props)
      this._resolvedDependencies = mapper(...deps.map(fetch))
    }

    render() {
      return (
        <Component
          {...this.state}
          {...this.props}
          {...this._resolvedDependencies} // {title: "react-patterns"}
        />
      )
    }
  }
}
```
在App 组件中使用`register` 注册数据
```
// App.js
import React, { Component } from 'react';

import Header from './header'
import { register } from './dependencies'
register('awesome-title', 'HOC-react-patterns')

class App extends Component {
  render() {
    return <Header />
  }
}

export default App;

```
```
// header.jsx
import React from 'react'
import Title from './title.jsx'

export default function Header() {
  return (
    <header>
      <Title />
    </header>
  )
}
```
在 Title 组件中通过 wire 注入数据
```
// title.jsx
import React from 'react'
import { wire } from './dependencies'

const Title = props => (<h1>{ props.title }</h1>)

export default wire(Title, ['awesome-title'], title => ({ title }))
```