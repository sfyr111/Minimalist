---
title: 周常2 算法题4道、react ssr 原理实践、koa-router 源码阅读
date:  2018-12-23 23:39
tags:
---
## 周常
+ 算法题 java 实现
  1.爬楼梯(斐波那契数列)
  2.位1的个数
  3.实现 Pow(x, n) x 的 n 次幂函数
  4.第N个数字

+ react ssr 原理

+ koa-router 源码阅读

## 算法题

### 爬楼梯(斐波那契数列)
> 假设你正在爬楼梯。需要 n 阶你才能到达楼顶。
每次你可以爬 1 或 2 个台阶。你有多少种不同的方法可以爬到楼顶呢？
注意：给定 n 是一个正整数。

#### 解题思路
+ 0层到1 层台阶，只有一种方法。
+ 0层到2 层台阶，有先跨1 层和跨2 层，两种方法。
+ 0层到3 层台阶，可以理解为下面两种情况相加:
  (1) 先从0层跨到2层，相当于(3-1) = 2 层到3 层台阶,  只有一种方法
  (2) 先从0层跨到1层，相当于(3-2) = 1 层到3 层台阶,  先跨1 层和跨2 层，两种方法
+ 上面这种情况下，可以从 0 层选择跨 1 或 2层对应 n-2或 n-1
+ 宏观考虑 0层到n 层台阶 f(n)，可以理解为 f(n-1) + f(n-2) 相加
+ 考虑到使用递归计算性能较差，采用循环的方法

#### 代码实现
```
public class ClimbStairs {

	public int climbStairs(int n) {
		if (n == 1) // 一阶 1种
			return 1;

		int[] arr = new int[n + 1];
		arr[1] = 1;
		arr[2] = 2; 
        // n 最小为3
		for (int i = 3; i <= n; i++)
			arr[i] = arr[i - 1] + arr[i - 2];

		return arr[n];
	}
}
```
[爬楼梯](https://leetcode-cn.com/problems/climbing-stairs/)

### 位1的个数

#### 解题思路
+ 解法1
  从 32 位 二进制码的第一位开始 ...000001 ,...000010, ...000100, 比与 n 比较。
+ 解法2
  1.根据二进制的特性，...110100 减1 为 ...110011, 两者使用 & 操作符结果为 ...110000。
2. ...110000 这个结果把 ..110100 最后一位 1给删除掉了。
3. 通过每次减 1 再比较的这个方式，一直减到 n 为 ...000000 也就是 0 后结束。
   ![](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_620_6201694866189100.png)


#### 代码实现
```
public class HammingWeight1 {
    // 解法1 逐个比较
	public int s1(int n) {
		int sum = 0;
		int mark = 1;

		for (int i = 0; i < 32; i++) {
			if ((n & mark) != 0)
				sum++;
			mark <<= 1;
		}
		return sum;
	}
    // 解法2 二进制数 减1来比较
	public int s2(int n) {
		int sum = 0;

		while (n != 0) {
			sum++;
			n &= (n - 1);
		}
		return sum;
	}

}
```
[位1的个数](https://leetcode-cn.com/problems/number-of-1-bits/)

## Pow(x, n)
实现 [pow(*x*, *n*)](https://www.cplusplus.com/reference/valarray/pow/) ，即计算 x 的 n 次幂函数。

### 解题思路
1. 2 ^ 32 等于 2 ^ 16 再平方，也就是 (2 ^ 2) ^ 16
2. 通过这个定律可知 2 ^ 32 ==  (2 ^ 2) ^ 16 == (2 ^ 2 ^ 2) ^ 8 == (2 ^ 2 ^ 2 ^ 2) ^ 4 == (2 ^ 2 ^ 2 ^ 2 ^ 2) ^ 2 == (2 ^ 2 ^ 2 ^ 2 ^ 2 ^ 2) ^ 1
3. 通过这个方法可以根据 N 来不停循环,  每次循环 N / 2, 同时 x * x 自己跟自己相乘进行平方计算，N 为 1 时 计算并返回 x 的结果。
4. 如果 N 为奇数，循环的最终结果  2 ^ 33 == (2 ^ 2 ^ 2 ^ 2 ^ 2 ^ 2) ^ 1 * 2， 需要乘一下最初的 x。
5. 当 N < 0, 时 1 = 1/x, N = -N
6. 不用递归的原因是因为当数很大时耗时很长.

### 代码实现
```
	public double pow(double x, int n) {
		long N = n; // 防止很大的数
		if (N == 0) return 1;

		if (N < 0) {
			x = 1 / x;
			N = -N;
		}

		double result = 1; // 会有小数的情况
		while (N > 0) {
			if (N % 2 == 1)
				result = result * x;

			N = N / 2; // 每次 / 2
			x = x * x; // x 都平方一次
		}

		return result;
	}
```
[Pow(x, n)](https://leetcode-cn.com/problems/powx-n/)

## 第N个数字
在无限的整数序列 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, ...中找到第 n 个数字。
n 是正数且在32为整形范围内 ( n < 231)。
> 输入:
3
输出:
3

> 输入:
11
输出:
0
说明:
第11个数字在序列 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, ... 里是0，它是10的一部分。

### 解题思路
+ 假设：
  1 n 是1000
  2 一位数区间 [1, 9] 有 1*9=9个数字的字符串，二位数区间 [10, 99] 有2*90=180个数字的字符串, 三位数区间 [100, 999] 有 3*900=2700个数字的字符串。
  3 n 1000, 肯定是落在了 三位数区间 [100, 999] 中的某个位置。
  4 1000 - 9 - 180 = 811，题目给的序号是从 1开始计算的，实际应该从序号 0开始，811 需要减去1 ， 所以 810 是数字100 第一位 1 到 n 之间所有的字符数 。
  5 我们来找到 n 1000 所在的数字 k，数100 到数 k 之间有 810，个字符，同时是在三位数区间内。
  6 100 到 k 之间有 810 / 3 = 270 个数字
  7 270 个数字加上之前跳过的一位数和二位数区间 [1-100] 的个数 100， 可以确定 n 1000 落在370 这个数字上。
  8 最后我们需要确定 n 1000 是在 370 的哪个位置上。
  9 之前我们在三位数区间 [100, 999] 上获得了100 的第一位 1 到 n 1000 落在数字 370 上的某个位置之间的所有字符一共有 810 个
  10 通过取模 % 的特性，对三位数 3 取模结果只会 0 1 2 是三个数中的一个，现在用 810 % 3 === 0, 可知 810 的位置是某三位数的第一位，我们已经知道这个数是 370，最后确定第一位的结果是 3
+ 总结：
  1 确定 n 在几位数的区间中
  2 找到 n 落在哪个数字上
  3 找到 n 在这个数字上的某个位置


### 代码实现
```
	public int findNthDigit(int n) {
		int len = 1; // 位数计数 1-9:1, 10-99:2, 100-999:3
		long count = 9; // 9, 90, 900
		int start = 1;

		while (n > len * count) { // len * count = 9, 180... 1-9有(1*9)字符, 10-99有(2*90)字符
			n -= len * count;
			len += 1;
			count *= 10;
			start *= 10;
		}
		// len = 1, n 在 1-9=9个字符内，len = 2, n 在 10-99=180个字符内， len = 3，n 在 100-999=2700个字符内
		// start 从1，10，100 开始

		/**
		 * 1000 - 9 - 180 = 811
		 * (811 - 1) / 3 = 270
		 * 100(start) + 270 = 370
		 */
		// n - 1是因为从 1 位置开始计算而不是0
		start += (n - 1) / len; // start为100在n 811 内
		String s = Integer.toString(start);
		return Character.getNumericValue(s.charAt((n - 1) % len)); // n - 1 是因为从 1 开始而不是 0
	}
```
[第N个数字](https://leetcode-cn.com/problems/nth-digit/)

## react ssr 原理
react ssr 问题主要解决三个问题
1. server 端编译 react 组件转成 html 返回给浏览器
2. 客户端代码接管 react 让页面逻辑执行 - 同构
3. client 代码接管 server 端返回的页面后需要配置路由
4. redux 状态管理数据在 server 和 client 两端统一 - 数据注水脱水

### 第一问题，解决 server 端返回 react 编译后的 html
+ 重点词：
  webpack.server.js 文件 - 编译打包 server 端的 js 代码
  renderToString - react-dom/server 模块下的方法

+ 实现方式:
  使用 webpack 配置打包 server 端 react 代码的 webpack.server.js 文件，打包编译成 html 字符串返回给前端

+ 代码
```
server 端返回的 react 组件
把 jsx 编译成字符串插入
import Home from './containers/Home';
import { renderToString } from 'react-dom/server';
const content = renderToString(<Home />);
 res.send(`
		<html>
			<head>
				<title>ssr</title>
			</head>
			<body>
				${content}
			</body>
		</html>
  `);
```
```
// webpack.sever.js
const path = require('path');
const nodeExternals = require('webpack-node-externals');

module.exports = {
	target: 'node', // 防止打包 node 原生模块的代码，比如 path
	mode: 'development',
	entry: './src/index.js',
	output: {
		filename: 'bundle.js',
		path: path.resolve(__dirname, 'build')
	},
	externals: [nodeExternals()], // 此选项配置排除的模块，nodeExternals 排除 node_modules 里面的模块
	module: {
		rules: [{
			test: /\.js?$/,
			loader: 'babel-loader',
			exclude: /node_modules/,
			options: {
				presets: ['react', 'stage-0', ['env', {
					targets: {
						browsers: ['last 2 versions']
					}
				}]]
			}
		}]
	}
}
```

### 第二个问题让客户端代码接管 react 让页面逻辑执行 - 同构
server 端返回 html 还不够，前端代码还不能在这个 html 里执行

renderToString 只能把 react 组件编译成字符串然后通过 server 返回到浏览器。
而组件上绑定的实践是无法编译的。
```
		<div>
			<div>This is Dell Lee!</div>
			<button onClick={()=>{alert('click1')}}>
				click
			</button>
		</div>
		// onClick 事件是不会出现在浏览器上的
```
使用通过，让 react 代码在服务端上执行同时又在客户端上执行。

#### 如何让客户端再执行一遍
+ 服务端返回的页面加载一个 js 文件让浏览器加载后自己执行
```
  res.send(`
		<html>
			<head>
				<title>ssr</title>
			</head>
			<body>
				<div id="root">${content}</div>
				<script src='/index.js'></script>
			</body>
		</html>
  `);
```
+ index.js文件如何来
  app.use(express.static('public')); 定义静态文件
  /public/index.js 此目录下放 webpack 打包后的 index.js
  /src/client/index.js 此目录下放客户端执行的代码
```
import React from 'react';
import ReactDom from 'react-dom';

import Home from '../containers/Home';
// ssr 使用 hydrate 而不是 render
ReactDom.hydrate(<Home />, document.getElementById('root'))
```
webpack.client.js 放打包客户端代码的配置
```
module.exports = {
	mode: 'development',
	entry: './src/client/index.js',
	output: {
		filename: 'index.js',
		path: path.resolve(__dirname, 'public')
	},
	module: {
	    // ...
	}
}
```

+ 总结
  服务端运行 React 代码渲染出 HTML 结构
  发送 HTML 给浏览器
  浏览器接受内容展示 （只有 html）
  浏览器加载 js 文件
  js 中的运行一样的 React 代码，在浏览器端重新执行 (会执行挂载，绑定事件等)
  JS 中的 React 代码就接管了服务端发送来的HTML 页面和操作。(正常执行)


### 第三个问题配置前后端一致的路由

同构的目的就是让 JS 中的 react 代码在浏览器上再执行一次接管 html 页面。
原来我们的 JS 文件用 react-router来识别浏览器的目录来渲染不同的页面
现在浏览器的 url 需要识别到底是后端请求还是前端页面
都清楚浏览器执行的代码跟服务端执行的代码是有区别的
区别就是在 server 的 React 代码中使用 StaticRouter， 而 client 的 React 代码中使用 BrowserRouter

#### 方法
使用 react-router
创建 Routes.js 文件
```
import React from 'react';
import { Route } from 'react-router-dom';
import Home from './containers/Home';
import Login from './containers/Login';

export default (
	<div>
		<Route path='/' exact component={Home}></Route>
		<Route path='/login' exact component={Login}></Route>
	</div>
)
```
在client/index.js 中挂载路由
```
import React from 'react';
import ReactDom from 'react-dom';
import { BrowserRouter } from 'react-router-dom';
import Routes from '../Routes';

const App = () => {
	return (
		<BrowserRouter>
			{Routes}
		</BrowserRouter>
	)
}

ReactDom.hydrate(<App />, document.getElementById('root'))
```
改造 server/index.js 中路由
```
import React from 'react';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';
import Routes from '../Routes';

export const render = (req) => {
	const content = renderToString((
		<StaticRouter location={req.path} context={{}}>
			{Routes}
		</StaticRouter>
	));

	return `
		<html>
			<head>
				<title>ssr</title>
			</head>
			<body>
				<div id="root">${content}</div>
				<script src='/index.js'></script>
			</body>
		</html>
  `;
}
```

#### StaticRouter
StaticRouter 不像 BrowserRouter 可以直接感知浏览器路径
```
		<StaticRouter location={req.path} context={{}}>
			{Routes}
		</StaticRouter>
```
context 属性用于数据通信
location 用于感知浏览器请求的路径，需要把 req.path 传递给 StaticRouter, 当浏览器请求的路径匹配到 Routes 时，server 执行的 StaticRouter 就会把相应的 React 组件返回给浏览器
这时候又是服务端 通过 StaticRouter 执行一次，浏览器通过 BrowserRouter 执行一次。

#### 服务端改造
改造 get 服务端路由，* 用来匹配所有请求
```
app.get('*', function (req, res) {
  res.send(render(req));
});
```

#### 使用 Link 标签
```
const Header = () => {
  return (
    <div>
      <Link to='/'>home</Link>
      <br />
      <Link to='/login'>login</Link>
    </div>
  )
}
```

+ 回顾和总结
  仅仅在首次请求会同构
  跳转路由时候并不会再次请求
  StaticRouter 只是对应了 BrowersRouter 同步切换

### 第四个问题 redux 异步数据在前后端上的统一
浏览器的 client 代码仍然使用 createStore 使用 Provider 组件进行传递

服务端的 server 代码需要把 store 再做一次传递到 服务端的 react 代码，可以跟 clinet 代码共用 createStore

## 步骤

### 共用 store 代码
/store/index.js
```
import { createStore, applyMiddleware, combineReducers } from 'redux';
import thunk from 'redux-thunk';
import { reducer as homeReducer } from '../containers/Home/store';

const reducer = combineReducers({
	home: homeReducer
});

export const getStore = () => {
	return createStore(reducer, applyMiddleware(thunk));
}

export const getClientStore = () => {
	const defaultState = window.context.state;
	return createStore(reducer, defaultState, applyMiddleware(thunk));
}
```
防止 server 代码使用 单例 store 导致每个用户都用一套 store
要使用一个 getStore 方法，让每个用户请求都重新创建一个 store
```
		const content = renderToString((
			<Provider store={getStore()}>
				<StaticRouter location={req.path} context={{}}>
                    ...
				</StaticRouter>
			</Provider>
		));
```
```
export const getStore = () => {
	return createStore(reducer, applyMiddleware(thunk));
}
```

### 服务端客户端共用 redux store
componentDidMount 只在客户端执行 生命周期只在客户端代码中执行，并没在服务端代码中执行，虽然服务端和客户端同时执行了相关代码实现，但是实际渲染出来的代码是不包含 redux store 里的数据的。
```
	componentDidMount() {
		if (!this.props.list.length) {
			this.props.getHomeList();
		}
	}
```

### 流程整理
1.请求项目 -> server
2.server 执行 render 来渲染 react 代码
```
export const render = (store, routes, req) => {

		const content = renderToString((
			<Provider store={store}>
				<StaticRouter location={req.path} context={{}}>
					<div>
						{routes.map(route => (
		      		<Route {...route}/>
		    		))}
	    		</div>
				</StaticRouter>
			</Provider>
		));

		return `
			<html>
				<head>
					<title>ssr</title>
				</head>
				<body>
					<div id="root">${content}</div>
					<script>
						window.context = {
							state: ${JSON.stringify(store.getState())}
						}
					</script>
					<script src='/index.js'></script>
				</body>
			</html>
	  `;
	
}
```
3. 这里面的 store 是由 getStore 创建
```
export const getStore = () => {
	return createStore(reducer, applyMiddleware(thunk));
}
```
4. 这时候 store 还是个空的初始数据，而客户端可以执行 生命周期获取数据
```
	componentDidMount() {
		if (!this.props.list.length) {
			this.props.getHomeList();
		}
	}
```
5.虽然客户端代码执行了 redux 中的请求获取数据渲染，但现在服务端返回的 react 代码还是空数据并没有什么改变，也不会展示在 HTML 上。

## 让服务端解决异步请求数据让页面上也展示请求数据

### 构建 loadData 代替 componentDidMount
解决思路：
服务端和客户端有两个 store
服务端的是用户每次请求组件通过 getStore() 执行生成的
```
app.get('*', function (req, res) {
	const store = getStore();
	...
}
```
客户端的是又客户端 js 代码生成的

使用 loadData:
在页面组件里创建 loadData
```
Home.loadData = (store) => {
	// 这个函数，负责在服务器端渲染之前，把这个路由需要的数据提前加载好
	return store.dispatch(getHomeList())
}
```

### 路由重构
目的：
访问 / 获取 home 的异步数据
访问 /login 获取 login 的异步数据

使用 react-router 中 matchPath matchRouter 方法:
改造路由对象
```
const routes = [
	{ 
		path: '/',
        component: Home,
        exact: true,
        loadData: Home.loadData, // 告诉路由匹配渲染时执行组件的 loadData 方法，用来让 server 端获取异步数据返回到 html 页面上
        key: 'home'
  }, 
  { 
		path: '/login',
        component: Login,
        exact: true,
        key: 'login'
  }
];
```
```
服务端
			<Provider store={store}>
				<StaticRouter location={req.path} context={{}}>
					<div>
						{routes.map(route => (
		      		<Route {...route}/>
		    		))}
	    		</div>
				</StaticRouter>
			</Provider>
客户端 
const App = () => {
	return (
		<Provider store={store}>
			<BrowserRouter>
				<div>
					{routes.map(route => (
	      		<Route {...route}/>
	    		))}
	    	</div>
			</BrowserRouter>
		</Provider>
	)
}
```
现在我们已经匹配好了路由的重构让服务端代码匹配到路由时可以请求页面异步数据，但是还不够
还需要在服务端被 app.get() 请求时返回页面前把请求完毕的 store 里的数据传递到 server 的 Provider 里再返回到浏览器上.

### 使用 matchRoutes 匹配多层路由
```
export default [
	{ 
		path: '/',
    component: Home,
    // exact: true,
    loadData: Home.loadData,
    key: 'home',
    routers: [{
		  path: '/ttt',
      component: Login,
      exact: true,
      key: 'ttt'
    }]
  }, {
		path: '/login',
    component: Login,
    exact: true,
    key: 'login'
  }
];
```


### server 根据路由的路径，来往 store 里加数据

```
import { matchRoutes } from 'react-router-config'

app.get('*', function (req, res) {
	const store = getStore();
	// 根据路由的路径，来往store里面加数据, matchedRoutes 存放所有匹配到的路由信息
	const matchedRoutes = matchRoutes(routes, req.path);
	// 让matchRoutes里面所有的组件，对应的loadData方法执行一次
	const promises = [];
	matchedRoutes.forEach(item => {
		if (item.route.loadData) { // 判断匹配的路由有 loadData 就执行
		    // 执行 loadData, 让 loadData 具有 store 来 dispatch 把所有 loadData 异步请求回来的结果给 push 到 promises 里。解决 axios 是异步数据的问题
			promises.push(item.route.loadData(store))
		}
	})
	// 让所有异步数据都执行成功后才返回 HTML，保证 loadData 的数据获取完后才执行 render 返回.
	Promise.all(promises).then(() => {
		res.send(render(store, routes, req));
	})
});
```

### 服务端客户端 store 数据统一
做到现在当 开启 js 执行时，访问页面还是会出现白屏，虽然 server 的异步数据返回了，但是浏览器还是渲染了 client 的异步数据再渲染
+ 原因
  客户端代码接管时刚开始加载时客户端的 store 是空的，客户端代码仍然是要等到生命周期请求后才能获取到渲染数据。
  而服务端 store 是有数据的，和客户端不同, 没有做到统一

+ 解决 脱水注水
  改写服务端代码的数据
```
		return `
			<html>
				<head>
					<title>ssr</title>
				</head>
				<body>
					<div id="root">${content}</div>
					<script>
                        // 把 server store 数据放到全局变量下
						window.context = {
							state: ${JSON.stringify(store.getState())}
						}
					</script>
					<script src='/index.js'></script>
				</body>
			</html>
	  `;
	
```
改写 client 客户端代码中的 store
```
export const getClientStore = () => {
    // 获取 server store 放在全局变量里的数据
	const defaultState = window.context.state; 
    // 把这些数据作为 client store 的默认数据, 解决统一问题
	return createStore(reducer, defaultState, applyMiddleware(thunk));
}
```

+ 流程
  服务端通过 loadData 来获取 store 后，返回 html 时把 server 的 store 数据写在全局变量下。
  客户端执行代码时，让 client 的 store 获取全局变量的数据作为 client 的 store 的默认值，这样客户端的 store 就不是一个初始数据，解决了 server client store 的统一

+ 注意
  注水脱水虽然解决了问题，但是不能省略 componentDidMount ，不然非首屏时是无法获取数据的，脱水注水只解决的首屏数据统一的问题, 但是生命周期的请求和数据注水又重复消耗性能。
  折中方案在 componentDidMount 中判断是否重复请求
```
	componentDidMount() {
		if (!this.props.list.length) {
			this.props.getHomeList();
		}
	}
```

## koa-router 源码阅读

### koa-router 使用
```
var Koa = require('koa');
var Router = require('koa-router');

var app = new Koa();
var router = new Router();

router.get('/', (ctx, next) => {
  // ctx.router available
});

app.use(router.routes())
```
从 koa-router 的调用 api 来看，是 koa-router 的实例 router 调用了 routes() 方法开启了 http 路由模式

### 查看调用的 router.js
```
Router.prototype.routes = Router.prototype.middleware = function () {
  var router = this;

  var dispatch = function dispatch(ctx, next) {
    // ...

    layerChain = matchedLayers.reduce(function(memo, layer) {
      memo.push(function(ctx, next) {
        ctx.captures = layer.captures(path, ctx.captures);
        ctx.params = layer.params(path, ctx.captures, ctx.params);
        ctx.routerName = layer.name;
        return next();
      });
      return memo.concat(layer.stack);
    }, []);

    return compose(layerChain)(ctx, next);
  };

  dispatch.router = this;

  return dispatch;
}
```
从 router.js 里的 routes 中可以看到，这个实例方法创建了一个 layerChain 的数组，通过 compose 方法给每个数组里的元素传递 ctx next 参数。
而我们的 koa.use(router.routes()) 可以看做 koa.use(compose(layerChain)(ctx, next))
koa.use 方法主要执行的就是 this.middleware.push(middleware) 这个方法，这样可以知道 routes 方法就是通过 layerChain 生成了多个中间件挂载到 koa 的中间件模型中。

### 寻找 router 是如何使用  layer 的
```
methods.forEach(function (method) {
  Router.prototype[method] = function (name, path, middleware) {
    var middleware;

    if (typeof path === 'string' || path instanceof RegExp) {
      middleware = Array.prototype.slice.call(arguments, 2);
    } else {
      middleware = Array.prototype.slice.call(arguments, 1);
      path = name;
      name = null;
    }

    this.register(path, [method], middleware, {
      name: name
    });

    return this;
  };
});
```
在 router.js 中有这么一端代码，用处很简单就是给 Router 构造函数创建 HTTP 请求 router.get, router.post 等方法函数供使用者调用，每个 HTTP 请求的方法都执行了 this.register

```
Router.prototype.register = function (path, methods, middleware, opts) {
  opts = opts || {};

  var router = this;
  var stack = this.stack;

  // support array of paths
  if (Array.isArray(path)) {
    path.forEach(function (p) {
      router.register.call(router, p, methods, middleware, opts);
    });

    return this;
  }

  // create route
  var route = new Layer(path, methods, middleware, {
    end: opts.end === false ? opts.end : true,
    name: opts.name,
    sensitive: opts.sensitive || this.opts.sensitive || false,
    strict: opts.strict || this.opts.strict || false,
    prefix: opts.prefix || this.opts.prefix || "",
    ignoreCaptures: opts.ignoreCaptures
  });

  if (this.opts.prefix) {
    route.setPrefix(this.opts.prefix);
  }

  // add parameter middleware
  Object.keys(this.params).forEach(function (param) {
    route.param(param, this.params[param]);
  }, this);

  stack.push(route);

  return route;
};
```
this.register  方法的主要作用就在创建和注册一个路由。它创建路由的方法就是把router.get() 等方法传递的参数来创建一个 Layer 实例。最后把每个 layer 实例都存到了 router 实例的 stack 中

### 查看 layer.js 了解 Layer 的作用
```
function Layer(path, methods, middleware, opts) {
  this.opts = opts || {};
  this.name = this.opts.name || null;
  this.methods = [];
  this.paramNames = [];
  this.stack = Array.isArray(middleware) ? middleware : [middleware];

  // ...

  this.path = path;
  this.regexp = pathToRegExp(path, this.paramNames, this.opts);

  debug('defined route %s %s', this.methods, this.opts.prefix + this.path);
};
```
这里可以看出 Layer 实例生成把，router.get() 方法中传递的中间件 middleware 存到了 layer 实例的 stack 中

### koa-router 如何匹配路径
```
Router.prototype.match = function (path, method) {
  var layers = this.stack;
  var layer;
  var matched = {
    path: [],
    pathAndMethod: [],
    route: false
  };

  for (var len = layers.length, i = 0; i < len; i++) {
    layer = layers[i];

    debug('test %s %s', layer.path, layer.regexp);

    if (layer.match(path)) {
      matched.path.push(layer);

      if (layer.methods.length === 0 || ~layer.methods.indexOf(method)) {
        matched.pathAndMethod.push(layer);
        if (layer.methods.length) matched.route = true;
      }
    }
  }

  return matched;
};
```
我们知道在 Router 会执行 register 把每个 route - layer 实例都 存入 router 实例的 stack 中。  
在 match 中，把 http 请求来的路径和所有 router 实例存在 stack 的 layer 比较，再返回出去。



###  回顾下 koa-router
+ 生成 koa-router 实例 router
+ 写 router.get(), router.post()  方法, 执行 Router.prototype[method] 方法，执行Router.prototype.register ，生成 layer 实例存到 router 实例的 stack 中。
+ layer 实例把每个 http 方法的中间件也 concat 合并到一起，并存到自己的 stack 中。
+ app.use(router. routes()) 执行 koa-router 实例方法 Router.prototype.routes
+ 在 Router.prototype.routes 方法中返回一个 dispatch 函数
+ 这个 dispatch 函数执行时会执行 Router.prototype.match 把 router 实例存放的所有 layer 实例拿出来进行匹配，匹配上的所有 layer 实例组成 layerChain。
+ 最后 layerChain 通过 compose 生成多个标准的 koa 中间件供 app.use()。

### 查看 Router.prototype.use 方法
```
// Router.prototype.use 用法
 router
   .use(session())
   .use(authorize());

 router.use('/users', userAuth());

 router.use(['/users', '/admin'], userAuth());
```
```
Router.prototype.use = function () {
  var router = this;
  var middleware = Array.prototype.slice.call(arguments);
  var path;

  // support array of paths
  if (Array.isArray(middleware[0]) && typeof middleware[0][0] === 'string') {
    middleware[0].forEach(function (p) {
      router.use.apply(router, [p].concat(middleware.slice(1)));
    });

    return this;
  }

  var hasPath = typeof middleware[0] === 'string';
  if (hasPath) {
    path = middleware.shift();
  }

  middleware.forEach(function (m) {
    if (m.router) {
      m.router.stack.forEach(function (nestedLayer) {
        if (path) nestedLayer.setPrefix(path);
        if (router.opts.prefix) nestedLayer.setPrefix(router.opts.prefix);
        router.stack.push(nestedLayer);
      });

      if (router.params) {
        Object.keys(router.params).forEach(function (key) {
          m.router.param(key, router.params[key]);
        });
      }
    } else {
      router.register(path || '(.*)', [], m, { end: false, ignoreCaptures: !hasPath });
    }
  });

  return this;
};
```
Router.prototype.use 方法的作用就是给 router  实例里可以匹配的路径里添加中间件，对 layer 进行重新注册。通过 use 的方法添加的中间件都是在原匹配路径的其他中间件和路由前执行。

### 查看 Router.prototype.allowedMethod
Router.prototype.allowedMethod 是用来处理路由执行的错误的，通过传入的配置来自定义错误处理
```
/*
 * @param {Object=} options
 * @param {Boolean=} options.throw 开启自定义处理错误
 * @param {Function=} options.notImplemented 处理 router 实例中 this.methods 不存在的方法
 * @param {Function=} options.methodNotAllowed 处理路由未定义方法的错误函数(只定义了get 没定义 post ，处理post 请求报错)
 */
Router.prototype.allowedMethods = function (options) {
  options = options || {};
  var implemented = this.methods; // array

  return function allowedMethods(ctx, next) {
    return next().then(function() {
      var allowed = {};

      if (!ctx.status || ctx.status === 404) {
        ctx.matched.forEach(function (route) {
          route.methods.forEach(function (method) {
            allowed[method] = method;
          });
        });

        var allowedArr = Object.keys(allowed);

        if (!~implemented.indexOf(ctx.method)) {
          if (options.throw) {
            var notImplementedThrowable;
            if (typeof options.notImplemented === 'function') {
              notImplementedThrowable = options.notImplemented(); // set whatever the user returns from their function
            } else {
              notImplementedThrowable = new HttpError.NotImplemented();
            }
            throw notImplementedThrowable;
          } else {
            ctx.status = 501;
            ctx.set('Allow', allowedArr.join(', '));
          }
        } else if (allowedArr.length) {
          if (ctx.method === 'OPTIONS') {
            ctx.status = 200;
            ctx.body = '';
            ctx.set('Allow', allowedArr.join(', '));
          } else if (!allowed[ctx.method]) {
            if (options.throw) {
              var notAllowedThrowable;
              if (typeof options.methodNotAllowed === 'function') {
                notAllowedThrowable = options.methodNotAllowed(); // set whatever the user returns from their function
              } else {
                notAllowedThrowable = new HttpError.MethodNotAllowed();
              }
              throw notAllowedThrowable;
            } else {
              ctx.status = 405;
              ctx.set('Allow', allowedArr.join(', '));
            }
          }
        }
      }
    });
  };
};
```
allowedMethod 返回一个可以生成中间件函数，当返回的 http 响应是 404 或 status 不存在时， 遍历每个 matched 到的 layer，来执行相应的错误逻辑。
![请求流程](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401694866190870.png)

[参考](https://juejin.im/entry/5b13c0c1518825137478917c)
