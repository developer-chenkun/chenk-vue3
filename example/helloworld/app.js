import { h } from '../../lib/guide-mini-vue.esm.js';
import { Foo } from './Foo.js'
export const App = {
  name: 'App',
  // render函数
  render() {
    window.self = this
    
    // return h('div',{ id: 'root', class: ['red']}, 'hi,'+ this.msg)
    return h('div',
    { id: 'root', class: ['red']},
    [
      h('p', { class: ['blue']}, 'hi,'), 
      h('p', { class: ['red']}, 'mini-vue'), 
      h(Foo, {
        count: 1, 
        onAdd(val){
          console.log('add', val)
        },
        onFooAdd(val) {
          console.log('foo-add', val);
        }
      })
    ])
  },
  setup() {
    // composition api

    return {
      msg: 'mini-vue'
    }
  }
}