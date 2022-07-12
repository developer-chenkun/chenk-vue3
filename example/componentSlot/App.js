import { h, createTextVNode } from '../../lib/guide-mini-vue.esm.js';
import { Foo } from './Foo.js'
export const App = {
  name: 'App',
  render() {
    const app = h('div', {}, "App")
    // const foo = h(Foo, {}, [h('p', {}, "123"), h('span', {}, "456")])
    // const foo = h(Foo, {}, h('p', {}, "123"))
    const foo = h(Foo, {}, {
      // slot 会被编译为function 返回其中的虚拟节点 然后使用renderSlot函数中Fragment包裹返回的虚拟节点
      header: ({ age }) => [h('header', {}, 'head1' + age), createTextVNode('你好')],
      footer: () => h('footer', {}, "footer")
    })

    return h('div', {}, [app, foo])
  },

  setup(){
    return {}
  }
} 