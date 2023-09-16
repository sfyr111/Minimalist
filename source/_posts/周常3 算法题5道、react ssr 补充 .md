---
title: 周常3 算法题5道、react ssr 补充
date: 2019-01-02 21:17
tags:
---
## 周常
+ 算法题 java 实现
  1.调整数组顺序使奇数位于偶数前面
  2.链表中倒数第k个结点
  3.翻转链表
  4.合并两个排序的链表
  5.树的子结构

+ react ssr 补充

## 算法题

### 调整数组顺序使奇数位于偶数前面
输入一个整数数组，实现一个函数来调整该数组中数字的顺序，使得所有的奇数位于数组的前半部分，所有的偶数位于位于数组的后半部分，并保证奇数和奇数，偶数和偶数之间的相对位置不变

#### 解题思路
1.前后两个指针从头尾出发
2.判断两个指针序号的奇偶数
3.左右指针不接触时进行运算
4.左指针序号自增直到找到偶数，右指针序号自减直到找到奇数。
5.左指针序号小于右指针序号则两者未接触，交换位置。

#### 代码实现
```
public class ReorderArray {

	public void reorderArray(int[] arr) {
		int left = 0;
		int right = arr.length - 1;

		while (left < right) {
			while (left < right && (arr[left] % 2 != 0))
				left++;
			while (left < right && (arr[right] % 2 == 0))
				right--;
			if (left < right)
				swap(left, right, arr);
		}
	}

	private void swap(int n, int m, int[] arr) {
		int temp = arr[n];
		arr[n] = arr[m];
		arr[m] = temp;
	}

	public static void main(String[] args) {
		int[] arr = {1, 3, 54, 1, 4, 65, 546, 2, 3, 5, 6};
		new ReorderArray().reorderArray(arr);
		for (int anArr : arr) System.out.print(anArr + " ");
	}
}
```

### 链表中倒数第k个结点
链表中倒数第k个节点

#### 解题思路
用两个链表使用双指针解法
1.第一个指针先走 k 步
2.第二个指针和第一个指针同时走，当第一个指针走到最后一位时一起停止
3.这时候第二个指针还有 k 步没走，第二个指针当前的位置就是倒数的 k 的位置

#### 代码实现
```
public class FindKthToTail {

	private class ListNode {
		int val;
		ListNode next;
		ListNode(int x) { val = x; }
	}

	public ListNode findKthToTail(ListNode head, int k) {
		if (head == null || k <= 0)
			return null;

		ListNode nodeP = head;
		ListNode nodeQ = head;

		// k - 1 是因为 遍历到 k - 2 下个节点 next 并不为 null 赋值后刚好是 k - 1位置
		for (int i = 0; i < k - 1; i++) {
			if (nodeP.next != null)
				nodeP = nodeP.next;
			else
				return null;
		}

		while (nodeP.next != null) {
			nodeP = nodeP.next;
			nodeQ = nodeQ.next;
		}

		return nodeQ;
	}
}
```

### 翻转链表
输入: 1->2->3->4->5->NULL
输出: 5->4->3->2->1->NULL

#### 解题思路
1.创建一个 null 链表 pre
2.每次把原链表 cur 的第一位放在pre 的第一位
3.直到原链表 cur 为 null 时
```
// 第一次
cur: 2->3->4->5->NULL
pre: 1->NULL
// 第二次
cur: 3->4->5->NULL
pre: 2->1->NULL
// 第三次
cur: 4->5->NULL
pre: 3->2->1->NULL
// 第四次
cur: 5->NULL
pre: 4->3->2->1->NULL
// 第五次
cur: NULL
pre: 5->4->3->2->1->NULL
// 返回 pre
```

#### 代码实现
```
public class ReverseList {

 public class ListNode {
   int val;
   ListNode next;
   ListNode(int x) { val = x; }
 }

  public ListNode reverseList(ListNode head) {
    ListNode pre = null;
    ListNode cur = head;

    while (cur != null) {
      ListNode temp = cur.next; // 保留除 cur 第1位的链表 2 -> 3 -> 4 ，cur 还没变
      cur.next = pre; // cur.next 指向 pre 截断 cur 当前第1位 1 -> null, 此处截断原链表生成新链表
      pre = cur; // pre 变成 1 -> null
      cur = temp; // 去除 cur 第1位, cur 变成 2 -> 3 -> 4
    }

    return pre;
  }
}
```

## 合并两个排序的链表

### 解题思路
+ 解法1 使用循环
  1.创建虚拟头 dummy
  2.dummy 引用赋值给 cur
  3.当 l1 l2 都不为 null 时循环
  4.比较 l1.val 和 l2.val 谁小谁接入到 cur.next 上，ln = ln.next 继续比较下一个
5. cur = cur.next 同时向下准备介接入
6. 当l1 或 l2 其中一个为空时 cur.next 为剩下不为空的链表
   7.最后返回 dummy 引用的 dummy.next

+ 解法2 使用递归
  1.基础问题：当其中一个链表为空时，剩下的节点肯定来自另一个链表
  2.基本问题：比较 l1.val 和 l2.val，谁小谁的 next 就递归比较其 next 节点与另一个链表的合并.

### 代码实现
```
public class MergeTwoSortedLists {

	public class ListNode {
		int val;
		ListNode next;
		ListNode(int x) { val = x; }
	}

	public ListNode mergeTwoLists1(ListNode l1, ListNode l2) {
		ListNode dummy = new ListNode(-1);
		ListNode cur = dummy;

		while (l1 != null && l2 != null) {
			if (l1.val < l2.val) {
				cur.next = l1;
				l1 = l1.next;
			} else {
				cur.next = l2;
				l2 = l2.next;
			}
			cur = cur.next;
		}

		cur.next = (l1 != null) ? l1 : l2;
		return dummy.next;
	}

	public ListNode mergeTwoLists2(ListNode l1, ListNode l2) {
		// 当其中一个链表为空时，剩下的节点肯定来自另一个链表
		if (l1 == null) return l2;
		if (l2 == null) return l1;
		// 开始递归
		if (l1.val < l2.val) { // l1 后面应该接节点
			l1.next = mergeTwoLists2(l1.next, l2); // 传入 l1.next l2, 决定 l1.next l2 如果合并
			return l1;
		} else { // l1.val >= l2.val
			l2.next = mergeTwoLists2(l1, l2.next);
			return l2;
		}
	}
}
```

### 树的子结构
给定两个非空二叉树 s 和 t，检验 s 中是否包含和 t 具有相同结构和节点值的子树。s 的一个子树包括 s 的一个节点和这个节点的所有子孙。s 也可以看做它自身的一棵子树。

#### 解题思路
1.创建 equals 函数，比较两个 TreeNode， 比较两个 TreeNode 的 val，如果相等递归比较 left 和 right 节点
2.创建 traverse 函数，这个函数用来在 s 的每个节点中比较 t ，同时进行比较当前节点， 递归的在 s 的 left 和 right 里比较 t

#### 代码实现
```
public class SubtreeOfAnotherTree {

	public class TreeNode {
		int val;
		TreeNode left;
		TreeNode right;

		TreeNode(int x) {
			val = x;
		}
	}

	public boolean isSubtree(TreeNode s, TreeNode t) {
		return traverse(s, t); // 此函数用来递归遍历树
	}

	// 这个函数用来在 s 的每个节点中比较 t ，同时进行比较当前节点
	private boolean traverse(TreeNode s, TreeNode t) {
		return s != null // 主树不为空
				&& (
				  equals(s, t) // 两个树一样
					|| traverse(s.left, t) // 从左子节点开始比较
					|| traverse(s.right, t) // 从右子节点开始比较
		);
	}

	private boolean equals(TreeNode x, TreeNode y) {
		if (x == null && y == null) // base 基础条件，比较到最后都没子节点了 true
			return true;
		if (x == null || y == null) // base 基础条件，还有子节点 false
			return false;
		// 递归实际比较
		return x.val == y.val && equals(x.left, y.left) && equals(x.right, y.right);
	}
}
```

## react ssr 补充

## node server 中间层
之前的代码在渲染时 node server 请求了一次 api 返回了数据插入到页面上，client 的代码在 componentDidMount 里也是请求了 api ，这次改造成 client 请求 node server，node server 再去请求 api，让 node server 只做代理而不是客户端还去请求外部服务。

### 使用 express-http-proxy
设置代理 client 请求本地服务 /api/news.json?secret=abcd 时代理到 http://47.95.113.63/ssr/api/news.json?secret=abcd 下
```
import proxy from 'express-http-proxy';

app.use('/api', proxy('http://47.95.113.63', {
  proxyReqPathResolver: function (req) {
    return '/ssr/api' + req.url;
  }
}));
```

### 区分 server client axios 请求的 baseURL
+ server client axios 配置
```
// client
import axios from 'axios';

const instance = axios.create({
	baseURL: '/'
});

export default instance;
```
```
// server
import axios from 'axios';

const createInstance = (req) => axios.create({
	baseURL: 'http://47.95.113.63/ssr',
	headers: {
		cookie: req.get('cookie') || ''
	}
});

export default createInstance;
```

+ 使用 thunk.withExtraArgument
```
export const getStore = (req) => {
	// 改变服务器端store的内容，那么就一定要使用serverAxios
	return createStore(reducer, applyMiddleware(thunk.withExtraArgument(serverAxios(req))));
}

export const getClientStore = () => {
	const defaultState = window.context.state;
	// 改变客户端store的内容，一定要使用clientAxios
	return createStore(reducer, defaultState, applyMiddleware(thunk.withExtraArgument(clientAxios)));
}
```
action 上就会增加额外的参数
```
// action
export const getHomeList = () => {
	return (dispatch, getState, axiosInstance) => {
		return axiosInstance.get('/api/news.json?secret=abcd')
			.then((res) => {
				const list = res.data.data;
				dispatch(changeList(list))
			});
	}
} 
```

+ 或者使用 webpack.DefinePlugin 插件，给server 端代码增加环境变量
```
// 通过插件传递的环境变量只在 server 打包的代码里使用
const baseUrl = process.env.API_BASE || ''
```
```
// webpack.server.js
  plugins: [
    new webpack.DefinePlugin({
      'process.env.API_BASE': '"http://127.0.0.1:3333"'
    })
  ]
```

### 多层路由展示
```
// Routes.js
export default [{
  path: '/',
  component: App,
  loadData: App.loadData,
  routes: [
    { 
      path: '/',
      component: Home,
      exact: true,
      loadData: Home.loadData,
      key: 'home'
    }, { 
      path: '/translation',
      component: Translation,
      loadData: Translation.loadData,
      exact: true,
      key: 'translation'
    }
  ]
}];
```
```
import { renderRoutes } from 'react-router-config';

// client
const App = () => {
	return (
		<Provider store={store}>
			<BrowserRouter>
				<div>
					{renderRoutes(routes)}
	    	</div>
			</BrowserRouter>
		</Provider>
	)
}

// server
export const render = (store, routes, req) => {

		const content = renderToString((
			<Provider store={store}>
				<StaticRouter location={req.path} context={{}}>
					<div>
						{renderRoutes(routes)}
	    		</div>
				</StaticRouter>
			</Provider>
		));
		// return ...
}
```
一级路由组件要渲染二级路由 routes 子路由数组
```
routes: [
    { 
      path: '/',
      component: Home,
      exact: true,
      loadData: Home.loadData,
      key: 'home'
    }, { 
      path: '/translation',
      component: Translation,
      loadData: Translation.loadData,
      exact: true,
      key: 'translation'
    }
  ]
```
一级路由组件渲染后 route 属性可以在 props 里获取到，在一级路由组件里使用 renderRoutes 渲染一级路由的 props.route.routes
```
// 一级路由的组件
// client server 端共用
const App = (props) => {
	return (
		<div>
			<Header />
			{renderRoutes(props.route.routes)}
		</div>
	)
}

App.loadData = (store) => {
	return store.dispatch(actions.getHeaderInfo());
}
```

### 解决 cookie 携带问题
当浏览器请求本地 node 服务时(携带 cookie)
node server 进行服务端渲染转发浏览器的请求
node server 请求 api server 获取数据(cookie 需要手动携带)
express-http-proxy 中间件 只转发了请求路径，请求内容最终还是 axios 请求的。
```
app.use('/api', proxy('http://47.95.113.63', {
  proxyReqPathResolver: function (req) {
    return '/ssr/api' + req.url;
  }
}));
```
通过把 express req 对象传递给 getStore 最后改造 createInstance 为高阶函数，这样cookie 就可以给 axios 获取cookie了
```
app.get('*', function (req, res) {
	const store = getStore(req);
	// ..
}
export const getStore = (req) => {
	// 改变服务器端store的内容，那么就一定要使用serverAxios
	return createStore(reducer, applyMiddleware(thunk.withExtraArgument(serverAxios(req))));
}

// axios 实例
import axios from 'axios';

const createInstance = (req) => axios.create({
	baseURL: 'http://47.95.113.63/ssr',
	headers: {
		cookie: req.get('cookie') || ''
	}
});

export default createInstance;
```

## 生成404页面
路由配置
```
export default [{
  path: '/',
  component: App,
  loadData: App.loadData,
  routes: [
    { 
      path: '/',
      component: Home,
      exact: true,
      loadData: Home.loadData,
      key: 'home'
    }, { 
      path: '/translation',
      component: Translation,
      loadData: Translation.loadData,
      exact: true,
      key: 'translation'
    },
    {
      component: NotFound
    }
  ]
}];
```

### 解决请求返回的页面 status 404 返回

在 server 使用 StaticRouter 传递 context, context 可以从 props.staticContext 中获取

修改 server ssr 路由配置，给 render 函数传递 context
```
app.get('*', function (req, res) {
	Promise.all(promises).then(() => {
		const context = {};
		const html = render(store, routes, req, context);
        res.send(html)
	})
}
```
给 render 函数增加 context 参数传递到 StaticRouter 组件中，等到 props.staticContext 使用
```

export const render = (store, routes, req, context) => {

		const content = renderToString((
			<Provider store={store}>
				<StaticRouter location={req.path} context={context}>
					<div>
						{renderRoutes(routes)}
	    		</div>
				</StaticRouter>
			</Provider>
		));
        return `...`
}
```
修改 NotFound 页面, 当没有匹配路由访问到 NotFound 页面时，staticContext 增加 NOT_FOUND
因为 server client 都会执行，client 不存在 staticContext 记得判断一下防止报错
```
import React, { Component } from 'react';

class NotFound extends Component {

	componentWillMount() {
		const { staticContext } = this.props;
		staticContext && (staticContext.NOT_FOUND = true);
	}

	render() {
		return <div>404, sorry, page not found</div>
	}

}

export default NotFound;
```
这样我们可以通过判断 context.NOT_FOUND 来判断设置 status 404再返回页面
```
app.get('*', function (req, res) {
	Promise.all(promises).then(() => {
		const context = {};
		const html = render(store, routes, req, context);
        if (context.NOT_FOUND) {
			res.status(404);
			res.send(html);
		}else {
			res.send(html);
		}
	})
}
```

### 实现 301 重定向
没登录的情况下访问需要授权的页面 虽然 client 的逻辑重定向了，但是server 端代码没有重定向。
```
// client 页面执行的 Redirect
	render() {
		return this.props.login ? (
			<div>
				{this.getList()}
			</div>
		) : <Redirect to='/'/>;
	}
```
不过 renderRoutes 方法在发现 Redirect 组件执行时，就是在 server 上发现时会帮我们的 context 上塞一段数据用来判断
```
// context: { url: '', action: '', location: { pathname: '', search: '', hash: '', state: undefined } }
app.get('*', function (req, res) {
	Promise.all(promises).then(() => {
		const context = {};
		const html = render(store, routes, req, context);
		if (context.action === 'REPLACE') {
			res.redirect(301, context.url)
		}else if (context.NOT_FOUND) {
			res.status(404);
			res.send(html);
		}else {
			res.send(html);
		}
	})
}
```
这样就可以实现301了

### 错误获取
当 node server 代理的请求报错时页面就崩溃了，我们喜欢 node server 代理的请求有错时还是能返回没报错的数据同时把页面渲染出来
```
app.get('*', function (req, res) {
	const store = getStore(req);
	const matchedRoutes = matchRoutes(routes, req.path);
	const promises = [];
	matchedRoutes.forEach(item => {
		if (item.route.loadData) {
		    // 封装一个 promise，当 loadData catch 时也能让外层的 promise 返回 resolve 能继续执行，保证返回页面的 promise.all 能继续执行
			const promise = new Promise((resolve, reject) => {
				item.route.loadData(store).then(resolve).catch(resolve);
			})
			promises.push(promise);
		}
	})
	Promise.all(promises).then(() => {
		const context = {};
		const html = render(store, routes, req, context);
		if (context.action === 'REPLACE') {
			res.redirect(301, context.url)
		}else if (context.NOT_FOUND) {
			res.status(404);
			res.send(html);
		}else {
			res.send(html);
		}
	})
}
```

## 处理 CSS

### server 打包 处理 css
使用isomorphic-style-loader, 处理样式的 loader 需要 window 对象，server 端是没有 window 的，使用同构样式的 loader, 这里使用 modules 模式需要执行 JS 才有样式，会有白屏问题
```
		rules: [{
			test: /\.css?$/,
			use: ['isomorphic-style-loader', {
				loader: 'css-loader',
				options: {
					importLoaders: 1,
					modules: true,
					localIdentName: '[name]_[local]_[hash:base64:5]'
				}
			}]
		}
```

### 实现 ssr 样式

+ 创建传递 styles.getCss() 对象到 staticContext.css 里的高阶组件
```
import React, { Component } from 'react';

export default (DecoratedComponent, styles) => {
	
	return class NewComponent extends Component {

		componentWillMount() {
			if (this.props.staticContext) {
				this.props.staticContext.css.push(styles._getCss());
			}
		}

		render() {
			return <DecoratedComponent {...this.props} />
		}

	}
}
```
+ ssr 样式的页面使用高阶组件
  这里同时把 loadData 挂载到到处的页面对象上。
```
const ExportHome = connect(mapStateToProps, mapDispatchToProps)(withStyle(Home, styles)); // 使用 withStyle

ExportHome.loadData = (store) => {
	return store.dispatch(getHomeList())
}

export default ExportHome;
```
+ 最后在 server 里修改返回的模板
  通过传入的 staticContext 对象里找到 css 对象数组，转换成字符串后，插入到 head 里
```
export const render = (store, routes, req, context) => {

		const content = renderToString((
			<Provider store={store}>
				<StaticRouter location={req.path} context={context}>
					<div>
						{renderRoutes(routes)}
	    		</div>
				</StaticRouter>
			</Provider>
		));

		const cssStr = context.css.length ? context.css.join('\n') : '';

		return `
			<html>
				<head>
					<title>ssr</title>
					<style>${cssStr}</style>
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

## SEO

### Title 和 Description
```angular2html
<title> 标题
<meta name="Description" content="搜索踹的简介">
```

### React-Helment
+ page 上使用
```
// pages/home.js
import { Helmet } from "react-helmet";

class Home extends Component {
	render() {
		return (
			<Fragment>
				<Helmet>
					<title>新闻页面 - 丰富多彩的资讯</title>
					<meta name="description" content="新闻页面 - 丰富多彩的资讯" />
				</Helmet>
				<div className={styles.container}>
					{list}
				</div>
			</Fragment>
		)
	}
    
}
```
+ node server 上使用
  注意要在 react.renderToString() 后使用 const helmet = Helmet.renderStatic(); 来获取每个 page 中 react 组件设置的 Helmet 对象
```
import { Helmet } from "react-helmet";

export const render = (store, routes, req, context) => {

		const content = renderToString((
			<Provider store={store}>
				<StaticRouter location={req.path} context={context}>
					<div>
						{renderRoutes(routes)}
	    		</div>
				</StaticRouter>
			</Provider>
		));
		const helmet = Helmet.renderStatic();

		const cssStr = context.css.length ? context.css.join('\n') : '';

		return `
			<html>
				<head>
					${helmet.title.toString()}
          ${helmet.meta.toString()}
					<style>${cssStr}</style>
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

### 预渲染解决 SEO
访问一个普通 react 项目链接，爬虫蜘蛛也访问项目链接
可以通过识别爬虫蜘蛛访问的时候预渲染 dom 返回给爬虫。

### prerender 模块
+ 创建 prerender 服务器
  访问时加上查询参数 ?url=${url} 预渲染服务就会先去访问 url 再返回给爬虫
```
const prerender = require('prerender');
const server = prerender({
	port: 8000
});
server.start();
```

+ 使用 nginx 识别用户和爬虫
  nginx 识别爬虫就访问 prerender，识别是人就访问 react 项目

+ prerender 官网参考

> 引用

https://prerender.io/

   
