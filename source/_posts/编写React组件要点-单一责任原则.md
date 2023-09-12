---
title: 编写React组件要点-单一责任原则
date: 2018-10-28 23:22:31
tags: React
categories: React
---

![思维导图](/images/imagemogr2_auto_orient_strip_7cimageview2_2_w_1240_12401694537003080.png)

## 什么是单一原则
+ 单一责任原则 SRP(Single responsibility principle) 是一种计算机编程原理，它规定每个模块或类应该对软件提供的单个功能负责。
+ 在 React 里单一责任原则要求组件改变时只有一个原因。
+ React 组件使用单一责任原则时，当它改变时只会有一个原因，做一件事就会更简单。

## 多责任陷阱
+ 直接编码，不划分结构
+ 写一个大组件，不划分组件
+ 对 callback、props、fetch 都不拆分
+ 反模式、上帝组件。
+ 多见于 <Application>, <Manager>, <BigContainer> <Page>, 大量代码

## React 单一责任原则

### 设想一个组件

```
import axios from 'axios';  
// 组件具有多个职责
class Weather extends Component {  
   constructor(props) {
     super(props);
     this.state = { temperature: 'N/A', windSpeed: 'N/A' };
   }

   render() {
     const { temperature, windSpeed } = this.state;
     return (
       <div className="weather">
         <div>Temperature: {temperature}°C</div>
         <div>Wind: {windSpeed}km/h</div>
       </div>
     );
   }

   componentDidMount() {
     axios.get('http://weather.com/api').then(function(response) {
       const { current } = response.data; 
       this.setState({
         temperature: current.temperature,
         windSpeed: current.windSpeed
       })
     });
   }
}
```
+ 这个组件有两个方式会改变：**(setState 和 render 会导致组件渲染)**
1 `componentDidMount()` 请求 `http://weather.com/api` 获取数据时 `this.setState`
2 在 `render()` 里渲染数据时

### 改写当前组件

```
import axios from 'axios';  
// 当前组件只负责获取数据
class WeatherFetch extends Component {  
   constructor(props) {
     super(props);
     this.state = { temperature: 'N/A', windSpeed: 'N/A' };
   }

   render() {
     const { temperature, windSpeed } = this.state;
     return (
       <WeatherInfo temperature={temperature} windSpeed={windSpeed} />
     );
   }

   async componentDidMount() {
     const response = await axios.get('http://weather.com/api');
     const { current } = response.data; 
     this.setState({
       temperature: current.temperature,
       windSpeed: current.windSpeed
     });
   }
}
```
```
// 组件只负责展示数据，展示逻辑可写在内部  
function WeatherInfo({ temperature, windSpeed }) {  
   const windInfo = windSpeed === 0 ? 'calm' : `${windSpeed} km/h`;
   return (
     <div className="weather">
       <div>Temperature: {temperature}°C</div>
       <div>Wind: {windInfo}</div>
     </div>
   );
}
```

## HOC 高阶组件

> 借用高阶函数的概念：高阶组件是一个函数，入参接受一个组件返回值也是一个组件

### 属性代理 props proxy

> 高阶组件为封装的组件传递新的 props 或者改变现有的 props，这种方式称为属性代理

```
function withNewFunctionality(WrappedComponent) {  
  return class NewFunctionality extends Component {
    render() {
      const newProp = 'Value';
      const propsProxy = {
         ...this.props,
         // Alter existing prop:
         ownProp: this.props.ownProp + ' was modified',
         // Add new prop:
         newProp
      };
      return <WrappedComponent {...propsProxy} />;
    }
  }
}
const MyNewComponent = withNewFunctionality(MyComponent);  
```

### 渲染劫持 render highjacking

> 通过更改组件 render 方法来改变组件的渲染方式，这种方式称为渲染劫持

```
function withModifiedChildren(WrappedComponent) {  
  return class ModifiedChildren extends WrappedComponent {
    render() {
      const rootElement = super.render();
      const newChildren = [
        ...rootElement.props.children, 
        // Insert a new child:
        <div>New child</div>
      ];
      return cloneElement(
        rootElement, 
        rootElement.props, 
        newChildren
      );
    }
  }
}
const MyNewComponent = withModifiedChildren(MyComponent); 
```

## HOC 高阶组件单一责任原则

### 先定义多重责任组件

```
class PersistentForm extends Component {  
  constructor(props) {
    super(props);
    this.state = { inputValue: localStorage.getItem('inputValue') };
    this.handleChange = this.handleChange.bind(this);
    this.handleClick = this.handleClick.bind(this);
  }

  render() {
    const { inputValue } = this.state;
    return (
      <div className="persistent-form">
        <input type="text" value={inputValue} 
          onChange={this.handleChange}/> 
        <button onClick={this.handleClick}>Save to storage</button>
      </div>
    );
  }

  handleChange(event) {
    this.setState({
      inputValue: event.target.value
    });
  }

  handleClick() {
    localStorage.setItem('inputValue', this.state.inputValue);
  }
}
```
+ constructor 内进行数据初始化
+ button 点击时保存数据
+ input 内容改变时更新组件状态

### 抽离出保存数据逻辑

```
class PersistentForm extends Component {  
  constructor(props) {
    super(props);
    this.state = { inputValue: props.initialValue };
    this.handleChange = this.handleChange.bind(this);
    this.handleClick = this.handleClick.bind(this);
  }

  render() {
    const { inputValue } = this.state;
    return (
      <div className="persistent-form">
        <input type="text" value={inputValue} 
          onChange={this.handleChange}/> 
        <button onClick={this.handleClick}>Save to storage</button>
      </div>
    );
  }

  handleChange(event) {
    this.setState({
      inputValue: event.target.value
    });
  }

  handleClick() {
    this.props.saveValue(this.state.inputValue);
  }
}
```
+ 改写组件，使数据初始化和保存功能都由 props 传递
+ 此组件现在只负责 input 的数据变化，数据和保存逻辑都由外部提供

### 编写可复用的单一责任原则的高阶组件

```
// 给函数传递两个参数，一个是数据获取的 key 值，一个是存储函数
function withPersistence(storageKey, storage) {  // 高阶组件函数
  return function(WrappedComponent) {
    return class PersistentComponent extends Component {
      constructor(props) {
        super(props);
        this.state = { initialValue: storage.getItem(storageKey) };
      }

      render() {
         return (
           <WrappedComponent
             initialValue={this.state.initialValue}
             saveValue={this.saveValue}
             {...this.props}
           />
         );
      }

      saveValue(value) {
        storage.setItem(storageKey, value);
      }
    }
  }
}
```
```
// 调用方式
const LocalStoragePersistentForm  
  = withPersistence('key', localStorage)(PersistentForm);
```
+ 隔离了数据操作和展示操作
+ 数据操作可以通过高阶函数传参改变存储 API 或 key 值
+ 符合单一责任原则：允许在隔离中进行修改，从而较少影响系统的其他部分。
