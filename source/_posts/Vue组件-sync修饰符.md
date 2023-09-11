---
title: Vue组件.sync修饰符
date: 2018-01-22 13:09:11
tags: Vue
categories: Vue
---
```
<div id="app">
    <div>父组件bar: {{bar}}</div>
    <comp :foo.sync="bar"></comp>
    <!-- <comp :foo="bar" @update:foo="val => bar = val"></comp> -->
</div>
```
```
<script>
Vue.component('comp', {
  template: '<div><button @click="increment">点我更新子组件foo++</button><div>子组件foo: {{foo}}</div></div>',
  props: ['foo'],
  methods: {
    increment: function() {
      this.foo++;
      this.$emit('update:foo', this.foo);
    }
  }
});

new Vue({
  el: '#app',
  data: {bar: 0}
});
</script>
```
`:foo.sync="bar"`  实际就是 `:foo="bar" @update:foo="val => bar = val"` 的语法糖
[.sync demo](http://js.jirengu.com/rolomucuvi/15/edit)