---
title: '前端基础重点回顾5:XSS、CSRF攻击'
date: 2018-01-31 17:01:53
tags: http
categories: Font-End Basis
---
## XSS
##### 攻击前提
>+ 攻击脚本必须添加到页面上

##### 攻击方式
>+ 跨站脚本XSS(Cross site script) 代码注入
>+ script 标签注入攻击 `<li><script>alert(1)</script></li>`
>+ 标签属性注入攻击 `<img src="" onerror="alert(1)">` `<p onclick="alert(2)">诱导点击</p>`
>+ 广告注入 `<iframe src=''></iframe>`

##### 防止XSS攻击
>+ 获取的数据不允许进行字符串拼接
>+ 使用element.inneText方法 把数据添加到dom 中，inneText 方法会转义所有内容
>+ 把所有数据里的`/["'&<>]/`使用正则进行转义
>+ 存储数据时过滤并转义`/["'&<>]/`
>+ 防止URL 上的参数在页面上展示 `http://url?code=<p onclick="alert(2)">诱导点击</p>` 这里的code query参数内容不得在页面中渲染

## CSRF
![](http://upload-images.jianshu.io/upload_images/2155778-617054f296163894.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

##### 攻击原理
>+ 利用用户已经登录的状态 伪造请求发送给服务器进行用户操作

##### 攻击方式
>+ 跨站请求伪造(Cross site request forgery)
>+ 用户已登录(cookie登录)`如果没设置httpOnly cookie是根据域名和路径访问的, 无关端口`
>+ 伪造请求(GET, POST)
```
伪造GET
<img src="http://localhost:3000/csrf?data=111" alt="">
http://localhost:3000/csrf?data=111 // 直接地址栏中输入
```
```
表单伪造POST
    <form id="form" style="display: none;" action="http://localhost:3000/csrf?data=111" method="post" target="csrf">
    </form>
    <input id="btn" type="button" value="submit">
    <iframe src="" style="display: none;" name="csrf" frameborder="0"></iframe>
    <script>
      btn.addEventListener('click', (e) => {
        e.preventDefault()
        form.submit()
      })
    </script>
```

防止CSRF攻击
>+ 请求时不仅浏览器携带cookie， `请求参数也需要把跟cookie 相关的值携带到参数中, 伪造的请求无法获取正确网站cookie的值, 比如常见约定的csrfToken`
>+ 使用Authorization 的token 授权
>+ 提交表单的时候增加token 认证
>+ 验证请求header 的Referer `携带请求来源信息`