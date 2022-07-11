import { h, createTextVNode } from '../../lib/guide-mini-vue.esm.js';
import { Foo } from './Foo.js'
export const App = {
  name: 'App',
  render() {
    const app = h('div', {}, "App")
    // const foo = h(Foo, {}, [h('p', {}, "123"), h('span', {}, "456")])
    // const foo = h(Foo, {}, h('p', {}, "123"))
    const foo = h(Foo, {}, {
      header: ({ age }) => [h('header', {}, 'head1' + age), createTextVNode('你好')],
      footer: () => h('footer', {}, "footer")
    })

    return h('div', {}, [app, foo])
  },

  setup(){
    return {}
  }
} 